import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

window.NexusUtils = { copyToClipboard() { return Promise.resolve(true); }, showToast() {} };
global.document = {
    activeElement: null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, classList: { add() {}, remove() {} } }),
    addEventListener() {},
    removeEventListener() {},
    body: { appendChild() {} }
};
global.Vue = { ref: (v) => ({ value: v }), nextTick: (fn) => fn() };

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));
load('components/nux-tool-call.js');
load('components/nux-confidence.js');
load('components/nux-citations.js');
load('components/nux-ai-chat-helpers.js');
load('nexus-components.js');

check('registry: nux-tool-call', window.NexusComponents.list().includes('nux-tool-call'));

const makeCtx = (comp, props) => {
    const ctx = { ...props, ...(comp.data ? comp.data.call({}) : {}) };
    for (const [k, fn] of Object.entries(comp.computed || {})) {
        Object.defineProperty(ctx, k, { get() { return fn.call(ctx); } });
    }
    for (const [k, fn] of Object.entries(comp.methods || {})) ctx[k] = fn.bind(ctx);
    return ctx;
};

const TC = window.NuxToolCall;
check('tool-call: template 存在', TC && TC.template && TC.template.includes('nx-tool-call'));
{
    const c = makeCtx(TC, { items: [] });
    check('tool-call: 空列表不渲染', c.views.length === 0 && c.runningCount === 0);
}
{
    const c = makeCtx(TC, { items: [
        { id: 'c1', name: 'web_search', status: 'running' },
        { id: 'c2', name: 'db_query', status: 'done', args: { sql: 'select 1', limit: 5 }, result: 'rows: 5', duration_ms: 820 },
        { id: 'c3', name: 'img_gen', status: 'failed', error: '配额不足，请稍后再试' },
        { id: 'c4', name: 'json_tool', status: 'done', result: { a: 1, b: [2, 3] }, duration_ms: 1500 }
    ] });
    check('tool-call: running 归一', c.views[0].running === true && c.views[0].summary === '正在执行…');
    check('tool-call: done 摘要带人话耗时', c.views[1].summary === '820ms' && c.views[1].expandable === true);
    check('tool-call: failed 归一 error', c.views[2].error === true && c.views[2].errorText.includes('配额不足'));
    check('tool-call: running 不可展开', c.views[0].expandable === false);
    check('tool-call: args 键值对', c.views[1].args.length === 2 && c.views[1].args[0].k === 'sql');
    check('tool-call: 耗时 1.5s', c.views[3].summary === '1.5s');
    check('tool-call: runningCount', c.runningCount === 1);
    c.toggle(c.views[1]);
    check('tool-call: toggle 展开', c.isOpen(c.views[1]) === true);
    c.toggle(c.views[0]);
    check('tool-call: running toggle 无效', c.isOpen(c.views[0]) === false);
}
{
    const long = 'x'.repeat(3000);
    const c = makeCtx(TC, { items: [{ name: 'big', result: long }] });
    check('tool-call: result 2000 截断', c.views[0].result.length < 2100 && c.views[0].result.includes('已截断'));
}
{
    const c = makeCtx(TC, { items: [{ name: 'obj', result: { a: 1 } }] });
    check('tool-call: 对象 result JSON 美化', c.views[0].result.includes('"a": 1'));
}

const H = window.NuxAiChatHelpers;
check('helpers: defaultFeatures 不含破坏性变化', H.defaultFeatures.richTools === true && H.defaultFeatures.richReferences === true);

{
    const msg = {};
    check('route: 纯名称进 legacy chips', H.routeRichEvent(msg, 'tool', { name: 'web_search' }) === true && msg.tools.length === 1 && msg.toolCalls.length === 0);
    H.routeRichEvent(msg, 'tool_executed', { display_name: '查库' });
    check('route: tool_executed 纯名称', msg.tools.length === 2);
}
{
    const msg = {};
    H.routeRichEvent(msg, 'tool', { id: 't1', name: 'db_query', status: 'running', args: { sql: 'select 1' } });
    check('route: 结构化 tool 入 toolCalls', msg.toolCalls.length === 1 && msg.toolCalls[0].status === 'running' && msg.toolCalls[0].args.sql === 'select 1');
    H.routeRichEvent(msg, 'tool_result', { id: 't1', status: 'done', result: 'rows: 5', duration_ms: 340 });
    check('route: tool_result 按 id 幂等更新', msg.toolCalls.length === 1 && msg.toolCalls[0].status === 'done' && msg.toolCalls[0].result === 'rows: 5' && msg.toolCalls[0].duration_ms === 340);
    H.routeRichEvent(msg, 'tool_update', { id: 't2', name: 'ghost', status: 'done', result: 'x' });
    check('route: 未知 id 的 update 新增条目', msg.toolCalls.length === 2);
}
{
    const msg = {};
    H.routeRichEvent(msg, 'tool', { name: 'flow_a', status: 'running' });
    H.routeRichEvent(msg, 'tool_result', { name: 'flow_a', result: 'ok' });
    check('route: 无 id 按名回填 running 项', msg.toolCalls.length === 1 && msg.toolCalls[0].status === 'done');
}
{
    const msg = {};
    H.routeRichEvent(msg, 'tool', { id: 'e1', name: 'img_gen', status: 'error', error: '配额不足' });
    check('route: error 态归一', msg.toolCalls[0].status === 'error' && msg.toolCalls[0].error === '配额不足');
}
{
    const msg = {};
    H.routeRichEvent(msg, 'credibility', { level: 'good', pct: 88 });
    check('route: credibility 带 level 进独立字段', msg.credibility && msg.credibility.level === 'good' && !msg.warnings);
    H.routeRichEvent(msg, 'credibility', { content: '数字未经审计' });
    check('route: credibility 无 level 降级 warnings', !msg.credibility.pct === false || msg.warnings.length === 1);
}
{
    const msg = {};
    H.routeRichEvent(msg, 'warning', { message: '数据延迟 15 分钟' });
    check('route: warning 保持文本', msg.warnings.length === 1 && !msg.credibility);
}
{
    check('route: isCitedReferences verdict 命中', H.isCitedReferences([{ title: 'a', url: 'https://x', verdict: 'supported' }]) === true);
    check('route: isCitedReferences 纯字符串判负', H.isCitedReferences(['https://x']) === false);
    check('route: isCitedReferences 对象无 verdict 判负', H.isCitedReferences([{ title: 'a', url: 'https://x' }]) === false);
    check('route: isCitedReferences 非数组判负', H.isCitedReferences(null) === false);
}

let failed = 0;
for (const [name, ok] of results) {
    if (!ok) failed++;
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
if (failed > 0) process.exit(1);
