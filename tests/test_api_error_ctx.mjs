// 错误文案 ctx 通道守底（收归轮）：三模式判定链 + mapDetail 单源 + 五仓金样表 + 存量兼容。
// 撤守卫必红：任一模式被删/顺序被打乱/translate 钩子失联，对应仓金样即 fail。
import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;
const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));

// ---- 最小 DOM 桩（nexus-utils 载入期触碰面，参照 test_el_retire 惯例）----
const store = new Map();
global.window.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
global.window.sessionStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { } };
const noop = () => { };
global.window.addEventListener = noop;
global.window.removeEventListener = noop;
global.window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop });
global.document = { cookie: '', getElementsByTagName: () => [], addEventListener: noop, removeEventListener: noop, documentElement: { style: { setProperty: noop, overflow: '' } }, createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop, addEventListener: noop }), head: { appendChild: noop }, body: { appendChild: noop, classList: { add: noop, remove: noop, toggle: noop, contains: () => false } } };
global.location = { hostname: 'localhost', origin: 'http://localhost', search: '', href: 'http://localhost/' };

load('nexus-utils.js');
load('nexus-api-error.js');
const mapHttpError = window.mapHttpError;
const mapDetail = window.mapDetail;
const NE = window.NexusApiError;
check('装载: NexusUtils.errorDetailText 在场', typeof window.NexusUtils?.errorDetailText === 'function');
check('装载: mapHttpError/mapDetail 全局导出', typeof mapHttpError === 'function' && typeof mapDetail === 'function');

// ---- 存量兼容金样（LifeCompass/promptManager/challengePlanet 形态：只传 {status: 文案}）----
check('存量: ctx[402] 覆写', mapHttpError(new NE('x', 402), { 402: '积分不足' }) === '积分不足');
check('存量: 500 默认映射', mapHttpError(new NE('x', 500)) === '服务器开小差了，请稍后重试');
check('存量: 网络错误映射', mapHttpError({ message: 'Failed to fetch' }) === '网络连接失败，请检查网络后重试');
check('存量: null → 未知错误', mapHttpError(null) === '未知错误');
check('存量: errorCode 表优先', mapHttpError({ errorCode: 'RATE_LIMITED', message: 'x' }) === '操作过于频繁，请稍后再试');
check('存量: 非 NexusApiError 中文 message 直通', mapHttpError(new Error('服务器说中文')) === '服务器说中文');
check('存量: 400 英文 message 直通（≥400 未映射原文出）', mapHttpError(new NE('Bad Request Payload', 418)) === 'Bad Request Payload');

// ---- 模式 A（travelMate 形态：status 优先 + ctx[status] 域文案 + fallback）----
const A_CTX = {
    401: '登录状态已过期，重新登录后再试',
    404: '没有找到这条行程',
    422: '请求格式有误，已自动重试仍失败——请刷新页面后再试',
    fallback: '生成失败，请稍后重试'
};
check('A: 401 域文案', mapHttpError(new NE('Unauthorized', 401), A_CTX) === '登录状态已过期，重新登录后再试');
check('A: 404 域文案', mapHttpError(new NE('Not Found', 404), A_CTX) === '没有找到这条行程');
check('A: 422 域文案', mapHttpError(new NE('Validation Failed', 422), A_CTX) === '请求格式有误，已自动重试仍失败——请刷新页面后再试');
check('A: 500 英文→平台文案（收编后英文泄漏根治）', mapHttpError(new NE('Internal Server Error', 500), A_CTX) === '服务器开小差了，请稍后重试');
check('A: 无状态中文 message 直通', mapHttpError(new Error('行程服务打了个盹'), A_CTX) === '行程服务打了个盹');
check('A: 无状态英文→fallback', mapHttpError(new Error('boom'), A_CTX) === '生成失败，请稍后重试');

