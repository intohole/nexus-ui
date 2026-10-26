import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));

load('nexus-stream.js');
const NS = window.NexusStream;

function sseResponse(chunks, opts = {}) {
    const enc = new TextEncoder();
    let i = 0;
    return {
        ok: opts.ok !== false,
        status: opts.status || 200,
        text: async () => opts.text || '',
        body: opts.body === null ? null : {
            getReader() {
                return {
                    read: async () => {
                        if (i < chunks.length) return { done: false, value: enc.encode(chunks[i++]) };
                        return { done: true, value: undefined };
                    }
                };
            }
        }
    };
}

function hangingResponse(signal) {
    return {
        ok: true, status: 200,
        body: {
            getReader() {
                return {
                    read: () => new Promise((resolve, reject) => {
                        if (signal && signal.aborted) return reject(new Error('aborted'));
                        if (signal) signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
                    })
                };
            }
        }
    };
}

{
    const calls = [];
    global.fetch = async (url, opt) => { calls.push({ url, opt }); return sseResponse([
        'data: {"type":"thinking","content":"a"}\n\n',
        'data: {"type":"thi',
        'nking","content":"b"}\n\ndata: [DONE]\n\n'
    ]); };
    const got = [];
    for await (const evt of NS.post('/api/chat', { body: 'x' })) got.push(evt);
    check('post: 跨块缓冲完整解析', got.length === 2 && got[0].data.content === 'a' && got[1].data.content === 'b');
    check('post: [DONE] 不产出事件', !got.some((e) => e.raw === '[DONE]'));
    check('post: data.type 优先为事件名', got.every((e) => e.event === 'thinking'));
    check('post: POST 方法与体透传', calls[0].opt.method === 'POST' && calls[0].opt.body === 'x');
}
{
    global.fetch = async () => sseResponse(['event: tool\ndata: {"name":"web_search"}\n\n']);
    const got = [];
    for await (const evt of NS.post('/s', { priority: 'sse-event' })) got.push(evt);
    check('post: sse-event 优先级读 event: 行', got.length === 1 && got[0].event === 'tool');
}
{
    let cleared = false, unauthorized = false;
    global.fetch = async () => ({ ok: false, status: 401, body: null });
    let err = null;
    try {
        for await (const evt of NS.post('/s', { clearAuth: () => { cleared = true; }, onUnauthorized: () => { unauthorized = true; } })) {}
    } catch (e) { err = e; }
    check('post 401: 登录过期错误带状态', err && err.message === '登录已过期，请重新登录' && err.status === 401);
    check('post 401: clearAuth/onUnauthorized 触发', cleared && unauthorized);
}
{
    global.fetch = async () => ({ ok: false, status: 500, text: async () => 'boom', body: null });
    let err = null;
    try { for await (const evt of NS.post('/s')) {} } catch (e) { err = e; }
    check('post 500: HTTP 状态与片段入错误', err && err.status === 500 && err.message.indexOf('HTTP 500') === 0);
}
{
    window.NexusUtils = { authToken: () => 'tok123' };
    let seen = null;
    global.fetch = async (url, opt) => { seen = opt; return sseResponse(['data: {"type":"done"}\n\n']); };
    for await (const evt of NS.post('/s', { auth: true })) {}
    check('post auth: Bearer 头+content-type 基础头', seen.headers.Authorization === 'Bearer tok123'
        && seen.headers['Content-Type'] === 'application/json' && seen.headers.Accept === 'text/event-stream');
    delete window.NexusUtils;
}
{
    global.fetch = async (url, opt) => hangingResponse(opt.signal);
    let err = null;
    try {
        for await (const evt of NS.post('/s', { idleTimeout: 30 })) {}
    } catch (e) { err = e; }
    check('post: 空闲看门狗超时报「连接超时」', err && err.code === 'timeout' && err.message === '连接超时，请重试');
}
{
    global.fetch = async () => sseResponse(['data: {"type":"meta"}\n\n']);
    const seen = [];
    let done = false;
    await NS.consume('/s', { onEvent: (ev, data) => seen.push(data.type), onDone: () => { done = true; } });
    check('consume: onEvent/onDone 收口', seen.length === 1 && seen[0] === 'meta' && done);
}
{
    const enc = new TextEncoder();
    const chunks = [enc.encode('data: {"type":"a"}\n'), enc.encode('data: {"type":"b"}\n\n')];
    let i = 0;
    const resp = { body: { getReader() { return { read: async () => i < chunks.length ? { done: false, value: chunks[i++] } : { done: true } }; } } };
    const got = [];
    await NS.read(resp, { onChunk: (data, event) => got.push(data.type) });
    check('read: 分帧回调逐事件', got.join(',') === 'a,b');
}
{
    let closeEvt = null;
    global.fetch = async () => sseResponse(['data: {"type":"ready"}\n\n']);
    const sub = NS.subscribe('/ws', { onClose: (e) => { closeEvt = e; } });
    sub.abort();
    check('subscribe: abort 立即收口 {type:abort}', closeEvt && closeEvt.type === 'abort');
}

let pass = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
    if (ok) pass++;
}
console.log(pass + '/' + results.length + ' passed');
if (pass !== results.length) process.exit(1);
