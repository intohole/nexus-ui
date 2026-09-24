(function() {
    const NuxPagination = {
        name: 'NuxPagination',
        props: {
            page: { type: Number, default: 1 },
            totalPages: { type: Number, default: 1 },
            hasNext: { type: Boolean, default: false },
            hasPrev: { type: Boolean, default: false }
        },
        emits: ['prev', 'next', 'goto'],
        template: `
            <div class="nux-pagination">
                <button class="nux-btn nux-btn--ghost nux-btn--sm" :disabled="!hasPrev" @click="$emit('prev')">上一页</button>
                <span class="nux-pagination-info">{{ page }} / {{ totalPages }}</span>
                <button class="nux-btn nux-btn--ghost nux-btn--sm" :disabled="!hasNext" @click="$emit('next')">下一页</button>
            </div>
        `
    };

    window.NuxPagination = NuxPagination;
})();
