import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));

load('components/nux-ai-chat-helpers.js');
const H = window.NuxAiChatHelpers;

function makeEnv(overrides = {}) {
    const env = {
        list: [],
        input: { value: '' },
        isStreaming: { value: false },
        isError: { value: false },
        errorMsg: { value: '' },
        lastSendTime: { value: 0 },
        inputEl: { value: null },
        listEl: { value: null },
        scrollEl: { value: null },
        events: [],
        emittedMessages: 0,
        uiCleared: false,
        props: Object.assign({ sendHandler: null, apiConfig: {}, disabled: false }, overrides.props),
        feat: Object.assign({ streamFallback: true }, overrides.feat),
        inputCfg: Object.assign({ rateLimit: 0 }, overrides.inputCfg),
        emit: function () { env.events.push([].slice.call(arguments)); },
        nextTick: (fn) => fn(),
        emitMessages: () => { env.emittedMessages++; },
        smartScroll: () => {},
        autoResize: () => {},
        postProcessMd: () => {},
        startElapsed: () => {},
        stopElapsed: () => {},
        buildAssistantMsg: () => ({
            id: 'a_test', role: 'assistant', content: '', streaming: true, error: false,
            thinking: '', tools: [], toolCalls: [], references: [], warnings: [], widgets: [],
            meta: null, credibility: null, showReasoning: false, created_at: new Date().toISOString()
        }),
        clearUiState: () => { env.uiCleared = true; },
    };
    return env;
}

const flush = () => new Promise((r) => setImmediate(r));

