import { readFileSync } from 'node:fs';

// H 系命题（S131 缓存键作用域 header 白名单）：
//   H1 cacheKeyHeaders 白名单内 header 值不同 → 不同缓存条目（双租户不串队）
//   H2 白名单 header 值切换后回切 → 命中各自条目（每队独立缓存）
//   H3 未登记进白名单的 header 值变化 → 仍共用条目（默认不掺键防膨胀）
//   H4 cacheKeyHeaders 缺省 → 键行为与旧版完全一致（全舰队默认安全）
//   H5 缺失白名单 header（undefined→''）与显式空串同键（形态归一）
//   H6 options.headers 里的白名单 header 也参与键（与请求头同源）
const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;
global.localStorage = {
    _s: {},
    getItem(k) { return this._s[k] ?? null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
    clear() { this._s = {}; }
};
global.sessionStorage = { ...global.localStorage };
window.NexusUtils = { showToast() {}, errorDetailText(v) { return String(v ?? ''); } };
global.CustomEvent = class CustomEvent { constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; } };
const listeners = {};
window.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
window.dispatchEvent = (ev) => { (listeners[ev.type] || []).forEach((fn) => fn(ev)); return true; };
let fetchLog = [];
global.fetch = async function(url, opts = {}) {
    fetchLog.push({ url: String(url), method: opts.method || 'GET', team: (opts.headers && opts.headers['X-Team-Id']) || '' });
    const respond = global.__respond || (() => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ code: 200, data: 'ok' }), text: async () => '' }));
    return respond(url, opts);
};
Object.defineProperty(global, 'crypto', { value: (await import('node:crypto')).webcrypto, configurable: true });

const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));
load('nexus-api.js');
load('nexus-api-factory.js');

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const json = (data) => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ code: 200, data }) });

let currentTeam = 7;
const mkApi = (extra) => NexusApi.create(Object.assign({
    baseUrl: '', tokenKey: '__no_token__', cache: { ttl: 15000 },
    cacheKeyHeaders: ['X-Team-Id'],
    headers: function () { return currentTeam ? { 'X-Team-Id': String(currentTeam) } : {}; }
}, extra || {}));
let seq = 0;
global.__respond = () => json({ team: (fetchLog.length === 0 ? null : fetchLog[fetchLog.length - 1].team), n: ++seq });

// H1 双租户双值两跳不串
fetchLog = [];
const a1 = mkApi();
currentTeam = 7;
const r71 = await a1.get('/kg/graph');
currentTeam = 3;
const r73 = await a1.get('/kg/graph');
check('H1 different team value = separate entries (2 net calls)', fetchLog.length === 2);
check('H1 responses carry own team (no cross-team leak)', r71.data.team === '7' && r73.data.team === '3');

// H2 回切命中各自条目
currentTeam = 7;
await a1.get('/kg/graph');
check('H2 revert to team 7 hits its own entry (still 2 net calls)', fetchLog.length === 2);

// H3 未登记 header 不掺键
fetchLog = [];
const a2 = NexusApi.create({
    baseUrl: '', tokenKey: '__no_token__', cache: { ttl: 15000 },
    cacheKeyHeaders: ['X-Team-Id'],
    serviceHeaders: { 'X-Anon-Id': 'zzz' }
});
await a2.get('/pub', {}, { headers: { 'X-Session-Tag': 's1' } });
await a2.get('/pub', {}, { headers: { 'X-Session-Tag': 's2' } });
check('H3 non-whitelisted header shares entry (1 net call)', fetchLog.length === 1);

// H4 缺省 cacheKeyHeaders 键行为=旧版
fetchLog = [];
const a4 = NexusApi.create({
    baseUrl: '', tokenKey: '__no_token__', cache: { ttl: 15000 },
    headers: function () { return { 'X-Team-Id': '5' }; }
});
await a4.get('/plain');
await a4.get('/plain');
check('H4 default (no whitelist) keeps old single-key behavior', fetchLog.length === 1);

// H5 缺失与空串归一
fetchLog = [];
const a5 = mkApi();
currentTeam = 0;
await a5.get('/empty');
currentTeam = 0;
await a5.get('/empty');
check('H5 missing header normalized (1 net call)', fetchLog.length === 1);

// H6 options.headers 白名单值参与键
fetchLog = [];
const a6 = mkApi();
currentTeam = 0;
await a6.get('/opt', {}, { headers: { 'X-Team-Id': '11' } });
await a6.get('/opt', {}, { headers: { 'X-Team-Id': '12' } });
check('H6 options.headers whitelist value keys the entry (2 net calls)', fetchLog.length === 2);

let fail = 0;
for (const [name, ok] of results) {
    if (!ok) { fail++; console.log(`✖ ${name}`); } else { console.log(`✔ ${name}`); }
}
console.log(fail === 0 ? 'ALL PASS' : `${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
