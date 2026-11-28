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
load('components/nux-plan-card.js');
load('components/nux-diff-review.js');
load('components/nux-run-telemetry.js');

const Plan = window.NuxPlanCard;
const Diff = window.NuxDiffReview;
const Tel = window.NuxRunTelemetry;
const Registry = window.NuxAiWidgetsRegistry;

const planCtx = (items, extra = {}) => {
    const ctx = { items, collapsible: true, doneCollapsed: true, ...extra };
    ctx.views = Plan.computed.views.call(ctx);
    ctx.doneViews = Plan.computed.doneViews.call(ctx);
    ctx.activeViews = Plan.computed.activeViews.call(ctx);
    ctx.doneCount = Plan.computed.doneCount.call(ctx);
    ctx.totalCount = Plan.computed.totalCount.call(ctx);
    return ctx;
};

const diffCtx = (files, decisions = {}, extra = {}) => {
    const ctx = { files, decisions, expanded: {}, collapsible: true, disabled: false, state: 'reviewing', decided: false, ...extra };
    ctx.views = Diff.computed.views.call(ctx);
    ctx.decidedKeys = Diff.computed.decidedKeys.call(ctx);
    ctx.decidedCount = Diff.computed.decidedCount.call(ctx);
    ctx.totalHunks = Diff.computed.totalHunks.call(ctx);
    ctx.normalizedState = Diff.computed.normalizedState.call(ctx);
    ctx.isReviewing = Diff.computed.isReviewing.call(ctx);
    return ctx;
};

test('plan-card: 全局导出与 widget 型注册', () => {
    assert.equal(Plan.name, 'NuxPlanCard');
    assert.equal(Registry.types.plan.name, 'NuxPlanWidget');
    assert.equal(Registry.icons.plan, '📋');
});

test('plan-card: computed 视图与进度', () => {
    const ctx = planCtx([
        { id: 't1', title: '解析需求', status: 'done' },
        { id: 't2', title: '生成代码', status: 'in_progress', note: '写组件' },
        { id: 't3', title: '回归', status: 'todo' },
        { id: 't4', title: '部署', status: 'failed', note: '磁盘满' }
    ]);
    const views = ctx.views;
    assert.equal(views.length, 4);
    assert.equal(views[0].status, 'done');
    assert.equal(views[1].status, 'running', 'in_progress 宽容归一 running');
    assert.equal(views[2].status, 'pending', 'todo 宽容归一 pending');
    assert.equal(views[3].status, 'error', 'failed 宽容归一 error');
    assert.equal(views[3].note, '磁盘满');
    assert.equal(Plan.computed.doneCount.call(ctx), 1);
    assert.equal(Plan.computed.totalCount.call(ctx), 4);
    assert.equal(Plan.computed.progressPct.call(ctx), 25);
    assert.equal(Plan.computed.runningView.call(ctx).key, 't2');
    assert.equal(Plan.computed.activeViews.call(ctx).length, 3, 'active = 非 done 三项');
    assert.ok(Plan.computed.showDoneBlock.call(ctx), 'collapsible+有 done+折叠态 → 显示折叠块');
    assert.equal(Plan.computed.views.call(planCtx([])).length, 0);
});

test('plan-card: 未知状态归一 pending 且 title 回退链', () => {
    const views = Plan.computed.views.call(planCtx([{ id: 'x', content: '裸内容', status: 'weird' }]));
    assert.equal(views[0].status, 'pending', '未知状态 ≠ done（清单卡划线误导），中性待定');
    assert.equal(views[0].title, '裸内容');
});

test('diff-review: parse() unified diff 解析', () => {
    const text = [
        'diff --git a/src/foo.js b/src/foo.js',
        'index 123..456 100644',
        '--- a/src/foo.js',
        '+++ b/src/foo.js',
        '@@ -10,4 +10,5 @@ function main() {',
        ' keep line',
        '-removed line',
        '+added line',
        '+added line 2',
        ' context after',
        '\\ No newline at end of file',
        'diff --git a/src/new.js b/src/new.js',
        'new file mode 100644',
        '--- /dev/null',
        '+++ b/src/new.js',
        '@@ -0,0 +1,1 @@',
        '+brand new'
    ].join('\n');
    const files = Diff.parse(text);
    assert.equal(files.length, 2);
    assert.equal(files[0].file, 'src/foo.js');
    assert.equal(files[0].hunks.length, 1);
    assert.equal(files[0].hunks[0].adds, 2);
    assert.equal(files[0].hunks[0].dels, 1);
    assert.equal(files[0].hunks[0].lines.filter((l) => l.type === 'ctx').length, 2);
    assert.equal(files[1].created, true, 'new file mode → created');
    assert.equal(files[1].hunks[0].lines[0].text, 'brand new');
});

test('diff-review: normalizeFiles 三态输入宽容', () => {
    const fromString = Diff.parse('--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n');
    assert.equal(fromString.length, 1);
    const views0 = Diff.computed.views.call(diffCtx(['--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n']));
    assert.equal(views0[0].file, 'x', '纯字符串项 → 解析得文件名');
    assert.equal(views0[0].adds, 1);
    const views1 = Diff.computed.views.call(diffCtx([{ file: 'y.ts', patch: '--- a/y.ts\n+++ b/y.ts\n@@ -1 +1 @@\n-old\n+new\n' }]));
    assert.equal(views1[0].file, 'y.ts', '{file,patch} 项 → 解析并保文件名');
    const views2 = Diff.computed.views.call(diffCtx([{ file: 'z.ts', hunks: [{ header: '@@', lines: ['+a', '-b', ' c'] }] }]));
    assert.equal(views2[0].hunks[0].adds, 1, '行字符串前缀分型');
    assert.equal(views2[0].hunks[0].dels, 1);
    const views3 = Diff.computed.views.call(diffCtx([{ hunks: [] }]));
    assert.equal(views3[0].file, 'file-1', '无名文件兜底命名');
});

