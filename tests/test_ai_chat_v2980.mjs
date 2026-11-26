import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

window.NexusUtils = { showToast() {}, injectStyle() {}, copyToClipboard() { return Promise.resolve(true); } };
global.document = {
    activeElement: null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, classList: { add() {}, remove() {} } }),
    addEventListener() {},
    removeEventListener() {},
    body: { appendChild() {} }
};
global.Vue = { ref: (v) => ({ value: v }), reactive: (o) => o, computed: (fn) => ({ value: fn() }), nextTick: (fn) => fn() };

const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));
load('nexus-chat.js');
// 实锚：routeRichEvent v2.98.0 数据层依赖 window.NexusSubagent；nexus-all.js FILES
// 聚合序（build_all.py）= nexus-chat.js → nexus-stop.js → nexus-subagent.js，生产必在，
// 本测试加载范式须补齐同环境（judge prompt 签名面未列数据层加载，此处补环境非改断言）。
load('nexus-subagent.js');
let H = null;
try {
    load('components/nux-ai-chat-helpers.js');
    H = window.NuxAiChatHelpers;
} catch (e) {
    console.error('[loader] components/nux-ai-chat-helpers.js 加载失败:', e.message);
}
let ST = null;
try {
    load('components/nux-subagent-track.js');
    ST = window.NuxSubagentTrack;
} catch (e) {
    console.error('[loader] components/nux-subagent-track.js 加载失败（G2 预期红）:', e.message);
}
const NC = window.NexusChat;

const startMsg = () => ({});
const subEntry = (id) => ({ id, label: id, status: 'running', parent: '', thinking: '', toolCalls: [] });
const snap = (o) => JSON.stringify(o);
const hasTimingKey = (ent) => Object.keys(ent).some((k) => /start|durat|elapsed|time/i.test(k));

/* ---------- A. subagent 四族事件状态机 ---------- */

test('A1: subagent_start 推入 running 条目且形状符合契约', () => {
    const msg = startMsg();
    const r = NC.routeRichEvent(msg, 'subagent_start', { subagentRunId: 'sa1', label: '联网检索', parentSubagentRunId: 'root0' });
    assert.strictEqual(r, true, '生命周期分支应返回 handled=true');
    assert.ok(Array.isArray(msg.subagents) && msg.subagents.length === 1, 'msg.subagents 建数组推入一条');
    const e = msg.subagents[0];
    assert.strictEqual(e.id, 'sa1', 'id=payload.subagentRunId');
    assert.strictEqual(e.status, 'running');
    assert.strictEqual(e.label, '联网检索', 'label 优先取 payload.label');
    assert.strictEqual(e.parent, 'root0', 'parent=payload.parentSubagentRunId');
    assert.ok(!e.thinking, 'thinking 初始为空');
    assert.ok(Array.isArray(e.toolCalls) && e.toolCalls.length === 0, 'toolCalls 初始空数组');
    assert.ok(hasTimingKey(e), '条目需带 startedAt 或耗时类计时字段');
});

test('A2: start 的 label 回退链 name → subagentRunId', () => {
    const msg = startMsg();
    NC.routeRichEvent(msg, 'subagent_start', { subagentRunId: 'sa1', name: '检索代理' });
    NC.routeRichEvent(msg, 'subagent_start', { subagentRunId: 'sa2' });
    assert.strictEqual(msg.subagents[0].label, '检索代理', '无 label 用 name');
    assert.strictEqual(msg.subagents[1].label, 'sa2', 'name 也没有则用 subagentRunId');
});

test('A3: subagent_started 别名等效 push running 条目', () => {
    const msg = startMsg();
    const r = NC.routeRichEvent(msg, 'subagent_started', { subagentRunId: 'sa1', label: 'x' });
    assert.strictEqual(r, true);
    assert.strictEqual(msg.subagents.length, 1);
    assert.strictEqual(msg.subagents[0].status, 'running');
});

test('A4: subagent_finish 命中 id 置 done 且 result/摘要写入条目', () => {
    const msg = { subagents: [subEntry('sa1')] };
    const r = NC.routeRichEvent(msg, 'subagent_finish', { subagentRunId: 'sa1', result: '子任务报告' });
    assert.strictEqual(r, true);
    assert.strictEqual(msg.subagents[0].status, 'done');
    assert.ok(snap(msg.subagents[0]).includes('子任务报告'), 'result 内容落条目');
});

