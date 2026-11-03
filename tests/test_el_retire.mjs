// r156 守底：element-plus 退役启动三件——toast 常驻/onClick、utils 透传、SDK 引导缓存。
// 撤守卫必红：常驻分支、onClick 接线、cacheTtl 默认 0 纪律任一被删即 fail。
import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;
const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));

// ---- localStorage stub（SDK 缓存行为测试）----
const store = new Map();
global.window.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
};
global.window.sessionStorage = { getItem: () => null };
global.document = { cookie: '', getElementsByTagName: () => [] };
global.location = { hostname: 'localhost', origin: 'http://localhost', search: '' };

load('user-center-sdk.js');
const SDK = window.UserCenterSDK;
check('sdk: UserCenterSDK 导出在位', typeof SDK === 'function');

// 行为级：缓存写→读往返（同 URL、TTL 内）
{
    const url = '/api/v1/client/config';
    SDK._writeBootCache(url, { user_center: { base_url: 'https://uc.example.com', app_key: 'k1' } });
    const hit = SDK._readBootCache(url, 600000);
    check('cache: 写读往返命中', hit && hit.user_center && hit.user_center.base_url === 'https://uc.example.com');
}
// 行为级：URL 不同键隔离（多应用同 origin 共存）
{
    const miss = SDK._readBootCache('/other/app/api/config', 600000);
    check('cache: 不同 configUrl 键隔离不命中', miss === null);
}
// 行为级：TTL 过期失效（ts 回拨到 TTL 之外）
{
    const url = '/api/v1/client/config';
    const key = SDK._bootCacheKey(url);
    const entry = JSON.parse(store.get(key));
    entry.ts = Date.now() - 601000;
    store.set(key, JSON.stringify(entry));
    check('cache: TTL 过期不命中', SDK._readBootCache(url, 600000) === null);
}
// 行为级：坏 JSON 静默返回 null（fail-open）
{
    store.set(SDK._bootCacheKey('/broken'), '{not-json');
    check('cache: 坏 JSON 静默 miss', SDK._readBootCache('/broken', 600000) === null);
}
// 行为级：bootstrap 默认不缓存（cacheTtl 缺省 → 走 fetch 路径，无缓存键写入）
{
    global.fetch = async () => ({ json: async () => ({ user_center: { base_url: 'https://uc2.example.com' } }) });
    const boot = SDK.bootstrap({ configUrl: '/fresh/path/config' });
    await boot.ready;
    check('boot: 默认 ttl=0 拉取并应用 baseUrl', SDK._bootCacheKey('/fresh/path/config').length > 0 && !store.has(SDK._bootCacheKey('/fresh/path/config')));
    check('boot: ready 后 baseUrl 已应用', String(boot.sdk.baseUrl).indexOf('uc2.example.com') > -1);
}
// 行为级：cacheTtl 显式传参 → 首拉写入缓存，二次 bootstrap 直接命中（fetch 计数不再增长）
{
    let fetchCount = 0;
    global.fetch = async () => { fetchCount += 1; return { json: async () => ({ user_center: { base_url: 'https://uc3.example.com', app_key: 'k3' } }) }; };
    const b1 = SDK.bootstrap({ configUrl: '/cached/path/config', cacheTtl: 600000 });
    await b1.ready;
    const b2 = SDK.bootstrap({ configUrl: '/cached/path/config', cacheTtl: 600000 });
    await b2.ready;
    check('boot: cacheTtl 写入缓存', store.has(SDK._bootCacheKey('/cached/path/config')));
    check('boot: 二次命中零请求', fetchCount === 1);
    check('boot: 缓存命中同样应用 baseUrl', String(b2.sdk.baseUrl).indexOf('uc3.example.com') > -1);
}

// 源码契约：toast 常驻分支与 onClick 接线在位（撤守卫必红）
{
    const host = readFileSync(ROOT + 'nexus-overlay-host.js', 'utf8');
    check('toast: duration=0 常驻守卫在位', /ttl > 0 \? setTimeout/.test(host));
    check('toast: pickDuration 放行 0', /if \(typeof value === 'number'\) return value;/.test(host));
    check('toast: onClick 回调接线在位', /onClick\(item\)/.test(host));
}
// 源码契约：utils 层透传不吞 0 / onClick
{
    const interact = readFileSync(ROOT + 'utils/nexus-utils-interact.js', 'utf8');
    check('utils: duration 缺省才给 3000（0 可透传）', /opts\.duration !== undefined \? opts\.duration : 3000/.test(interact));
    check('utils: onClick 透传在位', /payload\.onClick = opts\.onClick/.test(interact));
}
// 源码契约：SDK 缓存纪律——默认 0 不缓存
{
    const sdkSrc = readFileSync(ROOT + 'user-center-sdk.js', 'utf8');
    check('sdk: cacheTtl 默认 0 纪律在位', /Number\(opts\.cacheTtl\) > 0 \? Number\(opts\.cacheTtl\) : 0/.test(sdkSrc));
}

let fail = 0;
for (const [name, ok] of results) { if (!ok) { fail += 1; console.log('FAIL ' + name); } }
console.log(`test_el_retire: ${results.length - fail}/${results.length} passed`);
if (fail > 0) process.exit(1);
