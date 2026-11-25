/* NexusAiChatCore —— nux-ai-chat 聚合包支撑层（前21 补偿再分）
 * 上收自 nux-ai-chat-helpers.js：composer 附件纯函数族 + TTS 朗读（helpers 保别名转发）；
 * 下沉自 nux-ai-chat.js：流式块级渲染器工厂 + 编辑重发状态机工厂。
 * Vue-free（工厂经 env 注入响应式依赖），tests 直测面保持。
 */
(function() {
    'use strict';
    window.NuxAiChatCore = {
        /* ---------- composer 附件纯函数族（v2.89.0 形态守恒） ---------- */
        attachmentFrom: function (file) {
            return {
                id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                file: file, name: file.name, size: file.size, type: file.type || '',
                status: 'pending', url: '', error: '', preview: ''
            };
        },
        filterAttachmentFiles: function (files, existing, inputCfg) {
            const max = (inputCfg && inputCfg.attachmentMaxCount) || 4;
            const maxBytes = ((inputCfg && inputCfg.attachmentMaxSizeMb) || 10) * 1024 * 1024;
            const list = Array.from(files || []);
            const room = Math.max(0, max - existing.length);
            const inRoom = list.slice(0, room);
            const accepted = inRoom.filter((f) => f.size <= maxBytes);
            return { accepted: accepted, oversize: inRoom.length - accepted.length, overflow: list.length - room };
        },
        uploadAttachment: function (att, uploader) {
            att.status = 'uploading';
            return Promise.resolve()
                .then(() => uploader(att.file))
                .then((out) => {
                    att.status = 'done';
                    att.url = (out && (out.url || out.audio_url)) || '';
                    if (!att.url) { att.status = 'error'; att.error = '上传响应缺少 url'; }
                    return att;
                })
                .catch((e) => {
                    att.status = 'error';
                    att.error = (e && e.message) || '上传失败';
                    return att;
                });
        },
        snapshotAttachments: function (attachments) {
            if (!attachments || !attachments.length) return null;
            const out = attachments.map((a) => ({
                id: a.id, name: a.name, size: a.size, type: a.type,
                status: a.status, url: a.url
            }));
            attachments.splice(0, attachments.length);
            return out;
        },
        speakMessage: function (env, m) {
            if (!window.NexusTts || !m || !m.content) return;
            const sid = env.speakingId;
            if (sid.value === m.id) {
                NexusTts.stop();
                sid.value = '';
                return;
            }
            sid.value = m.id;
            const strip = (window.NexusChat && NexusChat.stripMarkdownForTts)
                || window.NuxAiChatHelpers.stripMarkdownForTts;
            NexusTts.speak(strip(m.content)).then((ok) => {
                if (!ok && sid.value === m.id) sid.value = '';
            });
        },

        /* ---------- 流式块级渲染器工厂（自 nux-ai-chat.js 下沉） ----------
         * 稳定区 html 仅块推进时变化（v-html 值不变不重建 DOM），活跃尾块经 rAF
         * 合帧每帧最多渲一次。env: { list: array, enabled(): boolean, inList(m): boolean } */
        createStreamers: function (env) {
            const streamers = new WeakMap();
            function refreshStream(m) {
                if (!env.enabled() || !m.streaming) return;
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
                    if (!env.inList(m)) { streamers.delete(m); return; }
                    const out = NexusStreamdown.update(m.content, s);
                    if (out) {
                        m.stableHtml = out.stableHtml;
                        m.activeHtml = out.activeHtml;
                    }
                });
            }
            function stopStreamers() {
                (env.list || []).forEach((m) => {
                    const s = streamers.get(m);
                    if (s && s.raf) cancelAnimationFrame(s.raf);
                });
            }
            return { refreshStream: refreshStream, stopStreamers: stopStreamers };
        },

        /* ---------- 编辑重发状态机工厂（自 nux-ai-chat.js 下沉） ----------
         * env: { feat, isStreaming(ref), disabled(): boolean, editResend(msg, text) } */
        createEditResend: function (env) {
            function startEdit(m) {
                if (!env.feat.chatActions || env.feat.editResend === 'off' || env.isStreaming.value || env.disabled()) return;
                if (!m || m.role !== 'user') return;
                m._editDraft = m.content;
                m._editing = true;
            }
            function cancelEdit(m) {
                if (!m) return;
                m._editing = false;
                m._editDraft = '';
            }
            function confirmEdit(m) {
                if (!m || !m._editing) return;
                const text = String(m._editDraft || '').trim();
                m._editing = false;
                m._editDraft = '';
                if (!text || text === m.content) return;
                env.editResend(m, text);
            }
            return { startEdit: startEdit, cancelEdit: cancelEdit, confirmEdit: confirmEdit };
        }
    };
})();
