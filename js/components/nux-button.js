(function() {
    const NuxButton = {
        name: 'NuxButton',
        props: {
            variant: { type: String, default: 'primary' },
            size: { type: String, default: 'md' },
            block: { type: Boolean, default: false },
            disabled: { type: Boolean, default: false },
            loading: { type: Boolean, default: false }
        },
        emits: ['click'],
        computed: {
            cls() {
                return [
                    'nux-btn',
                    'nux-btn--' + this.variant,
                    this.size !== 'md' ? 'nux-btn--' + this.size : '',
                    this.block ? 'nux-btn--block' : ''
                ].filter(Boolean).join(' ');
            }
        },
        methods: {
            onClick(e) {
                if (this.disabled || this.loading) return;
                this.$emit('click', e);
            }
        },
        template: `
            <button :class="cls" :disabled="disabled || loading" @click="onClick">
                <span v-if="loading" class="nux-btn-spinner" aria-hidden="true"></span>
                <slot></slot>
            </button>
        `
    };
    window.NuxButton = NuxButton;
})();
