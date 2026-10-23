import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
const PROJ = new URL('../', import.meta.url).pathname;
global.window = global;

window.NexusUtils = {
    copyToClipboard(text) { window.__lastCopy = text; return Promise.resolve(!!text); },
    showToast() {}
};
global.document = {
    activeElement: null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, classList: { add() {}, remove() {} } }),
    addEventListener() {},
    removeEventListener() {},
    body: { appendChild() {} }
};
global.Vue = { ref: (v) => ({ value: v }), nextTick: (fn) => fn() };

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));
load('components/nux-confidence.js');
load('components/nux-citations.js');
load('components/nux-copy-button.js');
load('components/nux-timeline.js');
load('components/nux-descriptions.js');
load('nexus-components.js');

const registry = window.NexusComponents.list();
for (const tag of ['nux-confidence', 'nux-citations', 'nux-copy-button', 'nux-timeline', 'nux-descriptions']) {
    check(`registry: ${tag}`, registry.includes(tag));
}

const makeCtx = (comp, props) => {
    const ctx = { ...props };
    for (const [k, fn] of Object.entries(comp.computed || {})) {
        Object.defineProperty(ctx, k, { get() { return fn.call(ctx); } });
    }
    for (const [k, fn] of Object.entries(comp.methods || {})) ctx[k] = fn.bind(ctx);
    return ctx;
};

const Conf = window.NuxConfidence;
check('confidence: template 存在', Conf && Conf.template);
{
    const c = makeCtx(Conf, { level: 'good', label: '', pct: 72, note: '', variant: 'badge', hidePct: false });
    check('confidence: 档位词', c.word === '很可信' && c.tone === 'success');
    check('confidence: pct 归一', c.pctText === '72%');
    check('confidence: aria', c.ariaText === '置信度：很可信，约 72%');
}
{
    const c = makeCtx(Conf, { level: 2, label: '', pct: null, note: '', variant: 'badge', hidePct: false });
    check('confidence: 数字档位', c.key === 'shaky' && c.tone === 'warning');
}
{
    const c = makeCtx(Conf, { level: 9, label: '', pct: null, note: '', variant: 'badge', hidePct: false });
    check('confidence: 非法档位降级待确认', c.key === '' && c.word === '' && c.tone === 'muted' && c.ariaText === '置信度：待确认');
}
{
    const c = makeCtx(Conf, { level: 'fair', label: '', pct: 200, note: '', variant: 'badge', hidePct: false });
    check('confidence: 越界 pct 不显示', c.pctText === '');
}

const Cit = window.NuxCitations;
check('citations: template 存在', Cit && Cit.template);
{
    const items = [
        { n: 1, title: 'a', url: 'https://www.example.gov.cn/x', verdict: 'supported' },
        { n: 2, title: 'b', verdict: 'partial' },
        { n: 3, title: 'c', verdict: 'unsupported' },
        { n: 4, title: 'd', verdict: 'supported' }
    ];
    const c = makeCtx(Cit, { items, title: 't', collapsible: true });
    Object.assign(c, { expanded: false });
    check('citations: 折叠取前 3', c.visible.length === 3 && c.restCount === 1);
    check('citations: 域名剥 www', c.host('https://www.example.gov.cn/x') === 'example.gov.cn');
    check('citations: 非法 URL 诚实空', c.host('not-a-url') === '');
    check('citations: verdict 映射', c.verdict(items[0]).text === '有据' && c.verdict(items[2]).tone === 'danger');
    check('citations: 未知 verdict 不装饰', c.verdict({ verdict: 'made-up' }) === null);
}

const Copy = window.NuxCopyButton;
check('copy-button: template 存在', Copy && Copy.template);
const calls = [];
{
    window.NexusUtils.copyToClipboard = (t) => { calls.push(t); return Promise.resolve(true); };
    const c = makeCtx(Copy, { text: 'hello', getText: null, label: '复制', variant: 'ghost' });
    Object.assign(c, { copied: false, timer: null });
    c.doCopy();
    await Promise.resolve();
    check('copy-button: 走 copyToClipboard 单源', calls[0] === 'hello');
    check('copy-button: copied 态翻转', c.copied === true && c.currentLabel === '已复制');
}
{
    const c = makeCtx(Copy, { text: '', getText: () => 'dyn', label: '复制', variant: 'text' });
    Object.assign(c, { copied: false, timer: null });
    c.doCopy();
    await Promise.resolve();
    check('copy-button: getText 优先', calls[1] === 'dyn');
    const c2 = makeCtx(Copy, { text: '', getText: null, label: '复制', variant: 'ghost' });
    Object.assign(c2, { copied: false, timer: null });
    window.__lastCopy = 'untouched';
    c2.doCopy();
    await Promise.resolve();
    check('copy-button: 空值不动作', window.__lastCopy === 'untouched' && c2.copied === false);
}

const Tl = window.NuxTimeline;
check('timeline: template 存在', Tl && Tl.template);
check('timeline: tone 白名单降级 default', Tl.methods.tone({ tone: 'rainbow' }) === 'default' && Tl.methods.tone({ tone: 'danger' }) === 'danger');

const Dx = window.NuxDescriptions;
check('descriptions: template 存在', Dx && Dx.template);
{
    const c = makeCtx(Dx, { items: [], columns: 2, title: '' });
    check('descriptions: columns clamp 1-4', makeCtx(Dx, { items: [], columns: 9, title: '' }).styleVars['--nxd-cols'] === '4'
        && makeCtx(Dx, { items: [], columns: 0, title: '' }).styleVars['--nxd-cols'] === '1');
    check('descriptions: styleVars 字符串', c.styleVars['--nxd-cols'] === '2');
}

const buildSrc = readFileSync(PROJ + 'build_all.py', 'utf8');
check('build: insight css 已登记', buildSrc.includes('"nexus-components-insight.css"'));
const css = readFileSync(PROJ + 'css/nexus-components-insight.css', 'utf8');
check('css: 花括号配平', (css.match(/{/g) || []).length === (css.match(/}/g) || []).length);
check('css: 无裸 @import', !css.includes('@import'));
check('css: reduced-motion 兜底', css.includes('prefers-reduced-motion'));

let fail = 0;
for (const [name, ok] of results) {
    if (!ok) fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
}
console.log(fail === 0 ? `\nALL PASS (${results.length})` : `\n${fail} FAILED of ${results.length}`);
process.exit(fail === 0 ? 0 : 1);
