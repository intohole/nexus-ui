(function() {
    const NuxSegmented = {
        name: 'NuxSegmented',
        props: {
            modelValue: { type: [String, Number], default: '' },
            options: { type: Array, default: () => [] },
            disabled: { type: Boolean, default: false }
        },
        emits: ['update:modelValue', 'change'],
        data() {
            return { indicator: { left: '0px', width: '0px' } };
        },
        watch: {
            modelValue() {
                this.$nextTick(() => this.updateIndicator());
            }
        },
        methods: {
            select(opt) {
                if (this.disabled || opt.disabled) return;
                this.$emit('update:modelValue', opt.value);
                this.$emit('change', opt.value);
            },
            updateIndicator() {
                const btns = this.$refs.btns || [];
                const idx = this.options.findIndex(o => o.value === this.modelValue);
                const el = btns[idx];
                if (!el) {
                    this.indicator = { left: '0px', width: '0px' };
                    return;
                }
                this.indicator = { left: el.offsetLeft + 'px', width: el.offsetWidth + 'px' };
            }
        },
        mounted() {
            this.$nextTick(() => this.updateIndicator());
            this._onResize = () => this.updateIndicator();
            window.addEventListener('resize', this._onResize);
        },
        beforeUnmount() {
            window.removeEventListener('resize', this._onResize);
        },
        template: `
            <div class="nux-segmented" :class="{ 'nux-segmented--disabled': disabled }">
                <span class="nux-segmented-indicator" :style="indicator" aria-hidden="true"></span>
                <button
                    v-for="opt in options"
                    :key="String(opt.value)"
                    ref="btns"
                    type="button"
                    class="nux-segmented-item"
                    :class="{ 'nux-segmented-item--on': opt.value === modelValue, 'nux-segmented-item--disabled': opt.disabled }"
                    :disabled="disabled || opt.disabled"
                    @click="select(opt)"
                >{{ opt.label }}</button>
            </div>
        `
    };
    window.NuxSegmented = NuxSegmented;
})();