test('A5: finish outcome=suspended → suspended 非 done', () => {
    const msg = { subagents: [subEntry('sa1')] };
    const r = NC.routeRichEvent(msg, 'subagent_finish', { subagentRunId: 'sa1', outcome: 'suspended' });
    assert.strictEqual(r, true);
    assert.strictEqual(msg.subagents[0].status, 'suspended', '挂起态独立于 done');
});

test('A6: subagent_finished 别名等效置 done', () => {
    const msg = { subagents: [subEntry('sa1')] };
    const r = NC.routeRichEvent(msg, 'subagent_finished', { subagentRunId: 'sa1', result: 'ok' });
    assert.strictEqual(r, true);
    assert.strictEqual(msg.subagents[0].status, 'done');
});

test('A7: subagent_error 命中 id 置 error 且 message 写入条目', () => {
    const msg = { subagents: [subEntry('sa1')] };
    const r = NC.routeRichEvent(msg, 'subagent_error', { subagentRunId: 'sa1', message: '上游超时' });
    assert.strictEqual(r, true);
    assert.strictEqual(msg.subagents[0].status, 'error');
    assert.ok(snap(msg.subagents[0]).includes('上游超时'), '错误原因落条目');
});

test('A8: subagent_failed 别名等效置 error', () => {
    const msg = { subagents: [subEntry('sa1')] };
    const r = NC.routeRichEvent(msg, 'subagent_failed', { subagentRunId: 'sa1', message: 'boom' });
    assert.strictEqual(r, true);
    assert.strictEqual(msg.subagents[0].status, 'error');
});

test('A9: 重复 start 同 id 幂等不重复 push', () => {
    const msg = startMsg();
    NC.routeRichEvent(msg, 'subagent_start', { subagentRunId: 'sa1', label: 'x' });
    NC.routeRichEvent(msg, 'subagent_start', { subagentRunId: 'sa1', label: 'x' });
    assert.strictEqual(msg.subagents.length, 1, '同 id 二次 start 不新增条目');
});

test('A10: 并行双子代理状态互不串扰', () => {
    const msg = startMsg();
    NC.routeRichEvent(msg, 'subagent_start', { subagentRunId: 'sa1' });
    NC.routeRichEvent(msg, 'subagent_start', { subagentRunId: 'sa2' });
    NC.routeRichEvent(msg, 'subagent_finish', { subagentRunId: 'sa2', result: 'ok' });
    assert.strictEqual(msg.subagents.length, 2);
    const byId = Object.fromEntries(msg.subagents.map((s) => [s.id, s]));
    assert.strictEqual(byId.sa1.status, 'running', '未完成的 sa1 保持 running');
    assert.strictEqual(byId.sa2.status, 'done');
});

/* ---------- B. 内容事件归因分流 ---------- */

test('B1: thinking 带 subagentRunId（条目在）追加进条目不落母消息', () => {
    const msg = { subagents: [subEntry('sa1')] };
    const r1 = NC.routeRichEvent(msg, 'thinking', { subagentRunId: 'sa1', content: '片段一' });
    const r2 = NC.routeRichEvent(msg, 'thinking', { subagentRunId: 'sa1', content: '片段二' });
    assert.strictEqual(r1, true);
    assert.strictEqual(r2, true);
    const e = msg.subagents[0];
    assert.ok(e.thinking.includes('片段一') && e.thinking.includes('片段二'), '子代理 thinking 追加');
    assert.ok(e.thinking.indexOf('片段一') < e.thinking.indexOf('片段二'), '追加顺序保持');
    assert.ok(!msg.thinking, '母消息 msg.thinking 不被写入');
});

