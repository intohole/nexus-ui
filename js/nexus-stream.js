(function () {
    const DEFAULT_IDLE_TIMEOUT = 90000;

    class NexusStreamError extends Error {
        constructor(message, status, code) {
            super(message);
            this.name = 'NexusStreamError';
            this.status = status;
            this.code = code || null;
        }
    }

    // SSE 帧解析单一实现。priority 决定事件名判定策略：
    // - 'data-type'：data.type 优先（NexusStream 默认约定）
    // - 'sse-event'：event: 行优先，无则 null（NexusApi.streamPost 约定）
    // - 'data-type-then-sse-event'：data.type → event: 行 → defaultEvent（ChatController 约定）
    function _parseSseLine(line, opts) {
        const { defaultEvent = 'message', priority = 'data-type', state = null } = opts || {};
        if (state && line === '') {
            state.sseEvent = null;
            return null;
        }
        if (state && /^event:/.test(line)) {
            state.sseEvent = line.slice(6).trim();
            return null;
        }
        const match = /^data:\s?/.exec(line);
        if (!match) return null;
        const raw = line.slice(match[0].length).trim();
        if (!raw || raw === '[DONE]') return null;
        let data = raw;
        try { data = JSON.parse(raw); } catch (e) { }
        const hasType = data && typeof data === 'object' && !Array.isArray(data) && data.type;
        let event;
        if (priority === 'sse-event') {
            event = state ? state.sseEvent : null;
        } else if (priority === 'data-type-then-sse-event') {
            event = hasType || (state && state.sseEvent) || defaultEvent;
        } else {
            event = hasType || defaultEvent;
        }
        return { event, data, raw };
    }

    async function* post(url, options = {}) {
        const {
            body,
            headers,
            signal = null,
            idleTimeout = DEFAULT_IDLE_TIMEOUT,
            onUnauthorized = null,
            clearAuth = null,
            defaultEvent = 'message',
            priority = 'data-type',
            method = 'POST',
        } = options;

        const ctrl = new AbortController();
        let watchdog = null;
        let timedOut = false;
        const abort = () => { try { ctrl.abort(); } catch (e) { } };
        const resetWatchdog = () => {
            if (!idleTimeout) return;
            if (watchdog) clearTimeout(watchdog);
            watchdog = setTimeout(() => { timedOut = true; abort(); }, idleTimeout);
        };
        if (signal && signal.aborted) abort();
        if (signal) signal.addEventListener('abort', abort, { once: true });
        resetWatchdog();

        try {
            const resp = await fetch(url, {
                method,
                headers,
                body,
                signal: ctrl.signal,
            });
            if (!resp.ok) {
                if (resp.status === 401) {
                    if (clearAuth) clearAuth();
                    if (onUnauthorized) onUnauthorized();
                    throw new NexusStreamError('登录已过期，请重新登录', 401);
                }
                const text = await resp.text().catch(() => '');
                throw new NexusStreamError('HTTP ' + resp.status + ' ' + text.slice(0, 200), resp.status);
            }
            if (!resp.body) return;

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            const state = { sseEvent: null };
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                resetWatchdog();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const evt = _parseSseLine(line, { defaultEvent, priority, state });
                    if (evt) yield evt;
                }
            }
            if (buffer) {
                const evt = _parseSseLine(buffer, { defaultEvent, priority, state });
                if (evt) yield evt;
            }
        } catch (e) {
            if (timedOut) throw new NexusStreamError('连接超时，请重试', null, 'timeout');
            throw e;
        } finally {
            if (watchdog) clearTimeout(watchdog);
            if (signal) signal.removeEventListener('abort', abort);
            try { ctrl.abort(); } catch (e) { }
        }
    }

    async function read(response, options = {}) {
        const { onChunk, onDone, onError } = options;
        if (!response || !response.body) {
            if (onDone) onDone();
            return;
        }
        try {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const evt = _parseSseLine(line, { defaultEvent: 'message' });
                    if (evt && onChunk) onChunk(evt.data, evt.event);
                }
            }
            if (buffer) {
                const evt = _parseSseLine(buffer, { defaultEvent: 'message' });
                if (evt && onChunk) onChunk(evt.data, evt.event);
            }
            if (onDone) onDone();
        } catch (e) {
            if (onError) onError(e);
            else throw e;
        }
    }

    async function consume(url, options = {}) {
        const { onEvent, onDone, onError } = options;
        try {
            for await (const evt of post(url, options)) {
                if (onEvent) onEvent(evt.event, evt.data, evt.raw);
            }
            if (onDone) onDone();
        } catch (e) {
            if (onError) onError(e);
            else throw e;
        }
    }

    // 长连接订阅编排：指数退避重连（含抖动）+空闲看门狗+终态收口。
    // 语义参照 MiaoBi sse.js 的 subscribePath（工作区唯一自写重连实现）收编：
    // onDone/onError/空闲超时 → 退避重试（>maxRetries 回落 {type:'disconnect'}）；
    // data.type 命中 terminalTypes → 终态收口 onClose(data)；abort() → {type:'abort'}。
    function subscribe(url, options = {}) {
        const {
            headers = null,
            method = 'GET',
            body = null,
            idleTimeout = DEFAULT_IDLE_TIMEOUT,
            maxRetries = 2,
            backoffBase = 1000,
            backoffMax = 30000,
            terminalTypes = ['done', 'ready', 'failed', 'error'],
            pathPrefix = true,
            onEvent = null,
            onClose = null,
        } = options;
        const fullUrl = (pathPrefix && url.charAt(0) === '/' && window.PATH_PREFIX)
            ? window.PATH_PREFIX + url : url;

        let closed = false;
        let stopping = false;
        let controller = null;
        let retries = 0;
        let idleTimer = null;
        let backoffTimer = null;

        function finish(evt) {
            if (closed) return;
            closed = true;
            if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
            if (backoffTimer) { clearTimeout(backoffTimer); backoffTimer = null; }
            if (controller) { try { controller.abort(); } catch (e) { } controller = null; }
            if (onClose) onClose(evt);
        }
        function armIdle() {
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => { if (!closed && !stopping) reconnect(); }, idleTimeout);
        }
        function reconnect() {
            if (closed || stopping) return;
            retries += 1;
            if (retries > maxRetries) { finish({ type: 'disconnect' }); return; }
            if (controller) { try { controller.abort(); } catch (e) { } }
            const delay = Math.min(backoffMax, backoffBase * Math.pow(2, retries - 1)) * (0.8 + Math.random() * 0.4);
            backoffTimer = setTimeout(start, delay);
        }
        function start() {
            if (closed || stopping) return;
            controller = new AbortController();
            const ctrl = controller;
            armIdle();
            (async () => {
                try {
                    const resp = await fetch(fullUrl, { method, headers, body, signal: ctrl.signal });
                    if (!resp.ok || !resp.body) {
                        finish({ type: 'error', message: '连接失败(' + resp.status + ')' });
                        return;
                    }
                    await read(resp, {
                        onChunk: (data, event) => {
                            if (!data || typeof data !== 'object') return;
                            armIdle();
                            if (onEvent) onEvent(data, event);
                            if (data.type && terminalTypes.indexOf(data.type) >= 0) {
                                retries = maxRetries + 1;
                                finish(data);
                            }
                        },
                        onDone: () => reconnect(),
                        onError: () => { if (closed) return; reconnect(); },
                    });
                } catch (e) {
                    if (closed) return;
                    reconnect();
                }
            })();
        }
        start();
        return {
            abort: function () {
                stopping = true;
                finish({ type: 'abort' });
            },
        };
    }

    window.NexusStream = { post, read, consume, subscribe };
})();