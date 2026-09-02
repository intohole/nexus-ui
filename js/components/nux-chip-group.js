(function() {
    const NuxChipGroup = {
        name: 'NuxChipGroup',
        props: {
            modelValue: { type: [String, Number, Array], default: '' },
            options: { type: Array, default: () => [] },
            multiple: { type: Boolean, default: false },
            removable: { type: Boolean, default: false },
            disabled: { type: Boolean, default: false }
        },
        emits: ['update:modelValue', 'change', 'remove'],
        methods: {
            isOn(value) {
                if (this.multiple) return Array.isArray(this.modelValue) && this.modelValue.includes(value);
                return this.modelValue === value;
            },
            select(opt) {
                if (this.disabled || opt.disabled) return;
                let next;
                if (this.multiple) {
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
                    v-for="opt in options"
                    :key="String(opt.value)"
                    class="nux-chip"
                    :class="{ 'nux-chip--on': isOn(opt.value), 'nux-chip--disabled': opt.disabled }"
                    role="button"
                    :aria-pressed="String(isOn(opt.value))"
                    @click="select(opt)"
                >
                    {{ opt.label }}
                    <button v-if="removable" type="button" class="nux-chip-remove" aria-label="移除" @click.stop="remove(opt)">×</button>
                </span>
            </div>
        `
    };
    window.NuxChipGroup = NuxChipGroup;
})();
