(function() {
    const NuxPagination = {
        name: 'NuxPagination',
        props: {
            page: { type: Number, default: 1 },
            totalPages: { type: Number, default: 1 },
            hasNext: { type: Boolean, default: null },
            hasPrev: { type: Boolean, default: null },
            ariaLabel: { type: String, default: '分页' }
        },
        emits: ['prev', 'next'],
        computed: {
            canPrev: function() { return this.hasPrev === null ? this.page > 1 : this.hasPrev; },
            canNext: function() { return this.hasNext === null ? this.page < this.totalPages : this.hasNext; }
        },
        template: `
            <nav class="nux-pagination" :aria-label="ariaLabel">
                <button type="button" class="nux-btn nux-btn--ghost nux-btn--sm" :disabled="!canPrev" @click="$emit('prev')">上一页</button>
                <span class="nux-pagination-info" aria-live="polite">{{ page }} / {{ totalPages }}</span>
                <button type="button" class="nux-btn nux-btn--ghost nux-btn--sm" :disabled="!canNext" @click="$emit('next')">下一页</button>
            </nav>
        `
    };

    window.NuxPagination = NuxPagination;
})();
