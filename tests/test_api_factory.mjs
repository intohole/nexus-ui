import { readFileSync } from 'node:fs';

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
window.NexusUtils = {
    showToast() {},
    errorDetailText(v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v;
        if (Array.isArray(v)) return v.join('；');
        if (typeof v === 'object') return v.message || v.detail || v.msg || v.error || '';
        return String(v);
    }
};
global.CustomEvent = class CustomEvent { constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; } };
const listeners = {};
window.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
window.dispatchEvent = (ev) => { (listeners[ev.type] || []).forEach((fn) => fn(ev)); return true; };
let fetchLog = [];
global.fetch = async function(url, opts = {}) {
    fetchLog.push({ url: String(url), method: opts.method || 'GET', headers: opts.headers || {}, body: opts.body });
    const respond = global.__respond || (() => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ code: 200, data: 'ok' }), text: async () => '' }));
    return respond(url, opts);
};
Object.defineProperty(global, 'crypto', { value: (await import('node:crypto')).webcrypto, configurable: true });

const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));
load('nexus-api-error.js');
load('nexus-api.js');
load('nexus-api-factory.js');

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

// 1. unwrap code200 成功解包
global.__respond = () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ code: 200, data: { id: 7 }, message: 'ok' }) });
const api1 = NexusApi.create({ baseUrl: '', tokenKey: '__no_token__', unwrap: 'code200' });
check('code200 unwrap returns data', (await api1.get('/x')) .id === 7);

// 2. code200 非 200 抛 ApiError 带 code
global.__respond = () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ code: 40401, message: '不存在' }) });
try { await api1.get('/x'); check('code200 throws on non-200', false); }
catch (e) { check('code200 throws on non-200', e.status === 200 && e.code === '40401' && e.message === '不存在'); }

// 3. dataOrRes
global.__respond = () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ data: [1, 2] }) });
const api2 = NexusApi.create({ baseUrl: '', unwrap: 'dataOrRes' });
check('dataOrRes unwraps', JSON.stringify(await api2.get('/x')) === '[1,2]');
global.__respond = () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ plain: true }) });
check('dataOrRes passthrough', (await api2.get('/x')).plain === true);

// 4. unwrap fn
global.__respond = () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ v: 9 }) });
const api3 = NexusApi.create({ baseUrl: '', unwrap: (d) => d.v });
check('unwrap fn adapter', (await api3.get('/x')) === 9);

// 5. unauthorized 预设：clearKeys + event + redirect
localStorage.setItem('extra_key', '1');
let fired = null;
window.addEventListener('auth-kick', () => { fired = 'yes'; });
const api4 = NexusApi.create({
    baseUrl: '', tokenKey: 'uc_access_token', refreshTokenKey: 'uc_refresh_token',
    unauthorized: { clearKeys: ['extra_key'], event: 'auth-kick' }
});
global.__respond = () => ({ ok: false, status: 401, headers: { get: () => 'application/json' }, json: async () => ({ detail: 'expired' }) });
try { await api4.get('/x'); } catch (e) {}
check('unauthorized clears extra keys', localStorage.getItem('extra_key') === null);
check('unauthorized clears token', localStorage.getItem('uc_access_token') === null);
check('unauthorized fires event', fired === 'yes');

// 6. methods 声明式 + fn 形态 this 绑定
global.__respond = (url) => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ url: String(url) }) });
const api5 = NexusApi.create({
    baseUrl: '', unwrap: 'raw',
    methods: {
        listBooks: ['GET', '/books'],
        createBook: ['POST', '/books'],
        updateBook: ['PUT', '/books'],
        delBook: ['DELETE', '/books'],
        patchBook: ['PATCH', '/books'],
        customSearch(kw) { return this.get('/search', { kw }); }
    }
});
const r1 = await api5.listBooks({ page: 2 });
check('methods GET', r1.url.includes('/books?page=2'));
const r2 = await api5.createBook({ t: 1 });
check('methods POST ok', r2.url.includes('/books'));
const postLog = fetchLog.filter((l) => l.method === 'POST').pop();
check('methods POST body', JSON.parse(postLog.body).t === 1);
check('methods fn this-bind', (await api5.customSearch('x')).url.includes('kw=x'));
await api5.patchBook({});
check('methods patch', fetchLog[fetchLog.length - 1].method === 'PATCH');

// 7. cache：TTL 命中、fresh 跳过、写失效、并发去重、invalidateCache
fetchLog = [];
let n = 0;
global.__respond = () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ code: 200, data: ++n }) });
const api6 = NexusApi.create({ baseUrl: '', unwrap: 'code200', cache: { ttl: 15000 } });
const [a, b] = await Promise.all([api6.get('/stat'), api6.get('/stat')]);
check('cache pending dedup', a === 1 && b === 1 && fetchLog.length === 1);
check('cache hit within ttl', (await api6.get('/stat')) === 1 && fetchLog.length === 1);
check('cache fresh bypasses', (await api6.get('/stat', {}, { fresh: true })) === 2 && fetchLog.length === 2);
await api6.post('/stat', {});
check('write invalidates cache', (await api6.get('/stat')) === 4 && fetchLog.length === 4);
api6.invalidateCache('nothing');
check('invalidateCache prefix no-op', (await api6.get('/stat')) === 4);

// 7b. code200 对 HTTP 非 ok 响应放行给 request 的 401/错误分支
const api9 = NexusApi.create({ baseUrl: '', unwrap: 'code200' });
global.__respond = () => ({ ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({ code: 500, message: '服务器内部错误' }) });
try { await api9.get('/x'); check('code200 non-ok not swallowed by adapter', false); }
catch (e) { check('code200 non-ok not swallowed by adapter', e.status === 500 && e.message === '服务器内部错误'); }

// 8. headerBuilder 动态头
global.__respond = () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ ok: 1 }) });
let teamId = 't1';
const api7 = NexusApi.create({ baseUrl: '', tokenKey: 'uc_access_token', headers: () => ({ 'X-Team-Id': teamId }) });
localStorage.setItem('uc_access_token', 'tok');
fetchLog = [];
await api7.get('/x');
check('headerBuilder dynamic', fetchLog[0].headers['X-Team-Id'] === 't1' && fetchLog[0].headers['Authorization'] === 'Bearer tok');
teamId = 't2';
await api7.get('/x');
check('headerBuilder re-evaluated', fetchLog[1].headers['X-Team-Id'] === 't2');

// 9. 默认行为零变化：new NexusApi 无缓存无钩子
fetchLog = [];
const api8 = new NexusApi({ baseUrl: '' });
await api8.get('/y');
await api8.get('/y');
check('default: no cache branches', fetchLog.length === 2);
check('default: default baseUrl pattern', typeof api8.baseUrl === 'string');

// 10. 未知预设报错
try { NexusApi.create({ unwrap: 'nope' }); check('unknown preset throws', false); }
catch (e) { check('unknown preset throws', String(e.message).includes('nope')); }

let fail = 0;
for (const [name, ok] of results) { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); }
console.log(`\n${results.length - fail}/${results.length} passed`);
process.exit(fail ? 1 : 0);
