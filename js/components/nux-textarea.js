(function() {
    const NuxTextarea = {
        name: 'NuxTextarea',
        props: {
            modelValue: { type: String, default: '' },
            placeholder: { type: String, default: '' },
            rows: { type: Number, default: 3 },
            disabled: { type: Boolean, default: false },
            readonly: { type: Boolean, default: false },
            autoResize: { type: Boolean, default: false },
            error: { type: String, default: '' },
            hint: { type: String, default: '' },
            maxlength: { type: Number, default: 0 },
            label: { type: String, default: '' },
            required: { type: Boolean, default: false }
        },
        emits: ['update:modelValue', 'blur'],
        computed: {
            count() {
                return String(this.modelValue == null ? '' : this.modelValue).length;
            }
        },
        methods: {
            onInput(e) {
                this.$emit('update:modelValue', e.target.value);
                if (this.autoResize) this.resize(e.target);
            },
            onBlur(e) {
                this.$emit('blur', e.target.value);
            },
            resize(el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
            }
        },
        mounted() {
            if (this.autoResize && this.$refs.ta) this.resize(this.$refs.ta);
        },
        template: `
            <div class="nux-field" :class="{ 'nux-field--error': error }">
                <label v-if="label" class="nux-field-label">
                    {{ label }}<span v-if="required" class="nux-field-required">*</span>
                </label>
                <textarea
                    ref="ta"
                    class="nux-input nux-textarea"
                    :rows="rows"
                    :value="modelValue"
                    :placeholder="placeholder"
                    :disabled="disabled"
                    :readonly="readonly"
                    :maxlength="maxlength || null"
                    @input="onInput"
                    @blur="onBlur"
                ></textarea>
                <div class="nux-field-foot">
                    <span v-if="error" class="nux-field-error">{{ error }}</span>
                    <span v-else-if="hint" class="nux-field-hint">{{ hint }}</span>
                    <span v-if="maxlength" class="nux-field-count">{{ count }}/{{ maxlength }}</span>
                </div>
            </div>
        `
    };
    window.NuxTextarea = NuxTextarea;
})();