{
    const env = makeEnv();
    const a = H.createActions(env);
    a.send('   ');
    check('send: 空文本不发起', env.list.length === 0 && !env.isStreaming.value);
}
{
    const env = makeEnv();
    env.isStreaming.value = true;
    const a = H.createActions(env);
    a.send('hi');
    check('send: 流式中拒发', env.list.length === 0);
}
{
    const env = makeEnv();
    env.props.disabled = true;
    const a = H.createActions(env);
    a.send('hi');
    check('send: disabled 拒发', env.list.length === 0);
}
{
    const env = makeEnv();
    env.input.value = '  你好  ';
    let handlerArgs = null;
    env.props.sendHandler = async (text, callbacks) => { handlerArgs = { text, callbacks }; };
    const a = H.createActions(env);
    await a.send();
    check('send: 用户消息+占位助手消息入列', env.list.length === 2 && env.list[0].role === 'user'
        && env.list[0].content === '你好' && env.list[1].role === 'assistant' && env.list[1].streaming === true);
    check('send: input 清空（缺省路径）', env.input.value === '');
    check('send: 状态置位+send/stream-start 事件', env.isStreaming.value === true
        && env.events.some((e) => e[0] === 'send' && e[1] === '你好')
        && env.events.some((e) => e[0] === 'stream-start'));
    check('send: handler 收到文本与 callbacks', handlerArgs && handlerArgs.text === '你好'
        && typeof handlerArgs.callbacks.onChunk === 'function' && typeof handlerArgs.callbacks.registerStop === 'function');
    handlerArgs.callbacks.onChunk('你', '你好世');
    check('send: onChunk 更新 content+chunk 事件', env.list[1].content === '你好世'
        && env.events.some((e) => e[0] === 'chunk'));
    handlerArgs.callbacks.onDone('你好世界');
    check('send: onDone 收敛 streaming=false+isStreaming 复位', env.list[1].streaming === false && env.isStreaming.value === false);
    const doneEvt = env.events.find((e) => e[0] === 'done');
    check('send: done 事件带已流式内容与消息体（full 不覆盖已有 content）', doneEvt
        && doneEvt[1] === '你好世' && doneEvt[2] === env.list[1]);
    const endEvts = env.events.filter((e) => e[0] === 'stream-end');
    check('send: stream-end(true) 恰一次', endEvts.length === 1 && endEvts[0][1] === true);
}
{
    const env = makeEnv();
    env.props.sendHandler = async (text, cb) => { cb.onDone('兜底内容'); };
    const a = H.createActions(env);
    await a.send('q');
    check('onDone: content 为空时 full 兜底写回', env.list[1].content === '兜底内容');
}
{
    const env = makeEnv();
    env.input.value = '草稿';
    env.props.sendHandler = async () => {};
    const a = H.createActions(env);
    await a.send('快捷指令');
    check('send(显式 content): input 草稿保留', env.input.value === '草稿');
}
{
    const env = makeEnv();
    env.inputCfg.rateLimit = 60000;
    env.props.sendHandler = async () => {};
    const a = H.createActions(env);
    await a.send('第一条');
    await a.send('第二条');
    check('rateLimit: 间隔内第二次拒发', env.list.length === 2 && env.list[0].content === '第一条');
}
{
    const env = makeEnv();
    env.feat.streamFallback = false;
    env.props.sendHandler = async (text, cb) => { cb.onError(new Error('网络断了')); };
    const a = H.createActions(env);
    await a.send('q');
    check('onError: assistant 错误态置位', env.list[1].error === true && env.list[1].streaming === false);
    check('onError: 组件错误态+人话消息透传', env.isError.value === true && env.errorMsg.value === '网络断了');
    const errEvt = env.events.find((e) => e[0] === 'error');
    check('onError: error 事件带消息与消息体', errEvt && errEvt[1] === '网络断了' && errEvt[2] === env.list[1]);
    check('onError: stream-end(false)', env.events.some((e) => e[0] === 'stream-end' && e[1] === false));
}
{
    const env = makeEnv();
    env.feat.streamFallback = false;
    env.props.sendHandler = async (text, cb) => { cb.onError({}); };
    const a = H.createActions(env);
    await a.send('q');
    check('onError: 缺 message 走默认文案', env.errorMsg.value === 'AI服务暂时不可用');
}
{
    const env = makeEnv();
    env.props.apiConfig.fallbackUrl = '/api/fallback';
    env.props.apiConfig.apiInstance = { post: async () => ({ data: { content: '降级内容' } }) };
    env.props.sendHandler = async (text, cb) => { cb.onError(new Error('流断了')); };
    const a = H.createActions(env);
    await a.send('q');
    check('fallback: 降级成功写入内容且不置错', env.list[1].content === '降级内容' && env.list[1].error === false);
    check('fallback: done 事件收口', env.events.some((e) => e[0] === 'done') && !env.events.some((e) => e[0] === 'error'));
}
{
    const env = makeEnv();
    env.props.apiConfig.fallbackUrl = '/api/fallback';
    env.props.apiConfig.apiInstance = { post: async () => { throw new Error('降级也断'); } };
    env.props.sendHandler = async (text, cb) => { cb.onError(new Error('流断了')); };
    const a = H.createActions(env);
    await a.send('q');
    check('fallback 失败: 错误收敛带降级原因', env.list[1].error === true && env.errorMsg.value === '降级也断'
        && env.events.some((e) => e[0] === 'error'));
}
{
    const env = makeEnv();
    env.feat.streamFallback = false;
    env.props.sendHandler = async () => { throw new Error('同步炸了'); };
    const a = H.createActions(env);
    await a.send('q');
    check('handler 异常: settle 收敛不复位悬浮', env.list[1].error === true && env.errorMsg.value === '同步炸了'
        && env.isStreaming.value === false);
}
{
    const env = makeEnv();
    let cbs = null;
    let stopRegistered = false;
    env.props.sendHandler = async (text, cb) => {
        cbs = cb;
        cb.registerStop(() => { stopRegistered = true; });
        await new Promise(() => {});
    };
    const a = H.createActions(env);
    a.send('q');
    await flush();
    a.stop();
    check('stop: registerStop 被调', stopRegistered === true);
    check('stop: isStreaming 复位+stop/stream-end(true) 事件', env.isStreaming.value === false
        && env.events.some((e) => e[0] === 'stop')
        && env.events.some((e) => e[0] === 'stream-end' && e[1] === true));
    check('stop: 空内容占位写「（已停止生成）」', env.list[1].streaming === false && env.list[1].content === '（已停止生成）');
    cbs.onError(new Error('迟到的错误'));
    check('stop 后: 迟到错误按完成收敛不置错', !env.list[1].error && !env.events.some((e) => e[0] === 'error'));
}
{
    const env = makeEnv();
    const a = H.createActions(env);
    a.stop();
    check('stop: 空闲态 no-op', env.events.length === 0);
}
{
    const env = makeEnv();
    const a = H.createActions(env);
    env.list.push({ id: 'u1', role: 'user', content: '第一问' }, { id: 'a1', role: 'assistant', content: '', streaming: false, error: true });
    env.isError.value = true;
    env.errorMsg.value = 'x';
    env.props.sendHandler = async () => {};
    a.retry();
    check('retry: 弹出末条并以倒数第二条重发', env.list.length === 3 && env.list[0].content === '第一问'
        && env.list[2].streaming === true && env.list[1].content === '第一问');
    check('retry: 错误态清除+retry 事件带目标', env.isError.value === false && env.errorMsg.value === ''
        && env.events.some((e) => e[0] === 'retry' && e[1].content === '第一问'));
}
{
    const env = makeEnv();
    const a = H.createActions(env);
    env.list.push({ id: 'u1', role: 'user', content: '唯一一条' });
    a.retry();
    check('retry: 无可重试目标 no-op', env.list.length === 1 && !env.isStreaming.value);
}
{
    const env = makeEnv();
    const a = H.createActions(env);
    env.isStreaming.value = true;
    env.list.push({ id: 'a1', role: 'assistant', content: 'x', streaming: true });
    a.clear();
    check('clear: 全清+uiState 复位+clear 事件+流式复位', env.list.length === 0 && env.uiCleared === true
        && env.events.some((e) => e[0] === 'clear') && env.isStreaming.value === false);
}
{
    const env = makeEnv();
    let stoppedBy = '';
    env.props.sendHandler = async (text, cb) => {
        cb.registerStop(() => { stoppedBy = 'stopFn'; });
        await new Promise(() => {});
    };
    const a = H.createActions(env);
    a.send('q');
    await flush();
    a.abort();
    check('abort: stopFn 优先触发', stoppedBy === 'stopFn');
    check('abort: 静默清理（无 stop/stream-end 事件）', !env.events.some((e) => e[0] === 'stop' || e[0] === 'stream-end'));
}
{
    const env = makeEnv();
    let usedDefault = false;
    env.props.apiConfig.streamUrl = '/api/chat/stream';
    env.props.sendHandler = null;
    window.NexusApi = class { };
    window.NexusChat = { ChatController: class { constructor(cfg) { usedDefault = !!cfg.api && cfg.url === '/api/chat/stream'; } start() {} stop() {} } };
    const a = H.createActions(env);
    const p = a.send('q');
    await flush();
    check('defaultSend: 无 handler 时走 createStreamController', usedDefault === true);
    delete window.NexusApi;
    delete window.NexusChat;
}

