(function() {
    const NuxSelect = {
        name: 'NuxSelect',
        props: {
            modelValue: { type: [String, Number, Boolean], default: '' },
            options: { type: Array, default: () => [] },
            placeholder: { type: String, default: '请选择' },
            disabled: { type: Boolean, default: false },
            error: { type: String, default: '' },
            label: { type: String, default: '' },
            required: { type: Boolean, default: false }
        },
        emits: ['update:modelValue', 'change'],
        computed: {
            hasValue() {
                return this.modelValue !== '' && this.modelValue !== null && this.modelValue !== undefined;
            }
        },
        methods: {
            onChange(e) {
                this.$emit('update:modelValue', e.target.value);
                this.$emit('change', e.target.value);
            }
        },
        template: `
            <div class="nux-field" :class="{ 'nux-field--error': error }">
                <label v-if="label" class="nux-field-label">
                    {{ label }}<span v-if="required" class="nux-field-required">*</span>
                </label>
                <div class="nux-select-wrap">
                    <select class="nux-input nux-select-native" :value="modelValue" :disabled="disabled" @change="onChange">
                        <option v-if="!hasValue" value="" disabled>{{ placeholder }}</option>
                        <option v-for="opt in options" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
                    </select>
                    <span class="nux-select-arrow" aria-hidden="true">▾</span>
                </div>
                <div class="nux-field-foot">
                    <span v-if="error" class="nux-field-error">{{ error }}</span>
                </div>
            </div>
        `
    };
    window.NuxSelect = NuxSelect;
})();
