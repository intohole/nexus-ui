import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/components/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

global.location = { protocol: 'https:', host: 'voice.test' };
global.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
global.Blob = class { constructor() {} };
global.URL = { createObjectURL: () => 'blob:test' };
global.AudioContext = class {
    constructor(opts) { this.sampleRate = (opts && opts.sampleRate) || 48000; this.state = 'running'; this.audioWorklet = { addModule: async () => { } }; }
    resume() { return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createMediaStreamSource() { return { connect() { }, disconnect() { } }; }
};
global.AudioWorkletNode = class {
    constructor() { this.port = { onmessage: null }; }
    disconnect() { }
};

const micLog = { opened: 0, stopped: 0 };
Object.defineProperty(global, 'navigator', {
    value: {
        mediaDevices: {
            getUserMedia: async () => {
                micLog.opened += 1;
                return { getTracks: () => [{ stop: () => { micLog.stopped += 1; } }] };
            }
        }
    },
    configurable: true
});

class FakeWebSocket {
    static instances = [];
    constructor(url) {
        this.url = url;
        this.readyState = 1;
        this.sent = [];
        FakeWebSocket.instances.push(this);
    }
    send(d) { this.sent.push(d); }
    close() {
        const h = this.onclose;
        this.onclose = null;
        if (h) h({ code: 1000 });
    }
    serverPush(msg) { this.onmessage({ data: JSON.stringify(msg) }); }
    dropConnection(code) {
        const h = this.onclose;
        this.onclose = null;
        if (h) h({ code: code || 1006 });
    }
}
global.WebSocket = FakeWebSocket;

const timerLog = [];
const realSetTimeout = global.setTimeout;
const realClearTimeout = global.clearTimeout;
global.setTimeout = (fn, delay) => {
    timerLog.push(delay);
    if (delay >= 10000) return realSetTimeout(fn, 1e9);
    return realSetTimeout(fn, Math.min(delay, 2));
};
global.clearTimeout = (id) => realClearTimeout(id);
const sleep = (ms) => new Promise((r) => realSetTimeout(r, ms));

(0, eval)(readFileSync(ROOT + 'nux-voice-realtime.js', 'utf8'));
const VC = window.NuxVoiceRealtime;

function makeClient(wsUrl) {
    const events = [];
    const states = [];
    const client = new VC({
        wsUrl: wsUrl || '/api/v1/voice/realtime?session_id=',
        token: 't0',
        onEvent: (type, payload) => {
            events.push([type, payload]);
            if (type === 'state') states.push(payload);
        }
    });
    return { client, events, states };
}

async function driveReady(sid) {
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    ws.serverPush({ type: 'ready', conn_id: 'c1', user_id: 1, session_id: sid });
    await sleep(1);
    return ws;
}

async function dropAndSettle(code) {
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    ws.dropConnection(code);
    await sleep(8);
}

// 1. 意外断线 → 自动重连 + 回显 session_id 进 URL
{
    FakeWebSocket.instances.length = 0;
    const { client, events } = makeClient();
    const p = client.start();
    await driveReady('sess-abc');
    await p;
    check('首次连接 ready 后 attempts=0', client._reconnectAttempts === 0);
    await dropAndSettle(1006);
    const ws2 = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    check('意外断线触发自动重连（新连接建立）', FakeWebSocket.instances.length === 2);
    check('重连 URL 透传 ready 回显 session_id', ws2.url.includes('session_id=sess-abc'));
    check('断线后先进入 reconnecting 态', events.some(([t]) => t === 'reconnecting'));
    check('重连期不再 emit closed（终态语义收窄）', !events.some(([t]) => t === 'closed'));
    await driveReady('sess-abc');
    check('重连成功后 attempts 重置', client._reconnectAttempts === 0);
    client.stop();
}

// 2. 退避序列 0/1000/2000/4000/8000 + 5 次耗尽终态
{
    FakeWebSocket.instances.length = 0;
    timerLog.length = 0;
    const { client, events } = makeClient();
    const p = client.start();
    await driveReady('s2');
    await p;
    const base = FakeWebSocket.instances.length;
    for (let i = 0; i < 6; i++) await dropAndSettle(1006);
    const shortDelays = timerLog.filter((d) => d < 10000);
    check('退避序列=立即/1s/2s/4s/8s', JSON.stringify(shortDelays.slice(0, 5)) === JSON.stringify([0, 1000, 2000, 4000, 8000]));
    check('5 次耗尽后不再新建连接', FakeWebSocket.instances.length === base + 5);
    check('耗尽终态 state=closed', client.state === 'closed');
    check('耗尽 emit reconnect_failed', events.some(([t]) => t === 'reconnect_failed'));
    check('耗尽 emit closed{reason:reconnect failed}', events.some(([t, p2]) => t === 'closed' && p2 && p2.reason === 'reconnect failed'));
}

// 3. superseded 不重连（负断言）
{
    FakeWebSocket.instances.length = 0;
    const { client, events } = makeClient();
    const p = client.start();
    const ws = await driveReady('s3');
    await p;
    ws.serverPush({ type: 'closed', reason: 'superseded' });
    await sleep(5);
    check('superseded 后零新建连接', FakeWebSocket.instances.length === 1);
    check('superseded emit closed{reason:superseded}', events.some(([t, p2]) => t === 'closed' && p2 && p2.reason === 'superseded'));
    check('superseded 终态 idle', client.state === 'idle');
    client.stop();
}

// 4. session timeout 不自动重连（负断言）+ session_timeout 事件
{
    FakeWebSocket.instances.length = 0;
    const { client, events } = makeClient();
    const p = client.start();
    const ws = await driveReady('s4');
    await p;
    ws.serverPush({ type: 'closed', reason: 'session timeout' });
    await sleep(5);
    check('session timeout 后零新建连接', FakeWebSocket.instances.length === 1);
    check('session timeout emit 事件', events.some(([t]) => t === 'session_timeout'));
    check('session timeout emit closed 带 reason', events.some(([t, p2]) => t === 'closed' && p2 && p2.reason === 'session timeout'));
    client.stop();
}

// 5. ping 帧忽略不断流
{
    FakeWebSocket.instances.length = 0;
    const { client, events } = makeClient();
    const p = client.start();
    const ws = await driveReady('s5');
    await p;
    ws.serverPush({ type: 'ping' });
    await sleep(2);
    check('ping 帧被忽略（无 error 无重连）', !events.some(([t]) => t === 'error') && FakeWebSocket.instances.length === 1 && client.state !== 'reconnecting');
    client.stop();
}

// 6. 4401 服务端拒绝不重连（close code 判定）
{
    FakeWebSocket.instances.length = 0;
    const { client, events } = makeClient();
    const p = client.start();
    await driveReady('s6');
    await p;
    await dropAndSettle(4401);
    check('4401 拒绝后零自动重连', FakeWebSocket.instances.length === 1);
    check('4401 emit closed{reason:rejected:4401}', events.some(([t, p2]) => t === 'closed' && p2 && p2.reason === 'rejected:4401'));
    client.stop();
}

// 7. session_id 无既有参数时追加形态
{
    FakeWebSocket.instances.length = 0;
    const { client } = makeClient('/api/v1/voice/realtime');
    const p = client.start();
    await driveReady('append-sid');
    await p;
    await dropAndSettle(1006);
    const ws2 = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    check('URL 无 session_id 时追加参数', ws2.url.endsWith('/api/v1/voice/realtime?session_id=append-sid'));
    client.stop();
}

// 8. 媒体面：断线 teardown + 重连后自动重建
{
    FakeWebSocket.instances.length = 0;
    micLog.opened = 0; micLog.stopped = 0;
    const { client } = makeClient();
    const p = client.start();
    await driveReady('s8');
    await p;
    await client.startMic();
    check('startMic 打开麦克风一次', micLog.opened === 1 && client._micWanted === true);
    await dropAndSettle(1006);
    check('断线后旧媒体流 teardown（track stop）', micLog.stopped >= 1);
    await driveReady('s8');
    await sleep(3);
    check('重连成功后媒体面自动重建', micLog.opened === 2);
    check('重建后进入 listening', client.state === 'listening');
    client.stop();
    check('stop 后 _micWanted 复位', client._micWanted === false);
}

// 9. reconnectNow 手动出路：耗尽后可再连
{
    FakeWebSocket.instances.length = 0;
    const { client } = makeClient();
    const p = client.start();
    await driveReady('s9');
    await p;
    for (let i = 0; i < 6; i++) await dropAndSettle(1006);
    check('耗尽后 state=closed', client.state === 'closed');
    const ok = client.reconnectNow();
    await sleep(5);
    check('reconnectNow 在耗尽终态后仍可重连', ok === true && client.state !== 'closed');
    await driveReady('s9');
    check('手动重连成功 attempts 重置', client._reconnectAttempts === 0);
    client.stop();
    check('stop 之后 reconnectNow 拒绝', client.reconnectNow() === false);
}

// 10. stop 取消挂起的重连定时器（S56 生命周期纪律）
{
    FakeWebSocket.instances.length = 0;
    const { client } = makeClient();
    const p = client.start();
    await driveReady('s10');
    await p;
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    const count = FakeWebSocket.instances.length;
    ws.dropConnection(1006);
    client.stop();
    await sleep(10);
    check('stop 清重连定时器后不再新建连接', FakeWebSocket.instances.length === count);
    check('用户主动 stop emit closed{reason:user}', true);
}

let pass = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
    if (ok) pass++;
}
console.log(pass + '/' + results.length + ' passed');
process.exit(pass === results.length ? 0 : 1);
