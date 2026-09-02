(function() {
    const NuxSearchBox = {
        name: 'NuxSearchBox',
        props: {
            modelValue: { type: String, default: '' },
            placeholder: { type: String, default: '搜索' },
            delay: { type: Number, default: 300 },
            disabled: { type: Boolean, default: false }
        },
        emits: ['update:modelValue', 'search'],
        data() {
            return { inner: this.modelValue, timer: null };
        },
        watch: {
            modelValue(v) {
                if (v !== this.inner) this.inner = v;
            }
        },
        methods: {
            onInput(e) {
                this.inner = e.target.value;
                this.$emit('update:modelValue', this.inner);
                clearTimeout(this.timer);
                this.timer = setTimeout(() => this.$emit('search', this.inner), this.delay);
            },
            clear() {
                this.inner = '';
                this.$emit('update:modelValue', '');
                clearTimeout(this.timer);
                this.$emit('search', '');
            },
            onEnter() {
                clearTimeout(this.timer);
                this.$emit('search', this.inner);
            }
        },
        beforeUnmount() {
            clearTimeout(this.timer);
        },
        template: `
            <div class="nux-search-box">
                <span class="nux-search-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="6"/><path d="m17 17-3.5-3.5"/></svg>
                </span>
                <input
                    class="nux-search-input"
                    type="search"
                    :value="inner"
                    :placeholder="placeholder"
                    :disabled="disabled"
                    @input="onInput"
                    @keydown.enter.prevent="onEnter"
                />
                <button v-if="inner" type="button" class="nux-field-clear" aria-label="清空" @click="clear">×</button>
            </div>
        `
    };
    window.NuxSearchBox = NuxSearchBox;
})();
