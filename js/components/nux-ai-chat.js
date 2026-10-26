(function () {
    'use strict';

    const { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } = Vue;

    const H = window.NuxAiChatHelpers;
    const DEFAULT_FEATURES = H.defaultFeatures;
    const DEFAULT_INPUT = H.defaultInput;
    const DEFAULT_ROLES = H.defaultRoles;
    const scrollToBottomEl = H.scrollToBottomEl;
    const isNearBottom = H.isNearBottom;

    const NuxAiChat = {
        name: 'NuxAiChat',
        props: {
            messages: { type: Array, default: () => [] },
            apiConfig: { type: Object, default: () => ({}) },
            sendHandler: { type: Function, default: null },
            features: { type: Object, default: () => ({}) },
            inputConfig: { type: Object, default: () => ({}) },
            welcome: { type: Object, default: () => ({}) },
            quickReplies: { type: Array, default: () => [] },
            roles: { type: Object, default: () => ({}) },
            placeholder: { type: String, default: '输入消息，Enter发送，Shift+Enter换行' },
            disabled: { type: Boolean, default: false },
            scrollThreshold: { type: Number, default: 150 },
            streaming: { type: Boolean, default: false }
        },
        emits: ['update:messages', 'send', 'chunk', 'done', 'error', 'stop', 'retry', 'clear', 'stream-start', 'stream-end', 'meta', 'widget-action', 'voice-result'],
        components: Object.assign(
            { NuxAiWidgets: window.NuxAiWidgets },
            window.NuxVoiceInput ? { NuxVoiceInput: window.NuxVoiceInput } : {},
            window.NuxToolCall ? { NuxToolCall: window.NuxToolCall } : {},
            window.NuxCitations ? { NuxCitations: window.NuxCitations } : {},
            window.NuxConfidence ? { NuxConfidence: window.NuxConfidence } : {}
        ),
        setup(props, ctx) {
            const feat = Object.assign({}, DEFAULT_FEATURES, props.features);
            const inputCfg = Object.assign({}, DEFAULT_INPUT, props.inputConfig);
            const roleCfg = Object.assign({}, DEFAULT_ROLES, props.roles);

            const list = reactive(props.messages.slice());
            const input = ref('');
            const isStreaming = ref(false);
            const isError = ref(false);
            const errorMsg = ref('');
            const showScrollBtn = ref(false);
            const newMsgCount = ref(0);
            const isComposing = ref(false);
            const lastSendTime = ref(0);
            const elapsed = ref(0);
            let elapsedTimer = null;

            const scrollEl = ref(null);
            const inputEl = ref(null);
            const listEl = ref(null);
            const kbHeight = ref(0);
            let rafId = null;
            let unmountKb = null;

            function emitMessages() {
                ctx.emit('update:messages', list.slice());
            }

            function startElapsed() {
                elapsed.value = 0;
                clearInterval(elapsedTimer);
                elapsedTimer = setInterval(() => { elapsed.value++; }, 1000);
            }

            function stopElapsed() {
                clearInterval(elapsedTimer);
                elapsedTimer = null;
            }

            function autoResize() {
                const el = inputEl.value;
                if (!el || !inputCfg.autoResize) return;
                el.style.height = 'auto';
                const lineHeight = 24;
                const maxH = lineHeight * inputCfg.maxRows;
                el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
            }

            function onScroll() {
                if (!feat.smartScroll) return;
                const near = isNearBottom(scrollEl.value, props.scrollThreshold);
                showScrollBtn.value = !near && list.length > 0;
                if (near) newMsgCount.value = 0;
            }

            function smartScroll(force) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    if (!scrollEl.value) return;
                    if (force || !feat.smartScroll || isNearBottom(scrollEl.value, props.scrollThreshold)) {
                        scrollToBottomEl(scrollEl.value, false);
                        showScrollBtn.value = false;
                        newMsgCount.value = 0;
                    } else {
                        newMsgCount.value++;
                    }
                });
            }

            function scrollToBottom() {
                scrollToBottomEl(scrollEl.value, true);
                showScrollBtn.value = false;
                newMsgCount.value = 0;
            }

            function renderMarkdown(text) {
                if (window.NexusMarkdown) return NexusMarkdown.render(text || '');
                return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            }

            // 流式块级渲染（nexus-streamdown）：稳定区 html 仅块推进时变化（v-html 值
            // 不变不重建 DOM），活跃尾块经 rAF 合帧每帧最多渲一次。watch 挂在消息
            // content 上，helpers 的直写路径无需感知。
            const streamers = new WeakMap();

            function refreshStream(m) {
                if (!feat.streamBlocks || !m.streaming) return;
                if (!window.NexusStreamdown || !window.NexusMarkdown) return;
                let s = streamers.get(m);
                if (!s) {
                    s = { raf: 0 };
                    streamers.set(m, s);
                }
                if (s.raf) return;
                s.raf = requestAnimationFrame(() => {
                    s.raf = 0;
                    if (!streamers.has(m) || !m.streaming) return;
                    if (!list.includes(m)) { streamers.delete(m); return; }
                    const out = NexusStreamdown.update(m.content, s);
                    if (out) {
                        m.stableHtml = out.stableHtml;
                        m.activeHtml = out.activeHtml;
                    }
                });
            }

            function stopStreamers() {
                list.forEach((m) => {
                    const s = streamers.get(m);
                    if (s && s.raf) cancelAnimationFrame(s.raf);
                });
                streamers.clear?.();
            }

            function postProcessMd(el) {
                if (window.NexusMarkdown && el) NexusMarkdown.postProcess(el);
            }

            function buildAssistantMsg() {
                const m = reactive({
                    id: 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    role: 'assistant', content: '', streaming: true, error: false,
                    thinking: '', tools: [], toolCalls: [], references: [], warnings: [], widgets: [], meta: null,
                    credibility: null,
                    stableHtml: '', activeHtml: '',
                    showReasoning: false, created_at: new Date().toISOString()
                });
                if (feat.streamBlocks) {
                    const stopWatch = watch(() => m.content, () => refreshStream(m));
                    m._stopStreamWatch = stopWatch;
                }
                return m;
            }

            function isCitedRefs(refs) {
                return H.isCitedReferences(refs);
            }

            const actions = H.createActions({
                list: list, input: input,
                isStreaming: isStreaming, isError: isError, errorMsg: errorMsg,
                lastSendTime: lastSendTime,
                scrollEl: scrollEl, inputEl: inputEl, listEl: listEl,
                props: props, feat: feat, inputCfg: inputCfg,
                emit: function () { ctx.emit.apply(ctx, arguments); },
                nextTick: nextTick,
                emitMessages: emitMessages, smartScroll: smartScroll,
                autoResize: autoResize, postProcessMd: postProcessMd,
                startElapsed: startElapsed, stopElapsed: stopElapsed,
                buildAssistantMsg: buildAssistantMsg,
                clearUiState: function () { newMsgCount.value = 0; showScrollBtn.value = false; }
            });
            const send = actions.send;
            const stop = actions.stop;
            const retry = actions.retry;
            const clear = actions.clear;

            function copyMessage(msg) {
                if (!msg || !msg.content) return;
                if (window.NexusUtils && NexusUtils.copyText) {
                    NexusUtils.copyText(msg.content, { success: '已复制' });
                }
            }

            function onWidgetAction(ev, msg) {
                if (!ev) return;
                if (ev.action === 'send') {
                    const text = ev.payload && (ev.payload.text || ev.payload.value || ev.payload);
                    if (text && typeof text === 'string') { send(text); return; }
                }
                ctx.emit('widget-action', ev, msg);
            }

            function onVoiceResult(payload) {
                const text = payload && payload.text ? String(payload.text).trim() : '';
                if (!text) return;
                input.value = input.value ? input.value + text : text;
                autoResize();
                ctx.emit('voice-result', payload);
                if (inputEl.value) inputEl.value.focus();
            }

            function onInput() { autoResize(); }
            function onKeydown(e) {
                if (!inputCfg.enterToSend) return;
                if (e.key === 'Enter' && !e.shiftKey && !isComposing.value) {
                    e.preventDefault();
                    send();
                }
            }
            function onCompositionStart() { isComposing.value = true; }
            function onCompositionEnd() { isComposing.value = false; }

            function clickQuickReply(item) {
                if (isStreaming.value || props.disabled) return;
                const val = item.value || item.text;
                input.value = val;
                send(val);
                if (input.value === val) input.value = '';
            }

            watch(() => props.messages, (newVal) => {
                if (newVal && newVal.length !== list.length) {
                    list.splice(0, list.length, ...newVal.map(m => reactive(Object.assign({}, m))));
                    nextTick(() => smartScroll(true));
                }
            }, { deep: false });

            onMounted(() => {
                nextTick(() => {
                    if (list.length > 0) scrollToBottomEl(scrollEl.value, false);
                    if (window.NexusMarkdown) NexusMarkdown.injectLibs();
                });
                unmountKb = (window.NexusMobile && NexusMobile.mountKeyboard)
                    ? NexusMobile.mountKeyboard(!!feat.keyboardAvoid, kbHeight, () => { if (scrollEl.value && list.length) scrollToBottomEl(scrollEl.value, false); })
                    : (function () { return function () {}; }());
            });

            onBeforeUnmount(() => {
                if (unmountKb) unmountKb();
                actions.abort();
                if (rafId) cancelAnimationFrame(rafId);
                list.forEach((m) => { if (m._stopStreamWatch) m._stopStreamWatch(); });
                stopStreamers();
                stopElapsed();
            });

            ctx.expose({
                send, stop, clear, retry, copyMessage, scrollToBottom,
                getMessages: () => list.slice(),
                setMessages: (arr) => {
                    list.splice(0, list.length, ...arr.map(m => reactive(Object.assign({}, m))));
                    emitMessages();
                    nextTick(() => scrollToBottomEl(scrollEl.value, false));
                },
                focus: () => { if (inputEl.value) inputEl.value.focus(); }
            });

            return {
                list, input, isStreaming, isError, errorMsg, showScrollBtn, newMsgCount,
                elapsed, kbHeight, scrollEl, inputEl, listEl, feat, inputCfg, roleCfg,
                renderMarkdown, send, stop, retry, clear, copyMessage, scrollToBottom,
                isCitedRefs,
                onScroll, onInput, onKeydown, onCompositionStart, onCompositionEnd,
                clickQuickReply, smartScroll, onWidgetAction, onVoiceResult
            };
        },
        template: window.NuxAiChatTemplate
    };

    window.NuxAiChat = NuxAiChat;
})();