(function() {
    const NuxSkeleton = {
        name: 'NuxSkeleton',
        props: {
            loading: { type: Boolean, default: true },
            rows: { type: Number, default: 3 },
            avatar: { type: Boolean, default: false },
            variant: { type: String, default: 'list' },
            cards: { type: Number, default: 4 },
            ariaLabel: { type: String, default: '' },
            preset: { type: String, default: '' }
        },
        computed: {
            mode() {
                if (this.preset === 'cards') return 'cards';
                if (this.preset === 'gallery') return 'gallery';
                if (this.preset === 'report') return 'report';
                if (!this.preset && this.variant === 'grid') return 'cards';
                return 'text';
            },
            showAvatar() {
                return this.avatar || this.preset === 'list';
            },
            rowCount() {
                const n = Math.round(Number(this.rows));
                return isNaN(n) || n < 1 ? 1 : n;
            },
            cardCount() {
                const n = Math.round(Number(this.cards));
                return isNaN(n) || n < 1 ? 1 : n;
            },
            shapeClass() {
                return 'is-' + (this.preset || this.variant);
            }
        },
        template: `
            <div v-if="loading" class="nux-skeleton" :class="shapeClass" role="status" aria-busy="true" :aria-label="ariaLabel || '加载中'">
                <div v-if="mode==='cards'" class="nux-skeleton-grid" aria-hidden="true">
                    <div v-for="i in cardCount" :key="i" class="nux-skeleton-card">
                        <div class="nux-skeleton-card-cover"></div>
                        <div class="nux-skeleton-card-body">
                            <div class="nux-skeleton-card-line" style="width:100%"></div>
                            <div class="nux-skeleton-card-line" style="width:70%"></div>
                        </div>
                    </div>
                </div>
                <div v-else-if="mode==='gallery'" class="nux-skeleton-grid nux-skeleton-grid-gallery" aria-hidden="true">
                    <div v-for="i in cardCount" :key="i" class="nux-skeleton-card">
                        <div class="nux-skeleton-card-cover nux-skeleton-cover-tall"></div>
                        <div class="nux-skeleton-card-body">
                            <div class="nux-skeleton-card-line" style="width:56%"></div>
                        </div>
                    </div>
                </div>
                <div v-else-if="mode==='report'" class="nux-skeleton-report" aria-hidden="true">
                    <div class="nux-skeleton-report-title"></div>
                    <div class="nux-skeleton-report-sub"></div>
                    <div class="nux-skeleton-content">
                        <div v-for="i in rowCount" :key="i" class="nux-skeleton-row" :style="{ width: i === rowCount ? '58%' : '100%' }"></div>
                    </div>
                    <div class="nux-skeleton-report-block"></div>
                    <div class="nux-skeleton-row" style="width:78%"></div>
                </div>
                <template v-else>
                    <div v-if="showAvatar" class="nux-skeleton-avatar" aria-hidden="true"></div>
                    <div class="nux-skeleton-content" aria-hidden="true">
                        <div v-for="i in rowCount" :key="i" class="nux-skeleton-row" :style="{ width: i === rowCount ? '60%' : '100%' }"></div>
                    </div>
                </template>
            </div>
            <slot v-else></slot>
        `
    };
    window.NuxSkeleton = NuxSkeleton;
})();