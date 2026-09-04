(function () {
    const DEFAULT_IDLE_TIMEOUT = 90000;

    class NexusStreamError extends Error {
        constructor(message, status) {
            super(message);
            this.name = 'NexusStreamError';
            this.status = status;
        }
    }

    function _parseEvent(line, defaultEvent) {
        const match = /^data:\s?/.exec(line);
        if (!match) return null;
        const raw = line.slice(match[0].length).trim();
        if (!raw || raw === '[DONE]') return null;
        let data = raw;
        try { data = JSON.parse(raw); } catch (e) { }
        const event = (data && typeof data === 'object' && !Array.isArray(data) && data.type)
            ? data.type : defaultEvent;
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
                throw new Error('HTTP ' + resp.status + ' ' + text.slice(0, 200));
            }
            if (!resp.body) return;

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            resetWatchdog();
            while (true) {
                const { done, value } = await reader.read();
                resetWatchdog();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const evt = _parseEvent(line, defaultEvent);
                    if (evt) yield evt;
                }
            }
            if (buffer) {
                const evt = _parseEvent(buffer, defaultEvent);
                if (evt) yield evt;
            }
        } catch (e) {
            if (timedOut) throw new Error('连接超时，请重试');
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
                    const evt = _parseEvent(line, 'message');
                    if (evt && onChunk) onChunk(evt.data, evt.event);
                }
            }
            if (buffer) {
                const evt = _parseEvent(buffer, 'message');
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