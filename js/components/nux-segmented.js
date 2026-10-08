(function() {
    const NuxSegmented = {
        name: 'NuxSegmented',
        props: {
            modelValue: { type: [String, Number], default: '' },
            options: { type: Array, default: () => [] },
            disabled: { type: Boolean, default: false },
            ariaLabel: { type: String, default: '' }
        },
        emits: ['update:modelValue', 'change'],
        data() {
            return { indicator: { left: '0px', width: '0px' } };
        },
        watch: {
            modelValue() {
                this.$nextTick(() => this.updateIndicator());
            },
            options: {
                deep: true,
                handler() {
                    this.$nextTick(() => this.updateIndicator());
                }
            }
        },
        computed: {
            tabbableValue() {
                if (this.disabled) return null;
                const selIdx = this.options.findIndex(o => o.value === this.modelValue);
                if (selIdx > -1) return this.modelValue;
                const first = this.options.find(o => !o.disabled);
                return first ? first.value : null;
            }
        },
        methods: {
            select(opt) {
                if (this.disabled || opt.disabled) return;
                this.$emit('update:modelValue', opt.value);
                this.$emit('change', opt.value);
            },
            onKeydown(e) {
                if (this.disabled) return;
                const total = this.options.length;
                if (!total) return;
                const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Home';
                let idx = (window.NexusUtils && NexusUtils.rovingIndex(e, total,
                    this.options.findIndex(o => o.value === this.modelValue))) ?? -1;
                if (idx < 0) return;
                e.preventDefault();
                for (let i = 0; i < total; i++) {
                    const opt = this.options[idx];
                    if (opt && !opt.disabled) {
                        this.select(opt);
                        this.$nextTick(() => {
                            const el = (this.$refs.btns || [])[idx];
                            if (el && el.focus) el.focus();
                        });
                        return;
                    }
                    idx = back ? (idx - 1 + total) % total : (idx + 1) % total;
                }
            },
            updateIndicator() {
                const btns = this.$refs.btns || [];
                const idx = this.options.findIndex(o => o.value === this.modelValue);
                const el = btns[idx];
                if (!el) {
                    if (this.indicator.left !== '0px' || this.indicator.width !== '0px') this.indicator = { left: '0px', width: '0px' };
                    return;
                }
                const left = el.offsetLeft + 'px';
                const width = el.offsetWidth + 'px';
                if (this.indicator.left === left && this.indicator.width === width) return;
                this.indicator = { left: left, width: width };
            }
        },
        mounted() {
            this.$nextTick(() => this.updateIndicator());
            this._onResize = () => this.updateIndicator();
            window.addEventListener('resize', this._onResize);
            if (window.ResizeObserver) {
                this._ro = new ResizeObserver(() => this.updateIndicator());
                this._ro.observe(this.$el);
            }
        },
        beforeUnmount() {
            window.removeEventListener('resize', this._onResize);
            if (this._ro) this._ro.disconnect();
        },
        template: `
            <div class="nux-segmented" :class="{ 'nux-segmented--disabled': disabled }" role="radiogroup" :aria-label="ariaLabel || undefined" @keydown="onKeydown">
                <span class="nux-segmented-indicator" :style="indicator" aria-hidden="true"></span>
                <button
                    v-for="opt in options"
                    :key="String(opt.value)"
                    ref="btns"
                    type="button"
                    role="radio"
                    class="nux-segmented-item"
                    :class="{ 'nux-segmented-item--on': opt.value === modelValue, 'nux-segmented-item--disabled': opt.disabled }"
                    :disabled="disabled || opt.disabled"
                    :aria-checked="opt.value === modelValue ? 'true' : 'false'"
                    :tabindex="!disabled && !opt.disabled && opt.value === tabbableValue ? 0 : -1"
                    @click="select(opt)"
                >{{ opt.label }}</button>
            </div>
        `
    };
    window.NuxSegmented = NuxSegmented;
})();
