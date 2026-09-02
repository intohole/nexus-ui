(function() {
    const NuxCheckbox = {
        name: 'NuxCheckbox',
        props: {
            modelValue: { type: Boolean, default: false },
            label: { type: String, default: '' },
            disabled: { type: Boolean, default: false }
        },
        emits: ['update:modelValue', 'change'],
        methods: {
            toggle() {
                if (this.disabled) return;
                this.$emit('update:modelValue', !this.modelValue);
                this.$emit('change', !this.modelValue);
            }
        },
        template: `
            <label class="nux-check" :class="{ 'nux-check--disabled': disabled }" @click.prevent="toggle">
                <span class="nux-check-box" :class="{ 'nux-check-box--on': modelValue }" aria-hidden="true">
                    <svg v-if="modelValue" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5 6.5 12 13 4.5"/></svg>
                </span>
                <input type="checkbox" class="nux-check-native" :checked="modelValue" :disabled="disabled" />
                <span v-if="label" class="nux-check-label">{{ label }}</span>
            </label>
        `
    };
    window.NuxCheckbox = NuxCheckbox;
})();
