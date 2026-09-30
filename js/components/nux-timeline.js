(function() {
    const TYPES = ['accent', 'success', 'warning', 'danger', 'info', 'muted'];
    const NuxTimeline = {
        name: 'NuxTimeline',
        props: {
            items: { type: Array, default: () => [] }
        },
        methods: {
            dotClass(type) {
                return TYPES.includes(type) ? 'nux-timeline-dot--' + type : 'nux-timeline-dot--accent';
            }
        },
        template: `
            <ol class="nux-timeline">
                <li v-for="(item, i) in items" :key="i" class="nux-timeline-item">
                    <span class="nux-timeline-dot" :class="dotClass(item.type)" aria-hidden="true">
                        <span v-if="item.icon" class="nux-timeline-icon">{{ item.icon }}</span>
                    </span>
                    <div class="nux-timeline-body">
                        <div class="nux-timeline-head">
                            <span v-if="item.title" class="nux-timeline-title">{{ item.title }}</span>
                            <span v-if="item.time" class="nux-timeline-time">{{ item.time }}</span>
                        </div>
                        <p v-if="item.desc" class="nux-timeline-desc">{{ item.desc }}</p>
                        <div v-if="item.content" class="nux-timeline-content"><slot name="content" :item="item">{{ item.content }}</slot></div>
                    </div>
                </li>
            </ol>
        `
    };
    window.NuxTimeline = NuxTimeline;
})();
