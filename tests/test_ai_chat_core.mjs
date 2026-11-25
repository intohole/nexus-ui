import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const flush = () => new Promise((r) => setImmediate(r));

const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));
load('nexus-chat.js');
load('nexus-ai-chat-core.js');
const Core = window.NuxAiChatCore;

/* ---------- 附件族 ---------- */
{
    const att = Core.attachmentFrom({ name: 'a.png', size: 10, type: 'image/png' });
    check('attachmentFrom: 形状与 pending 初态', !!att.id && att.status === 'pending' && att.name === 'a.png');
}
{
    const cfg = { attachmentMaxCount: 2, attachmentMaxSizeMb: 1 };
    const files = [{ size: 100 }, { size: 100 }, { size: 100 }, { size: 100 }];
    const out = Core.filterAttachmentFiles(files, [], cfg);
    check('filter: 超出 maxCount 截断且计数', out.accepted.length === 2 && out.overflow === 2 && out.oversize === 0);
    const out2 = Core.filterAttachmentFiles([{ size: 2 * 1024 * 1024 }], [], cfg);
    check('filter: 超限计 oversize', out2.accepted.length === 0 && out2.oversize === 1);
    const out3 = Core.filterAttachmentFiles([{ size: 1 }], [{}, {}, {}, {}], { attachmentMaxCount: 4, attachmentMaxSizeMb: 10 });
    check('filter: 满仓无容量→overflow=1 拒入', out3.overflow === 1 && out3.accepted.length === 0);
    const out4 = Core.filterAttachmentFiles([], [], { attachmentMaxCount: 4, attachmentMaxSizeMb: 10 });
    check('filter: 空列表负 overflow 形状守恒（>0 守卫在组件，前18 判例）', out4.overflow === -4 && out4.accepted.length === 0);
}
{
    const att = { status: 'pending', url: '', error: '' };
    Core.uploadAttachment(att, async () => ({ url: 'https://x/y' }));
    await flush();
    check('upload: 成功态 done+url', att.status === 'done' && att.url === 'https://x/y');
    const att2 = { status: 'pending', url: '', error: '' };
    Core.uploadAttachment(att2, async () => ({}));
    await flush();
    check('upload: 缺 url 判错', att2.status === 'error' && att2.error === '上传响应缺少 url');
    const att3 = { status: 'pending', url: '', error: '' };
    Core.uploadAttachment(att3, async () => { throw new Error('net down'); });
    await flush();
    check('upload: 异常判错带原因', att3.status === 'error' && att3.error === 'net down');
}
{
    const list = [{ id: 1, name: 'a', size: 1, type: 't', status: 'done', url: 'u' }];
    const snap = Core.snapshotAttachments(list);
    check('snapshot: 快照字段+原数组清空', snap.length === 1 && snap[0].id === 1 && list.length === 0);
    check('snapshot: 空数组返回 null', Core.snapshotAttachments([]) === null);
}

/* ---------- 流式渲染器工厂 ---------- */
function installRaf() {
    let n = 0;
    const rafQ = [];
    global.requestAnimationFrame = (fn) => { rafQ.push(fn); return ++n; };
    global.cancelAnimationFrame = (id) => { /* mark */ };
    return { drain: async () => { while (rafQ.length) { rafQ.shift()(); await flush(); } }, rafQ };
}
{
    const raf = installRaf();
    let sdCalls = 0;
    window.NexusStreamdown = { update: (content, s) => { sdCalls += 1; s.usedContent = content; return { stableHtml: '<p>' + content + '</p>', activeHtml: '' }; } };
    window.NexusMarkdown = {};
    const list = [];
    const m = { content: '第一段', streaming: true };
    list.push(m);
    const st = Core.createStreamers({ list, enabled: () => true, inList: (x) => list.includes(x) });
    st.refreshStream(m);
    st.refreshStream(m);
    await raf.drain();
    check('streamers: 稳定区写入+同帧合帧（两次刷新一帧只渲一次）', m.stableHtml === '<p>第一段</p>' && sdCalls === 1);
    m.content = '第二段';
    st.refreshStream(m);
    await raf.drain();
    check('streamers: 新帧推进重渲', sdCalls === 2 && m.stableHtml === '<p>第二段</p>');
    m.streaming = false;
    st.refreshStream(m);
    await raf.drain();
    check('streamers: 非流式跳过', sdCalls === 2);
    const off = Core.createStreamers({ list, enabled: () => false, inList: () => true });
    m.streaming = true;
    off.refreshStream(m);
    await raf.drain();
    check('streamers: enabled=false 门控', sdCalls === 2);
    delete window.NexusStreamdown;
    delete window.NexusMarkdown;
}

/* ---------- 编辑重发工厂 ---------- */
{
    const feat = { chatActions: true, editResend: 'local' };
    const isStreaming = { value: false };
    let resendArgs = null;
    const st = Core.createEditResend({
        feat, isStreaming,
        disabled: () => false,
        editResend: (m, t) => { resendArgs = [m, t]; }
    });
    const m = { role: 'user', content: '旧文案' };
    st.startEdit(m);
    check('edit: startEdit 置草稿+编辑态', m._editing === true && m._editDraft === '旧文案');
    st.confirmEdit(m);
    check('edit: 同文案 no-op（不重发不退编辑态外溢）', resendArgs === null);
    st.startEdit(m);
    m._editDraft = '  新文案  ';
    st.confirmEdit(m);
    check('edit: 新文案 trim 后重发', resendArgs && resendArgs[1] === '新文案' && m._editing === false);
    const sentBefore = resendArgs[1];
    st.startEdit(m);
    m._editDraft = m.content;
    st.confirmEdit(m);
    check('edit: 同文案不重发', resendArgs[1] === sentBefore && m._editing === false);
    isStreaming.value = true;
    st.startEdit(m);
    check('edit: 流式中拒进编辑态', m._editing === false);
    isStreaming.value = false;
    feat.chatActions = false;
    st.startEdit(m);
    check('edit: chatActions 关拒进', m._editing === false);
}

let failed = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name);
    if (!ok) failed += 1;
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
