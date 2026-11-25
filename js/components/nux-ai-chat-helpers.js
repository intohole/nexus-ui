(function () {
    'use strict';
    const Core = window.NuxAiChatCore || {};
    window.NuxAiChatHelpers = {
        defaultFeatures: {
            stopButton: true,
            streamFallback: true,
            streamBlocks: true,
            chatActions: true,
            reasoningAuto: true,
            metaStrip: false,
            stopNote: true,
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
            loadEarlier: true,
            regenerate: 'local',
            editResend: 'local',
            voice: false,
            speakButton: false,
            attachments: false,
            interrupts: true
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
            voiceMaxSeconds: 60,
            attachmentAccept: '',
            attachmentMaxCount: 4,
            attachmentMaxSizeMb: 10,
            attachmentUpload: null
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
        // v2.87.0：语义路由与传输助手已上收 nexus-chat 单源（聚合包必载，消费方
        // 零新增 script），此处别名仅为既有直调面（tests/业务胶水）保留。
        createStreamController: function (cfg, content, callbacks, onController) {
            return window.NexusChat.createStreamController(cfg, content, callbacks, onController);
        },
        fallbackRequest: function (cfg, content, assistantMsg, fx) {
            return window.NexusChat.fallbackRequest(cfg, content, assistantMsg, fx);
        },
        routeRichEvent: function (msg, event, data) {
            return window.NexusChat.routeRichEvent(msg, event, data);
        },
        normalizeToolStatus: function (status) {
            return window.NexusChat.normalizeToolStatus(status);
        },
        isCitedReferences: function (refs) {
            if (!Array.isArray(refs)) return false;
            return refs.some((r) => r && typeof r === 'object' && typeof r.verdict === 'string');
        },
        metaChips: function (msg) {
            if (!msg || !msg.meta) return [];
            const meta = msg.meta;
            const chips = [];
            const usage = meta.usage || meta.tokens || {};
            const total = usage.total_tokens || usage.totalTokens || meta.total_tokens;
            if (total) chips.push(total + ' tokens');
            const ms = meta.duration_ms || meta.elapsed_ms;
            if (ms) chips.push(ms >= 1000 ? (Math.round(ms / 100) / 10) + 's' : ms + 'ms');
            if (msg.thinkingMs) chips.push('思考 ' + msg.thinkingMs + 's');
            return chips;
        },
        errorKind: function (msg) {
            const code = String((msg && msg.errorCode) || '');
            const status = Number((msg && msg.errorStatus) || (code.match(/^\d+$/) ? code : 0) || 0);
            if (code === 'timeout') return '响应超时';
            if (code === 'network') return '网络连接异常';
            if (code === 'config') return '配置缺失';
            if (status === 429) return '请求过于频繁';
            if (status >= 500) return '服务暂时不可用';
            if (status === 408 || status === 504) return '响应超时';
            if (status === 401 || status === 403) return '登录状态失效';
            return '';
        },
        // v2.89.0：composer 附件纯函数族 + TTS 朗读（v2.97.0 上收 NexusAiChatCore，
        // 聚合包必载；helpers 保直调面别名）。UI 态（drag/条渲染）归组件。
        attachmentFrom: (file) => Core.attachmentFrom(file),
        filterAttachmentFiles: (files, existing, inputCfg) => Core.filterAttachmentFiles(files, existing, inputCfg),
        uploadAttachment: (att, uploader) => Core.uploadAttachment(att, uploader),
        snapshotAttachments: (attachments) => Core.snapshotAttachments(attachments),
        speakMessage: (env, m) => Core.speakMessage(env, m),
        // 对话动作状态机工厂（r137 自 nux-ai-chat setup 抽出，行为逐行守恒；
        // env 依赖注入形态保持 Vue-free，tests/test_ai_chat_actions.mjs 直测）。
        // settle 为终态收敛单源：收编原 send.finishStream 与 fallbackSync.onFinish 重复簇。
        // v2.87.0：reasoning 自动开合（streaming 自动展开/收口自动收起，尊重手动干预）
        // 与 thinkingMs 首响耗时记账。
        // v2.97.0：NexusStop 接线——seq 代际闸（迟到帧拒收）+ settle 幂等（根治停止后
        // 迟到 AbortError 二次收口的双发）+ feat.stopNote 终态签名行（抑制假内容占位）
        // + cancelRequest 服务端取消钩子透传。
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
            const stopper = env.stopper
                || (window.NexusStop ? window.NexusStop.create({ cancelRequest: env.cancelRequest || null }) : null);

            let controller = null;
            let stopped = false;
            let stopFn = null;

            function settle(ok, msg, err, errMeta) {
                if (msg._settled) return;
                msg._settled = true;
                msg.streaming = false;
                if (feat.reasoningAuto && !msg._reasoningManual && msg.showReasoning) {
                    msg.showReasoning = false;
                }
                if (!ok) {
                    msg.error = true;
                    msg.errorMsg = err || '未知错误';
                    msg.errorCode = (errMeta && errMeta.code) || '';
                    msg.errorStatus = (errMeta && errMeta.status) || 0;
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

            // 单轮流式主体：send / regenerate / editResend 共用。opts.emitSend=是否补发
            // 'send' 事件（send 路径语义守恒）；regenerate/editResend 改发各自语义事件。
            async function startTurn(text, opts) {
                const assistantMsg = buildAssistantMsg();
                assistantMsg._turnStart = Date.now();
                list.push(assistantMsg);
                emitMessages();
                if (opts && opts.emitSend) emit('send', text, (opts && opts.attachments) || null);
                smartScroll(true);

                isStreaming.value = true;
                isError.value = false;
                errorMsg.value = '';
                emit('stream-start');
                startElapsed();

                stopped = false;
                stopFn = null;
                controller = null;
                const seq = stopper ? stopper.begin() : 0;

                const callbacks = {
                    onChunk: (chunk, full) => {
                        if (stopper && !stopper.isCurrent(seq)) return;
                        assistantMsg.content = full;
                        if (!assistantMsg._firstChunkAt) {
                            assistantMsg._firstChunkAt = Date.now();
                            if (assistantMsg.thinking && assistantMsg._turnStart) {
                                assistantMsg.thinkingMs = Math.round((assistantMsg._firstChunkAt - assistantMsg._turnStart) / 100) / 10;
                            }
                        }
                        if (assistantMsg.thinking) assistantMsg.thinking = '';
                        smartScroll(false);
                        emit('chunk', chunk, full, assistantMsg);
                    },
                    onEvent: (ev, data) => {
                        if (stopper && !stopper.isCurrent(seq)) return;
                        const routed = routeRichEvent(assistantMsg, ev, data);
                        if (routed && feat.reasoningAuto && assistantMsg.thinking && !assistantMsg._reasoningManual) {
                            assistantMsg.showReasoning = true;
                        }
                        if (routed && (ev === 'meta' || (data && data.type === 'meta'))) emit('meta', data, assistantMsg);
                    },
                    onDone: (full) => {
                        if (stopper && !stopper.isCurrent(seq)) return;
                        if (full && !assistantMsg.content) assistantMsg.content = full;
                        settle(true, assistantMsg);
                    },
                    onError: (err, errMeta) => {
                        if (stopped || (stopper && !stopper.isCurrent(seq))) {
                            settle(true, assistantMsg);
                            return;
                        }
                        if (feat.streamFallback && props.apiConfig.fallbackUrl) {
                            fallbackSync(text, assistantMsg);
                        } else {
                            const errText = typeof err === 'string'
                                ? err
                                : (err && err.message) || 'AI服务暂时不可用';
                            settle(false, assistantMsg, errText, errMeta);
                        }
                    },
                    currentMessage: assistantMsg,
                    routeRich: (ev, data) => { routeRichEvent(assistantMsg, ev, data); },
                    registerStop: (fn) => {
                        stopFn = fn;
                        if (stopper) stopper.onStopFn(fn);
                    }
                };

                try {
                    const handler = props.sendHandler || defaultSend;
                    await handler(text, callbacks, (opts && opts.attachments) || null);
                } catch (e) {
                    if (!stopped) settle(false, assistantMsg, e.message || '请求异常');
                }
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
                const atts = env.takeAttachmentsForSend ? env.takeAttachmentsForSend() : null;
                if (atts) userMsg.attachments = atts;
                list.push(userMsg);

                await startTurn(text, { emitSend: true, attachments: atts });
            }

            // 重新生成：从任一成功 assistant 消息截断后续并重发其前最近的用户提问。
            // 纯前端编排——用户消息保留在列表，不重复 push；消息变更经 emitMessages 灌出。
            function regenerate(msg) {
                if (!feat.chatActions || feat.regenerate === 'off' || isStreaming.value || props.disabled) return;
                let target = msg;
                if (!target) {
                    for (let i = list.length - 1; i >= 0; i--) {
                        if (list[i].role === 'assistant') { target = list[i]; break; }
                    }
                }
                if (!target || target.role !== 'assistant') return;
                const idx = list.indexOf(target);
                if (idx < 0) return;
                let userIdx = -1;
                for (let i = idx - 1; i >= 0; i--) {
                    if (list[i].role === 'user') { userIdx = i; break; }
                }
                if (userIdx < 0) return;
                const text = String(list[userIdx].content || '').trim();
                if (!text) return;
                list.splice(userIdx + 1);
                emitMessages();
                emit('regenerate', text);
                startTurn(text, {});
            }

            // 编辑重发：改写既有用户消息并截断其后，以新文案重发该轮。
            function editResend(msg, newContent) {
                if (!feat.chatActions || feat.editResend === 'off' || isStreaming.value || props.disabled) return;
                if (!msg || msg.role !== 'user') return;
                const text = String(newContent != null ? newContent : msg.content).trim();
                if (!text) return;
                const idx = list.indexOf(msg);
                if (idx < 0) return;
                msg.content = text;
                list.splice(idx + 1);
                emitMessages();
                emit('edit-resend', text);
                startTurn(text, {});
            }

            function stop() {
                if (!isStreaming.value) return;
                stopped = true;
                if (stopper) stopper.stop();
                else if (stopFn) { try { stopFn(); } catch (e) {} }
                else if (controller) { try { controller.stop(); } catch (e) {} }
                isStreaming.value = false;
                stopElapsed();
                emit('stop');
                emit('stream-end', true);
                const last = list[list.length - 1];
                if (last && last.streaming) {
                    last.streaming = false;
                    last._settled = true;
                    if (feat.reasoningAuto && !last._reasoningManual && last.showReasoning) {
                        last.showReasoning = false;
                    }
                    const kind = stopper ? stopper.classify(!!last.content)
                        : (last.content ? 'stoppedPartial' : 'stoppedEmpty');
                    if (feat.stopNote) {
                        last._stopped = kind;
                        last._stoppedNote = stopper ? stopper.noteFor(kind)
                            : (window.NexusStop ? window.NexusStop.DEFAULT_NOTES[kind] : '');
                    } else if (!last.content) {
                        last.content = '（已停止生成）';
                    }
                    emit('done', last.content, last);
                }
                /* 平台路径本地即时收口：释放 stopping（服务端收尾型宿主才走 waitSettled） */
                if (stopper) stopper.finish();
                emitMessages();
                nextTick(() => {
                    if (last && last.content && listEl.value) {
                        const els = listEl.value.querySelectorAll('.nx-ai-chat-msg');
                        const el = els[els.length - 1];
                        if (el) postProcessMd(el.querySelector('.nx-ai-chat-bubble'));
                    }
                });
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

            return { send: send, stop: stop, retry: retry, clear: clear, abort: abort,
                regenerate: regenerate, editResend: editResend, stopper: stopper };
        }
    };
})();
