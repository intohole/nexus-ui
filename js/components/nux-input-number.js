(function() {
    const NuxInputNumber = {
        name: 'NuxInputNumber',
        props: {
            modelValue: { type: Number, default: 0 },
            min: { type: Number, default: -Infinity },
            max: { type: Number, default: Infinity },
            step: { type: Number, default: 1 },
            label: { type: String, default: '' },
            required: { type: Boolean, default: false },
            error: { type: String, default: '' },
            disabled: { type: Boolean, default: false },
            unit: { type: String, default: '' },
            placeholder: { type: String, default: '' }
        },
        emits: ['update:modelValue', 'change'],
        computed: {
            atMin() { return this.modelValue <= this.min; },
            atMax() { return this.modelValue >= this.max; }
        },
        methods: {
            clamp(v) {
                if (v === '' || v === null || v === undefined || Number.isNaN(v)) return this.modelValue;
                let n = Number(v);
                if (Number.isNaN(n)) return this.modelValue;
                n = Math.min(this.max, Math.max(this.min, n));
                const snapped = Math.round(n / this.step) * this.step;
                const fixed = Number((Math.abs(snapped) < 1 ? snapped : Math.round(snapped * 1e6) / 1e6).toFixed(6));
                return Math.min(this.max, Math.max(this.min, fixed));
            },
            emit(v) {
                const next = this.clamp(v);
                if (next === this.modelValue) return;
                this.$emit('update:modelValue', next);
                this.$emit('change', next);
            },
            stepBy(dir) {
                if (this.disabled) return;
                this.emit((this.modelValue || 0) + dir * this.step);
            },
            onInput(e) {
                const raw = e.target.value;
                if (raw === '') return;
                const n = Number(raw);
                if (Number.isNaN(n)) return;
                if (n < this.min || n > this.max) return;
                this.$emit('update:modelValue', n);
                this.$emit('change', n);
            },
            onBlur(e) {
                this.emit(e.target.value === '' ? this.min === -Infinity ? 0 : this.modelValue : e.target.value);
            }
        },
        template: `
            <div class="nux-field" :class="{ 'nux-field--error': error }">
                <label v-if="label" class="nux-field-label">
                    {{ label }}<span v-if="required" class="nux-field-required">*</span>
                </label>
                <div class="nux-input-number" :class="{ 'nux-input-number--disabled': disabled }">
                    <button type="button" class="nux-input-number-btn" :disabled="disabled || atMin"
                        aria-label="减少" @click="stepBy(-1)">−</button>
                    <input class="nux-input nux-input-number-native" type="number" inputmode="decimal"
                        :value="modelValue" :min="min === -Infinity ? undefined : min" :max="max === Infinity ? undefined : max"
                        :step="step" :disabled="disabled" :placeholder="placeholder"
                        :aria-label="label || '数值输入'" @input="onInput" @blur="onBlur" />
                    <span v-if="unit" class="nux-input-number-unit">{{ unit }}</span>
                    <button type="button" class="nux-input-number-btn" :disabled="disabled || atMax"
                        aria-label="增加" @click="stepBy(1)">＋</button>
                </div>
                <div class="nux-field-foot">
                    <span v-if="error" class="nux-field-error">{{ error }}</span>
                </div>
            </div>
        `
    };
    window.NuxInputNumber = NuxInputNumber;
})();
