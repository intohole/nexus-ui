(function() {
    const NuxPagination = {
        name: 'NuxPagination',
        props: {
            page: { type: Number, default: 1 },
            totalPages: { type: Number, default: 1 },
            hasNext: { type: Boolean, default: null },
            hasPrev: { type: Boolean, default: null },
            ariaLabel: { type: String, default: '分页' },
            total: { type: Number, default: null },
            pageSize: { type: Number, default: null },
            currentPage: { type: Number, default: null },
            pageSizes: { type: Array, default: null },
            layout: { type: String, default: '' },
            pagerCount: { type: Number, default: 5 }
        },
        emits: ['prev', 'next', 'current-change', 'size-change', 'update:currentPage', 'update:pageSize'],
        computed: {
            isEnhanced() { return this.total !== null && this.total !== undefined; },
            parts() { return this.layout ? this.layout.split(',').map(s => s.trim()).filter(Boolean) : ['prev', 'pager', 'next']; },
            derivedTotalPages() {
                if (!this.isEnhanced) return this.totalPages;
                const size = this.pageSize || 10;
                return Math.max(1, Math.ceil(this.total / size));
            },
            cur() {
                if (!this.isEnhanced) return this.page;
                return this.currentPage === null || this.currentPage === undefined ? 1 : this.currentPage;
            },
            canPrev() { return this.hasPrev === null ? this.cur > 1 : this.hasPrev; },
            canNext() { return this.hasNext === null ? this.cur < this.derivedTotalPages : this.hasNext; },
            pagerItems() {
                const total = this.derivedTotalPages;
                const cur = this.cur;
                const half = Math.floor((this.pagerCount - 1) / 2);
                let start = Math.max(1, cur - half);
                let end = Math.min(total, start + this.pagerCount - 1);
                start = Math.max(1, end - this.pagerCount + 1);
                const items = [];
                if (start > 1) { items.push(1); if (start > 2) items.push('…'); }
                for (let i = start; i <= end; i++) items.push(i);
                if (end < total) { if (end < total - 1) items.push('…'); items.push(total); }
                return items;
            }
        },
        methods: {
            go(p) {
                const target = Math.min(Math.max(1, p), this.derivedTotalPages);
                if (target === this.cur) return;
                this.$emit('update:currentPage', target);
                this.$emit('current-change', target);
            },
            onPrev() {
                if (!this.canPrev) return;
                if (this.isEnhanced) { this.go(this.cur - 1); return; }
                this.$emit('prev');
            },
            onNext() {
                if (!this.canNext) return;
                if (this.isEnhanced) { this.go(this.cur + 1); return; }
                this.$emit('next');
            },
            onSize(e) {
                const size = Number(e.target.value);
                this.$emit('update:pageSize', size);
                this.$emit('size-change', size);
            },
            onJumper(e) {
                if (e.key !== 'Enter') return;
                const p = parseInt(e.target.value, 10);
                if (!isNaN(p)) { this.go(p); e.target.value = ''; }
            }
        },
        template: `
            <nav class="nux-pagination" :class="{ 'nux-pagination--bar': isEnhanced }" :aria-label="ariaLabel">
                <template v-for="part in parts" :key="part">
                    <span v-if="part === 'total' && isEnhanced" class="nux-pagination-total">共 {{ total }} 条</span>
                    <select v-else-if="part === 'sizes' && pageSizes" class="nux-pagination-sizes" :value="pageSize" :aria-label="'每页条数'" @change="onSize">
                        <option v-for="s in pageSizes" :key="s" :value="s">{{ s }} 条/页</option>
                    </select>
                    <button v-else-if="part === 'prev'" type="button" class="nux-btn nux-btn--ghost nux-btn--sm" :disabled="!canPrev" @click="onPrev">上一页</button>
                    <template v-else-if="part === 'pager'">
                        <button v-for="(item, i) in pagerItems" :key="i" type="button"
                            class="nux-pagination-page"
                            :class="{ 'nux-pagination-page--active': item === cur, 'nux-pagination-page--ellipsis': item === '…' }"
                            :disabled="item === '…'" @click="item !== '…' && go(item)">{{ item }}</button>
                    </template>
                    <button v-else-if="part === 'next'" type="button" class="nux-btn nux-btn--ghost nux-btn--sm" :disabled="!canNext" @click="onNext">下一页</button>
                    <span v-else-if="part === 'jumper' && isEnhanced" class="nux-pagination-jumper">前往<input type="number" class="nux-pagination-jumper-input" min="1" :max="derivedTotalPages" @keyup="onJumper">页</span>
                </template>
                <span v-if="!isEnhanced" class="nux-pagination-info" aria-live="polite">{{ cur }} / {{ derivedTotalPages }}</span>
            </nav>
        `
    };
    window.NuxPagination = NuxPagination;
})();
