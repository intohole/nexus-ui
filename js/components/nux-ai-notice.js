(function () {
    if (window.NuxAiNotice) return;
    if (!window.Vue) return;

    var NuxAiNotice = {
        name: 'NuxAiNotice',
        props: {
            text: { type: String, default: '由 AI 生成' },
            note: { type: String, default: '内容由 AI 生成，关键数据请以权威来源核实' },
            size: { type: String, default: 'md' },
            tone: { type: String, default: 'accent' }
        },
        computed: {
            hasBadge: function () {
                return !!window.NuxAiBadge;
            },
            classes: function () {
                return ['nux-ai-notice', 'is-' + this.size];
            }
        },
        template: `
            <div :class="classes" :data-tone="tone" role="note" :aria-label="note || text">
                <nux-ai-badge v-if="hasBadge" :text="text" :size="size" :tone="tone"></nux-ai-badge>
                <span v-else class="nux-ai-notice-badge">
                    <svg class="nux-ai-notice-glyph" width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8z"></path>
                        <path d="M18.5 15.5l.7 1.7 1.8.8-1.8.8-.7 1.7-.7-1.7-1.8-.8 1.8-.8z"></path>
                    </svg>
                    <span class="nux-ai-notice-badge-text">{{ text }}</span>
                </span>
                <span v-if="note" class="nux-ai-notice-note">{{ note }}</span>
                <span v-if="$slots.default" class="nux-ai-notice-actions"><slot></slot></span>
            </div>
        `
    };

    if (window.Vue && Vue.component) {
        try { Vue.component('nux-ai-notice', NuxAiNotice); } catch (e) {}
    }

    window.NuxAiNotice = NuxAiNotice;
})();