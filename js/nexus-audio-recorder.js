(function () {
    'use strict';

    const REC_VERSION = '1.0.0';
    const DEFAULT_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

    function pickMime(mimes) {
        if (typeof MediaRecorder === 'undefined') return '';
        const list = (mimes && mimes.length) ? mimes : DEFAULT_MIMES;
        for (let i = 0; i < list.length; i++) {
            try { if (MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch (e) {}
        }
        return '';
    }

    function mimeExt(mime) {
        return String(mime || '').indexOf('mp4') > -1 ? '.mp4' : '.webm';
    }

    function isSupported() {
        try {
            return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia
                && typeof MediaRecorder !== 'undefined' && pickMime());
        } catch (e) { return false; }
    }

    // headless 录音+波形原语：MediaRecorder（mime 探测）+ AnalyserNode 能量帧回调 +
    // 时长上限自动停 + 放弃语义 + seq 守卫（快速 start/stop/destroy 竞态旧回调作废）。
    // 与 NexusTts 同定位：不设 UI 不设 css，波形渲染由消费方在 onFrame 里自行驱动。
    function create(opts) {
        const o = Object.assign({
            maxSecs: 300,
            mimes: null,
            fftSize: 64,
            frameIntervalMs: 66,
            onFrame: null,
            onStop: null,
            onError: null
        }, opts || {});

        let stateValue = 'idle'; // idle | starting | recording | processing
        let seq = 0;
        let stream = null;
        let recorder = null;
        let chunks = [];
        let mime = '';
        let audioCtx = null;
        let analyser = null;
        let rafId = null;
        let lastFrame = 0;
        let timer = null;
        let secs = 0;
        let startTs = 0;
        let discardNext = false;
        let stopPending = false;

        function state(s) { stateValue = s; }

        function stopWave() {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; analyser = null; }
        }

        function clearTimer() {
            if (timer) { clearInterval(timer); timer = null; }
        }

        function teardown() {
            clearTimer();
            stopWave();
            if (stream && stream.getTracks) {
                try { stream.getTracks().forEach((t) => { t.stop(); }); } catch (e) {}
            }
            stream = null;
            recorder = null;
            chunks = [];
        }

        function frameTick() {
            rafId = null;
            if (stateValue !== 'recording' || !analyser) return;
            const now = Date.now();
            if (now - lastFrame >= o.frameIntervalMs) {
                lastFrame = now;
                try {
                    const data = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(data);
                    const bars = new Float32Array(data.length);
                    for (let i = 0; i < data.length; i++) bars[i] = data[i] / 255;
                    if (typeof o.onFrame === 'function') o.onFrame(bars);
                } catch (e) { stopWave(); }
            }
            rafId = requestAnimationFrame(frameTick);
        }

        function finish(mySeq) {
            const blob = new Blob(chunks, { type: mime.indexOf('mp4') > -1 ? 'audio/mp4' : 'audio/webm' });
            const durationMs = Date.now() - startTs;
            const discarded = discardNext;
            discardNext = false;
            teardown();
            state('idle');
            if (mySeq !== seq) return;
            if (typeof o.onStop === 'function') {
                o.onStop({ blob: blob, ext: mimeExt(mime), durationMs: durationMs, discarded: discarded });
            }
        }

        function start() {
            if (stateValue === 'starting' || stateValue === 'recording' || stateValue === 'processing') {
                return Promise.reject(new Error('NexusAudioRecorder: 上一段录音尚未结束'));
            }
            if (!isSupported()) {
                return Promise.reject({ name: 'NotSupportedError', message: '这台设备不支持录音' });
            }
            const mySeq = ++seq;
            mime = pickMime(o.mimes);
            if (!mime) {
                state('idle');
                const err = { name: 'NotSupportedError', message: '这台设备不支持录音' };
                if (typeof o.onError === 'function') o.onError(err);
                return Promise.reject(err);
            }
            stopPending = false;
            state('starting');
            return navigator.mediaDevices.getUserMedia({ audio: true }).then((mediaStream) => {
                if (mySeq !== seq) {
                    try { mediaStream.getTracks().forEach((t) => { t.stop(); }); } catch (e) {}
                    return;
                }
                if (stopPending) {
                    try { mediaStream.getTracks().forEach((t) => { t.stop(); }); } catch (e) {}
                    state('idle');
                    return;
                }
                stream = mediaStream;
                chunks = [];
                discardNext = false;
                recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
                recorder.ondataavailable = function (e) {
                    if (e.data && e.data.size) chunks.push(e.data);
                };
                recorder.onstop = function () { finish(mySeq); };
                recorder.start();
                startTs = Date.now();
                secs = 0;
                state('recording');
                try {
                    const AC = window.AudioContext || window.webkitAudioContext;
                    audioCtx = new AC();
                    const src = audioCtx.createMediaStreamSource(stream);
                    analyser = audioCtx.createAnalyser();
                    analyser.fftSize = o.fftSize;
                    src.connect(analyser);
                    lastFrame = 0;
                    rafId = requestAnimationFrame(frameTick);
                } catch (e) { stopWave(); }
                timer = setInterval(function () {
                    secs += 1;
                    if (secs >= o.maxSecs) stop();
                }, 1000);
            }).catch((err) => {
                if (mySeq !== seq) return;
                teardown();
                state('idle');
                if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.name === 'NotFoundError')) {
                    err = { name: 'NotAllowedError', message: '拿不到麦克风，检查一下授权' };
                }
                if (typeof o.onError === 'function') o.onError(err);
                throw err;
            });
        }

        function stop(discard) {
            if (stateValue === 'starting') { stopPending = true; return; }
            if (stateValue !== 'recording') return;
            discardNext = !!discard;
            clearTimer();
            try {
                if (recorder && recorder.state !== 'inactive') recorder.stop();
                else finish(seq);
            } catch (e) { finish(seq); }
        }

        function destroy() {
            seq++;
            stopPending = false;
            discardNext = false;
            try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch (e) {}
            teardown();
            state('idle');
        }

        return {
            start: start,
            stop: stop,
            destroy: destroy,
            get state() { return stateValue; },
            get secs() { return secs; },
            get mime() { return mime; },
            get ext() { return mimeExt(mime); }
        };
    }

    window.NexusAudioRecorder = {
        version: REC_VERSION,
        isSupported: isSupported,
        pickMime: pickMime,
        mimeExt: mimeExt,
        create: create
    };
})();