test('diff-review: decideAll 语义（全量 vs 已标记块）', () => {
    const files = [{ file: 'a.js', hunks: [{ header: '@@ -1 +1 @@', lines: [{ type: 'add', text: 'x' }] }, { header: '@@ -5 +5 @@', lines: [{ type: 'del', text: 'y' }] }] }];
    let emitted = null;
    const ctx = diffCtx(files, { f0h0: 'approve' });
    ctx.$emit = (ev, d) => { emitted = d; };
    assert.equal(ctx.isReviewing, true);
    assert.equal(ctx.decidedCount, 1);
    Diff.methods.decideAll.call(ctx, 'approve');
    assert.equal(emitted.action, 'approve');
    assert.equal(emitted.scope, 'hunk', '有已标记块 → scope=hunk 只作用标记块');
    assert.deepEqual(emitted.files, [{ file: 'a.js', hunkIds: ['f0h0'] }]);
    const ctxAll = diffCtx(files, {});
    ctxAll.$emit = ctx.$emit;
    Diff.methods.decideAll.call(ctxAll, 'reject');
    assert.equal(emitted.action, 'reject');
    assert.equal(emitted.scope, 'all');
    assert.deepEqual(emitted.files[0].hunkIds, ['f0h0', 'f0h1']);
    assert.equal(ctxAll.decided, true, '决定后进入 resolved 态');
});

test('diff-review: state 归一与 widget 型注册', () => {
    assert.equal(Diff.computed.normalizedState.call({ state: 'accepted' }), 'approved');
    assert.equal(Diff.computed.normalizedState.call({ state: 'declined' }), 'rejected');
    assert.equal(Diff.computed.normalizedState.call({ state: 'weird' }), 'reviewing');
    assert.equal(diffCtx([], {}, { state: 'reviewing' }).isReviewing, true);
    assert.equal(diffCtx([], {}, { state: 'approved' }).isReviewing, false);
    assert.equal(typeof Diff.parse, 'function');
    assert.equal(Registry.types.diff.name, 'NuxDiffWidget');
    assert.equal(Registry.icons.diff, '📝');
});

test('run-telemetry: collect() 聚合', () => {
    const messages = [
        { role: 'user', id: 'm0' },
        { role: 'assistant', id: 'm1', meta: { runId: 'r1', tokens: 1200, durationMs: 3000 }, toolCalls: [{}, {}], subagents: [{ id: 'a' }] },
        { role: 'assistant', id: 'm2', meta: { runId: 'r1', tokens: 30 }, stoppedPartial: true },
        { role: 'assistant', id: 'm3', meta: { runId: 'r2', usage: { total_tokens: 2500 } }, error: '429' },
        { role: 'assistant', id: 'm4', meta: { threadId: 't9' }, streaming: true },
        { role: 'assistant', id: 'm5', meta: {} }
    ];
    const runs = Tel.collect(messages);
    assert.equal(runs.length, 4, 'user 消息不计；无 runId 落 msg.id 组');
    const r1 = runs.find((r) => r.id === 'r1');
    assert.equal(r1.tokens, 1230);
    assert.equal(r1.toolCount, 2);
    assert.equal(r1.subagentCount, 1);
    assert.equal(r1.turns, 2);
    assert.equal(r1.durationMs, 3000, '取最大时长');
    assert.equal(r1.status, 'interrupted', 'stoppedPartial → interrupted');
    const r2 = runs.find((r) => r.id === 'r2');
    assert.equal(r2.status, 'error', 'error 优先');
    assert.equal(r2.tokens, 2500, 'usage.total_tokens 兼容');
    assert.equal(runs.find((r) => r.id === 't9').status, 'running');
});

test('run-telemetry: 终态优先级 error > running > interrupted', () => {
    const runs = Tel.collect([{ role: 'assistant', id: 'm1', meta: { runId: 'r' }, stopped: true, streaming: false }]);
    assert.equal(runs[0].status, 'interrupted');
    const runs2 = Tel.collect([{ role: 'assistant', id: 'm1', meta: { runId: 'r', status: 'running' } }, { role: 'assistant', id: 'm2', meta: { runId: 'r' }, stopped: true }]);
    assert.equal(runs2[0].status, 'running', '在途组不被后至终态降级');
});

test('run-telemetry: formatTokens 与 widget 型注册', () => {
    assert.equal(Tel.collect([{ role: 'assistant', id: 'm1', meta: { runId: 'r', tokens: 0 } }])[0].tokens, 0);
    const views = Tel.computed.views.call({ sourceRuns: [{ id: 'r1', label: 'r1', status: 'done', tokens: 4210, durationMs: 12400, toolCount: 6, subagentCount: 2, turns: 3, startedAt: '' }], expanded: {} });
    assert.equal(views[0].tokens, '4.2k');
    assert.equal(views[0].duration, '12.4s');
    assert.equal(views[0].statusText, '已完成');
    assert.equal(Registry.types.telemetry.name, 'NuxTelemetryWidget');
    assert.equal(Registry.icons.telemetry, '📊');
});
