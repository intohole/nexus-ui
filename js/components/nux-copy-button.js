(function() {
    const NuxCopyButton = {
        name: 'NuxCopyButton',
        props: {
            text: { type: String, default: '' },
            getText: { type: Function, default: null },
            label: { type: String, default: '复制' },
            variant: { type: String, default: 'ghost' }
        },
        data() {
            return { copied: false, timer: null };
        },
        computed: {
            currentLabel() { return this.copied ? '已复制' : this.label; }
        },
        beforeUnmount() {
            if (this.timer) clearTimeout(this.timer);
        },
        methods: {
            doCopy() {
                const value = this.getText ? this.getText() : this.text;
                if (!value) return;
                const done = (ok) => {
                    if (!ok) return;
                    this.copied = true;
                    if (this.timer) clearTimeout(this.timer);
                    this.timer = setTimeout(() => { this.copied = false; }, 1600);
                };
                if (window.NexusUtils && NexusUtils.copyToClipboard) {
                    NexusUtils.copyToClipboard(value).then(done);
                }
            }
        },
        template: `
            <button type="button"
                    :class="['nux-copy-btn', 'nux-copy-btn--' + variant, { 'is-copied': copied }]"
                    :aria-label="currentLabel" :title="currentLabel"
                    @click="doCopy">
                <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                <span class="nux-copy-btn-text" aria-live="polite">{{ currentLabel }}</span>
            </button>
        `
    };

    window.NuxCopyButton = NuxCopyButton;
})();
