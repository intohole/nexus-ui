(function() {
    const NuxRadioGroup = {
        name: 'NuxRadioGroup',
        props: {
            modelValue: { type: [String, Number, Boolean], default: '' },
            options: { type: Array, default: () => [] },
            label: { type: String, default: '' },
            required: { type: Boolean, default: false },
            error: { type: String, default: '' },
            disabled: { type: Boolean, default: false },
            block: { type: Boolean, default: false }
        },
        emits: ['update:modelValue', 'change'],
        methods: {
            select(opt) {
                if (this.disabled || opt.disabled) return;
                this.$emit('update:modelValue', opt.value);
                this.$emit('change', opt.value);
            }
        },
        template: `
            <div class="nux-field" :class="{ 'nux-field--error': error }" role="radiogroup" :aria-label="label || undefined" :aria-disabled="disabled || undefined">
                <label v-if="label" class="nux-field-label">
                    {{ label }}<span v-if="required" class="nux-field-required">*</span>
                </label>
                <div class="nux-radio-group" :class="{ 'nux-radio-group--block': block, 'nux-radio-group--disabled': disabled }">
                    <button v-for="opt in options" :key="String(opt.value)" type="button" class="nux-radio-item"
                        role="radio" :aria-checked="String(modelValue === opt.value)"
                        :class="{ 'nux-radio-item--on': modelValue === opt.value, 'nux-radio-item--disabled': opt.disabled }"
                        :disabled="disabled || opt.disabled" @click="select(opt)">
                        <span class="nux-radio-dot" aria-hidden="true"></span>
                        <span class="nux-radio-text">{{ opt.label }}</span>
                    </button>
                </div>
                <div class="nux-field-foot">
                    <span v-if="error" class="nux-field-error">{{ error }}</span>
                </div>
            </div>
        `
    };
    window.NuxRadioGroup = NuxRadioGroup;
})();
