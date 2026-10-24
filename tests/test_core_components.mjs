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
    nextTick: (fn) => fn()
};
load('components/nux-button.js');
load('components/nux-select.js');
load('components/nux-tag.js');
load('components/nux-stat-card.js');
load('components/nux-undo-toast.js');

const Btn = window.NuxButton;
check('button: 模板在', Btn && Btn.template);
{
    const ctx = { size: 'small', type: 'primary', plain: false, disabled: false, loading: false, block: false, icon: '' };
    const norm = Btn.computed.sizeClass ? null : null;
    const sizeVal = (Btn.computed.sizeNorm || Btn.computed.normalizedSize || (() => {}));
    const keys = Object.keys(Btn.computed);
    check('button: computed 集合', keys.length > 0);
    const clsFn = keys.map(k => Btn.computed[k]).find(fn => /nux-btn--/.test(String(fn)));
    check('button: 存在 variant/size 类组装', !!clsFn);
    if (clsFn) {
        const mk = (size) => {
            const ctx = { size, type: 'primary', block: false };
            for (const [k, fn] of Object.entries(Btn.computed)) Object.defineProperty(ctx, k, { get() { return fn.call(ctx); } });
            return clsFn.call(ctx);
        };
        check('button: small 别名归一到 sm 类', /nux-btn--sm/.test(mk('small')) && !/nux-btn--small/.test(mk('small')));
        check('button: md 不输出 size 类', !/nux-btn--(sm|lg)/.test(mk('md')));
    }
}

const Sel = window.NuxSelect;
check('select: 模板在', Sel && Sel.template);
{
    const emitted = [];
    const ctx = {
        modelValue: '',
        options: [{ value: 10, label: '十' }, { value: true, label: '是' }, { value: 'x', label: 'X' }],
        $emit: (ev, v) => emitted.push([ev, v])
    };
    for (const [k, fn] of Object.entries(Sel.computed)) Object.defineProperty(ctx, k, { get() { return fn.call(ctx); } });
    for (const [k, fn] of Object.entries(Sel.methods)) ctx[k] = fn.bind(ctx);
    ctx.onChange({ target: { value: '10' } });
    check('select: 数字选项保持 number', emitted[0][1] === 10 && typeof emitted[0][1] === 'number');
    ctx.onChange({ target: { value: 'true' } });
    check('select: 布尔选项保持 boolean', emitted[2] && emitted[2][1] === true);
    ctx.onChange({ target: { value: 'ghost-value' } });
    check('select: 未知值原样透传', emitted[4] && emitted[4][1] === 'ghost-value');
    check('select: change 与 update 成对', emitted.every(([ev]) => ev === 'update:modelValue' || ev === 'change'));
}

const Tag = window.NuxTag;
check('tag: 模板在', Tag && Tag.template);
{
    const fn = Object.values(Tag.computed).find(f => /nux-tag/.test(String(f)));
    const out = fn.call({ type: 'success', size: 'sm', plain: true, closable: false });
    check('tag: type/plain 类组装', out['nux-tag--success'] === true && out['nux-tag--plain'] === true && out['nux-tag--sm'] === true);
    const off = fn.call({ type: '', size: 'md', plain: false, closable: false });
    check('tag: 空类型不产出类', !off['nux-tag--undefined'] && !off['nux-tag--'] && off['nux-tag'] === true);
}

const Stat = window.NuxStatCard;
{
    const isNum = Stat.computed.isNumeric;
    check('stat: 数值检测', isNum.call({ value: 12 }) === true && isNum.call({ value: '3.5' }) === true && isNum.call({ value: '2岁' }) === false);
    const tt = Stat.computed.trendText;
    check('stat: trend 文案', tt.call({ trend: 5 }) === '+5%' && tt.call({ trend: -3 }) === '-3%' && tt.call({ trend: 0 }) === '');
}

const Undo = window.NuxUndoToast;
check('undo-toast: 模板在且带 role=status', Undo && Undo.template.includes('role="status"') && Undo.template.includes('aria-live'));
check('selection-bar: count aria-live', readFileSync(ROOT + 'components/nux-selection-bar.js', 'utf8').includes('aria-live="polite"'));
check('checkin: display aria-live ×2', (readFileSync(ROOT + 'components/nux-checkin.js', 'utf8').match(/aria-live="polite"/g) || []).length === 2);

/* v2.71.2 浮标未读回音徽标（userFeedback r5 挂账）：源码级守底 */
{
    const ff = readFileSync(ROOT + 'nexus-feedback-float.js', 'utf8');
    check('feedback-float: unread-count 原语消费', ff.includes('/api/v1/uc/echo/unread-count'));
    check('feedback-float: 徽标渲染与清零函数在', ff.includes('function renderEchoBadge') && ff.includes('function clearEchoBadge'));
    check('feedback-float: 打开面板即清徽标', /openPanel[\s\S]{0,400}clearEchoBadge/.test(ff));
    check('feedback-float: 匿名不查（token 缺失早退）', /if \(!token\(\) \|\| window\.NexusFeedbackFloatStopped\) return/.test(ff));
    check('feedback-float: mine 列表新回音强调', ff.includes('nxfb-newecho') && ff.includes('item.unread_echo'));
}

let fail = 0;
for (const [name, ok] of results) {
    if (!ok) fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
}
console.log(fail === 0 ? `\nALL PASS (${results.length})` : `\n${fail} FAILED of ${results.length}`);
process.exit(fail === 0 ? 0 : 1);
