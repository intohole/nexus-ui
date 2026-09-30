(function() {
    const NuxTag = {
        name: 'NuxTag',
        props: {
            type: { type: String, default: '' },
            size: { type: String, default: 'md' },
            plain: { type: Boolean, default: false }
        },
        computed: {
            classes() {
                return {
                    'nux-tag': true,
                    ['nux-tag--' + this.type]: !!this.type,
                    'nux-tag--sm': this.size === 'sm',
                    'nux-tag--plain': this.plain
                };
            }
        },
        template: `<span :class="classes"><slot></slot></span>`
    };
    window.NuxTag = NuxTag;
})();