test('B2: tool 带 subagentRunId 归一进条目 toolCalls 且 tool_result 同构幂等更新', () => {
    const msg = { subagents: [subEntry('sa1')] };
    NC.routeRichEvent(msg, 'tool', { subagentRunId: 'sa1', id: 't1', name: 'db_query', status: 'running', args: { sql: 'select 1' } });
    const e = msg.subagents[0];
    assert.ok(!msg.toolCalls, '母消息 msg.toolCalls 不被写入');
    assert.ok(Array.isArray(e.toolCalls) && e.toolCalls.length === 1, 'tool 归一入条目 toolCalls');
    assert.strictEqual(e.toolCalls[0].status, 'running');
    assert.strictEqual(e.toolCalls[0].args.sql, 'select 1');
    NC.routeRichEvent(msg, 'tool_result', { subagentRunId: 'sa1', id: 't1', status: 'done', result: 'rows: 5', duration_ms: 340 });
    assert.strictEqual(e.toolCalls.length, 1, '同 id 幂等更新不新增');
    assert.strictEqual(e.toolCalls[0].status, 'done');
    assert.strictEqual(e.toolCalls[0].result, 'rows: 5');
    assert.strictEqual(e.toolCalls[0].duration_ms, 340);
});

test('B3: thinking 不带 subagentRunId 走母消息累加（原逻辑）', () => {
    const msg = { subagents: [subEntry('sa1')] };
    const r = NC.routeRichEvent(msg, 'thinking', { content: '母消息思考' });
    assert.strictEqual(r, true);
    assert.ok(msg.thinking && msg.thinking.includes('母消息思考'), '母消息 thinking 累加');
    assert.ok(!msg.subagents[0].thinking, '子代理条目 thinking 不被写入');
});

test('B4: tool 不带 subagentRunId 走母消息 toolCalls（原逻辑）', () => {
    const msg = { subagents: [subEntry('sa1')] };
    const r = NC.routeRichEvent(msg, 'tool', { id: 't9', name: 'web_search', status: 'running' });
    assert.strictEqual(r, true);
    assert.ok(Array.isArray(msg.toolCalls) && msg.toolCalls.length === 1 && msg.toolCalls[0].status === 'running');
    assert.strictEqual(msg.subagents[0].toolCalls.length, 0, '子代理条目 toolCalls 不被写入');
});

test('B5: 带不存在的 subagentRunId 落母消息且既有条目零串扰', () => {
    const msg = { subagents: [subEntry('sa1')] };
    NC.routeRichEvent(msg, 'thinking', { subagentRunId: 'ghost', content: '无主思考' });
    NC.routeRichEvent(msg, 'tool', { subagentRunId: 'ghost', id: 'tg', name: 'x_tool', status: 'running' });
    assert.ok(msg.thinking && msg.thinking.includes('无主思考'), 'thinking 落母消息');
    assert.ok(Array.isArray(msg.toolCalls) && msg.toolCalls.length === 1, 'tool 落母消息');
    assert.strictEqual(msg.subagents.length, 1, '不为未知 id 新增条目');
    assert.ok(!msg.subagents[0].thinking && msg.subagents[0].toolCalls.length === 0, '既有条目零串扰');
});

/* ---------- C. thinking_end 收起与手动展开保护 ---------- */

test('C1: thinking_end 置 showReasoning=false 且 handled=true', () => {
    const msg = { showReasoning: true };
    const r = NC.routeRichEvent(msg, 'thinking_end', {});
    assert.strictEqual(r, true);
    assert.strictEqual(msg.showReasoning, false);
});

test('C2: _reasoningManual=true 时 thinking_end 不收起', () => {
    const msg = { showReasoning: true, _reasoningManual: true };
    const r = NC.routeRichEvent(msg, 'thinking_end', {});
    assert.strictEqual(r, true);
    assert.strictEqual(msg.showReasoning, true, '用户手动展开中不收起');
});

test('C3: reasoning_end 别名等效收起', () => {
    const msg = { showReasoning: true };
    const r = NC.routeRichEvent(msg, 'reasoning_end', {});
    assert.strictEqual(r, true);
    assert.strictEqual(msg.showReasoning, false);
});

test('C4: reasoning_end 在手动展开时同样不收起', () => {
    const msg = { showReasoning: true, _reasoningManual: true };
    NC.routeRichEvent(msg, 'reasoning_end', {});
    assert.strictEqual(msg.showReasoning, true);
});

