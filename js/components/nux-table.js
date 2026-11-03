(function() {
    const normSize = v => (v === '' || v === null || v === undefined) ? '' : (typeof v === 'number' ? v + 'px' : String(v));
    const NuxTable = {
        name: 'NuxTable',
        props: {
            data: { type: Array, default: () => [] },
            stripe: { type: Boolean, default: false },
            loading: { type: Boolean, default: false },
            emptyText: { type: String, default: '暂无数据' },
            maxHeight: { type: [String, Number], default: '' },
            clickable: { type: Boolean, default: false }
        },
        emits: ['row-click'],
        methods: {
            columns() {
                const vnodes = this.$slots.default ? this.$slots.default() : [];
                return vnodes.filter(v => v && v.type && v.type.name === 'NuxTableColumn').map(v => {
                    const p = v.props || {};
                    return {
                        label: p.label || '',
                        prop: p.prop || '',
                        width: p.width,
                        minWidth: p.minWidth,
                        fixed: p.fixed,
                        cell: (v.children && typeof v.children.default === 'function') ? v.children.default : null
                    };
                });
            },
            cellStyle(col) {
                const s = {};
                if (col.width) s.width = normSize(col.width);
                if (col.minWidth) s['min-width'] = normSize(col.minWidth);
                return s;
            },
            cellContent(col, row, idx) {
                if (col.cell) return col.cell({ row, $index: idx });
                if (col.prop) return [String(row[col.prop] === null || row[col.prop] === undefined ? '' : row[col.prop])];
                return [''];
            }
        },
        render() {
            const h = Vue.h;
            const cols = this.columns();
            const wrapStyle = this.maxHeight ? { 'max-height': normSize(this.maxHeight) } : {};
            const thCells = cols.map(c => h('th', {
                class: { 'nux-table-th': true, 'nux-table-col--fixed-right': c.fixed === 'right' },
                style: this.cellStyle(c),
                scope: 'col'
            }, c.label));
            let bodyRows = [];
            if (this.loading) {
                bodyRows = [h('tr', { class: 'nux-table-state-row' }, [
                    h('td', { colspan: cols.length, class: 'nux-table-state nux-table-state--loading' }, ['加载中…'])
                ])];
            } else if (!this.data.length) {
                bodyRows = [h('tr', { class: 'nux-table-state-row' }, [
                    h('td', { colspan: cols.length, class: 'nux-table-state' }, [this.emptyText])
                ])];
            } else {
                bodyRows = this.data.map((row, i) => h('tr', {
                    class: 'nux-table-tr',
                    onClick: e => this.$emit('row-click', row, e)
                }, cols.map(c => h('td', {
                    class: { 'nux-table-td': true, 'nux-table-col--fixed-right': c.fixed === 'right' },
                    style: this.cellStyle(c)
                }, this.cellContent(c, row, i)))));
            }
            return h('div', {
                class: { 'nux-table-wrap': true, 'nux-table--stripe': this.stripe, 'nux-table--clickable': this.clickable, 'nux-table--loading': this.loading },
                style: wrapStyle
            }, [
                h('table', { class: 'nux-table' }, [
                    h('thead', { class: 'nux-table-thead' }, [h('tr', { class: 'nux-table-tr' }, thCells)]),
                    h('tbody', { class: 'nux-table-tbody' }, bodyRows)
                ])
            ]);
        }
    };
    window.NuxTable = NuxTable;
})();
