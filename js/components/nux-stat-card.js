(function() {
    const NuxStatCard = {
        name: 'NuxStatCard',
        props: {
            icon: { type: String, default: '' },
            value: { type: [String, Number], default: '0' },
            label: { type: String, default: '' },
            subtext: { type: String, default: '' },
            trend: { type: Number, default: 0 },
            color: { type: String, default: '' }
        },
        computed: {
            trendClass() {
                return this.trend > 0 ? 'nux-stat-trend-up' : this.trend < 0 ? 'nux-stat-trend-down' : '';
            },
            trendText() {
                if (this.trend === 0) return '';
                return this.trend > 0 ? `+${this.trend}%` : `${this.trend}%`;
            },
            isNumeric() {
                return typeof this.value === 'number' || /^-?\d+(\.\d+)?$/.test(String(this.value).trim());
            }
        },
        data() {
            return { display: this.isNumeric ? '' : this.value };
        },
        methods: {
            animate(to, duration) {
                const target = Number(String(to).trim());
                if (!this.isNumeric || Number.isNaN(target) ||
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    this.display = this.value;
                    return;
                }
                const from = Number(this.display) || 0;
                const isInt = Number.isInteger(target);
                const start = performance.now();
                const step = (now) => {
                    const p = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - p, 3);
                    const val = from + (target - from) * eased;
                    this.display = isInt ? String(Math.round(val)) : String(Number(val.toFixed(2)));
                    if (p < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            }
        },
        watch: {
            value: {
                immediate: true,
                handler(v) {
                    if (this.isNumeric) this.animate(v, 500);
                    else this.display = v;
                }
            }
        },
        template: `
            <div class="nx-card nux-stat-card" :style="color ? '--stat-color: ' + color : ''">
                <div class="nux-stat-icon" v-if="icon">{{ icon }}</div>
                <div class="nux-stat-body">
                    <div class="nux-stat-value">{{ display }}</div>
                    <div class="nux-stat-label" v-if="label">{{ label }}</div>
                    <div class="nux-stat-sub" v-if="subtext">{{ subtext }}</div>
                </div>
                <div v-if="trend !== 0" :class="['nux-stat-trend', trendClass]">{{ trendText }}</div>
            </div>
        `
    };

    window.NuxStatCard = NuxStatCard;
})();