// 实锚（法官修订点4原文）：「thinking_start/reasoning_start 仅作小写别名并入既有 thinking 累积分支——
// 自动展开已有现成机制（nux-ai-chat-helpers.js onEvent routed 即 showReasoning=true），勿重复造」。
// 展开机制位于 helpers onEvent wrapper（集成面），routeRichEvent 直调层不可达——
// 本层正确断言 = handled=true + 思考内容走累积分支；wrapper 自动展开由 e2e_v2980_family A 段全链覆盖。
test('C5: thinking_start 并入 thinking 累积分支（handled + 内容累加）', () => {
    const msg = { showReasoning: false, thinking: '' };
    const r0 = NC.routeRichEvent(msg, 'thinking_start', {});
    assert.strictEqual(r0, true);
    NC.routeRichEvent(msg, 'thinking', { content: '分段一' });
    assert.strictEqual(msg.thinking, '分段一', 'start 别名后思考内容照常累加');
});

test('C6: reasoning_start 别名等效并入累积分支', () => {
    const msg = { showReasoning: false, thinking: '' };
    const r0 = NC.routeRichEvent(msg, 'reasoning_start', {});
    assert.strictEqual(r0, true);
    NC.routeRichEvent(msg, 'reasoning_start', { content: '推理段' });
    assert.strictEqual(msg.thinking, '推理段', 'reasoning_start 携带 content 同样累加');
});

/* ---------- D. 别名小写直通 ---------- */

test('D1: event 空 + data.type=SUBAGENT_STARTED 经 toLowerCase 归一等效路由', () => {
    const msg = startMsg();
    const r = NC.routeRichEvent(msg, '', { type: 'SUBAGENT_STARTED', subagentRunId: 'sa9' });
    assert.strictEqual(r, true);
    assert.ok(Array.isArray(msg.subagents) && msg.subagents.length === 1);
    assert.strictEqual(msg.subagents[0].id, 'sa9');
    assert.strictEqual(msg.subagents[0].status, 'running');
});

test('D2: event=SUBAGENT_FINISH 大写直通等效 subagent_finish', () => {
    const msg = { subagents: [subEntry('sa1')] };
    const r = NC.routeRichEvent(msg, 'SUBAGENT_FINISH', { subagentRunId: 'sa1', result: 'done-x' });
    assert.strictEqual(r, true);
    assert.strictEqual(msg.subagents[0].status, 'done');
});

/* ---------- E. 未知事件零副作用 ---------- */

const richMsg = () => ({ thinking: '已有', toolCalls: [{ id: 't0', status: 'done' }], showReasoning: true, subagents: [subEntry('sa1')] });

test('E1: subagent_update 未知事件 handled=false 且 msg 零变化', () => {
    const msg = richMsg();
    const before = snap(msg);
    const r = NC.routeRichEvent(msg, 'subagent_update', { subagentRunId: 'sa1', progress: 0.5 });
    assert.strictEqual(r, false);
    assert.strictEqual(snap(msg), before, 'msg 深度不变');
});

// 实锚（用例改锚）：v2.98.0 契约将 ACTIVITY 标注「后续轮候选不落码」→ E2 曾锚 activity_snapshot 为未知事件；
// v2.99.0 尾巴清理轮用户钦定兑掉 ACTIVITY 族（llms.txt 对照表同步升级为已支持，H 段覆盖其路由行为），
// 自造词 subagent_update（对照表明示正道=ACTIVITY_*）仍是未知事件，E2 改锚之。
test('E2: subagent_update 自造词 handled=false 且 msg 零变化', () => {
    const msg = richMsg();
    const before = snap(msg);
    const r = NC.routeRichEvent(msg, 'subagent_update', { items: [{ a: 1 }] });
    assert.strictEqual(r, false);
    assert.strictEqual(snap(msg), before, 'msg 深度不变');
});

test('E3: nonsense_ev 基线 handled=false（v2.97.1 语义不回归）', () => {
    const msg = startMsg();
    assert.strictEqual(NC.routeRichEvent(msg, 'nonsense_ev', {}), false);
});

/* ---------- F. 向后兼容抽测（v2.97.1 零漂移） ---------- */

test('F1: 旧 thinking 累加两段顺序保持', () => {
    const msg = startMsg();
    NC.routeRichEvent(msg, 'thinking', { content: '第一段' });
    NC.routeRichEvent(msg, 'thinking', { content: '第二段' });
    assert.ok(msg.thinking.includes('第一段') && msg.thinking.includes('第二段'), '累加不覆盖');
    assert.ok(msg.thinking.indexOf('第一段') < msg.thinking.indexOf('第二段'), '顺序保持');
});

