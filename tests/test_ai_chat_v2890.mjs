import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

window.NexusUtils = { showToast() {}, injectStyle() {} };
global.document = {
    activeElement: null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, classList: { add() {}, remove() {} } }),
    addEventListener() {},
    removeEventListener() {},
    body: { appendChild() {} }
};
global.Vue = { ref: (v) => ({ value: v }), reactive: (o) => o, computed: (fn) => ({ value: fn() }), nextTick: (fn) => fn() };

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));
load('nexus-chat.js');
load('components/nux-ai-chat-helpers.js');
load('components/nux-interrupt-card.js');
load('nexus-page-transition.js');

const H = window.NuxAiChatHelpers;
const NC = window.NexusChat;

// ---- routeRichEvent interrupt 语义 ----
{
    const msg = {};
    NC.routeRichEvent(msg, 'interrupt', { title: '需要授权', body: '将读取你的日历', payload: { scope: 'calendar' }, allow_edit: true, input_placeholder: '改一下' });
    check('interrupt: 路由挂 msg.interrupt', !!msg.interrupt);
    check('interrupt: title/body 透传', msg.interrupt.title === '需要授权' && msg.interrupt.body === '将读取你的日历');
    check('interrupt: actions 默认 approve/reject', JSON.stringify(msg.interrupt.actions) === '["approve","reject"]');
    check('interrupt: allowEdit/inputPlaceholder', msg.interrupt.allowEdit === true && msg.interrupt.inputPlaceholder === '改一下');
    check('interrupt: id 兜底生成', typeof msg.interrupt.id === 'string' && msg.interrupt.id.length > 0);
    const ev2 = {};
    NC.routeRichEvent(ev2, 'interrupt_request', { actions: ['approve', 'edit', 'retry'] });
    check('interrupt_request: 别名同语义+actions 透传', JSON.stringify(ev2.interrupt.actions) === '["approve","edit","retry"]');
    const msg3 = { interrupt: { id: 'it_1' } };
    NC.routeRichEvent(msg3, 'interrupt_resolve', { id: 'it_1' });
    check('interrupt_resolve: 同 id 清卡', msg3.interrupt === null);
    const msg4 = { interrupt: { id: 'it_1' } };
    NC.routeRichEvent(msg4, 'interrupt_resolve', { id: 'it_9' });
    check('interrupt_resolve: 异 id 不清', !!msg4.interrupt);
    const msg5 = {};
    check('interrupt: 未知事件不误路由', NC.routeRichEvent(msg5, 'nonsense_ev', {}) === false);
}

// ---- 附件纯函数族 ----
{
    const cfg = { attachmentMaxCount: 3, attachmentMaxSizeMb: 1 };
    const files = [
        { name: 'a.png', size: 512 * 1024, type: 'image/png' },
        { name: 'b.pdf', size: 2 * 1024 * 1024, type: 'application/pdf' },
        { name: 'c.txt', size: 10, type: 'text/plain' },
        { name: 'd.txt', size: 10, type: 'text/plain' }
    ];
    const r = H.filterAttachmentFiles(files, [], cfg);
    check('filter: 超限文件剔除', r.accepted.length === 2 && r.accepted[0].name === 'a.png' && r.accepted[2 - 1].name === 'c.txt');
    check('filter: oversize 计数', r.oversize === 1);
    const existing = [{ id: 'x' }, { id: 'y' }];
    const r2 = H.filterAttachmentFiles(files, existing, cfg);
    check('filter: 余量裁剪 room=1', r2.accepted.length === 1 && r2.overflow === 3);

    const store = [{ id: 'a1', name: 'f.png', size: 1, type: 'image/png', status: 'done', url: 'u1' }];
    const snap = H.snapshotAttachments(store);
    check('snapshot: 字段映射+File 不透传', snap.length === 1 && snap[0].url === 'u1' && !('file' in snap[0]) && !('preview' in snap[0]));
    check('snapshot: 原地清空', store.length === 0);
    check('snapshot: 空列表 null', H.snapshotAttachments([]) === null);

    const att = { status: 'pending', url: '', error: '', file: { name: 'x' } };
    H.uploadAttachment(att, async () => ({ url: 'https://x/y.png' }));
    check('upload: 立即置 uploading', att.status === 'uploading');
    await new Promise((r) => setTimeout(r, 10));
    check('upload: done+url 回填', att.status === 'done' && att.url === 'https://x/y.png');

    const att2 = { status: 'pending', url: '', error: '', file: { name: 'y' } };
    H.uploadAttachment(att2, async () => { throw new Error('配额不足'); });
    await new Promise((r) => setTimeout(r, 10));
    check('upload: 失败落 error+文案', att2.status === 'error' && att2.error === '配额不足');

    const att3 = { status: 'pending', url: '', error: '', file: { name: 'z' } };
    H.uploadAttachment(att3, async () => ({ ok: 1 }));
    await new Promise((r) => setTimeout(r, 10));
    check('upload: 缺 url 判 error', att3.status === 'error' && att3.error === '上传响应缺少 url');
}

