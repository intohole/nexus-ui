(function() {
    const NuxTimeline = {
        name: 'NuxTimeline',
        props: {
            items: { type: Array, default: () => [] }
        },
        methods: {
            tone(item) {
                return ['success', 'warning', 'danger', 'accent'].indexOf(item.tone) > -1 ? item.tone : 'default';
            }
        },
        template: `
            <ol class="nx-timeline" v-if="items.length">
                <li v-for="(item, i) in items" :key="i" class="nx-timeline-item" :class="'nx-timeline-item--' + tone(item)">
                    <span class="nx-timeline-dot" aria-hidden="true"></span>
                    <div class="nx-timeline-body">
                        <div class="nx-timeline-meta" v-if="item.time || item.tag">
                            <span class="nx-timeline-time" v-if="item.time">{{ item.time }}</span>
                            <span class="nx-timeline-tag" v-if="item.tag">{{ item.tag }}</span>
                        </div>
                        <div class="nx-timeline-title">{{ item.title }}</div>
                        <div class="nx-timeline-desc" v-if="item.desc">{{ item.desc }}</div>
                        <slot name="item" :item="item"></slot>
                    </div>
                </li>
            </ol>
        `
    };

    window.NuxTimeline = NuxTimeline;
})();
