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

    window.NexusStream = { post, read, consume };
})();