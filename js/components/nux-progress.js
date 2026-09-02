(function() {
    const NuxProgress = {
        name: 'NuxProgress',
        props: {
            value: { type: Number, default: 0 },
            type: { type: String, default: 'line' },
            size: { type: Number, default: 72 },
            strokeWidth: { type: Number, default: 8 },
            label: { type: String, default: '' },
            showPercent: { type: Boolean, default: true },
            status: { type: String, default: '' }
        },
        computed: {
            pct() {
                return Math.min(Math.max(this.value, 0), 100);
            },
            pctText() {
                return Math.round(this.pct) + '%';
            },
            circleStyle() {
                const r = (this.size - this.strokeWidth) / 2;
                const c = 2 * Math.PI * r;
                return {
                    r: r,
                    circumference: c,
                    dashoffset: c * (1 - this.pct / 100)
                };
            }
        },
        template: `
            <div class="nux-progress" :class="status ? 'nux-progress--' + status : ''">
                <template v-if="type === 'circle'">
                    <div class="nux-progress-circle" :style="{ width: size + 'px', height: size + 'px' }">
                        <svg :width="size" :height="size" :viewBox="'0 0 ' + size + ' ' + size">
                            <circle class="nux-progress-circle-bg" :cx="size / 2" :cy="size / 2" :r="circleStyle.r" :stroke-width="strokeWidth" fill="none" />
                            <circle class="nux-progress-circle-val" :cx="size / 2" :cy="size / 2" :r="circleStyle.r" :stroke-width="strokeWidth" fill="none"
                                :stroke-dasharray="circleStyle.circumference" :stroke-dashoffset="circleStyle.dashoffset" stroke-linecap="round" />
                        </svg>
                        <span v-if="showPercent" class="nux-progress-circle-text">{{ pctText }}</span>
                    </div>
                    <span v-if="label" class="nux-progress-label">{{ label }}</span>
                </template>
                <template v-else>
                    <div class="nux-progress-head" v-if="label || showPercent">
                        <span v-if="label" class="nux-progress-label">{{ label }}</span>
                        <span v-if="showPercent" class="nux-progress-percent">{{ pctText }}</span>
                    </div>
                    <div class="nux-progress-line" role="progressbar" :aria-valuenow="Math.round(pct)" aria-valuemin="0" aria-valuemax="100">
                        <div class="nux-progress-line-val" :style="{ width: pct + '%' }"></div>
                    </div>
                </template>
            </div>
        `
    };
    window.NuxProgress = NuxProgress;
})();
