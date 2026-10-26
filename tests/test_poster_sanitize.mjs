import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));

window.NexusUtils = { injectStyle() {} };
load('components/nux-poster.js');
const P = window.NuxPoster;

const ctx = Object.assign({}, P.data ? P.data.call({}) : {});
for (const [k, fn] of Object.entries(P.methods || {})) ctx[k] = fn.bind(ctx);
for (const [k, fn] of Object.entries(P.computed || {})) {
    Object.defineProperty(ctx, k, { get() { return fn.call(ctx); } });
}

{
    const html = ctx.renderText({ element_type: 'info-card', content: '要点一\n"onclick="alert(1)', style: {} });
    check('poster: 属性逃逸引号被中和', !html.includes('"onclick') && html.includes('&quot;onclick'));
}
{
    const html = ctx.renderText({ element_type: 'info-card', content: '<script>alert(1)</script>', style: {} });
    check('poster: script 标签中和', !html.includes('<script>') && html.includes('&lt;script&gt;'));
}
{
    const html = ctx.renderText({ element_type: 'cta', content: '按钮', style: { background: 'red" onmouseover="alert(1)' } });
    check('poster: style 属性值引号转义（capture 路径）', !html.includes('red" onmouseover') && html.includes('red&quot;'));
}
{
    const html = ctx.renderText({ element_type: 'price', content: '9.9', style: { currency: '¥">' } });
    check('poster: currency 字段引号转义', !html.includes('¥">'));
}
{
    const html = ctx.renderText({ element_type: 'info-card', content: '纯文本&符号\n第二行', style: {} });
    check('poster: 合法文本恒等（实体可逆渲染）', html.includes('纯文本&amp;符号') && html.includes('第二行'));
}
{
    const html = ctx.renderText({ element_type: 'image', content: 'http://x" onerror="alert(1)', style: {} });
    check('poster: img src 引号转义', !html.includes('src="http://x" onerror'));
}

let pass = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
    if (ok) pass++;
}
console.log(pass + '/' + results.length + ' passed');
if (pass !== results.length) process.exit(1);
