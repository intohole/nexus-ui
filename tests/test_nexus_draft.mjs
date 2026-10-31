import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/core/', import.meta.url).pathname;
const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

const store = {};
const unloadListeners = [];
let bannerInDom = null;

function makeNode(tag) {
    const node = {
        tagName: tag,
        childNodes: [],
        textContent: '',
        style: { cssText: '' },
        attrs: {},
        handlers: {},
        parentNode: null,
        setAttribute(k, v) { this.attrs[k] = v; },
        getAttribute(k) { return this.attrs[k] !== undefined ? this.attrs[k] : null; },
        addEventListener(t, fn) { (this.handlers[t] = this.handlers[t] || []).push(fn); },
        removeEventListener() {},
        appendChild(child) { child.parentNode = this; this.childNodes.push(child); return child; },
        removeChild(child) { const i = this.childNodes.indexOf(child); if (i >= 0) this.childNodes.splice(i, 1); child.parentNode = null; },
        click() { (this.handlers.click || []).forEach(fn => fn()); },
        focus() { this.focused = true; }
    };
    Object.defineProperty(node, 'parentNode', { value: null, writable: true });
    return node;
}

function makeEl(tag) {
    const inputHandlers = [];
    const el = makeNode(tag);
    el.value = '';
    el.__dispatched = [];
    el.addEventListener = function (t, fn) { if (t === 'input') inputHandlers.push(fn); else (this.handlers[t] = this.handlers[t] || []).push(fn); };
    el.dispatchEvent = function (ev) { this.__dispatched.push(ev.type); };
    el._input = function (v) { this.value = v; inputHandlers.forEach(fn => fn()); };
    return el;
}

global.window = {
    location: { pathname: '/compose' },
    sessionStorage: {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = v; },
        removeItem: (k) => { delete store[k]; }
    },
    addEventListener: (t, fn) => { if (t === 'beforeunload') unloadListeners.push(fn); }
};
global.document = {
    readyState: 'complete',
    addEventListener() {},
    querySelectorAll: () => ({ forEach() {} }),
    createElement: (tag) => makeNode(tag),
    body: {
        appendChild(el) { bannerInDom = el; el.parentNode = document.body; },
        removeChild(el) { el.parentNode = null; bannerInDom = null; }
    }
};
global.Event = class { constructor(type) { this.type = type; } };

eval(readFileSync(ROOT + 'nexus-draft.js', 'utf-8'));

const ta = makeEl('TEXTAREA');
ta.setAttribute('name', 'content');
const entry = window.NexusDraft.attach(ta);
check('attach 返回 entry 且 key 含 pathname+name', !!entry && entry.key.includes('/compose') && entry.key.includes('content'));

{
    const t0 = Date.now();
    ta._input('第一天写的三千字');
    check('输入未到防抖窗不落盘', store['nxd:' + entry.key] === undefined);
    await new Promise(r => setTimeout(r, 620));
    const saved = store['nxd:' + entry.key];
    check('防抖后落 sessionStorage', !!saved && JSON.parse(saved).v === '第一天写的三千字');
    check('落盘带时间戳', JSON.parse(saved).t >= t0);
}

{
    ta._input('');
    await new Promise(r => setTimeout(r, 620));
    check('清空输入自动清稿', store['nxd:' + entry.key] === undefined);
}

{
    window.NexusDraft.detach(ta);
    const ta2 = makeEl('TEXTAREA');
    ta2.setAttribute('name', 'content');
    store['nxd:' + '/compose#content'] = JSON.stringify({ v: '上次未保存的半稿', t: Date.now() });
    const entry2 = window.NexusDraft.attach(ta2);
    await new Promise(r => setTimeout(r, 10));
    check('进页检出草稿显示恢复条', !!bannerInDom && bannerInDom.childNodes.some(n => n.textContent.includes('未保存')));
    const restoreBtn = bannerInDom.childNodes.find(n => n.textContent === '恢复');
    const discardBtn = bannerInDom.childNodes.find(n => n.textContent === '不用了');
    check('恢复条含恢复/弃用双出口', !!restoreBtn && !!discardBtn);
    check('entry2 与 ta2 关联成功', !!entry2);
    restoreBtn.click();
    await new Promise(r => setTimeout(r, 10));
    check('一键恢复写入元素值', ta2.value === '上次未保存的半稿');
    check('恢复后派发 input 事件(Vue v-model 兼容)', ta2.__dispatched.includes('input'));
    check('恢复条消失', bannerInDom === null || bannerInDom.parentNode !== document.body || bannerInDom.style.display === 'none');
    window.NexusDraft.clear(ta2);
}

{
    const ta3 = makeEl('TEXTAREA');
    ta3.setAttribute('data-nx-draft', 'note-42');
    window.NexusDraft.attach(ta3);
    ta3._input('脏值');
    await new Promise(r => setTimeout(r, 620));
    const evt = { prevented: false, returnValue: undefined, preventDefault() { this.prevented = true; } };
    unloadListeners.forEach(fn => fn(evt));
    check('beforeunload: 在管非空=拦截', evt.prevented === true && evt.returnValue === '');
    window.NexusDraft.clear(ta3);
    check('clear 清稿', store['nxd:note-42'] === undefined);
    const ta4 = makeEl('TEXTAREA');
    ta4.setAttribute('data-nx-draft', 'never-typed');
    window.NexusDraft.attach(ta4);
    const evt2 = { prevented: false, returnValue: undefined, preventDefault() { this.prevented = true; } };
    unloadListeners.forEach(fn => fn(evt2));
    check('beforeunload: 无输入不拦截', evt2.prevented === false && evt2.returnValue === undefined);
}

{
    const ta5 = makeEl('TEXTAREA');
    ta5.setAttribute('data-nx-draft', 'scan-target');
    document.querySelectorAll = () => ({ forEach(fn) { fn(ta5); } });
    const scanned = window.NexusDraft.scan(document);
    check('scan 声明式批量挂载', scanned.length === 1 && scanned[0].key === 'scan-target');
}

{
    const big = makeEl('TEXTAREA');
    big.setAttribute('name', 'huge');
    const eb = window.NexusDraft.attach(big);
    big._input('x'.repeat(131073));
    await new Promise(r => setTimeout(r, 620));
    check('超 128KB 不落盘(配额守卫)', store['nxd:' + eb.key] === undefined);
}

let pass = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
    if (ok) pass++;
}
console.log(pass + '/' + results.length + ' passed');
process.exit(pass === results.length ? 0 : 1);
