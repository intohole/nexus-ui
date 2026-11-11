import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const flush = () => new Promise((r) => setImmediate(r));

global.localStorage = {
    store: {},
    getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); }
};

class FakeUtterance {
    constructor(text) { this.text = text; this.lang = ''; this.rate = 1; this.pitch = 1; this.voice = null; this.onend = null; this.onerror = null; }
}

const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));
load('nexus-tts.js');
const T = window.NexusTts;

function installWeb(extra = {}) {
    global.SpeechSynthesisUtterance = FakeUtterance;
    window.speechSynthesis = Object.assign({
        speaking: false,
        pending: null,
        cancel() { this.speaking = false; this.pending = null; },
        speak(u) { this.pending = u; this.speaking = true; },
        getVoices() { return [{ lang: 'zh-CN', name: 't1' }, { lang: 'en-US', name: 't2' }]; }
    }, extra);
}

function installAudio(fireEndOnPlay) {
    global.Audio = class {
        constructor(url) { this.url = url; this.volume = 1; this.paused = true; }
        play() {
            this.paused = false;
            if (fireEndOnPlay) { this.paused = true; if (this.onended) this.onended(); }
            return Promise.resolve();
        }
        pause() { this.paused = true; }
    };
}

function cleanup() {
    delete window.speechSynthesis;
    delete global.SpeechSynthesisUtterance;
    delete global.Audio;
}

(async () => {
    check('version: 1.0.0', T.version === '1.0.0');
    check('supported: 无 speechSynthesis 为 false', T.supported() === false);
    check('speak: 无通道时 resolve false', await T.speak('你好') === false);
    check('speak: 空文本 resolve false', await T.speak('  ') === false);
    check('state: 初始 idle', T.state === 'idle');

    installWeb();
    check('supported: 挂载后 true', T.supported() === true);
    let spokenText = '';
    window.speechSynthesis.speak = function (u) { spokenText = u.text; this.pending = u; this.speaking = true; };
    check('speak: web 通道启动 true', await T.speak('你好世界') === true);
    check('speak: 完整文本入列', spokenText === '你好世界');
    check('isSpeaking: 播放中 true', T.isSpeaking() === true);
    check('state: speaking', T.state === 'speaking');
    const u = window.speechSynthesis.pending;
    u.onend();
    await flush();
    check('state: onend 收口 idle', T.state === 'idle');

    const u2 = new FakeUtterance('x');
    installWeb({ speak(uu) { setTimeout(() => { if (uu.onend) uu.onend(); }, 5); }, getVoices() { return [{ lang: 'zh-CN' }]; } });
    T.stop();
    check('stop: 幂等无异常且 idle', T.state === 'idle' && T.isSpeaking() === false);

    installWeb();
    T.setEnabled(false);
    check('setEnabled(false): speak resolve false', await T.speak('x') === false);
    T.setEnabled(true);
    check('setEnabled(true): 恢复可播', await T.speak('x') === true);

    spokenText = '';
    installWeb({ speak(u) { spokenText = u.text; this.pending = u; this.speaking = true; } });
    await T.speak('一二三四五', { maxLen: 3 });
    check('maxLen: 截断生效', spokenText === '一二三');
    T.stop();

    let states = [];
    const off = T.onState((s) => states.push(s));
    await T.speak('x');
    off();
    T.stop();
    check('onState: 订阅收到 speaking 且退订后不再收', states.indexOf('speaking') >= 0 && states.indexOf('idle') < 0);

    cleanup();
    let gotUrl = '';
    installAudio(true);
    const served = await T.speak('服务端朗读', { requestor: (t) => { gotUrl = t; return Promise.resolve('https://x/tts.mp3'); } });
    check('speak: server 通道（requestor）启动 true', served === true);
    check('server: 文本透传 requestor', gotUrl === '服务端朗读');
    await flush();
    check('server: onended 收口 idle', T.state === 'idle');

    cleanup();
    installWeb();
    const fallbacked = await T.speak('服务端失败回退', {
        prefer: 'server',
        requestor: () => Promise.reject(new Error('tts down'))
    });
    check('prefer=server: 失败回退 web true', fallbacked === true);
    check('prefer=server: 回退后 speaking', T.state === 'speaking');

    cleanup();
    installAudio(false);
    const webFailToServer = await T.speak('web 不可用转服务端', { requestor: () => Promise.resolve('https://x/a.mp3') });
    check('web 失败: 有 requestor 时回退 server true', webFailToServer === true);

    cleanup();
    installAudio(false);
    let stateSeen = '';
    T.onState((s) => { if (s === 'idle') stateSeen = s; });
    const stopRace = T.speak('打断', { requestor: () => new Promise((r) => setTimeout(() => r('https://x/b.mp3'), 5)) });
    T.stop();
    const raced = await stopRace;
    check('stop: 竞态旧通道不接管（resolve false/无 state 污染）', raced === false || T.state === 'idle');

    cleanup();
    installWeb();
    check('config: storeKey/prefer/endpoint 可配置', T.config({ storeKey: 'cb_voice', prefer: 'server', endpoint: '/api/voice/tts' }).endpoint === '/api/voice/tts'
        && T.enabled() === true);
    T.config({ storeKey: 'nexus-tts-voice', prefer: 'web', endpoint: '' });

    let pass = 0;
    for (const [name, ok] of results) {
        console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
        if (ok) pass++;
    }
    console.log(pass + '/' + results.length + ' passed');
    if (pass !== results.length) process.exit(1);
})();
