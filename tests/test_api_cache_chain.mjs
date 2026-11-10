import { readFileSync } from 'node:fs';

// 缓存行为链四命题（前9 全舰队铺开轮守底）：
//   C1 ttl>0 时同 URL GET 在 TTL 窗口内只打一次网络
//   C2 写后全清：POST 成功后同实例 GET 必打网络（:306 防线）
//   C3 skipCache GET 恒打网络（轮询防护，F1 纪律）
//   C4 ttl 缺省=0 时行为不变（全舰队默认安全，S49 判定表）
//   C5 不同 params 不同缓存键
//   C6 invalidateCache(prefix) 定向失效
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
    fetchLog.push({ url: String(url), method: opts.method || 'GET' });
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
global.__respond = () => json({ n: fetchLog.length });

// C1 同 URL 双 GET → 1 次网络
fetchLog = [];
const api = NexusApi.create({ baseUrl: '', tokenKey: '__no_token__', cache: { ttl: 15000 } });
await api.get('/list');
await api.get('/list');
check('C1 two GETs within ttl = 1 network call', fetchLog.length === 1);

// C2 写后全清：POST 后同 URL GET 再打网络
fetchLog = [];
const api2 = NexusApi.create({ baseUrl: '', tokenKey: '__no_token__', cache: { ttl: 15000 } });
await api2.get('/items');
await api2.post('/items', { title: 'x' });
await api2.get('/items');
check('C2 GET,POST,GET = 2 network calls (write clears cache)', fetchLog.filter(f => f.method === 'GET').length === 2);

// C3 skipCache GET 恒打网络
fetchLog = [];
const api3 = NexusApi.create({ baseUrl: '', tokenKey: '__no_token__', cache: { ttl: 15000 } });
await api3.get('/task/1', {}, { skipCache: true });
await api3.get('/task/1', {}, { skipCache: true });
check('C3 skipCache GETs always hit network', fetchLog.length === 2);

// C4 缺省 ttl=0 行为不变：双 GET 两网络
fetchLog = [];
const api4 = NexusApi.create({ baseUrl: '', tokenKey: '__no_token__' });
await api4.get('/list');
await api4.get('/list');
check('C4 no cache config = 2 network calls (default off)', fetchLog.length === 2);

// C5 不同 params 不同键
fetchLog = [];
const api5 = NexusApi.create({ baseUrl: '', tokenKey: '__no_token__', cache: { ttl: 15000 } });
await api5.get('/items', { page: 1 });
await api5.get('/items', { page: 2 });
await api5.get('/items', { page: 1 });
check('C5 different params = different keys (2 calls)', fetchLog.length === 2);

// C6 invalidateCache(prefix) 定向失效
fetchLog = [];
const api6 = NexusApi.create({ baseUrl: '', tokenKey: '__no_token__', cache: { ttl: 15000 } });
await api6.get('/research/tasks/1');
await api6.get('/docs/list');
api6.invalidateCache('/research/');
await api6.get('/research/tasks/1');
check('C6 invalidateCache(prefix) clears matching only (3 calls)', fetchLog.length === 3);

// C7 fresh 选项绕缓存
fetchLog = [];
const api7 = NexusApi.create({ baseUrl: '', tokenKey: '__no_token__', cache: { ttl: 15000 } });
await api7.get('/list');
await api7.get('/list', {}, { fresh: true });
check('C7 fresh option bypasses cache (2 calls)', fetchLog.length === 2);

let fail = 0;
for (const [name, ok] of results) { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); }
console.log(`\n${results.length - fail}/${results.length} passed`);
process.exit(fail ? 1 : 0);
