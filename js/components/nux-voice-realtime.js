(function () {
    'use strict';

    var CAPTURE_WORKLET = [
        'class PCMCaptureProcessor extends AudioWorkletProcessor {',
        '  constructor(options) {',
        '    super();',
        '    const o = (options && options.processorOptions) || {};',
        '    this._ratio = (o.srcRate || 16000) / (o.dstRate || 16000);',
        '    this._dstBlock = 1600;',
        '    this._out = new Int16Array(this._dstBlock);',
        '    this._n = 0;',
        '    this._frac = 0;',
        '    this._prev = 0;',
        '    this._cur = 0;',
        '    this._hasCur = false;',
        '    this._sum = 0;',
        '  }',
        '  _pushSample(s) {',
        '    this._sum += s * s;',
        '    if (this._n < this._dstBlock) this._out[this._n++] = s < -1 ? -32768 : (s > 1 ? 32767 : Math.round(s * 32767));',
        '    if (this._n === this._dstBlock) {',
        '      this.port.postMessage({ pcm: this._out.slice(0), rms: Math.sqrt(this._sum / this._dstBlock) });',
        '      this._n = 0;',
        '      this._sum = 0;',
        '    }',
        '  }',
        '  process(inputs) {',
        '    const ch = inputs[0] && inputs[0][0];',
        '    if (!ch) return true;',
        '    if (this._ratio <= 1.001) {',
        '      for (let i = 0; i < ch.length; i++) {',
        '        this._pushSample(Math.max(-1, Math.min(1, ch[i])));',
        '      }',
        '      return true;',
        '    }',
        '    for (let i = 0; i < ch.length; i++) {',
        '      this._prev = this._hasCur ? this._cur : ch[i];',
        '      this._cur = ch[i];',
        '      this._hasCur = true;',
        '      this._frac += 1 / this._ratio;',
        '      while (this._frac >= 1) {',
        '        this._frac -= 1;',
        '        const t = this._frac;',
        '        this._pushSample(this._prev + (this._cur - this._prev) * t);',
        '      }',
        '    }',
        '    return true;',
        '  }',
        '}',
        'registerProcessor("pcm-capture", PCMCaptureProcessor);'
    ].join('\n');

    function VoiceRealtimeClient(options) {
        this.opts = Object.assign({
            wsUrl: '',
            token: '',
            vadSpeechRms: 0.02,
            vadSilenceRms: 0.012,
            vadSilenceMs: 500,
            onEvent: null
        }, options || {});
        this.state = 'idle';
        this.ws = null;
        this.micCtx = null;
        this.playCtx = null;
        this.stream = null;
        this.playHead = 0;
        this.activeSources = [];
        this.sawSpeech = false;
        this.silentBlocks = 0;
        this._blockMs = 100;
        this._closedByUser = false;
    }

    VoiceRealtimeClient.prototype.emit = function (type, payload) {
        if (typeof this.opts.onEvent === 'function') this.opts.onEvent(type, payload || {});
    };

    VoiceRealtimeClient.prototype._setState = function (s) {
        if (this.state === s) return;
        this.state = s;
        this.emit('state', s);
    };

    VoiceRealtimeClient.prototype.start = function () {
        var self = this;
        if (this.state !== 'idle') return Promise.reject(new Error('already started'));
        this._closedByUser = false;
        this._setState('connecting');
        var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
        var base = this.opts.wsUrl.indexOf('ws') === 0 ? this.opts.wsUrl : proto + location.host + this.opts.wsUrl;
        var ws = new WebSocket(base);
        this.ws = ws;
        ws.onopen = function () {
            self.ws.send(JSON.stringify({ type: 'auth', token: self.opts.token || '' }));
        };
        ws.onmessage = function (ev) {
            var msg;
            try { msg = JSON.parse(ev.data); } catch (e) { return; }
            self._onServerMessage(msg);
        };
        ws.onclose = function () {
            self.emit('closed');
            self._teardownMedia();
            if (self._onOpenReject) {
                var rej = self._onOpenReject;
                self._onOpenResolve = null;
                self._onOpenReject = null;
                rej(new Error('连接被关闭'));
            }
            if (!self._closedByUser) self._setState('idle');
        };
        ws.onerror = function () { self.emit('error', { message: '连接服务器失败' }); };
        self._visHandler = function () {
            if (document.visibilityState !== 'visible') return;
            if (self.playCtx && self.playCtx.state === 'suspended') self.playCtx.resume();
            if (self.micCtx && self.micCtx.state === 'suspended') self.micCtx.resume();
        };
        document.addEventListener('visibilitychange', self._visHandler);
        return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () {
                self._onOpenResolve = null;
                self._onOpenReject = null;
                reject(new Error('连接超时'));
            }, 10000);
            self._onOpenResolve = function () { clearTimeout(timer); resolve(); };
            self._onOpenReject = function (err) { clearTimeout(timer); reject(err); };
        });
    };

    VoiceRealtimeClient.prototype._onOpenReady = function () {
        if (typeof this._onOpenResolve === 'function') { this._onOpenResolve(); this._onOpenResolve = null; }
    };

    VoiceRealtimeClient.prototype._onServerMessage = function (msg) {
        var type = msg.type;
        if (type === 'ready') { this._onOpenReady(); this.emit('ready', msg); return; }
        if (type === 'asr_partial') { this.emit('asr_partial', msg); return; }
        if (type === 'asr_final') { this.emit('asr_final', msg); return; }
        if (type === 'thinking') { this.emit('thinking', msg); return; }
        if (type === 'assistant_delta') {
            if (this.state !== 'speaking') this._setState('thinking');
            this.emit('assistant_delta', msg);
            return;
        }
        if (type === 'tts_audio') { this._setState('speaking'); this._playChunk(msg.data); return; }
        if (type === 'turn_end') { this._setState('listening'); this.emit('turn_end', msg); return; }
        if (type === 'interrupted') { this._setState('listening'); this.emit('interrupted', msg); return; }
        if (type === 'error') { this.emit('error', msg); return; }
    };

    VoiceRealtimeClient.prototype.startMic = function () {
        var self = this;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return Promise.reject(new Error('当前浏览器不支持麦克风'));
        }
        return navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
        }).then(function (stream) {
            self.stream = stream;
            return self._setupCapture();
        });
    };

    VoiceRealtimeClient.prototype._unlockPlayback = function () {
        if (!this.playCtx) {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            this.playCtx = new Ctx();
        }
        if (this.playCtx.state === 'suspended') this.playCtx.resume();
    };

    VoiceRealtimeClient.prototype._setupCapture = function () {
        var self = this;
        var Ctx = window.AudioContext || window.webkitAudioContext;
        this.micCtx = new Ctx({ sampleRate: 16000 });
        var workletBlob = new Blob([CAPTURE_WORKLET], { type: 'application/javascript' });
        var workletUrl = URL.createObjectURL(workletBlob);
        return this.micCtx.audioWorklet.addModule(workletUrl).then(function () {
            var src = self.micCtx.createMediaStreamSource(self.stream);
            var node = new AudioWorkletNode(self.micCtx, 'pcm-capture', {
                processorOptions: { srcRate: self.micCtx.sampleRate, dstRate: 16000 }
            });
            node.port.onmessage = function (ev) { self._handleBlock(ev.data); };
            src.connect(node);
            self.micCtx.resume();
            self._workletNode = node;
            self._unlockPlayback();
            self._setState('listening');
        });
    };

    VoiceRealtimeClient.prototype._handleBlock = function (data) {
        if (!this.ws || this.ws.readyState !== 1) return;
        var pcm = data.pcm;
        var rms = data.rms || 0;
        var chunk = new Int16Array(pcm);
        this.ws.send(JSON.stringify({ type: 'audio', data: this._b64(new Uint8Array(chunk.buffer)) }));
        if (this.state === 'speaking') {
            if (rms > this.opts.vadSpeechRms) {
                this.speakingBars = (this.speakingBars || 0) + 1;
                if (this.speakingBars >= 3) { this.interrupt(); this.speakingBars = 0; }
            } else {
                this.speakingBars = 0;
            }
            return;
        }
        if (rms > this.opts.vadSpeechRms) {
            this.sawSpeech = true;
            this.silentBlocks = 0;
        } else if (this.sawSpeech && rms < this.opts.vadSilenceRms) {
            this.silentBlocks += 1;
            if (this.silentBlocks * this._blockMs >= this.opts.vadSilenceMs) {
                this.sawSpeech = false;
                this.silentBlocks = 0;
                this.ws.send(JSON.stringify({ type: 'turn_end' }));
            }
        }
    };

    VoiceRealtimeClient.prototype.sendText = function (text) {
        if (this.ws && this.ws.readyState === 1 && text) {
            this.ws.send(JSON.stringify({ type: 'text', text: text }));
            return true;
        }
        return false;
    };

    VoiceRealtimeClient.prototype.interrupt = function () {
        if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'interrupt' }));
        this._stopPlayback();
    };

    VoiceRealtimeClient.prototype._b64 = function (bytes) {
        var binary = '';
        var step = 0x8000;
        for (var i = 0; i < bytes.length; i += step) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
        }
        return btoa(binary);
    };

    VoiceRealtimeClient.prototype._playChunk = function (b64) {
        var self = this;
        if (!b64) return;
        if (!this.playCtx) {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            this.playCtx = new Ctx();
        }
        var binary = atob(b64);
        var len = binary.length;
        var samples = len >> 1;
        if (!samples) return;
        var pcm = new Int16Array(samples);
        for (var i = 0; i < samples; i++) {
            pcm[i] = (binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8));
        }
        var floats = new Float32Array(samples);
        for (var j = 0; j < samples; j++) floats[j] = pcm[j] / 32768;
        var buffer = this.playCtx.createBuffer(1, samples, 16000);
        buffer.copyToChannel(floats, 0);
        var src = this.playCtx.createBufferSource();
        src.buffer = buffer;
        src.connect(this.playCtx.destination);
        var at = Math.max(this.playHead, this.playCtx.currentTime + 0.03);
        src.start(at);
        this.playHead = at + buffer.duration;
        this.activeSources.push(src);
        src.onended = function () {
            var idx = self.activeSources.indexOf(src);
            if (idx >= 0) self.activeSources.splice(idx, 1);
            if (!self.activeSources.length && self.state === 'speaking') {
                self.sawSpeech = false;
                self.silentBlocks = 0;
                self._setState('listening');
            }
        };
        this.playCtx.resume();
    };

    VoiceRealtimeClient.prototype._stopPlayback = function () {
        this.activeSources.forEach(function (s) { try { s.stop(); } catch (e) {} });
        this.activeSources = [];
        this.playHead = 0;
    };

    VoiceRealtimeClient.prototype._teardownMedia = function () {
        if (this._visHandler) {
            document.removeEventListener('visibilitychange', this._visHandler);
            this._visHandler = null;
        }
        if (this._workletNode) { try { this._workletNode.disconnect(); } catch (e) {} this._workletNode = null; }
        if (this.micCtx) { try { this.micCtx.close(); } catch (e) {} this.micCtx = null; }
        if (this.stream) { this.stream.getTracks().forEach(function (t) { t.stop(); }); this.stream = null; }
        this._stopPlayback();
        if (this.playCtx) { try { this.playCtx.close(); } catch (e) {} this.playCtx = null; }
    };

    VoiceRealtimeClient.prototype.stop = function () {
        this._closedByUser = true;
        if (this.ws) { try { this.ws.send(JSON.stringify({ type: 'stop' })); } catch (e) {} try { this.ws.close(); } catch (e) {} this.ws = null; }
        this._teardownMedia();
        this._setState('idle');
    };

    window.NuxVoiceRealtime = VoiceRealtimeClient;
})();