// ---- S64 对话控制面：regenerate / editResend / 消息级失败文案 ----
{
    const env = makeEnv();
    env.props.sendHandler = async () => {};
    const a = H.createActions(env);
    env.list.push({ id: 'u1', role: 'user', content: '第一问' }, { id: 'a1', role: 'assistant', content: '答一' });
    a.regenerate();
    check('regenerate: feat.chatActions 默认关时 no-op', env.list.length === 2 && !env.isStreaming.value);
}
{
    const env = makeEnv();
    env.feat.chatActions = true;
    env.props.sendHandler = async (text, cb) => { cb.onDone('重新生成的答案'); };
    const a = H.createActions(env);
    env.list.push(
        { id: 'u1', role: 'user', content: '第一问' },
        { id: 'a1', role: 'assistant', content: '答一' },
        { id: 'u2', role: 'user', content: '第二问' },
        { id: 'a2', role: 'assistant', content: '答二' }
    );
    await a.regenerate(env.list[1]);
    check('regenerate: 从中途 assistant 截断（目标消息及其后全删）', env.list.length === 2
        && env.list[0].id === 'u1' && env.list[1].role === 'assistant');
    check('regenerate: 用户消息不重复 push 且内容保留', env.list.filter((m) => m.role === 'user').length === 1
        && env.list[0].content === '第一问');
    check('regenerate: 新流推进完成', env.list[1].content === '重新生成的答案' && env.list[1].streaming === false);
    check('regenerate: regenerate 事件带重发文本', env.events.some((e) => e[0] === 'regenerate' && e[1] === '第一问'));
    check('regenerate: 不补发 send 事件', !env.events.some((e) => e[0] === 'send'));
}
{
    const env = makeEnv();
    env.feat.chatActions = true;
    env.props.sendHandler = async () => {};
    const a = H.createActions(env);
    env.isStreaming.value = true;
    env.list.push({ id: 'u1', role: 'user', content: 'q' }, { id: 'a1', role: 'assistant', content: 'a' });
    a.regenerate();
    check('regenerate: 流式中拒发', env.list.length === 2);
}
{
    const env = makeEnv();
    env.feat.chatActions = true;
    env.props.sendHandler = async () => {};
    const a = H.createActions(env);
    env.list.push({ id: 'a1', role: 'assistant', content: '孤立的助手消息' });
    a.regenerate();
    check('regenerate: 无前置用户消息 no-op', env.list.length === 1 && !env.isStreaming.value);
}
{
    const env = makeEnv();
    env.feat.chatActions = true;
    env.props.sendHandler = async (text, cb) => { cb.onDone('按新文案的回答'); };
    const a = H.createActions(env);
    env.list.push(
        { id: 'u1', role: 'user', content: '旧文案' },
        { id: 'a1', role: 'assistant', content: '旧回答' },
        { id: 'u2', role: 'user', content: '另一问' }
    );
    await a.editResend(env.list[0], '新文案');
    check('editResend: 用户消息就地改写', env.list[0].content === '新文案' && env.list[0].id === 'u1');
    check('editResend: 该轮之后全部截断', env.list.length === 2 && env.list[1].role === 'assistant');
    check('editResend: 新流完成', env.list[1].content === '按新文案的回答');
    check('editResend: edit-resend 事件带新文案', env.events.some((e) => e[0] === 'edit-resend' && e[1] === '新文案'));
}
{
    const env = makeEnv();
    env.feat.chatActions = true;
    env.props.sendHandler = async () => {};
    const a = H.createActions(env);
    env.list.push({ id: 'u1', role: 'user', content: 'q' }, { id: 'a1', role: 'assistant', content: 'a' });
    a.editResend(env.list[1], 'x');
    check('editResend: 非 user 消息拒发', env.list.length === 2 && !env.isStreaming.value);
    a.editResend(env.list[0], '   ');
    check('editResend: 空文本拒发', env.list.length === 2 && !env.isStreaming.value);
}
{
    const env = makeEnv();
    env.feat.streamFallback = false;
    env.props.sendHandler = async (text, cb) => { cb.onError(new Error('这条会失败')); };
    const a = H.createActions(env);
    await a.send('q');
    await a.send('q2');
    check('settle: 失败文案落消息级 errorMsg（首条不被末条覆盖）',
        env.list[1].errorMsg === '这条会失败' && env.list[3].errorMsg === '这条会失败');
}

let pass = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
    if (ok) pass++;
}
console.log(pass + '/' + results.length + ' passed');
if (pass !== results.length) process.exit(1);
