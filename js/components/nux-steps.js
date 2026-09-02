(function() {
    const NuxSteps = {
        name: 'NuxSteps',
        props: {
            items: { type: Array, default: () => [] },
            current: { type: Number, default: 0 }
        },
        computed: {
            fill() {
                const total = Math.max(this.items.length - 1, 1);
                return Math.min(Math.max(this.current / total, 0), 1) * 100 + '%';
            }
        },
        template: `
            <div class="nux-steps">
                <div class="nux-steps-track" aria-hidden="true">
                    <div class="nux-steps-fill" :style="{ width: fill }"></div>
                </div>
                <div
                    v-for="(item, i) in items"
                    :key="i"
                    class="nux-step"
                    :class="{
                        'nux-step--done': i < current,
                        'nux-step--active': i === current
                    }"
                >
                    <span class="nux-step-dot">
                        <svg v-if="i < current" viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5 6.5 12 13 4.5"/></svg>
                        <span v-else>{{ i + 1 }}</span>
                    </span>
                    <span class="nux-step-title">{{ item.title }}</span>
                    <span v-if="item.desc" class="nux-step-desc">{{ item.desc }}</span>
                </div>
            </div>
        `
    };
    window.NuxSteps = NuxSteps;
})();
