(function() {
    const NuxSkeleton = {
        name: 'NuxSkeleton',
        props: {
            loading: { type: Boolean, default: true },
            rows: { type: Number, default: 3 },
            avatar: { type: Boolean, default: false },
            variant: { type: String, default: 'list' },
            cards: { type: Number, default: 4 }
        },
        template: `
            <div v-if="loading" class="nux-skeleton" :class="'is-'+variant">
                <div v-if="variant==='grid'" class="nux-skeleton-grid">
                    <div v-for="i in cards" :key="i" class="nux-skeleton-card">
                        <div class="nux-skeleton-card-cover"></div>
                        <div class="nux-skeleton-card-body">
                            <div class="nux-skeleton-card-line" style="width:100%"></div>
                            <div class="nux-skeleton-card-line" style="width:70%"></div>
                        </div>
                    </div>
                </div>
                <template v-else>
                    <div v-if="avatar" class="nux-skeleton-avatar"></div>
                    <div class="nux-skeleton-content">
                        <div v-for="i in rows" :key="i" class="nux-skeleton-row" :style="{ width: i === rows ? '60%' : '100%' }"></div>
                    </div>
                </template>
            </div>
            <slot v-else></slot>
        `
    };
    window.NuxSkeleton = NuxSkeleton;
})();
