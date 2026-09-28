(function() {
    const NuxPagination = {
        name: 'NuxPagination',
        props: {
            page: { type: Number, default: 1 },
            totalPages: { type: Number, default: 1 },
            hasNext: { type: Boolean, default: null },
            hasPrev: { type: Boolean, default: null }
        },
        emits: ['prev', 'next'],
        computed: {
            canPrev: function() { return this.hasPrev === null ? this.page > 1 : this.hasPrev; },
            canNext: function() { return this.hasNext === null ? this.page < this.totalPages : this.hasNext; }
        },
        template: `
            <div class="nux-pagination">
                <button class="nux-btn nux-btn--ghost nux-btn--sm" :disabled="!canPrev" @click="$emit('prev')">上一页</button>
                <span class="nux-pagination-info">{{ page }} / {{ totalPages }}</span>
                <button class="nux-btn nux-btn--ghost nux-btn--sm" :disabled="!canNext" @click="$emit('next')">下一页</button>
            </div>
        `
    };

    window.NuxPagination = NuxPagination;
})();
