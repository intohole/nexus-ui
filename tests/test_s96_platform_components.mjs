import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));

global.Vue = {
    ref: (v) => ({ value: v }),
    watch: () => {},
    onBeforeUnmount: () => {},
    nextTick: (fn) => fn(),
    h: () => null
};

load('components/nux-table.js');
load('components/nux-table-column.js');
load('components/nux-pagination.js');
load('components/nux-select.js');

const mkCtx = (def, state) => {
    const ctx = Object.assign({ $emit: () => {}, $slots: {} }, state);
    for (const [k, fn] of Object.entries(def.computed || {})) Object.defineProperty(ctx, k, { get() { return fn.call(ctx); } });
    for (const [k, fn] of Object.entries(def.methods || {})) ctx[k] = fn.bind(ctx);
    return ctx;
};

const Table = window.NuxTable;
const Column = window.NuxTableColumn;
check('table: NuxTable 挂载', !!Table);
check('table: NuxTableColumn 挂载', !!Column);
check('table: Column 纯占位不渲染', Column.render && Column.render() === null);
{
    const ctx = mkCtx(Table, { data: [], stripe: false, loading: false, emptyText: '暂无数据', maxHeight: 410, clickable: false, $slots: { default: () => [] } });
    const cols = ctx.columns();
    check('table: 空插槽列提取为空数组', Array.isArray(cols) && cols.length === 0);
    const fakeVnodes = [
        { type: { name: 'NuxTableColumn' }, props: { label: '应用', prop: 'app', width: 110 }, children: null },
        { type: { name: 'NuxTableColumn' }, props: { label: '操作', fixed: 'right', minWidth: 80 }, children: { default: ({ row }) => [row.id] } },
        { type: { name: 'OtherComponent' }, props: {}, children: null }
    ];
    const ctx2 = mkCtx(Table, { data: [], $slots: { default: () => fakeVnodes } });
    const cols2 = ctx2.columns();
    check('table: 只提取 NuxTableColumn 子节点', cols2.length === 2);
    check('table: 列 props 透传', cols2[0].label === '应用' && cols2[0].prop === 'app' && cols2[1].fixed === 'right');
    check('table: scoped slot 提取为 cell 函数', typeof cols2[1].cell === 'function' && cols2[0].cell === null);
    const s1 = ctx2.cellStyle(cols2[0]);
    check('table: 数字宽度归一 px', s1.width === '110px');
    const s2 = ctx2.cellStyle(cols2[1]);
    check('table: min-width 归一', s2['min-width'] === '80px');
    const c1 = ctx2.cellContent(cols2[1], { id: 'x9' }, 0);
    check('table: cell slot 调用传 row', c1[0] === 'x9');
    const c2 = ctx2.cellContent(cols2[0], { app: 'lyra' }, 0);
    check('table: prop 列取行字段', c2[0] === 'lyra');
    const c3 = ctx2.cellContent({ cell: null, prop: 'missing' }, {}, 0);
    check('table: 空值列渲染空串', c3[0] === '');
}

