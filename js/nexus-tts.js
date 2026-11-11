(function () {
    'use strict';

    const TTS_VERSION = '1.0.0';
    const defaults = {
        storeKey: 'nexus-tts-voice',
        prefer: 'web',
        endpoint: '',
        requestor: null,
        lang: 'zh-CN',
        rate: 0.95,
        pitch: 1.05,
        maxLen: 300,
        volume: 0.95
    };
    let seq = 0;
    let audio = null;
    let stateValue = 'idle';
    const stateCbs = [];

    function setState(s) {
        if (stateValue === s) return;
        stateValue = s;
        stateCbs.forEach((fn) => { try { fn(s); } catch (e) {} });
    }

    function config(patch) {
        Object.assign(defaults, patch || {});
        return {
            storeKey: defaults.storeKey, prefer: defaults.prefer, endpoint: defaults.endpoint,
            requestor: defaults.requestor, lang: defaults.lang, rate: defaults.rate,
            pitch: defaults.pitch, maxLen: defaults.maxLen, volume: defaults.volume
        };
    }

    function enabled() {
        try { return localStorage.getItem(defaults.storeKey) !== 'off'; } catch (e) { return true; }
    }

    function setEnabled(on) {
        try { localStorage.setItem(defaults.storeKey, on ? 'on' : 'off'); } catch (e) {}
        if (!on) stop();
    }

    function supported() {
        try { return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); } catch (e) { return false; }
    }

    function isSpeaking() {
        if (audio && !audio.paused) return true;
        try { return !!(window.speechSynthesis && speechSynthesis.speaking); } catch (e) { return false; }
    }

    function stop() {
        seq++;
        try { if (audio) { audio.pause(); audio.src = ''; } } catch (e) {}
        audio = null;
        try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
        setState('idle');
    }

    function onState(cb) {
        if (typeof cb === 'function') stateCbs.push(cb);
        return function off() {
            const i = stateCbs.indexOf(cb);
            if (i >= 0) stateCbs.splice(i, 1);
        };
    }

    function pickVoice(u) {
        const lang = String(u.lang || '').slice(0, 2).toLowerCase();
        const voices = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().indexOf(lang) === 0);
        if (voices.length) u.voice = voices[0];
    }

    function webSpeak(text, opts, mySeq) {
        if (!supported()) return false;
        try {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = opts.lang || defaults.lang;
            u.rate = opts.rate != null ? opts.rate : defaults.rate;
            u.pitch = opts.pitch != null ? opts.pitch : defaults.pitch;
            pickVoice(u);
            u.onend = function () { if (mySeq === seq) setState('idle'); };
            u.onerror = function () { if (mySeq === seq) setState('idle'); };
            setState('speaking');
            speechSynthesis.speak(u);
            return true;
        } catch (e) {
            setState('idle');
            return false;
        }
    }

    function defaultRequestor(endpoint, text) {
        const api = window.NexusApi ? new NexusApi() : null;
        if (!api) return Promise.reject(new Error('NexusTts: NexusApi 未加载'));
        return api.post(endpoint, { text: text }).then((res) => {
            const d = res && res.data;
            const url = (d && (d.url || d.audio_url)) || (res && res.url);
            if (!url) throw new Error('NexusTts: 响应缺少音频 url');
            return url;
        });
    }

    function serverSpeak(text, opts, mySeq) {
        const requestor = opts.requestor
            || (opts.endpoint ? (t) => defaultRequestor(opts.endpoint, t) : null);
        if (!requestor) return Promise.reject(new Error('NexusTts: 未配置 endpoint/requestor'));
        return Promise.resolve().then(() => requestor(text)).then((url) => {
            if (mySeq !== seq) return false;
            return new Promise((resolve, reject) => {
                audio = new Audio(url);
                audio.volume = opts.volume != null ? opts.volume : defaults.volume;
                audio.onended = function () { if (mySeq === seq) { audio = null; setState('idle'); } };
                audio.onerror = function () { if (mySeq === seq) { audio = null; setState('idle'); } reject(new Error('NexusTts: 音频播放失败')); };
                setState('speaking');
                audio.play().then(() => resolve(true)).catch((e) => {
                    audio = null;
                    setState('idle');
                    reject(e);
                });
            });
        });
    }

    // 双通道朗读：prefer='server' 先走服务端 TTS（音质优先，失败回退 web speech），
    // prefer='web'（默认）纯前端 speechSynthesis、失败时若有 endpoint 再回退服务端。
    // seq 守卫防止快速连播/打断后旧通道回写状态。
    function speak(text, opts) {
        const o = Object.assign({}, defaults, opts || {});
        const raw = String(text || '').trim();
        if (!raw) return Promise.resolve(false);
        if (!enabled()) return Promise.resolve(false);
        const mySeq = ++seq;
        const t = raw.slice(0, o.maxLen);
        const hasServer = !!(o.endpoint || o.requestor);
        const preferServer = hasServer && (o.prefer === 'server' || (o.prefer !== 'web' && !supported()));
        if (preferServer) {
            return serverSpeak(t, o, mySeq).catch(() => {
                if (mySeq !== seq) return false;
                return Promise.resolve(webSpeak(t, o, mySeq));
            });
        }
        if (webSpeak(t, o, mySeq)) return Promise.resolve(true);
        if (hasServer) return serverSpeak(t, o, mySeq).catch(() => false);
        return Promise.resolve(false);
    }

    window.NexusTts = {
        version: TTS_VERSION,
        config: config,
        speak: speak,
        stop: stop,
        enabled: enabled,
        setEnabled: setEnabled,
        supported: supported,
        isSpeaking: isSpeaking,
        onState: onState,
        get state() { return stateValue; }
    };
})();
