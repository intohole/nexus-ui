(function () {
    'use strict';
    window.NuxAiChatHelpers = {
        defaultFeatures: {
            stopButton: true,
            streamFallback: true,
            scrollToBottomButton: true,
            smartScroll: true,
            typingIndicator: true,
            messageCopy: true,
            aiTag: true,
            timestamp: false,
            keyboardAvoid: true,
            richReasoning: true,
            richTools: true,
            richReferences: true
        },
        defaultInput: {
            enterToSend: true,
            shiftEnterNewline: true,
            autoResize: true,
            maxLength: 4000,
            rateLimit: 0,
            checkComposing: true,
            maxRows: 6
        },
        defaultRoles: {
            user: { avatar: '🧑', label: '我' },
            assistant: { avatar: '🤖', label: 'AI助手', aiTag: true }
        },
        scrollToBottomEl: function (el, smooth) {
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
        },
        isNearBottom: function (el, threshold) {
            if (!el) return true;
            return el.scrollHeight - el.scrollTop - el.clientHeight < (threshold || 150);
        },
        getKeyboardHeight: function () {
            if (!window.visualViewport) return 0;
            const diff = window.innerHeight - window.visualViewport.height;
            return diff > 80 ? diff : 0;
        },
        mountKeyboard: function (enabled, kbRef, onOpen) {
            const vv = window.visualViewport;
            if (!enabled || !vv || !kbRef) return function () {};
            const sync = function () {
                const kb = window.NuxAiChatHelpers.getKeyboardHeight();
                if (kb !== kbRef.value) {
                    kbRef.value = kb;
                    if (kb > 0 && onOpen) onOpen();
                }
            };
            vv.addEventListener('resize', sync);
            window.addEventListener('resize', sync);
            return function () {
                vv.removeEventListener('resize', sync);
                window.removeEventListener('resize', sync);
            };
        },
        createStreamController: function (cfg, content, callbacks, onController) {
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
        },
        fallbackRequest: async function (cfg, content, assistantMsg, fx) {
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
        },
        routeRichEvent: function (msg, event, data) {
            const payload = data || {};
            const type = String(event || payload.type || '').toLowerCase();
            let handled = true;
            if (type === 'meta') {
                msg.meta = payload;
            } else if (type === 'thinking') {
                msg.thinking = (msg.thinking || '') + (payload.content || payload.thinking || '');
            } else if (type === 'tool' || type === 'tool_executed') {
                const tools = msg.tools || (msg.tools = []);
                const label = payload.display_name || payload.name || payload.tool;
                if (label) tools.push(label);
            } else if (type === 'references' || type === 'reference') {
                msg.references = payload.references || payload.items || [];
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
    };
})();