test('F2: 旧 tool 四族归一：结构化入表 + result 幂等回填 + 未知 id update 新增', () => {
    const msg = startMsg();
    let r = NC.routeRichEvent(msg, 'tool', { id: 't1', name: 'db_query', status: 'running', args: { sql: 'select 1' } });
    assert.strictEqual(r, true);
    assert.ok(msg.toolCalls.length === 1 && msg.toolCalls[0].status === 'running' && msg.toolCalls[0].args.sql === 'select 1');
    NC.routeRichEvent(msg, 'tool_result', { id: 't1', status: 'done', result: 'rows: 5', duration_ms: 340 });
    assert.ok(msg.toolCalls.length === 1 && msg.toolCalls[0].status === 'done' && msg.toolCalls[0].result === 'rows: 5' && msg.toolCalls[0].duration_ms === 340, '同 id 幂等更新');
    NC.routeRichEvent(msg, 'tool_update', { id: 't2', name: 'ghost', status: 'done', result: 'x' });
    assert.strictEqual(msg.toolCalls.length, 2, '未知 id 的 update 新增条目');
});

test('F3: 旧 tool 无 id 按名回填 running 项', () => {
    const msg = startMsg();
    NC.routeRichEvent(msg, 'tool', { name: 'flow_b', status: 'running' });
    NC.routeRichEvent(msg, 'tool_result', { name: 'flow_b', result: 'ok' });
    assert.ok(msg.toolCalls.length === 1 && msg.toolCalls[0].status === 'done');
});

test('F4: 旧 tool status=cancelled 归一 error', () => {
    const msg = startMsg();
    NC.routeRichEvent(msg, 'tool', { id: 'e1', name: 'img_gen', status: 'cancelled', error: '已取消' });
    assert.strictEqual(msg.toolCalls[0].status, 'error', 'cancelled → error 归一');
});

test('F5: interrupt 路由与未知不误路由不回归', () => {
    const msg = startMsg();
    const r = NC.routeRichEvent(msg, 'interrupt', { title: '需要授权', body: '将读取你的日历' });
    assert.strictEqual(r, true);
    assert.ok(msg.interrupt && msg.interrupt.title === '需要授权');
    assert.strictEqual(NC.routeRichEvent(startMsg(), 'nonsense_ev', {}), false);
});

/* ---------- G. 签名面补充：feature 开关与组件 ---------- */

test('G1: richSubagents feature 开关默认 false', () => {
    assert.ok(H, 'NuxAiChatHelpers 未加载');
    assert.ok(H.defaultFeatures, 'defaultFeatures 存在');
    assert.strictEqual(H.defaultFeatures.richSubagents, false, '默认关闭，false 时不渲染 nux-subagent-track');
});

test('G2: nux-subagent-track 组件存在且 props 声明 items', () => {
    assert.ok(ST, 'components/nux-subagent-track.js 未实现或未导出 window.NuxSubagentTrack');
    assert.ok(ST.props && 'items' in ST.props, 'props 需声明 items（msg.subagents 数组）');
});

/* ---------- H. ACTIVITY 族（v2.99.0，AG-UI ACTIVITY_SNAPSHOT/DELTA 对应物） ----------
 * 契约锚：llms.txt「AI 事件面 ↔ AG-UI 1.0 对照表」ACTIVITY 行
 * - activity_snapshot：messageId 键落 msg.activities[]，replace 缺省 true 覆写 content，带 subagentRunId 记录归因
 * - activity_delta：对既有条目 content 应用最小 RFC 6902（add/remove/replace），无基底 fail-soft 忽略
 * - 未知大写 wire 名小写直通；events 由 routeRichEvent 路由返回 handled=true
 */

test('H1: activity_snapshot 落 msg.activities[] 且 replace 缺省覆写', () => {
    const msg = {};
    assert.strictEqual(NC.routeRichEvent(msg, 'activity_snapshot', { messageId: 'act1', activityType: 'search_step', content: { step: 1 } }), true);
    assert.strictEqual(msg.activities.length, 1);
    assert.strictEqual(msg.activities[0].id, 'act1');
    assert.strictEqual(msg.activities[0].content.step, 1);
    NC.routeRichEvent(msg, 'activity_snapshot', { messageId: 'act1', activityType: 'search_step', content: { step: 2 } });
    assert.strictEqual(msg.activities[0].content.step, 2, '缺省 replace=true 覆写');
    assert.strictEqual(msg.activities.length, 1, '同 messageId 不重复 push');
});

