(function() {
    const SIZE_ALIAS = { small: 'sm', medium: 'md', large: 'lg' };
    const NuxButton = {
        name: 'NuxButton',
        props: {
            variant: { type: String, default: 'primary' },
            size: { type: String, default: 'md', validator: v => ['sm', 'md', 'lg', 'small', 'medium', 'large'].includes(v) },
            block: { type: Boolean, default: false },
            disabled: { type: Boolean, default: false },
            loading: { type: Boolean, default: false }
        },
        emits: ['click'],
        computed: {
            normSize() {
                return SIZE_ALIAS[this.size] || this.size;
            },
            cls() {
                return [
                    'nux-btn',
                    'nux-btn--' + this.variant,
                    this.normSize !== 'md' ? 'nux-btn--' + this.normSize : '',
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
