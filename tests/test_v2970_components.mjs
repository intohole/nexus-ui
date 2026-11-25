import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));

load('components/nux-timeline.js');
load('components/nux-select.js');
load('components/nux-chip-group.js');
const Timeline = window.NuxTimeline;
const Select = window.NuxSelect;
const ChipGroup = window.NuxChipGroup;

/* ---------- nux-timeline（刀2：current 高亮+slot scope+empty） ---------- */
{
    check('timeline: is-current 高亮类在模板（评审裁定：仅高亮，无内置徽章）',
        Timeline.template.includes("'is-current': !!item.current")
        && !Timeline.template.includes('当前版'));
    check('timeline: item slot scope 增 index/is-current/busy',
        Timeline.template.includes(':index="i"') && Timeline.template.includes(':is-current="!!item.current"')
        && Timeline.template.includes(':busy="!!item.busy"'));
    check('timeline: #empty 空态插槽', Timeline.template.includes('nx-timeline-empty') && Timeline.template.includes('<slot name="empty">'));
    check('timeline: v2.97.1 state 透传（数组/字符串→行类）+单根 wrap（attrs 透传恢复）',
        Timeline.template.includes('stateCls(item)') && Timeline.template.includes('nx-timeline-wrap')
        && typeof Timeline.methods.stateCls === 'function');
    check('timeline: stateCls 数组过滤+字符串单包+空态 null',
        JSON.stringify(Timeline.methods.stateCls({ state: ['a', '', 'b'] })) === JSON.stringify(['a', 'b'])
        && JSON.stringify(Timeline.methods.stateCls({ state: 'solo' })) === JSON.stringify(['solo'])
        && Timeline.methods.stateCls({}) === null);
    check('timeline: title 补 v-if（v2.97.1）', Timeline.template.includes('v-if="item.title"'));
    check('timeline: tone 白名单降级守恒', Timeline.methods.tone({ tone: 'nope' }) === 'default'
        && Timeline.methods.tone({ tone: 'danger' }) === 'danger');
}

/* ---------- nux-select（刀4：filterFields/freeText/rich/disabled） ---------- */
{
    const opts = [
        { label: '布偶猫', value: 'ragdoll', desc: 'Ragdoll', tag: '4-6kg' },
        { label: '橘猫', value: 'orange', desc: 'Orange Tabby', tag: '4-7kg' },
        { label: '柯基犬', value: 'corgi', desc: 'Corgi', tag: '10-13kg' }
    ];
    const fo = Select.computed.filteredOptions.call({ query: 'ragdoll', filterFields: ['label', 'desc'], options: opts });
    check('filterFields: desc 入检索（英文命中）', fo.length === 1 && fo[0].value === 'ragdoll');
    const fo2 = Select.computed.filteredOptions.call({ query: 'corgi', filterFields: ['label'], options: opts });
    check('filterFields: 默认仅 label（英文不命中=保真旧行为）', fo2.length === 0);
    const fo3 = Select.computed.filteredOptions.call({ query: '', filterFields: ['label'], options: opts });
    check('filterFields: 空 query 全量', fo3.length === 3);
    check('selectedLabel: freeText 兜底（值不在选项集显示原值）',
        Select.computed.selectedLabel.call({ options: opts, modelValue: '自由文本存量', hasValue: true }) === '自由文本存量');
    check('selectedLabel: 在选项集仍取 label',
        Select.computed.selectedLabel.call({ options: opts, modelValue: 'orange', hasValue: true }) === '橘猫');
    check('selectedLabel: 无值空串', Select.computed.selectedLabel.call({ options: opts, modelValue: '', hasValue: false }) === '');
}
{
    let emitted = [];
    const fakeThis = {
        query: '', open: true,
        $emit: function () { emitted.push([].slice.call(arguments)); }
    };
    Select.methods.pick.call(fakeThis, { value: 'x', disabled: true });
    check('pick: disabled 拒点（评审一行修）', emitted.length === 0 && fakeThis.open === true);
    Select.methods.pick.call(fakeThis, { value: 'ok' });
    check('pick: 正常选中双 emit+关面板', emitted.length === 2 && emitted[0][0] === 'update:modelValue' && fakeThis.open === false);
}
{
    check('select 模板: 富选项结构在位', Select.template.includes('nux-select-option-row')
        && Select.template.includes('nux-select-option-tag') && Select.template.includes('nux-select-option-desc')
        && Select.template.includes('<slot name="option" :option="opt">'));
    check('select 模板: 原生 select 分支 option 带 disabled 透传', Select.template.includes(':disabled="opt.disabled">{{ opt.label }}'));
    check('select 模板: aria-disabled 拒点可感知', Select.template.includes('aria-disabled'));
}

