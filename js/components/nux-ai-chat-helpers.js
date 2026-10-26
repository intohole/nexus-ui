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
            richReferences: true,
            voice: false
        },
        defaultInput: {
            enterToSend: true,
            shiftEnterNewline: true,
            autoResize: true,
            maxLength: 4000,
            rateLimit: 0,
            checkComposing: true,
            maxRows: 6,
            voiceUrl: '',
            voiceMaxSeconds: 60
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
        isCitedReferences: function (refs) {
            if (!Array.isArray(refs)) return false;
            return refs.some((r) => r && typeof r === 'object' && typeof r.verdict === 'string');
        },
        normalizeToolStatus: function (status, hasDetail) {
            const s = String(status || '').toLowerCase();
            if ({ running: 1, executing: 1, in_progress: 1, pending: 1 }[s]) return 'running';
            if ({ error: 1, failed: 1, failure: 1, cancelled: 1 }[s]) return 'error';
            return 'done';
        },
        routeRichEvent: function (msg, event, data) {
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
                            ? window.NuxAiChatHelpers.normalizeToolStatus(payload.status)
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
                    ? window.NuxAiChatHelpers.normalizeToolStatus(payload.status)
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
        },
        // 对话动作状态机工厂（r137 自 nux-ai-chat setup 抽出，行为逐行守恒；
        // env 依赖注入形态保持 Vue-free，tests/test_ai_chat_actions.mjs 直测）。
        // settle 为终态收敛单源：收编原 send.finishStream 与 fallbackSync.onFinish 重复簇。
        createActions: function (env) {
            const list = env.list, input = env.input;
            const isStreaming = env.isStreaming, isError = env.isError, errorMsg = env.errorMsg;
            const lastSendTime = env.lastSendTime;
            const listEl = env.listEl;
            const props = env.props, feat = env.feat, inputCfg = env.inputCfg;
            const emit = env.emit;
            const emitMessages = env.emitMessages, smartScroll = env.smartScroll;
            const autoResize = env.autoResize, postProcessMd = env.postProcessMd;
            const startElapsed = env.startElapsed, stopElapsed = env.stopElapsed;
            const nextTick = env.nextTick || (function (fn) { fn(); });
            const buildAssistantMsg = env.buildAssistantMsg;
            const routeRichEvent = env.routeRichEvent || window.NuxAiChatHelpers.routeRichEvent;
            const createStreamController = env.createStreamController || window.NuxAiChatHelpers.createStreamController;
            const fallbackRequest = env.fallbackRequest || window.NuxAiChatHelpers.fallbackRequest;

            let controller = null;
            let stopped = false;
            let stopFn = null;

            function settle(ok, msg, err) {
                msg.streaming = false;
                if (!ok) {
                    msg.error = true;
                    isError.value = true;
                    errorMsg.value = err || '未知错误';
                }
                isStreaming.value = false;
                stopElapsed();
                emit('stream-end', ok);
                if (ok) emit('done', msg.content, msg);
                else emit('error', errorMsg.value, msg);
                emitMessages();
                nextTick(() => {
                    if (msg.content && listEl.value) {
                        const els = listEl.value.querySelectorAll('.nx-ai-chat-msg');
                        const last = els[els.length - 1];
                        if (last) postProcessMd(last.querySelector('.nx-ai-chat-bubble'));
                    }
                });
            }

            function defaultSend(content, callbacks) {
                createStreamController(props.apiConfig || {}, content, callbacks, (ctrl) => { controller = ctrl; });
            }

            function fallbackSync(content, assistantMsg) {
                fallbackRequest(props.apiConfig, content, assistantMsg, {
                    onFinish: (ok, msg, err) => {
                        if (ok) settle(true, msg);
                        else settle(false, msg, err);
                    }
                });
            }

            async function send(content) {
                if (content === undefined && env.inputEl.value) {
                    const domVal = String(env.inputEl.value.value || '');
                    if (domVal !== input.value) input.value = domVal;
                }
                const text = (content !== undefined ? content : input.value).trim();
                if (!text || isStreaming.value || props.disabled) return;

                if (inputCfg.rateLimit > 0) {
                    const now = Date.now();
                    if (now - lastSendTime.value < inputCfg.rateLimit) return;
                    lastSendTime.value = now;
                }

                if (content === undefined) input.value = '';
                autoResize();

                const userMsg = {
                    id: 'u_' + Date.now(),
                    role: 'user',
                    content: text,
                    created_at: new Date().toISOString()
                };
                list.push(userMsg);

                const assistantMsg = buildAssistantMsg();
                list.push(assistantMsg);
                emitMessages();

                emit('send', text);
                smartScroll(true);

                isStreaming.value = true;
                isError.value = false;
                errorMsg.value = '';
                emit('stream-start');
                startElapsed();

                stopped = false;
                stopFn = null;
                controller = null;

                const callbacks = {
                    onChunk: (chunk, full) => {
                        assistantMsg.content = full;
                        if (assistantMsg.thinking) assistantMsg.thinking = '';
                        smartScroll(false);
                        emit('chunk', chunk, full, assistantMsg);
                    },
                    onEvent: (ev, data) => {
                        if (routeRichEvent(assistantMsg, ev, data) && (ev === 'meta' || (data && data.type === 'meta'))) emit('meta', data, assistantMsg);
                    },
                    onDone: (full) => {
                        if (full && !assistantMsg.content) assistantMsg.content = full;
                        settle(true, assistantMsg);
                    },
                    onError: (err) => {
                        if (stopped) {
                            settle(true, assistantMsg);
                            return;
                        }
                        if (feat.streamFallback && props.apiConfig.fallbackUrl) {
                            fallbackSync(text, assistantMsg);
                        } else {
                            settle(false, assistantMsg, err && err.message ? err.message : 'AI服务暂时不可用');
                        }
                    },
                    currentMessage: assistantMsg,
                    routeRich: (ev, data) => { routeRichEvent(assistantMsg, ev, data); },
                    registerStop: (fn) => { stopFn = fn; }
                };

                try {
                    const handler = props.sendHandler || defaultSend;
                    await handler(text, callbacks);
                } catch (e) {
                    if (!stopped) settle(false, assistantMsg, e.message || '请求异常');
                }
            }

            function stop() {
                if (!isStreaming.value) return;
                stopped = true;
                if (stopFn) { try { stopFn(); } catch (e) {} }
                else if (controller) { try { controller.stop(); } catch (e) {} }
                isStreaming.value = false;
                stopElapsed();
                emit('stop');
                emit('stream-end', true);
                const last = list[list.length - 1];
                if (last && last.streaming) {
                    last.streaming = false;
                    if (!last.content) last.content = '（已停止生成）';
                }
                emitMessages();
            }

            function retry(msg) {
                const target = msg || (list.length >= 2 ? list[list.length - 2] : null);
                if (!target) return;
                if (list.length > 0) list.pop();
                if (isError.value) {
                    isError.value = false;
                    errorMsg.value = '';
                }
                emit('retry', target);
                send(target.content);
            }

            function clear() {
                stop();
                list.splice(0, list.length);
                isError.value = false;
                errorMsg.value = '';
                if (env.clearUiState) env.clearUiState();
                emit('clear');
                emitMessages();
            }

            function abort() {
                if (stopFn) { try { stopFn(); } catch (e) {} }
                else if (controller) { try { controller.stop(); } catch (e) {} }
            }

            return { send: send, stop: stop, retry: retry, clear: clear, abort: abort };
        }
    };
})();