(function() {
    const NuxInput = {
        name: 'NuxInput',
        props: {
            modelValue: { type: [String, Number], default: '' },
            type: { type: String, default: 'text' },
            placeholder: { type: String, default: '' },
            disabled: { type: Boolean, default: false },
            readonly: { type: Boolean, default: false },
            clearable: { type: Boolean, default: false },
            error: { type: String, default: '' },
            hint: { type: String, default: '' },
            maxlength: { type: Number, default: 0 },
            label: { type: String, default: '' },
            required: { type: Boolean, default: false }
        },
        emits: ['update:modelValue', 'enter', 'blur'],
        computed: {
            count() {
                return String(this.modelValue == null ? '' : this.modelValue).length;
            }
        },
        methods: {
            onInput(e) {
                this.$emit('update:modelValue', e.target.value);
            },
            onKeydown(e) {
                if (e.key === 'Enter') this.$emit('enter', e.target.value);
            },
            onBlur(e) {
                this.$emit('blur', e.target.value);
            },
            clear() {
                this.$emit('update:modelValue', '');
            }
        },
        template: `
            <div class="nux-field" :class="{ 'nux-field--error': error }">
                <label v-if="label" class="nux-field-label">
                    {{ label }}<span v-if="required" class="nux-field-required">*</span>
                </label>
                <div class="nux-field-control">
                    <span v-if="$slots.prefix" class="nux-field-prefix"><slot name="prefix"></slot></span>
                    <input
                        class="nux-input"
                        :type="type"
                        :value="modelValue"
                        :placeholder="placeholder"
                        :disabled="disabled"
                        :readonly="readonly"
                        :maxlength="maxlength || null"
                        @input="onInput"
                        @keydown="onKeydown"
                        @blur="onBlur"
                    />
                    <button
                        v-if="clearable && !disabled && !readonly && count > 0"
                        type="button"
                        class="nux-field-clear"
                        aria-label="清空"
                        @click="clear"
                    >×</button>
                    <span v-if="$slots.suffix" class="nux-field-suffix"><slot name="suffix"></slot></span>
                </div>
                <div class="nux-field-foot">
                    <span v-if="error" class="nux-field-error">{{ error }}</span>
                    <span v-else-if="hint" class="nux-field-hint">{{ hint }}</span>
                    <span v-if="maxlength" class="nux-field-count">{{ count }}/{{ maxlength }}</span>
                </div>
            </div>
        `
    };
    window.NuxInput = NuxInput;
})();
