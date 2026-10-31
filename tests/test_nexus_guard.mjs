import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/core/', import.meta.url).pathname;
const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

const listeners = {};
global.window = {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    location: { pathname: '/t' }
};
global.document = { readyState: 'complete', addEventListener() {} };
const consoleLog = { error: [], warn: [] };
global.console = { ...console, error: (...a) => consoleLog.error.push(a), warn: (...a) => consoleLog.warn.push(a) };

const reports = [];
const toasts = [];
window.NexusApp = { notify: (m, t) => toasts.push([m, t]) };
window.NexusErrorText = {
    fromError: () => ({ title: '网络异常', message: '' }),
    safeMessage: (s) => String(s).slice(0, 40)
};

const fire = (type, evt) => (listeners[type] || []).forEach(fn => fn(evt));

{
    eval(readFileSync(ROOT + 'nexus-guard.js', 'utf-8'));
    check('加载即安装且幂等单监听', (listeners.error || []).length === 1 && (listeners.unhandledrejection || []).length === 1);
    window.NexusGuard.install();
    check('重复 install 不重复绑监听', (listeners.error || []).length === 1);
}

{
    consoleLog.error.length = 0; toasts.length = 0;
    window.NexusGuard.onReport = (e) => reports.push(e);
    fire('error', { message: 'boom is not defined', error: new ReferenceError('boom is not defined') });
    check('运行时异常→console.error 保留', consoleLog.error.length === 1 && String(consoleLog.error[0][1]).includes('boom'));
    check('运行时异常→人话 toast 出现', toasts.length === 1 && toasts[0][1] === 'error');
    check('上报钩子收到条目', reports.length === 1 && reports[0].kind === 'js' && reports[0].stack.includes('ReferenceError'));
}

{
    toasts.length = 0;
    fire('error', { message: 'boom again', error: new ReferenceError('boom is not defined') });
    check('同源异常 60s 节流不打扰', toasts.length === 0);
    fire('error', { message: 'different', error: new TypeError('Cannot read props') });
    check('不同源异常仍 toast', toasts.length === 1);
}

{
    consoleLog.warn.length = 0; toasts.length = 0;
    fire('error', { target: { tagName: 'IMG', src: 'https://x/broken.png' } });
    check('资源错误→console.warn 不打扰用户', consoleLog.warn.length === 1 && toasts.length === 0);
    check('资源错误上报 kind=resource', reports[reports.length - 1].kind === 'resource' && reports[reports.length - 1].tag === 'IMG');
}

{
    toasts.length = 0;
    const streamErr = new Error('s down'); streamErr.name = 'NexusStreamError'; streamErr.__nxHandled = true;
    fire('unhandledrejection', { reason: streamErr });
    const r401 = new Error('unauth'); r401.status = 401; r401.__nxHandled = true;
    fire('unhandledrejection', { reason: r401 });
    fire('unhandledrejection', { reason: Object.assign(new Error('abort'), { name: 'AbortError' }) });
    check('NexusStreamError/401/AbortError 三豁免通道零双 toast', toasts.length === 0);
}

{
    toasts.length = 0; consoleLog.error.length = 0;
    fire('unhandledrejection', { reason: new TypeError('async blew') });
    check('非 401 未捕获 promise→兜底 toast', toasts.length === 1);
    check('promise 异常 console.error 保留', consoleLog.error.length === 1);
    const r = reports[reports.length - 1];
    check('promise 上报 kind=promise', r.kind === 'promise');
}

{
    toasts.length = 0;
    fire('unhandledrejection', { reason: '纯字符串 reject' });
    check('字符串 reason 也兜底', toasts.length === 1);
}

let pass = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
    if (ok) pass++;
}
console.log(pass + '/' + results.length + ' passed');
process.exit(pass === results.length ? 0 : 1);