/* ---------- nux-chip-group（刀5：maxVisible/stat/action/keydown.stop） ---------- */
{
    const opts = [];
    for (let i = 1; i <= 7; i++) opts.push({ label: '项' + i, value: 'v' + i });
    const vis = ChipGroup.computed.visibleOptions.call({ maxVisible: 4, expanded: false, options: opts });
    const visAll = ChipGroup.computed.visibleOptions.call({ maxVisible: 4, expanded: true, options: opts });
    const folded = ChipGroup.computed.foldedCount.call({ maxVisible: 4, options: opts });
    check('折叠: 渲染裁到 maxVisible', vis.length === 4);
    check('折叠: expanded 展开全量', visAll.length === 7);
    check('折叠: N=全部被折叠项数（评审口径，含已选不随选择漂移）', folded === 3);
    check('折叠: maxVisible=0 不折叠', ChipGroup.computed.foldedCount.call({ maxVisible: 0, options: opts }) === 0);
    check('折叠: 选中第 5 项后计数不漂移（选中项在被折叠区仍计入 N）',
        ChipGroup.computed.foldedCount.call({ maxVisible: 4, options: opts, modelValue: ['v5'] }) === 3);
}
{
    let emitted = [];
    const mk = (modelValue, variant) => ({
        disabled: false, modelValue, variant: variant || 'select',
        $emit: function () { emitted.push([].slice.call(arguments)); }
    });
    ChipGroup.methods.select.call(mk('a'), { value: 'b' });
    check('select 形态: 单选回弹语义守恒', emitted[0][1] === 'b');
    emitted = [];
    ChipGroup.methods.select.call(mk('b'), { value: 'b' });
    check('select 形态: 再点同值回空', emitted[0][1] === '');
    emitted = [];
    ChipGroup.methods.select.call(mk(['x'], 'action'), { value: 'y' });
    check('action 形态: 恒发被点值不回弹', emitted[0][1] === 'y');
    emitted = [];
    ChipGroup.methods.remove.call({ disabled: false, removable: true, modelValue: 'v', $emit: (...a) => emitted.push(a) }, { value: 'v' });
    check('removable: remove 双 emit 守恒', emitted.length === 2 && emitted[0][1] === 'v');
}
{
    check('chip 模板: keydown.stop 随刀修（span enter.prevent 吞冒泡存量雷）', ChipGroup.template.includes('@keydown.stop'));
    check('chip 模板: stat 副文案+折叠开关+action aria-pressed 缺省', ChipGroup.template.includes('nux-chip-stat')
        && ChipGroup.template.includes('nux-chip-more')
        && ChipGroup.template.includes("variant === 'select' ? String(isOn(opt.value)) : undefined"));
}

/* ---------- CSS 侧断言（聚合产物签名，教训#575 同款） ---------- */
import { readFileSync as rf } from 'node:fs';
const CSS_ROOT = new URL('../css/', import.meta.url).pathname;
const insight = rf(CSS_ROOT + 'nexus-components-insight.css', 'utf8');
const controls = rf(CSS_ROOT + 'nexus-components-controls.css', 'utf8');
const aiChatCss = rf(CSS_ROOT + 'nexus-ai-chat.css', 'utf8');
check('CSS: timeline is-current 规则在场', insight.includes('.nx-timeline-item.is-current'));
check('CSS: select 富选项规则在场', controls.includes('.nux-select-option--rich') && controls.includes('.nux-select-option-tag'));
check('CSS: chip stat/more 规则在场', controls.includes('.nux-chip-stat') && controls.includes('.nux-chip-more'));
check('CSS: 停止终态签名行规则在场', aiChatCss.includes('.nx-ai-chat-stopped-line'));

let failed = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name);
    if (!ok) failed += 1;
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
