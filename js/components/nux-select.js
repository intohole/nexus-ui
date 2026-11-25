(function() {
    let fieldUid = 0;
    const NuxSelect = {
        name: 'NuxSelect',
        props: {
            modelValue: { type: [String, Number, Boolean], default: '' },
            options: { type: Array, default: () => [] },
            placeholder: { type: String, default: '请选择' },
            disabled: { type: Boolean, default: false },
            error: { type: String, default: '' },
            label: { type: String, default: '' },
            required: { type: Boolean, default: false },
            clearable: { type: Boolean, default: false },
            filterable: { type: Boolean, default: false },
            loading: { type: Boolean, default: false },
            // 联想检索字段（v2.97.0）：默认仅 label；双语场景传 ['label','desc']。
            filterFields: { type: Array, default: () => ['label'] }
        },
        emits: ['update:modelValue', 'change', 'clear', 'query'],
        data() {
            return { open: false, query: '' };
        },
        computed: {
            hasValue() {
                return this.modelValue !== '' && this.modelValue !== null && this.modelValue !== undefined;
            },
            fieldId() {
                if (!this._fieldId) this._fieldId = 'nux-select-' + (++fieldUid);
                return this._fieldId;
            },
            selectedLabel() {
                const opt = this.options.find(o => String(o.value) === String(this.modelValue));
                if (opt) return opt.label;
                // freeText 兜底（v2.97.0）：值不在选项集（如自由文本存量数据）时显示原值
                return this.hasValue ? String(this.modelValue) : '';
            },
            filteredOptions() {
                if (!this.query) return this.options;
                const q = this.query.toLowerCase();
                const fields = this.filterFields && this.filterFields.length ? this.filterFields : ['label'];
                return this.options.filter(o => fields.some(f => {
                    const v = f === 'label' ? o.label : o[f];
                    return String(v != null ? v : '').toLowerCase().includes(q);
                }));
            },
            displayValue() {
                if (this.query !== '') return this.query;
                return this.hasValue ? this.selectedLabel : '';
            }
        },
        methods: {
            onChange(e) {
                const opt = this.options.find(o => String(o.value) === e.target.value);
                const value = opt ? opt.value : e.target.value;
                this.$emit('update:modelValue', value);
                this.$emit('change', value);
            },
            clearValue() {
                this.query = '';
                this.$emit('update:modelValue', '');
                this.$emit('change', '');
                this.$emit('clear');
            },
            pick(opt) {
                if (opt.disabled) return;
                this.query = '';
                this.open = false;
                this.$emit('update:modelValue', opt.value);
                this.$emit('change', opt.value);
            },
            toggleOpen() {
                if (this.disabled) return;
                this.open = !this.open;
                if (this.open) this.query = '';
            },
            onDocClick(e) {
                if (this.$el && !this.$el.contains(e.target)) this.open = false;
            },
            onFilterKey(e) {
                if (e.key === 'Escape') { this.open = false; }
                else if (e.key === 'Enter') {
                    const first = this.filteredOptions.find(o => !o.disabled);
                    if (first) this.pick(first);
                } else if (e.key === 'ArrowDown') {
                    const first = this.filteredOptions[0];
                    if (first && this.filteredOptions.length) e.preventDefault();
                }
            }
        },
        mounted() {
            if (this.filterable) document.addEventListener('click', this.onDocClick);
        },
        beforeUnmount() {
            if (this.filterable) document.removeEventListener('click', this.onDocClick);
        },
        template: `
            <div class="nux-field" :class="{ 'nux-field--error': error }">
                <label v-if="label" class="nux-field-label" :for="fieldId">
                    {{ label }}<span v-if="required" class="nux-field-required">*</span>
                </label>
                <div v-if="!filterable" class="nux-select-wrap">
                    <select :id="fieldId" class="nux-input nux-select-native" :value="modelValue" :disabled="disabled" :aria-invalid="error ? 'true' : undefined" :aria-describedby="error ? fieldId + '-error' : undefined" @change="onChange">
                        <option v-if="!hasValue" value="" disabled>{{ placeholder }}</option>
                        <option v-for="opt in options" :key="String(opt.value)" :value="opt.value" :disabled="opt.disabled">{{ opt.label }}</option>
                    </select>
                    <button v-if="clearable && hasValue && !disabled" type="button" class="nux-select-clear" aria-label="清空选择" @click.stop="clearValue">×</button>
                    <span v-else class="nux-select-arrow" aria-hidden="true">▾</span>
                </div>
                <div v-else class="nux-select-wrap nux-select-wrap--combo" :class="{ 'nux-select-wrap--open': open }">
                    <input :id="fieldId" type="text" class="nux-input nux-select-input" autocomplete="off"
                        :disabled="disabled" :value="displayValue" :placeholder="hasValue ? selectedLabel : placeholder"
                        @input="e => { query = e.target.value; $emit('query', e.target.value); }" @focus="open = true" @click.stop="open = true" @keydown="onFilterKey">
                    <button v-if="clearable && hasValue && !disabled && !open" type="button" class="nux-select-clear" aria-label="清空选择" @click.stop="clearValue">×</button>
                    <span v-else class="nux-select-arrow" aria-hidden="true">▾</span>
                    <ul v-if="open && !disabled" class="nux-select-dropdown" role="listbox">
                        <li v-if="loading" class="nux-select-option nux-select-option--muted">加载中…</li>
                        <li v-else-if="!filteredOptions.length" class="nux-select-option nux-select-option--muted">无匹配项</li>
                        <li v-else v-for="opt in filteredOptions" :key="String(opt.value)" class="nux-select-option nux-select-option--rich"
                            :class="{ 'nux-select-option--selected': String(opt.value) === String(modelValue), 'nux-select-option--disabled': opt.disabled }"
                            role="option" :aria-disabled="opt.disabled ? 'true' : undefined" :aria-selected="String(opt.value) === String(modelValue)"
                            @click.stop="pick(opt)">
                            <slot name="option" :option="opt">
                                <span class="nux-select-option-row">
                                    <span class="nux-select-option-main">{{ opt.label }}</span>
                                    <span v-if="opt.tag" class="nux-select-option-tag">{{ opt.tag }}</span>
                                </span>
                                <span v-if="opt.desc" class="nux-select-option-desc">{{ opt.desc }}</span>
                            </slot>
                        </li>
                    </ul>
                </div>
                <div class="nux-field-foot">
                    <span v-if="error" :id="fieldId + '-error'" class="nux-field-error">{{ error }}</span>
                </div>
            </div>
        `
    };
    window.NuxSelect = NuxSelect;
})();
