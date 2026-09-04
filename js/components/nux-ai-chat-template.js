(function () {
    'use strict';
    window.NuxAiChatTemplate = `
        <div class="nx-ai-chat" :class="{ 'keyboard-open': kbHeight > 0 }" :style="kbHeight > 0 ? { '--nx-chat-kb': kbHeight + 'px' } : null">
            <div class="nx-ai-chat-messages" ref="scrollEl" @scroll="onScroll">
                <div class="nx-ai-chat-list" ref="listEl">
                    <div v-if="!list.length && !$slots.empty && !$slots.welcome" class="nx-ai-chat-welcome">
                        <div class="nx-ai-chat-welcome-icon">{{ welcome.icon || '👋' }}</div>
                        <h3 class="nx-ai-chat-welcome-title">{{ welcome.title || 'AI助手为您服务' }}</h3>
                        <p class="nx-ai-chat-welcome-desc">{{ welcome.description || '有什么可以帮您的？请输入您的问题~' }}</p>
                        <div v-if="quickReplies.length" class="nx-ai-chat-quick">
                            <button v-for="(q,i) in quickReplies" :key="i" class="nx-ai-chat-quick-btn" @click="clickQuickReply(q)">
                                <span v-if="q.icon" class="nx-ai-chat-quick-icon">{{ q.icon }}</span>
                                <span>{{ q.text }}</span>
                            </button>
                        </div>
                    </div>
                    <slot v-if="!list.length" name="welcome"></slot>
                    <slot v-if="!list.length" name="empty"></slot>

                    <div v-for="m in list" :key="m.id" class="nx-ai-chat-msg" :class="['nx-ai-chat-' + m.role, { 'is-streaming': m.streaming, 'is-error': m.error }]">
                        <div class="nx-ai-chat-avatar">{{ roleCfg[m.role] ? roleCfg[m.role].avatar : '🤖' }}</div>
                        <div class="nx-ai-chat-main">
                            <div class="nx-ai-chat-meta">
                                <span class="nx-ai-chat-name">{{ roleCfg[m.role] ? roleCfg[m.role].label : m.role }}</span>
                                <span v-if="roleCfg[m.role] && roleCfg[m.role].aiTag && feat.aiTag" class="nx-ai-chat-aitag nx-ai-badge nx-ai-badge-sm" data-tone="accent"><svg class="nx-ai-badge-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/></svg><span class="nx-ai-badge-text">AI 生成</span></span>
                            </div>
                            <div class="nx-ai-chat-bubble">
                                <slot name="message-before" :msg="m"></slot>
                                <div v-if="feat.richReasoning && m.thinking" class="nx-ai-chat-reasoning">
                                    <button type="button" class="nx-ai-chat-reasoning-toggle" @click="m.showReasoning = !m.showReasoning">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" :style="m.showReasoning ? 'transform:rotate(180deg)' : ''"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        <span>思考过程</span>
                                        <span v-if="m.streaming">…</span>
                                    </button>
                                    <div v-if="m.showReasoning" class="nx-ai-chat-reasoning-body">{{ m.thinking }}</div>
                                </div>
                                <div v-if="feat.richTools && m.tools && m.tools.length" class="nx-ai-chat-tools">
                                    <span v-for="(t, ti) in m.tools" :key="'t' + ti" class="nx-ai-chat-tool-chip">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                                        {{ t }}
                                    </span>
                                </div>
                                <template v-if="m.streaming && !m.content && feat.typingIndicator && !m.thinking">
                                    <div class="nx-ai-chat-typing">
                                        <span></span><span></span><span></span>
                                        <em class="nx-ai-chat-thinking">正在思考…</em>
                                    </div>
                                </template>
                                <template v-else>
                                    <div class="nx-ai-chat-content" v-html="renderMarkdown(m.content)"></div>
                                    <span v-if="m.streaming" class="nx-ai-chat-cursor"></span>
                                </template>
                                <div v-if="feat.richReferences && m.references && m.references.length" class="nx-ai-chat-references">
                                    <p class="nx-ai-chat-ref-title">引用来源</p>
                                    <a v-for="(r, ri) in m.references" :key="'r' + ri" class="nx-ai-chat-ref-item" :href="typeof r === 'string' ? r : (r.url || r.link || '#')" target="_blank" rel="noopener">{{ typeof r === 'string' ? r : (r.title || r.url || r.link || '#') }}</a>
                                </div>
                                <slot name="message-after" :msg="m"></slot>
                            </div>
                            <div v-if="m.error" class="nx-ai-chat-error-bar">
                                <span>{{ errorMsg || m.errorMsg || '生成失败' }}</span>
                                <button class="nx-ai-chat-retry-btn" @click="retry(m)">重试</button>
                            </div>
                            <div v-if="!m.streaming && !m.error && m.content && feat.messageCopy" class="nx-ai-chat-actions">
                                <button class="nx-ai-chat-action-btn" @click="copyMessage(m)">复制</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <transition name="nx-ai-chat-fab">
                <button v-if="showScrollBtn" class="nx-ai-chat-scroll-btn" @click="scrollToBottom">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    <span v-if="newMsgCount" class="nx-ai-chat-scroll-badge">{{ newMsgCount }}</span>
                </button>
            </transition>

            <div class="nx-ai-chat-input-wrap">
                <slot name="input-before"></slot>
                <div v-if="isStreaming" class="nx-ai-chat-status">
                    <span class="nx-ai-chat-status-spinner"></span>
                    <span class="nx-ai-chat-status-text">AI 正在生成，已用时 {{ elapsed }}s</span>
                </div>
                <div class="nx-ai-chat-input-row">
                    <textarea
                        ref="inputEl"
                        v-model="input"
                        class="nx-ai-chat-input"
                        :placeholder="placeholder"
                        :disabled="disabled"
                        :maxlength="inputCfg.maxLength"
                        rows="1"
                        @input="onInput"
                        @keydown="onKeydown"
                        @compositionstart="onCompositionStart"
                        @compositionend="onCompositionEnd"
                    ></textarea>
                    <button v-if="isStreaming && feat.stopButton" class="nx-ai-chat-btn nx-ai-chat-stop" @click="stop" aria-label="停止生成">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>
                    </button>
                    <button v-else class="nx-ai-chat-btn nx-ai-chat-send" :disabled="!input.trim() || isStreaming || disabled" @click="send()" aria-label="发送">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
                <slot name="input-after"></slot>
            </div>
        </div>
        `;
})();