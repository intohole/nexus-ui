(function() {
    const NuxLoading = {
        name: 'NuxLoading',
        props: {
            text: { type: String, default: '' },
            size: { type: String, default: 'md' },
            inline: { type: Boolean, default: false }
        },
        computed: {
            cls() {
                return [
                    'nux-loading',
                    this.inline ? 'nux-loading--inline' : 'nux-loading--block',
                    'nux-loading--' + this.size
                ].join(' ');
            }
        },
        template: `
            <div :class="cls" role="status" :aria-label="text || '加载中'">
                <span class="nux-loading-spinner" aria-hidden="true"></span>
                <span v-if="text" class="nux-loading-text">{{ text }}</span>
            </div>
        `
    };
    window.NuxLoading = NuxLoading;
})();
