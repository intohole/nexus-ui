(function() {
    if (window.NuxPlanProgress) return;
    if (!window.Vue) return;

    const NuxPlanProgress = {
        name: 'NuxPlanProgress',
        props: {
            stats: { type: Object, default: null },
            title: { type: String, default: '' },
            subtitle: { type: String, default: '' },
            showPercent: { type: Boolean, default: true }
        },
        computed: {
            s() {
                return this.stats || window.NexusUseProgress.computeStats({});
            },
            percentText() {
                return Math.round(this.s.percent) + '%';
            }
        },
        template: `
            <div class="nux-plan-progress" role="region" aria-label="进度总览">
                <div class="nux-plan-progress-head" v-if="title || subtitle">
                    <div class="nux-plan-progress-titles">
                        <span v-if="title" class="nux-plan-progress-title">{{ title }}</span>
                        <span v-if="subtitle" class="nux-plan-progress-subtitle">{{ subtitle }}</span>
                    </div>
                    <span v-if="s.currentDayLabel" class="nux-plan-progress-day">{{ s.currentDayLabel }}</span>
                </div>
                <div class="nux-plan-progress-bar" role="progressbar" :aria-valuenow="Math.round(s.percent)" aria-valuemin="0" aria-valuemax="100">
                    <div class="nux-plan-progress-bar-val" :style="{ width: s.percent + '%' }"></div>
                </div>
                <div class="nux-plan-progress-foot">
                    <span v-if="showPercent" class="nux-plan-progress-pct">{{ percentText }}</span>
                    <ul v-if="s.statLines && s.statLines.length" class="nux-plan-progress-stats">
                        <li v-for="line in s.statLines" :key="line.k" class="nux-plan-progress-stat">
                            <span class="nux-plan-progress-stat-k">{{ line.k }}</span>
                            <span class="nux-plan-progress-stat-v">{{ line.v }}</span>
                        </li>
                    </ul>
                </div>
            </div>
        `
    };

    if (window.Vue && Vue.component) {
        try { Vue.component('nux-plan-progress', NuxPlanProgress); } catch (e) {}
    }

    window.NuxPlanProgress = NuxPlanProgress;
})();