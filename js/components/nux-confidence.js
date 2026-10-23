(function() {
    const LEVELS = ['fail', 'shaky', 'fair', 'good'];
    const WORDS = { fail: '没把握', shaky: '不太好说', fair: '比较可信', good: '很可信' };
    const TONES = { fail: 'danger', shaky: 'warning', fair: 'accent', good: 'success' };

    const NuxConfidence = {
        name: 'NuxConfidence',
        props: {
            level: { type: [String, Number], default: '' },
            label: { type: String, default: '' },
            pct: { type: Number, default: null },
            note: { type: String, default: '' },
            variant: { type: String, default: 'badge' },
            hidePct: { type: Boolean, default: false }
        },
        computed: {
            key() {
                if (typeof this.level === 'number') return LEVELS[this.level - 1] || '';
                return LEVELS.indexOf(String(this.level).trim()) > -1 ? String(this.level).trim() : '';
            },
            word() { return this.label || WORDS[this.key] || ''; },
            tone() { return this.key ? TONES[this.key] : 'muted'; },
            pctText() {
                if (this.hidePct || typeof this.pct !== 'number' || Number.isNaN(this.pct)) return '';
                const v = Math.round(this.pct);
                return v >= 0 && v <= 100 ? v + '%' : '';
            },
            ariaText() {
                if (!this.key) return '置信度：待确认';
                const p = this.pctText ? '，约 ' + this.pctText : '';
                return '置信度：' + this.word + p;
            }
        },
        template: `
            <span :class="['nx-confidence', 'nx-confidence--' + variant, 'nx-confidence--' + tone]"
                  role="img" :aria-label="ariaText">
                <template v-if="variant === 'band'">
                    <span class="nx-confidence-word">{{ key ? word : '待确认' }}</span>
                    <span class="nx-confidence-pct" v-if="pctText">{{ pctText }}</span>
                    <span class="nx-confidence-note" v-if="note">{{ note }}</span>
                </template>
                <template v-else>
                    <span class="nx-confidence-dot" aria-hidden="true"></span>
                    <span class="nx-confidence-word">{{ key ? word : '待确认' }}</span>
                    <span class="nx-confidence-pct" v-if="pctText">{{ pctText }}</span>
                    <span class="nx-confidence-note" v-if="note">{{ note }}</span>
                </template>
            </span>
        `
    };

    window.NuxConfidence = NuxConfidence;
})();