// ---- 模式 B（adSmart/truemirror 形态：CJK 信任优先 + prefix）----
const B_CTX = {
    trustCJKOverStatus: true,
    500: '服务器暂时开小差了，请稍后重试',
    404: '要找的数据不存在，可能已被删除',
    403: '当前账号没有权限执行这个操作',
    400: '提交的内容没有通过校验，请检查后重试',
    422: '提交的内容没有通过校验，请检查后重试',
    fallback: '页面出了点问题，请重试；若反复出现请反馈'
};
check('B: 500+中文 message 信任直用（adSmart 签名行为）', mapHttpError(new NE('余额不足，请充值', 500), { ...B_CTX, prefix: '投放计划' }) === '投放计划：余额不足，请充值');
check('B: 500+英文→adSmart 域文案', mapHttpError(new NE('Internal Server Error', 500), { ...B_CTX, prefix: '投放计划' }) === '投放计划：服务器暂时开小差了，请稍后重试');
check('B: 404+英文→域文案', mapHttpError(new NE('Not Found', 404), B_CTX) === '要找的数据不存在，可能已被删除');
check('B: 无状态英文→fallback（渲染异常兜底）', mapHttpError(new TypeError('x is not a function'), B_CTX) === '页面出了点问题，请重试；若反复出现请反馈');
check('B: prefix 只包一层', mapHttpError(new NE('boom', 500), { ...B_CTX, prefix: '秒笔' }) === '秒笔：服务器暂时开小差了，请稍后重试');
check('B-truemirror: 422 非 CJK→域文案', mapHttpError(new NE('Unprocessable', 422), { trustCJKOverStatus: true, 422: '提交的内容有误，请检查后重试', fallback: '请求失败，请稍后重试' }) === '提交的内容有误，请检查后重试');
check('B-truemirror: 422+中文→中文 message', mapHttpError(new NE('标题不能为空', 422), { trustCJKOverStatus: true, 422: '提交的内容有误，请检查后重试', fallback: '请求失败，请稍后重试' }) === '标题不能为空');

// ---- 模式 C（piying 形态：detail 优先 + fallback 透传）----
const C = { detailFirst: true, fallback: '操作失败，请重试' };
check('C: detail 字符串直出', mapHttpError({ response: { detail: '文件太大' }, message: 'en error' }, C) === '文件太大');
check('C: detail 数组拼接', mapHttpError({ response: { detail: [{ msg: '名字必填' }, { msg: '年龄非法' }] }, message: '' }, C) === '名字必填；年龄非法');
check('C: detail 单对象 msg', mapHttpError({ body: { detail: { msg: '没有这个项目' } }, message: '' }, C) === '没有这个项目');
check('C: 无 detail 中文 message', mapHttpError(new Error('复制失败了'), C) === '复制失败了');
check('C: 无 detail 英文 422→平台文案（收编后兜底升级为具体）', mapHttpError(new NE('Unprocessable', 422), C) === '提交的数据有误，请检查后重试');
check('C: 无状态无 detail 英文→fallback', mapHttpError(new Error('mystery'), C) === '操作失败，请重试');

// ---- mapDetail（usercenter localizeDetail 形态：裸 detail 输入 + translate）----
const UC_ZH = {
    'Incorrect username, email, phone or password': '用户名、邮箱、手机号或密码不正确，请检查后重试',
    'Internal server error': '服务器开小差了，请稍后重试',
    'Organization name already exists': '组织名称已存在'
};
check('mapDetail: EN 键翻译', mapDetail('Incorrect username, email, phone or password', { translate: UC_ZH }) === '用户名、邮箱、手机号或密码不正确，请检查后重试');
check('mapDetail: 未知 EN 原文保留', mapDetail('Some new english detail', { translate: UC_ZH }) === 'Some new english detail');
check('mapDetail: 中文直通', mapDetail('已经存在', { translate: UC_ZH }) === '已经存在');
check('mapDetail: 数组逐条翻译+剥前缀+拼接', mapDetail([{ msg: 'Value error, Organization name already exists' }, { msg: '第二问题' }], { translate: UC_ZH }) === '组织名称已存在；第二问题');
check('mapDetail: 对象递归', mapDetail({ detail: 'Internal server error' }, { translate: UC_ZH }) === '服务器开小差了，请稍后重试');
check('mapDetail: 空串→空（调用面 || fallback 链依赖）', mapDetail('', { translate: UC_ZH }) === '');
check('mapDetail: null→空', mapDetail(null, { translate: UC_ZH }) === '');
check('mapDetail: 无 translate 退化为纯拼接', mapDetail([{ msg: 'A' }, { msg: 'B' }]) === 'A；B');

// ---- detail 通道与 status 的相对位置（模式 A 下 detail 不越过 status 默认）----
check('模式A: 404+中文 detail→404 文案优先（detail 不越位）', mapHttpError(new NE('en', 404), { response: { detail: '中文细节' }, ...{} }) === '请求的资源不存在');
const withResp = new NE('en', 404); withResp.response = { detail: '中文细节' };
check('模式A: 404+中文 detail→DEFAULT 404', mapHttpError(withResp, A_CTX) === '没有找到这条行程');
check('模式C: 422+detail→detail 优先', (() => { const e = new NE('en', 422); e.response = { detail: '具体原因' }; return mapHttpError(e, C) === '具体原因'; })());

// ---- 汇总 ----
const fails = results.filter(r => !r[1]);
for (const [name, ok] of results) console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
console.log(`\n${results.length - fails.length}/${results.length} 绿`);
process.exit(fails.length ? 1 : 0);