test('H2: activity_snapshot replace:false 保留基底', () => {
    const msg = {};
    NC.routeRichEvent(msg, 'activity_snapshot', { messageId: 'a2', content: { base: true } });
    NC.routeRichEvent(msg, 'activity_snapshot', { messageId: 'a2', content: { base: false, extra: 1 }, replace: false });
    assert.deepStrictEqual(msg.activities[0].content, { base: true }, 'replace=false 不覆写非空基底');
});

test('H3: snapshot 带 subagentRunId 记录归因到条目', () => {
    const msg = {};
    NC.routeRichEvent(msg, 'activity_snapshot', { messageId: 'a3', activityType: 'plan', content: { v: 1 }, subagentRunId: 'sa-p' });
    assert.strictEqual(msg.activities[0].subagentRunId, 'sa-p');
});

test('H4: activity_delta 应用最小 JSON patch（add/replace/remove）', () => {
    const msg = {};
    NC.routeRichEvent(msg, 'activity_snapshot', { messageId: 'a4', content: { list: ['x'], done: false } });
    assert.strictEqual(NC.routeRichEvent(msg, 'activity_delta', { messageId: 'a4', activityType: 't', patch: [
        { op: 'add', path: '/list/-', value: 'y' } === undefined ? {} : { op: 'add', path: '/list/1', value: 'y' },
        { op: 'replace', path: '/done', value: true }
    ] }), true);
    assert.deepStrictEqual(msg.activities[0].content, { list: ['x', 'y'], done: true });
    NC.routeRichEvent(msg, 'activity_delta', { messageId: 'a4', activityType: 't', patch: [{ op: 'remove', path: '/list/0' }] });
    assert.deepStrictEqual(msg.activities[0].content.list, ['y']);
});

test('H5: activity_delta 无基底条目 fail-soft 忽略（handled=true 不崩）', () => {
    const msg = {};
    assert.strictEqual(NC.routeRichEvent(msg, 'activity_delta', { messageId: 'ghost', patch: [{ op: 'replace', path: '/x', value: 1 }] }), true);
    assert.strictEqual(msg.activities, undefined, '无基底不建条目');
});

test('H6: activity_delta 未知 op / 失配路径 fail-soft', () => {
    const msg = {};
    NC.routeRichEvent(msg, 'activity_snapshot', { messageId: 'a6', content: { a: 1 } });
    NC.routeRichEvent(msg, 'activity_delta', { messageId: 'a6', patch: [{ op: 'copy', path: '/b', from: '/a' }] });
    assert.deepStrictEqual(msg.activities[0].content, { a: 1 }, '未知 op 不动 content');
    NC.routeRichEvent(msg, 'activity_delta', { messageId: 'a6', patch: [{ op: 'replace', path: '/deep/missing', value: 0 }] });
    assert.deepStrictEqual(msg.activities[0].content, { a: 1 }, '失配路径不动 content');
});

test('H7: 大写 wire 名 ACTIVITY_SNAPSHOT 小写直通', () => {
    const msg = {};
    assert.strictEqual(NC.routeRichEvent(msg, '', { type: 'ACTIVITY_SNAPSHOT', messageId: 'a7', content: { ok: 1 } }), true);
    assert.strictEqual(msg.activities[0].id, 'a7');
});

test('H8: NexusSubagent.applyJsonPatch 直调三 op 等价 + 非法入参 false', () => {
    const SA = window.NexusSubagent;
    assert.ok(SA && SA.applyJsonPatch, 'applyJsonPatch 导出在位');
    const t = { a: { b: [1] } };
    assert.strictEqual(SA.applyJsonPatch(t, [{ op: 'add', path: '/a/b/1', value: 2 }, { op: 'replace', path: '/a/b/0', value: 9 }, { op: 'remove', path: '/a/b/1' }]), true);
    assert.deepStrictEqual(t, { a: { b: [9] } });
    assert.strictEqual(SA.applyJsonPatch(t, 'not-array'), false);
    assert.strictEqual(SA.applyJsonPatch(t, [{ op: 'move', path: '/x', from: '/y' }]), false);
});