// ---- TTS 剥离与朗读 ----
{
    const md = '# 标题\n\n这是**加粗**与`代码`混排。\n\n```js\nconst a = 1;\n```\n\n- 列表一\n- 列表二\n\n[链接文字](https://x.y)';
    const out = NC.stripMarkdownForTts(md);
    check('strip-md: 标记符号剥离', !out.includes('#') && !out.includes('**') && !out.includes('`'));
    check('strip-md: 代码块折叠', out.includes('代码省略') && !out.includes('const a'));
    check('strip-md: 链接留文字', out.includes('链接文字') && !out.includes('https://x.y'));
    check('strip-md: 列表行合并', !out.includes('\n- '));

    let speakCalls = [];
    let stopCalls = 0;
    let fakeState = 'idle';
    window.NexusTts = {
        speak: (t) => { speakCalls.push(t); return Promise.resolve(true); },
        stop: () => { stopCalls++; },
        isSpeaking: () => false,
        onState: (cb) => { window._ttsCb = cb; return () => {}; }
    };
    const sid = { value: '' };
    H.speakMessage({ speakingId: sid }, { id: 'm1', content: 'hello **world**' });
    await Promise.resolve();
    check('speak: 内容剥离后进 TTS', speakCalls.length === 1 && speakCalls[0] === 'hello world');
    check('speak: speakingId 挂上', sid.value === 'm1');
    H.speakMessage({ speakingId: sid }, { id: 'm1', content: 'hello' });
    check('speak: 二次触发=停止', stopCalls === 1 && sid.value === '');
    H.speakMessage({ speakingId: sid }, { id: 'm2', content: '' });
    check('speak: 空内容不触发', speakCalls.length === 1);
}

// ---- Interrupt 卡组件契约 ----
{
    const IC = window.NuxInterruptCard;
    check('interrupt-card: 全局导出+模板', IC && IC.template.includes('nc-it') && IC.template.includes('data-nux-interrupt'));
    check('interrupt-card: actions 默认', JSON.stringify(IC.props.actions.default()) === '["approve","reject"]');
    const { ref: _ref } = global.Vue;
    const setupCtx = IC.setup({ actions: ['approve', { action: 'retry', label: '再来' }], payload: { a: 1 }, resolved: false, disabled: false, allowEdit: true }, {
        emit(ev, payload) { setupCtx._last = [ev, payload]; }
    });
    check('interrupt-card: 动作归一化 label/tone', setupCtx.normActions.value[0].label === '同意' && setupCtx.normActions.value[0].tone === 'primary' && setupCtx.normActions.value[1].label === '再来');
    check('interrupt-card: payload JSON 化', setupCtx.payloadText.value.includes('"a": 1'));
    setupCtx.onActionBtn(setupCtx.normActions.value[1]);
    check('interrupt-card: retry 直发', setupCtx._last && setupCtx._last[0] === 'action' && setupCtx._last[1].action === 'retry');
    setupCtx.onActionBtn({ action: 'edit' });
    check('interrupt-card: edit 开编辑态', setupCtx.editing.value === true);
    setupCtx.draft.value = '改成这样';
    setupCtx.confirmEdit();
    check('interrupt-card: edit 提交带 input', setupCtx._last[1].action === 'edit' && setupCtx._last[1].input === '改成这样');
    check('interrupt-card: 提交后关编辑态', setupCtx.editing.value === false);
}

// ---- task-progress 终态语义 ----
{
    const TP = window.NuxAiTaskProgress || undefined;
    check('task-progress: 模板带 is-state 类', TP === undefined || TP.template.includes("'is-state-' + state"));
}

// ---- NexusPageTransition ----
{
    const PT = window.NexusPageTransition;
    check('pt: 导出四件', PT && PT.transition && PT.nameOf && PT.vueTransition && PT.supported);
    check('pt: 无 startViewTransition 时 supported=false', PT.nativeSupported() === false);
    let ran = 0;
    const p = PT.transition(() => { ran++; });
    check('pt: 降级直跳同步执行', ran === 1);
    await p;
    let removed = '';
    const el = { style: { removeProperty(k) { removed = k; delete this.viewTransitionName; } } };
    PT.nameOf(el, 'card');
    check('pt: nameOf 设置', el.style.viewTransitionName === 'card');
    PT.nameOf(el, null);
    check('pt: nameOf 清除', removed === 'view-transition-name' && el.style.viewTransitionName === undefined);
}

// ---- nexus-api null options 加固 ----
{
    global.fetch = () => Promise.reject(new Error('stub-fetch'));
    load('nexus-api.js');
    const api = new window.NexusApi({ baseUrl: 'https://x' });
    let threw = '';
    try { const p = api.get('/y', {}, null); p.catch(() => {}); } catch (e) { threw = e.message; }
    check('api: get(url, params, null) 不再同步炸', threw === '');
    let threw2 = '';
    try { const p2 = api.get('/y', null, {}); p2.catch(() => {}); threw2 = ''; } catch (e) { threw2 = e.message; }
    check('api: get(url, null, {}) 不炸', threw2 === '');
}

let pass = 0, fail = 0;
for (const [name, ok] of results) {
    if (ok) pass++; else { fail++; console.log('FAIL ' + name); }
}
console.log(`test_ai_chat_v2890: ${pass}/${results.length} passed`);
if (fail) process.exit(1);
