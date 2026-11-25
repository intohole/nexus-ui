(function() {
    const NuxChipGroup = {
        name: 'NuxChipGroup',
        props: {
            modelValue: { type: [String, Number, Array], default: '' },
            options: { type: Array, default: () => [] },
            multiple: { type: Boolean, default: false },
            removable: { type: Boolean, default: false },
            disabled: { type: Boolean, default: false },
            // 折叠（v2.97.0）：>maxVisible 时裁渲染并出「还有 N 个」开关；
            // N=全部被折叠项数（含已选，评审裁定口径——计数与选中正交，数字不随选择漂移）。0=不折叠。
            maxVisible: { type: Number, default: 0 },
            // variant='action'：chip 即动作钮（去 aria-pressed/选中态样式；change 恒发被点值不回弹）
            variant: { type: String, default: 'select' }
        },
        emits: ['update:modelValue', 'change', 'remove'],
        data() {
            return { expanded: false };
        },
        computed: {
            visibleOptions() {
                if (!this.maxVisible || this.expanded) return this.options;
                return this.options.slice(0, this.maxVisible);
            },
            foldedCount() {
                if (!this.maxVisible) return 0;
                return Math.max(0, this.options.length - this.maxVisible);
            }
        },
        methods: {
            isOn(value) {
                if (this.multiple) return Array.isArray(this.modelValue) && this.modelValue.includes(value);
                return this.modelValue === value;
            },
            select(opt) {
                if (this.disabled || opt.disabled) return;
                let next;
                if (this.variant === 'action') {
                    next = opt.value;
                } else if (this.multiple) {
                    const list = Array.isArray(this.modelValue) ? this.modelValue.slice() : [];
                    const i = list.indexOf(opt.value);
                    if (i >= 0) list.splice(i, 1); else list.push(opt.value);
                    next = list;
                } else {
                    next = this.modelValue === opt.value ? '' : opt.value;
                }
                this.$emit('update:modelValue', next);
                this.$emit('change', next);
            },
            remove(opt) {
                if (this.disabled || !this.removable) return;
                this.$emit('remove', opt.value);
                this.$emit('change', this.modelValue);
            }
        },
        template: `
            <div class="nux-chip-group" :class="{ 'nux-chip-group--disabled': disabled }">
                <span
                    v-for="opt in visibleOptions"
                    :key="String(opt.value)"
                    class="nux-chip"
                    :class="{ 'nux-chip--on': variant === 'select' && isOn(opt.value), 'nux-chip--disabled': opt.disabled }"
                    role="button"
                    :aria-pressed="variant === 'select' ? String(isOn(opt.value)) : undefined"
                    :tabindex="disabled || opt.disabled ? -1 : 0"
                    @click="select(opt)"
                    @keydown.enter.prevent="select(opt)"
                    @keydown.space.prevent="select(opt)"
                >
                    <span class="nux-chip-main">{{ opt.label }}</span>
                    <span v-if="opt.stat" class="nux-chip-stat">{{ opt.stat }}</span>
                    <button v-if="removable" type="button" class="nux-chip-remove" aria-label="移除" @click.stop="remove(opt)" @keydown.stop>×</button>
                </span>
                <button v-if="foldedCount > 0" type="button" class="nux-chip-more" @click="expanded = !expanded">
                    {{ expanded ? '收起' : '还有 ' + foldedCount + ' 个' }}
                </button>
            </div>
        `
    };
    window.NuxChipGroup = NuxChipGroup;
})();
