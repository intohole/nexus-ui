(function() {
    if (window.NuxAiIndicator) return;
    if (!window.Vue) return;

    const NuxAiIndicator = {
        name: 'NuxAiIndicator',
        props: {
            state: { type: String, default: 'awaiting' },
            label: { type: String, default: '' }
        },
        computed: {
            text() {
                if (this.state === 'tool') return '已调度能力，正在为你处理…';
                if (this.state === 'routing') return '正在寻找最合适的能力…';
                if (this.state === 'streaming') return '正在生成回答…';
                return this.label || '正在理解你的需求…';
            },
            isTyping() {
                return !this.state || this.state === 'awaiting' || this.state === 'streaming';
            }
        },
        template: `
            <div class="nux-ai-indicator" role="status" :aria-live="'polite'">
                <span class="nux-ai-indicator-dots" aria-hidden="true">
                    <i></i><i></i><i></i>
                </span>
                <span class="nux-ai-indicator-text">{{ text }}</span>
            </div>
        `
    };

    if (window.Vue && Vue.component) {
        try { Vue.component('nux-ai-indicator', NuxAiIndicator); } catch (e) {}
    }

    window.NuxAiIndicator = NuxAiIndicator;
})();