const Pager = window.NuxPagination;
check('pager: 挂载', !!Pager);
{
    const legacy = mkCtx(Pager, { page: 2, totalPages: 5, total: null, currentPage: null, pageSize: null, pagerCount: 5, layout: '' });
    check('pager: 旧形态不进增强', legacy.isEnhanced === false);
    check('pager: 旧形态 cur=page', legacy.cur === 2 && legacy.derivedTotalPages === 5);
    check('pager: 旧形态 parts 默认', legacy.parts.join(',') === 'prev,pager,next');
    const enh = mkCtx(Pager, { total: 95, pageSize: 10, currentPage: 3, page: 1, totalPages: 1, pagerCount: 5, layout: 'total,sizes,prev,pager,next,jumper' });
    check('pager: 增强形态识别', enh.isEnhanced === true);
    check('pager: totalPages 派生', enh.derivedTotalPages === 10);
    check('pager: layout 六段解析', enh.parts.length === 6 && enh.parts[0] === 'total' && enh.parts[5] === 'jumper');
    check('pager: 首页窗口尾省略', enh.pagerItems.join(',') === '1,2,3,4,5,…,10');
    const edge = mkCtx(Pager, { total: 200, pageSize: 10, currentPage: 10, page: 1, totalPages: 1, pagerCount: 5, layout: '' });
    check('pager: 尾页窗口两侧省略', edge.pagerItems.join(',') === '1,…,8,9,10,11,12,…,20');
    const wide = mkCtx(Pager, { total: 1000, pageSize: 10, currentPage: 50, page: 1, totalPages: 1, pagerCount: 5, layout: '' });
    check('pager: 大总数两侧省略', wide.pagerItems.join(',') === '1,…,48,49,50,51,52,…,100');
    const emitted = [];
    const ctx3 = mkCtx(Pager, { total: 95, pageSize: 10, currentPage: 3, page: 1, totalPages: 1, pagerCount: 5, layout: '', $emit: (ev, v) => emitted.push([ev, v]) });
    ctx3.go(4);
    check('pager: go 发双事件', emitted[0][0] === 'update:currentPage' && emitted[0][1] === 4 && emitted[1][0] === 'current-change');
    ctx3.currentPage = 4;
    ctx3.go(4);
    check('pager: 同页不重复发', emitted.length === 2);
    ctx3.go(99);
    check('pager: 越界钳制', emitted[emitted.length - 1][1] === 10);
    const emitted2 = [];
    const ctx4 = mkCtx(Pager, { total: 95, pageSize: 10, currentPage: 3, $emit: (ev, v) => emitted2.push([ev, v]) });
    ctx4.onSize({ target: { value: '20' } });
    check('pager: sizes 变更双事件', emitted2[0][0] === 'update:pageSize' && emitted2[0][1] === 20 && emitted2[1][0] === 'size-change');
    const legacyEmits = [];
    const ctx5 = mkCtx(Pager, { page: 2, totalPages: 3, total: null, hasPrev: null, hasNext: null, $emit: (ev) => legacyEmits.push(ev) });
    ctx5.onPrev();
    check('pager: 旧形态 prev 事件保留', legacyEmits[0] === 'prev');
}

const Sel = window.NuxSelect;
check('select: 挂载', !!Sel);
{
    const emitted = [];
    const ctx = mkCtx(Sel, {
        modelValue: '', options: [{ value: 'a1', label: '应用一' }, { value: 'a2', label: '应用二' }, { value: 'b1', label: '业务一' }],
        clearable: false, filterable: false, query: '', open: false,
        $emit: (ev, v) => emitted.push([ev, v])
    });
    check('select: 默认非 filterable 保持原生形态', Sel.template.includes('nux-select-native'));
    ctx.clearValue();
    check('select: clearable 清空三事件', emitted.map(e => e[0]).join(',') === 'update:modelValue,change,clear' && emitted[0][1] === '');
    ctx.pick({ value: 'a2', label: '应用二' });
    check('select: pick 选中+关闭', emitted[3][1] === 'a2' && ctx.open === false);
    const fctx = mkCtx(Sel, {
        modelValue: 'a1', options: [{ value: 'a1', label: '应用一' }, { value: 'a2', label: '应用二' }, { value: 'b1', label: '业务一' }],
        filterable: true, query: '', open: true
    });
    check('select: filterable 无输入全量', fctx.filteredOptions.length === 3);
    check('select: displayValue 未输入显示选中', fctx.displayValue === '应用一');
    fctx.query = '业务';
    check('select: 输入后过滤生效', fctx.filteredOptions.length === 1 && fctx.filteredOptions[0].value === 'b1' && fctx.displayValue === '业务');
    check('select: filterable 模板有下拉', Sel.template.includes('nux-select-dropdown'));
    check('select: clearable 清空钮在模板', Sel.template.includes('nux-select-clear'));
}

let pass = 0, fail = 0;
for (const [name, ok] of results) {
    if (ok) { pass++; } else { fail++; console.error('FAIL: ' + name); }
}
console.log(`s96 platform components: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
