import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const flush = () => new Promise((r) => setImmediate(r));

const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));
load('nexus-audio-recorder.js');
const R = window.NexusAudioRecorder;

class FakeStream {
    constructor() { this._stopped = false; }
    getTracks() {
        const self = this;
        return [{ stop() { self._stopped = true; } }];
    }
}

class FakeMediaRecorder {
    constructor(stream, opts) {
        this.stream = stream;
        this.mimeType = opts && opts.mimeType;
        this.state = 'inactive';
        this.ondataavailable = null;
        this.onstop = null;
        FakeMediaRecorder.instances.push(this);
    }
    static isTypeSupported(m) { return FakeMediaRecorder.supported.indexOf(m) > -1; }
    start() { this.state = 'recording'; }
    stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        if (this.ondataavailable) this.ondataavailable({ data: { size: 1024 } });
        if (this.onstop) this.onstop();
    }
}
FakeMediaRecorder.instances = [];
FakeMediaRecorder.supported = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

class FakeAnalyser {
    constructor() { this.fftSize = 0; this.frequencyBinCount = 16; }
    getByteFrequencyData(arr) { arr.fill(204); }
}

class FakeAudioContext {
    constructor() { this.closed = false; }
    createMediaStreamSource() { return { connect() {} }; }
    createAnalyser() { return new FakeAnalyser(); }
    close() { this.closed = true; }
}

let rafCbs = [];
global.requestAnimationFrame = (cb) => { rafCbs.push(cb); return rafCbs.length; };
global.cancelAnimationFrame = () => { rafCbs = []; };
function pumpFrame() {
    const cbs = rafCbs;
    rafCbs = [];
    cbs.forEach((cb) => cb());
}

function install(opts = {}) {
    global.MediaRecorder = FakeMediaRecorder;
    FakeMediaRecorder.instances = [];
    FakeMediaRecorder.supported = opts.mimes || ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    global.AudioContext = FakeAudioContext;
    if (opts.ctxThrows) global.AudioContext = function () { throw new Error('no audio ctx'); };
    let stream = new FakeStream();
    global.navigator.mediaDevices = {
        getUserMedia() {
            if (opts.deny) return Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
            if (opts.hang) return new Promise(() => {});
            stream = new FakeStream();
            return Promise.resolve(stream);
        }
    };
    return { get stream() { return stream; } };
}

function cleanup() {
    delete global.MediaRecorder;
    delete global.AudioContext;
    delete global.navigator.mediaDevices;
    rafCbs = [];
}

(async () => {
    check('version: 1.0.0', R.version === '1.0.0');
    check('isSupported: 无 navigator.mediaDevices 为 false', R.isSupported() === false);
    check('pickMime: 无 MediaRecorder 返回空', R.pickMime() === '');

    install();
    check('isSupported: 挂载后 true', R.isSupported() === true);
    check('pickMime: 探测命中首个支持项', R.pickMime() === 'audio/webm;codecs=opus');
    check('mimeExt: webm→.webm', R.mimeExt('audio/webm') === '.webm');
    check('mimeExt: mp4→.mp4', R.mimeExt('audio/mp4') === '.mp4');
    check('mimeExt: 空串→.webm 兜底', R.mimeExt('') === '.webm');

    const rec1 = R.create();
    let frameBars = null;
    rec1.start();
    await flush();
    check('start: 进入 recording', rec1.state === 'recording');
    rec1.destroy();
    check('destroy: 回 idle 可复用', rec1.state === 'idle');

    const recF = R.create({ frameIntervalMs: 0, onFrame: (b) => { frameBars = b; } });
    await recF.start();
    pumpFrame();
    check('onFrame: 收到 0-1 归一化能量数组', !!frameBars && frameBars.length === 16 && frameBars[0] > 0.7 && frameBars[0] <= 1);
    let stop1 = null;
    recF.stop();
    await flush();
    check('stop: 回 idle', recF.state === 'idle');

    const recR = R.create({ onStop: (x) => { stop1 = x; } });
    await recR.start();
    recR.stop();
    await flush();
    check('stop: 结果含 blob/.webm/durationMs/discarded=false', !!stop1 && !!stop1.blob && stop1.ext === '.webm' && stop1.durationMs >= 0 && stop1.discarded === false);
    check('stop 后可复用 start（复用实例）', (() => { recR.start(); return true; })());
    await flush();
    check('复用 start: 回到 recording', recR.state === 'recording');
    recR.destroy();
    await flush();

    const recD = R.create();
    let discardedSeen = null;
    await recD.start();
    recD.destroy();
    const recD2 = R.create({ onStop: (x) => { discardedSeen = x.discarded; } });
    await recD2.start();
    recD2.stop(true);
    await flush();
    check('stop(discard): discarded 标志透传', discardedSeen === true);
    recD2.destroy();

    install({ deny: true });
    const recG = R.create();
    let rejected = null;
    let errMsg = '';
    recG.start().catch((e) => { rejected = e; });
    await flush();
    check('授权拒绝: start reject', rejected !== null);
    await recG.start().catch((e) => { errMsg = e && e.message; });
    check('授权拒绝: reject 带中文文案', String(errMsg).indexOf('麦克风') > -1);

    install({ ctxThrows: true });
    const recW = R.create();
    let waveFailed = true;
    await recW.start().then(() => { waveFailed = false; });
    check('波形失败: 不影响录音进入 recording', waveFailed === false && recW.state === 'recording');
    recW.stop();
    await flush();
    recW.destroy();

    install({ hang: true });
    const recH = R.create();
    recH.start();
    recH.stop();
    check('starting 竞态: 挂起期 stop 不炸', recH.state === 'starting');
    recH.destroy();
    check('starting 竞态: destroy 后 idle', recH.state === 'idle');

    install();
    const rec2 = R.create();
    await rec2.start();
    let doubleErr = null;
    rec2.start().catch((e) => { doubleErr = e; });
    await flush();
    check('二次 start: 拒绝且不影响进行中录音', doubleErr !== null && rec2.state === 'recording');
    let onStopFired = false;
    rec2.destroy();
    await flush();
    check('destroy: onStop 不触发（seq 作废）', onStopFired === false && rec2.state === 'idle');

    install({ mimes: ['audio/mp4'] });
    const recM = R.create();
    await recM.start();
    check('mime: mp4-only 环境探测命中且 ext=.mp4', recM.ext === '.mp4' && recM.mime === 'audio/mp4');
    let extSeen = '';
    const recM2 = R.create({ onStop: (x) => { extSeen = x.ext; } });
    await recM2.start();
    recM2.stop();
    await flush();
    check('stop: 结果 ext=.mp4', extSeen === '.mp4');
    recM.destroy();
    recM2.destroy();

    install({ mimes: [] });
    check('isSupported: 无可用 mime 为 false', R.isSupported() === false);
    const recE = R.create();
    let emptyErr = null;
    recE.start().catch((e) => { emptyErr = e; });
    await flush();
    check('mime 全不命中: start reject NotSupported', emptyErr !== null && emptyErr.name === 'NotSupportedError');
    recE.destroy();

    cleanup();
    check('isSupported: 卸载后 false', R.isSupported() === false);

    let pass = 0;
    for (const [name, ok] of results) {
        console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
        if (ok) pass++;
    }
    console.log(pass + '/' + results.length + ' passed');
    if (pass !== results.length) process.exit(1);
})();
