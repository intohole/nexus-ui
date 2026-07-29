(function() {
    const MARKED_CDN = 'https://cdn.jsdmirror.com/npm/marked@12.0.0/marked.min.js';
    const DOMPURIFY_CDN = 'https://cdn.jsdmirror.com/npm/dompurify@3.0.6/dist/purify.min.js';
    const HIGHLIGHT_CDN = 'https://cdn.jsdmirror.com/npm/highlight.js@11.9.0/lib/highlight.min.js';
    const HIGHLIGHT_CSS = 'https://cdn.jsdmirror.com/npm/highlight.js@11.9.0/styles/atom-one-dark.min.css';

    let libsLoaded = false;
    let libsLoading = null;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`load fail: ${src}`));
            document.head.appendChild(script);
        });
    }

    function loadStylesheet(href) {
        return new Promise((resolve) => {
            if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = resolve;
            document.head.appendChild(link);
        });
    }

    async function injectLibs() {
        if (libsLoaded) return true;
        if (libsLoading) return libsLoading;
        libsLoading = (async () => {
            await Promise.all([
                loadScript(MARKED_CDN),
                loadScript(DOMPURIFY_CDN),
                loadScript(HIGHLIGHT_CDN),
                loadStylesheet(HIGHLIGHT_CSS)
            ]).catch(err => { console.warn('[NexusChat] lib load fail:', err.message); });
            if (window.marked && window.DOMPurify) {
                const renderer = new marked.Renderer();
                const origLink = renderer.link.bind(renderer);
                renderer.link = (href, title, text) => {
                    const html = origLink(href, title, text);
                    return html.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
                };
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    renderer: renderer,
                    highlight: function(code, lang) {
                        if (typeof hljs !== 'undefined' && lang) {
                            try { return hljs.highlight(code, { language: lang }).value; } catch (e) {}
                        }
                        if (typeof hljs !== 'undefined') {
                            try { return hljs.highlightAuto(code).value; } catch (e) {}
                        }
                        return code;
                    }
                });
            }
            libsLoaded = true;
            return true;
        })();
        return libsLoading;
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function renderMarkdown(text) {
        if (!text) return '';
        if (window.marked && window.DOMPurify) {
            try {
                const raw = marked.parse(text);
                return DOMPurify.sanitize(raw, {
                    ADD_ATTR: ['target', 'rel'],
                    ALLOWED_TAGS: [
                        'p', 'br', 'strong', 'em', 'code', 'pre', 'span',
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                        'ul', 'ol', 'li', 'blockquote', 'hr',
                        'table', 'thead', 'tbody', 'tr', 'th', 'td',
                        'a', 'img', 'div', 'del', 'sub', 'sup'
                    ]
                });
            } catch (e) {
                console.warn('[NexusChat] render fail:', e);
            }
        }
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    class ChatController {
        constructor(options = {}) {
            this.api = options.api || (window.NexusApi ? new NexusApi() : null);
            this.url = options.url || '';
            this.body = options.body || {};
            this.timeout = options.timeout || 120000;
            this.eventKey = options.eventKey || 'delta';
            this.contentKey = options.contentKey || 'content';
            this.doneKey = options.doneKey || 'done';
            this.onChunk = options.onChunk || (() => {});
            this.onDone = options.onDone || (() => {});
            this.onError = options.onError || (() => {});
            this.onEvent = options.onEvent || null;
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
            const timeoutId = setTimeout(() => this.controller.abort(), this.timeout);
            try {
                const response = await fetch(`${this.api.baseUrl}${this.url}`, {
                    method: 'POST',
                    headers: this.api._buildHeaders({ 'Accept': 'text/event-stream' }),
                    body: JSON.stringify(this.body),
                    signal: this.controller.signal
                });
                if (!response.ok) {
                    let errData;
                    try { errData = await response.json(); } catch { errData = {}; }
                    this.onError(this.api._extractError(errData) || `请求失败 ${response.status}`);
                    return;
                }
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let newlineIdx;
                    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.slice(0, newlineIdx).replace(/\r$/, '');
                        buffer = buffer.slice(newlineIdx + 1);
                        if (line.startsWith('event:')) {
                            this._currentEvent = line.slice(6).trim();
                        } else if (line.startsWith('data:')) {
                            const payload = line.slice(5).trim();
                            if (!payload) continue;
                            try { this._handleData(JSON.parse(payload)); }
                            catch (e) {}
                        } else if (line === '') {
                            this._currentEvent = null;
                        }
                    }
                }
                this.onDone(this.receivedChunks);
            } catch (error) {
                if (error.name === 'AbortError') {
                    this.onDone(this.receivedChunks);
                } else {
                    this.onError(error.message || '网络错误');
                }
            } finally {
                clearTimeout(timeoutId);
                this.api.abortControllers.delete(requestId);
                this.controller = null;
                this._currentEvent = null;
            }
        }

        _handleData(data) {
            const event = this._currentEvent || this.eventKey;
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
                if (data[this.doneKey] === true || data.done === true || data.finished === true) {
                    this.controller && this.controller.abort();
                }
            }
        }

        stop() {
            if (this.controller) {
                try { this.controller.abort(); } catch (e) {}
            }
        }
    }

    function createStreamingButton({ button, onSend, onStop, streamingClass = 'nx-chat-streaming' }) {
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
        button.addEventListener('click', () => {
            if (streaming) onStop && onStop();
            else onSend && onSend();
        });
        return { setStreaming, getStreaming: () => streaming };
    }

    function renderError(message, onRetry, retryLabel = '重试') {
        const errId = `nx-chat-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const retryBtn = onRetry
            ? `<button type="button" class="nx-chat-retry" data-err-id="${errId}">${escapeHtml(retryLabel)}</button>`
            : '';
        return `<div class="nx-chat-error" id="${errId}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>${escapeHtml(message)}</span>
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
        version: '1.0.0',
        injectLibs,
        renderMarkdown,
        escapeHtml,
        ChatController,
        createStreamingButton,
        renderError,
        bindRetry,
        typingCursor
    };

    window.NexusChat = NexusChat;
})();
