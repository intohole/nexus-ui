(function () {
    'use strict';

    const CHAT_VERSION = '1.2.0';

    function delegateMarkdown(text) {
        if (window.NexusMarkdown && typeof window.NexusMarkdown.render === 'function') {
            return window.NexusMarkdown.render(text);
        }
        if (window.NexusMarkdown && typeof window.NexusMarkdown.escapeHtml === 'function') {
            return window.NexusMarkdown.escapeHtml(text).replace(/\n/g, '<br>');
        }
        return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }

    function delegateEscape(str) {
        if (window.NexusMarkdown && typeof window.NexusMarkdown.escapeHtml === 'function') {
            return window.NexusMarkdown.escapeHtml(str);
        }
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    async function delegateInject() {
        if (window.NexusMarkdown && typeof window.NexusMarkdown.injectLibs === 'function') {
            return window.NexusMarkdown.injectLibs();
        }
        return false;
    }

    class ChatController {
        constructor(options) {
            const opts = options || {};
            this.api = opts.api || (window.NexusApi ? new NexusApi() : null);
            this.url = opts.url || '';
            this.body = opts.body || {};
            this.timeout = opts.timeout || 120000;
            this.eventKey = opts.eventKey || 'delta';
            this.contentKey = opts.contentKey || 'content';
            this.doneKey = opts.doneKey || 'done';
            this.onChunk = opts.onChunk || (function () {});
            this.onDone = opts.onDone || (function () {});
            this.onError = opts.onError || (function () {});
            this.onEvent = opts.onEvent || null;
            this.controller = null;
            this.receivedChunks = '';
            this._currentEvent = null;
        }

        get isStreaming() { return this.controller !== null; }

        async start() {
            if (!this.api || !this.url) { this.onError('未配置API或URL'); return; }
            this.receivedChunks = '';
            this.controller = new AbortController();
            const requestId = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            this.api._registerController(requestId, this.controller);
            try {
                for await (const evt of NexusStream.post(`${this.api.baseUrl}${this.url}`, {
                    body: JSON.stringify(this.body),
                    headers: this.api._buildHeaders({ 'Accept': 'text/event-stream' }),
                    signal: this.controller.signal,
                    idleTimeout: this.timeout,
                    priority: 'data-type-then-sse-event',
                    defaultEvent: this.eventKey,
                })) {
                    this._handleData(evt.data, evt.event);
                }
                this.onDone(this.receivedChunks);
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    this.onDone(this.receivedChunks);
                } else if (error && error.code === 'timeout') {
                    this.onError(this.receivedChunks
                        ? '响应超时，已保留前面生成的内容，请重试或缩短问题'
                        : '响应超时，请重试或更换问题');
                } else if (error && error.status === 401) {
                    this.onError('登录已过期，请重新登录');
                } else if (error && error.status) {
                    const m = /^HTTP \d+ (.*)$/s.exec(error.message || '');
                    let msg = null;
                    if (m) {
                        try { msg = this.api._extractError(JSON.parse(m[1])); } catch (e) { }
                    }
                    this.onError(msg || `请求失败 ${error.status}`);
                } else {
                    this.onError((error && error.message) || '网络错误');
                }
            } finally {
                this.api.abortControllers.delete(requestId);
                this.controller = null;
                this._currentEvent = null;
            }
        }

        _handleData(data, event) {
            if (this.onEvent) this.onEvent(event, data);
            if (event === 'error') {
                this.onError(data.message || data.error || 'AI处理出错');
                return;
            }
            if (event === this.eventKey || event === 'delta' || event === 'content' || event === 'message') {
                const content = data[this.contentKey] || data.content || data.delta || data.text || data.message;
                if (content) {
                    this.receivedChunks += content;
                    this.onChunk(content, this.receivedChunks);
                }
            }
            if (data[this.doneKey] === true || data.done === true || data.finished === true) {
                this.controller && this.controller.abort();
            }
        }

        stop() {
            if (this.controller) {
                try { this.controller.abort(); } catch (e) {}
            }
        }
    }

    function normalizeToolStatus(status) {
        const s = String(status || '').toLowerCase();
        if ({ running: 1, executing: 1, in_progress: 1, pending: 1 }[s]) return 'running';
        if ({ error: 1, failed: 1, failure: 1, cancelled: 1 }[s]) return 'error';
        return 'done';
    }

    // v2.89.0：TTS 朗读前剥离 markdown 语法（代码块/表格/标记符号不进语音）。
    function stripMarkdownForTts(text) {
        let t = String(text || '');
        t = t.replace(/```[\s\S]*?(```|$)/g, '，代码省略，');
        t = t.replace(/`([^`]*)`/g, '$1');
        t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, '，图片，');
        t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
        t = t.replace(/^\s{0,3}#{1,6}\s+/gm, '');
        t = t.replace(/^\s*[-*+]\s+/gm, '');
        t = t.replace(/^\s*>\s?/gm, '');
        t = t.replace(/(\*\*|__)(.*?)\1/g, '$2');
        t = t.replace(/(\*|_)(.*?)\1/g, '$2');
        t = t.replace(/\|/g, '，');
        t = t.replace(/\n{2,}/g, '。').replace(/\n/g, '，');
        return t.trim();
    }

    function routeRichEvent(msg, event, data) {
        const payload = data || {};
        const type = String(event || payload.type || '').toLowerCase();
        let handled = true;
        if (type === 'meta') {
            msg.meta = payload;
        } else if (type === 'thinking') {
            msg.thinking = (msg.thinking || '') + (payload.content || payload.thinking || '');
        } else if (type === 'tool' || type === 'tool_executed' || type === 'tool_update' || type === 'tool_result') {
            const calls = msg.toolCalls || (msg.toolCalls = []);
            const tools = msg.tools || (msg.tools = []);
            const callId = payload.id || payload.call_id || payload.tool_call_id || '';
            const label = payload.display_name || payload.name || payload.tool || '';
            const isUpdate = type === 'tool_update' || type === 'tool_result';
            if (isUpdate) {
                const target = callId
                    ? calls.find((c) => c.id === callId)
                    : calls.find((c) => c.name === label && c.status === 'running');
                if (target) {
                    const status = payload.status
                        ? normalizeToolStatus(payload.status)
                        : (payload.error ? 'error' : 'done');
                    target.status = status;
                    if (payload.result !== undefined) target.result = payload.result;
                    if (payload.output !== undefined && payload.result === undefined) target.result = payload.output;
                    if (payload.error) target.error = payload.error;
                    if (payload.duration_ms !== undefined) target.duration_ms = payload.duration_ms;
                    if (!target.name && label) target.name = label;
                    return true;
                }
            }
            const hasDetail = !!(payload.status || payload.args || payload.input
                || payload.result || payload.output || payload.error || payload.duration_ms);
            if (!hasDetail && !isUpdate) {
                if (label) tools.push(label);
                return true;
            }
            const status = payload.status
                ? normalizeToolStatus(payload.status)
                : (payload.error ? 'error' : (isUpdate ? 'done' : 'running'));
            calls.push({
                id: callId || ('c_' + calls.length + '_' + Date.now()),
                name: label || payload.display_name || '工具调用',
                status: status,
                args: payload.args !== undefined ? payload.args : payload.input,
                result: payload.result !== undefined ? payload.result : payload.output,
                error: payload.error || '',
                duration_ms: payload.duration_ms || 0
            });
        } else if (type === 'interrupt' || type === 'interrupt_request') {
            // v2.89.0：AG-UI Interrupts 对应物——human-in-loop 暂停请求，一消息一活跃卡。
            msg.interrupt = {
                id: payload.id || ('it_' + Date.now()),
                title: payload.title || 'AI 请求确认',
                body: payload.body || payload.content || payload.message || '',
                payload: payload.payload !== undefined ? payload.payload : payload.data,
                actions: Array.isArray(payload.actions) && payload.actions.length ? payload.actions : ['approve', 'reject'],
                allowEdit: !!payload.allow_edit,
                inputPlaceholder: payload.input_placeholder || ''
            };
        } else if (type === 'interrupt_resolve') {
            if (msg.interrupt && (!payload.id || payload.id === msg.interrupt.id)) msg.interrupt = null;
        } else if (type === 'references' || type === 'reference') {
            msg.references = payload.references || payload.items || [];
        } else if (type === 'credibility' && (payload.level || payload.pct !== undefined)) {
            msg.credibility = payload;
        } else if (type === 'warning' || type === 'credibility') {
            const warnings = msg.warnings || (msg.warnings = []);
            const text = payload.content || payload.message || payload.text || '';
            if (text) warnings.push(text);
        } else if (type === 'widget' || type === 'component') {
            const widgets = msg.widgets || (msg.widgets = []);
            widgets.push({
                id: payload.id || ('w_' + widgets.length + '_' + Date.now()),
                type: payload.widget || payload.component || payload.type || '',
                title: payload.title || '',
                data: payload.data || payload
            });
        } else if (type === 'widget_update' || type === 'component_update') {
            const widgets = msg.widgets || (msg.widgets = []);
            const target = widgets.find((w) => w.id === payload.id);
            if (target) {
                if (payload.data) target.data = payload.data;
                if (payload.title) target.title = payload.title;
                if (payload.disabled !== undefined) {
                    target.data = Object.assign({}, target.data || {}, { disabled: !!payload.disabled });
                }
            }
        } else {
            handled = false;
        }
        return handled;
    }

    function createStreamController(cfg, content, callbacks, onController) {
        if (!cfg.streamUrl) { callbacks.onError(new Error('未配置 apiConfig.streamUrl')); return null; }
        const api = cfg.apiInstance || (window.NexusApi ? new NexusApi() : null);
        if (!api) { callbacks.onError(new Error('NexusApi 未加载')); return null; }
        if (!window.NexusChat || !NexusChat.ChatController) { callbacks.onError(new Error('NexusChat 未加载')); return null; }
        const ctrl = new NexusChat.ChatController({
            api: api,
            url: cfg.streamUrl,
            body: Object.assign({}, cfg.body || {}, { content: content }),
            contentKey: cfg.contentKey || 'content',
            eventKey: cfg.eventKey || 'delta',
            doneKey: cfg.doneKey || 'done',
            onChunk: (chunk, full) => callbacks.onChunk(chunk, full),
            onDone: (full) => callbacks.onDone(full),
            onError: (err) => callbacks.onError(err),
            onEvent: (ev, data) => { if (callbacks.onEvent) callbacks.onEvent(ev, data); }
        });
        if (onController) onController(ctrl);
        callbacks.registerStop(() => ctrl.stop());
        ctrl.start();
        return ctrl;
    }

    async function fallbackRequest(cfg, content, assistantMsg, fx) {
        let ok = true, err = '';
        try {
            const api = cfg.apiInstance || (window.NexusApi ? new NexusApi() : null);
            if (!api) throw new Error('NexusApi 未加载');
            const res = await api.post(cfg.fallbackUrl, Object.assign({}, cfg.body || {}, { content: content }));
            assistantMsg.content = res.data.content || res.data.answer || res.data.reply || '（无内容）';
        } catch (e) {
            ok = false;
            err = e.message || '降级同步也失败';
        }
        fx.onFinish(ok, assistantMsg, err);
    }

    function createStreamingButton(opts) {
        const options = opts || {};
        const button = options.button;
        const onSend = options.onSend;
        const onStop = options.onStop;
        const streamingClass = options.streamingClass || 'nx-chat-streaming';
        if (!button) return null;
        const sendIcon = button.innerHTML;
        let streaming = false;
        function setStreaming(state) {
            streaming = state;
            button.classList.toggle(streamingClass, state);
            button.innerHTML = state
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
                : sendIcon;
            button.disabled = false;
            button.setAttribute('aria-label', state ? '停止生成' : '发送');
        }
        button.addEventListener('click', function () {
            if (streaming) { onStop && onStop(); }
            else { onSend && onSend(); }
        });
        return { setStreaming: setStreaming, getStreaming: function () { return streaming; } };
    }

    function renderError(message, onRetry, retryLabel) {
        const label = retryLabel || '重试';
        const errId = `nx-chat-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const retryBtn = onRetry
            ? `<button type="button" class="nx-chat-retry" data-err-id="${errId}">${delegateEscape(label)}</button>`
            : '';
        return `<div class="nx-chat-error" id="${errId}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>${delegateEscape(message)}</span>
            ${retryBtn}
        </div>`;
    }

    function bindRetry(container, onRetry) {
        if (!container) return;
        const btn = container.querySelector('.nx-chat-retry');
        if (btn) btn.addEventListener('click', onRetry);
    }

    function typingCursor() {
        return '<span class="nx-chat-typing-cursor" aria-hidden="true"></span>';
    }

    const NexusChat = {
        version: CHAT_VERSION,
        injectLibs: delegateInject,
        renderMarkdown: delegateMarkdown,
        escapeHtml: delegateEscape,
        ChatController: ChatController,
        createStreamingButton: createStreamingButton,
        renderError: renderError,
        bindRetry: bindRetry,
        typingCursor: typingCursor,
        normalizeToolStatus: normalizeToolStatus,
        stripMarkdownForTts: stripMarkdownForTts,
        routeRichEvent: routeRichEvent,
        createStreamController: createStreamController,
        fallbackRequest: fallbackRequest
    };

    window.NexusChat = NexusChat;
})();
