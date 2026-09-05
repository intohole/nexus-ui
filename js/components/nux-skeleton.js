(function() {
    const NuxSkeleton = {
        name: 'NuxSkeleton',
        props: {
            loading: { type: Boolean, default: true },
            rows: { type: Number, default: 3 },
            avatar: { type: Boolean, default: false },
            variant: { type: String, default: 'list' },
            cards: { type: Number, default: 4 },
            ariaLabel: { type: String, default: '' }
        },
        template: `
            <div v-if="loading" class="nux-skeleton" :class="'is-'+variant" role="status" aria-busy="true" :aria-label="ariaLabel || '加载中'">
                <div v-if="variant==='grid'" class="nux-skeleton-grid" aria-hidden="true">
                    <div v-for="i in cards" :key="i" class="nux-skeleton-card">
                        <div class="nux-skeleton-card-cover"></div>
                        <div class="nux-skeleton-card-body">
                            <div class="nux-skeleton-card-line" style="width:100%"></div>
                            <div class="nux-skeleton-card-line" style="width:70%"></div>
                        </div>
                    </div>
                </div>
                <template v-else>
                    <div v-if="avatar" class="nux-skeleton-avatar" aria-hidden="true"></div>
                    <div class="nux-skeleton-content" aria-hidden="true">
                        <div v-for="i in rows" :key="i" class="nux-skeleton-row" :style="{ width: i === rows ? '60%' : '100%' }"></div>
                    </div>
                </template>
            </div>
            <slot v-else></slot>
        `
    };
    window.NuxSkeleton = NuxSkeleton;
})();
