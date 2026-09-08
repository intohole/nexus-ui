(function () {
    'use strict';

    const STRUCTURED_VERSION = '1.1.0';

    function extractBody(result) {
        if (result && typeof result === 'object' && !Array.isArray(result)
            && 'data' in result && result.data !== undefined && result.data !== null) {
            return result.data;
        }
        return result;
    }

    function stringifyVal(v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') {
            try { return JSON.stringify(v); } catch (e) { return String(v); }
        }
        return String(v);
    }

    function isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    function format(result) {
        if (result === null || result === undefined) return '无';
        if (typeof result === 'string') return result;
        try {
            return JSON.stringify(result, null, 2);
        } catch (e) {
            return String(result);
        }
    }

    function isError(result) {
        return result !== null && typeof result === 'object'
            && !Array.isArray(result) && 'error' in result;
    }

    function buildTable(rows) {
        if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== 'object') {
            return { kind: 'raw', text: format(rows) };
        }
        const columns = Object.keys(rows[0]);
        const data = rows.map(function (r) {
            const row = {};
            columns.forEach(function (c) {
                row[c] = stringifyVal(r[c]);
            });
            return row;
        });
        return { kind: 'table', columns, rows: data, summary: null };
    }

    function build(result) {
        if (result === null || result === undefined) {
            return { kind: 'raw', text: '空' };
        }
        const body = extractBody(result);
        if (Array.isArray(body)) {
            return buildTable(body);
        }
        if (typeof body === 'object' && body !== null) {
            const arrKey = Object.keys(body).find(function (k) {
                return Array.isArray(body[k]) && body[k].length > 0;
            });
            if (arrKey) {
                const summary = {};
                Object.keys(body).forEach(function (k) {
                    if (k !== arrKey) summary[k] = body[k];
                });
                const table = buildTable(body[arrKey]);
                table.summary = isEmpty(summary) ? null : summary;
                return table;
            }
            const pairs = Object.keys(body).map(function (k) {
                return { k, v: stringifyVal(body[k]) };
            });
            return { kind: 'kv', pairs };
        }
        return { kind: 'raw', text: stringifyVal(body) };
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    async function injectLibs() {
        if (window.NexusMarkdown && typeof window.NexusMarkdown.injectLibs === 'function') {
            return window.NexusMarkdown.injectLibs();
        }
        return false;
    }

    class StructuredController {
        constructor(options) {
            const opts = options || {};
            this.url = opts.url || '';
            this.body = opts.body || {};
            this.headers = opts.headers || {};
            this.timeout = opts.timeout || 120000;
            this.onText = opts.onText || (function () {});
            this.onAction = opts.onAction || (function () {});
            this.onDone = opts.onDone || (function () {});
            this.onError = opts.onError || (function () {});
            this.itemCount = 0;
            this.controller = null;
        }

        get isStreaming() { return this.controller !== null; }

        async start() {
            if (!this.url) { this.onError('未配置请求URL'); return; }
            this.itemCount = 0;
            this.controller = new AbortController();
            let timedOut = false;
            let idleTimer = null;
            const resetIdle = () => {
                if (idleTimer) clearTimeout(idleTimer);
                idleTimer = setTimeout(() => {
                    timedOut = true;
                    try { this.controller.abort(); } catch (e) {}
                }, this.timeout);
            };
            resetIdle();
            try {
                const response = await fetch(this.url, {
                    method: 'POST',
                    headers: Object.assign({ 'Accept': 'text/event-stream', 'Content-Type': 'application/json' }, this.headers),
                    body: JSON.stringify(this.body),
                    signal: this.controller.signal
                });
                if (!response.ok) {
                    let errData;
                    try { errData = await response.json(); } catch (e) { errData = {}; }
                    this.onError((errData && errData.message) ? errData.message : ('请求失败 ' + response.status));
                    return;
                }
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    resetIdle();
                    buffer += decoder.decode(value, { stream: true });
                    let idx;
                    while ((idx = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.slice(0, idx).replace(/\r$/, '');
                        buffer = buffer.slice(idx + 1);
                        if (line.startsWith('data:')) {
                            const payload = line.slice(5).trim();
                            if (payload) {
                                try { this._handleData(JSON.parse(payload)); }
                                catch (e) {}
                            }
                        }
                    }
                }
                this.onDone(this.itemCount);
            } catch (error) {
                if (error.name === 'AbortError') {
                    if (timedOut) { this.onError('响应超时，请重试'); }
                    else { this.onDone(this.itemCount); }
                } else {
                    this.onError(error.message || '网络错误');
                }
            } finally {
                if (idleTimer) clearTimeout(idleTimer);
                this.controller = null;
            }
        }

        _handleData(data) {
            const type = data.type;
            if (type === 'structured_text' || type === 'text') {
                const content = data.content || '';
                if (content) this.onText(content, data);
            } else if (type === 'structured_item' || type === 'item') {
                this.itemCount = (typeof data.item_count === 'number') ? data.item_count : (this.itemCount + 1);
                const item = data.item || {};
                if (item.type === 'action' || (item.name && item.params !== undefined)) {
                    this.onAction(item, data);
                } else if (item.type === 'text') {
                    const content = item.content || '';
                    if (content) this.onText(content, data);
                }
                if (data.last === true) {
                    this.onDone(this.itemCount, data);
                }
            } else if (type === 'structured_done' || type === 'done') {
                this.itemCount = (typeof data.item_count === 'number') ? data.item_count : this.itemCount;
                this.onDone(this.itemCount, data);
            } else if (type === 'error') {
                this.onError(data.message || 'AI处理出错');
            }
        }

        stop() {
            if (this.controller) {
                try { this.controller.abort(); } catch (e) {}
            }
        }
    }

    async function consume(url, options = {}) {
        const controller = new StructuredController(Object.assign({ url }, options));
        await controller.start();
        return controller;
    }

    const NexusStructured = {
        version: STRUCTURED_VERSION,
        build: build,
        format: format,
        isError: isError,
        escapeHtml: escapeHtml,
        injectLibs: injectLibs,
        StructuredController: StructuredController,
        consume: consume
    };

    window.NexusStructured = NexusStructured;
})();