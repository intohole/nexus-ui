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
            loading: { type: Boolean, default: false }
        },
        emits: ['update:modelValue', 'change', 'clear'],
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
                return opt ? opt.label : '';
            },
            filteredOptions() {
                if (!this.query) return this.options;
                const q = this.query.toLowerCase();
                return this.options.filter(o => String(o.label).toLowerCase().includes(q));
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
                    const first = this.filteredOptions[0];
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
                        <option v-for="opt in options" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
                    </select>
                    <button v-if="clearable && hasValue && !disabled" type="button" class="nux-select-clear" aria-label="清空选择" @click.stop="clearValue">×</button>
                    <span v-else class="nux-select-arrow" aria-hidden="true">▾</span>
                </div>
                <div v-else class="nux-select-wrap nux-select-wrap--combo" :class="{ 'nux-select-wrap--open': open }">
                    <input :id="fieldId" type="text" class="nux-input nux-select-input" autocomplete="off"
                        :disabled="disabled" :value="displayValue" :placeholder="hasValue ? selectedLabel : placeholder"
                        @input="e => query = e.target.value" @focus="open = true" @click.stop="open = true" @keydown="onFilterKey">
                    <button v-if="clearable && hasValue && !disabled && !open" type="button" class="nux-select-clear" aria-label="清空选择" @click.stop="clearValue">×</button>
                    <span v-else class="nux-select-arrow" aria-hidden="true">▾</span>
                    <ul v-if="open && !disabled" class="nux-select-dropdown" role="listbox">
                        <li v-if="loading" class="nux-select-option nux-select-option--muted">加载中…</li>
                        <li v-else-if="!filteredOptions.length" class="nux-select-option nux-select-option--muted">无匹配项</li>
                        <li v-else v-for="opt in filteredOptions" :key="String(opt.value)" class="nux-select-option"
                            :class="{ 'nux-select-option--selected': String(opt.value) === String(modelValue) }"
                            role="option" @click.stop="pick(opt)">{{ opt.label }}</li>
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
