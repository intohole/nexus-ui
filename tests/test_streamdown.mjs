import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));

let renderCalls = 0;
let renderInput = '';
let stableRenders = 0;
window.NexusMarkdown = {
    render(text) {
        renderCalls++;
        renderInput = text;
        if (text === '段落一\n\n' || text === '段落A\n\n') stableRenders++;
        return '<md>' + text + '</md>';
    }
};

load('nexus-streamdown.js');
const SD = window.NexusStreamdown;

{
    const c = SD.findCut('第一段\n\n第二段');
    check('findCut: 段落边界为切点', c === '第一段\n\n'.length);
}
{
    const c = SD.findCut('第一段\n\n第二段\n\n第三段');
    check('findCut: 取最后一个安全切点', c === ('第一段\n\n第二段\n\n').length);
}
{
    const c = SD.findCut('段落A\n\n```js\nconsole.log(1);\n\nx=2;\n```\n\n段落B');
    check('findCut: fence 内空行不切，闭合后可切', c === ('段落A\n\n```js\nconsole.log(1);\n\nx=2;\n```\n\n').length);
}
{
    const c = SD.findCut('段落A\n\n```js\n未闭合\n\n还在代码里');
    check('findCut: 未闭合 fence 起始行起整体活跃', c === '段落A\n\n'.length);
}
{
    const c = SD.findCut('$$\nE=mc^2\n\n还没闭合');
    check('findCut: 未闭合数学块整体活跃', c === -1);
}
{
    const c = SD.findCut('$$\nE=mc^2\n$$\n\n后文段落');
    check('findCut: 闭合数学块后可切', c === ('$$\nE=mc^2\n$$\n\n').length);
}
{
    const c = SD.findCut('1. 甲\n\n2. 乙\n\n3. 丙');
    check('findCut: 有序列表被空行分隔不切（防重编号）', c === -1);
}
{
    const c = SD.findCut('- 甲\n\n段落文字');
    check('findCut: 列表后接段落可切', c > 0);
}
{
    const c = SD.findCut('| a | b |\n|---|---|\n| 1 | 2 |\n\n后文');
    check('findCut: 表格后接段落可切', c === ('| a | b |\n|---|---|\n| 1 | 2 |\n\n').length);
}
{
    const c = SD.findCut('| a | b |\n|---|---|\n\n| 1 | 2 |');
    check('findCut: 表格被空行分隔不切', c === -1);
}
{
    const c = SD.findCut('单段无空行');
    check('findCut: 无切点返回 -1', c === -1);
}

{
    check('autoClose: 闭合 fence 不补', SD.autoCloseTail('```js\nx\n```\n尾') === '```js\nx\n```\n尾');
    check('autoClose: 未闭合 fence 补 ```', SD.autoCloseTail('```js\nx=1') === '```js\nx=1\n```');
    check('autoClose: 奇数反引号补齐', SD.autoCloseTail('前`code') === '前`code`');
    check('autoClose: 成对反引号不补', SD.autoCloseTail('前`code`后') === '前`code`后');
    check('autoClose: 奇数 ** 补齐', SD.autoCloseTail('**粗体') === '**粗体**');
    check('autoClose: 成对 ** 不补', SD.autoCloseTail('**粗体**后') === '**粗体**后');
    check('autoClose: 未闭合 $$ 补齐', SD.autoCloseTail('$$\nE=mc^2') === '$$\nE=mc^2$$');
    check('autoClose: fence 内 ** 不计数', SD.autoCloseTail('```\n**\n```') === '```\n**\n```');
}

{
    renderCalls = 0;
    const st = {};
    let out = SD.update('第一段', st);
    check('update: 无切点全文活跃', out && out.stableHtml === '' && out.activeHtml === '<md>第一段</md>');
    check('update: 空内容返回 null', SD.update('', st) === null);
    const saved = window.NexusMarkdown;
    window.NexusMarkdown = undefined;
    check('update: 缺 NexusMarkdown 返回 null', SD.update('x', {}) === null);
    window.NexusMarkdown = saved;
}

{
    renderCalls = 0;
    stableRenders = 0;
    const st = {};
    const text1 = '段落一';
    SD.update(text1, st);
    const callsAfter1 = renderCalls;
    const text2 = '段落一\n\n段落二的部分';
    const out = SD.update(text2, st);
    check('update: 块推进时稳定区渲染一次+活跃块渲染一次', renderCalls - callsAfter1 === 2);
    const before = renderCalls;
    const stableBefore = stableRenders;
    SD.update(text2, st);
    check('update: 重复调用活跃块重渲但稳定区零渲染', renderCalls - before === 1 && stableRenders === stableBefore);
    check('update: 稳定区 html 正确', out.stableHtml === '<md>段落一\n\n</md>');
}

{
    stableRenders = 0;
    const st = {};
    const stableBase = '段落A\n\n段落B\n\n';
    let full = stableBase;
    SD.update(full, st);
    const callsBaseline = renderCalls;
    const tokens = ['段落C的', '一段', '很长', '的流式', '输出', '，逐', 'token', '追加'];
    for (const t of tokens) {
        full += t;
        SD.update(full, st);
    }
    check('update: 流式追加渲染成本 O(帧)（首token块推进+每帧活跃块）', renderCalls - callsBaseline === tokens.length + 1);
    check('update: 稳定区首块全周期只渲染一次（块级 memoize）', stableRenders === 1);
}

{
    const st = {};
    SD.update('段落X\n\n```js\npartial', st);
    const out = SD.update('段落X\n\n```js\npartial\ncode()', st);
    check('update: 未闭合 fence 在活跃块内自动闭合', typeof out.activeHtml === 'string' && out.activeHtml.length > 0);
}

let failed = 0;
for (const [name, ok] of results) {
    if (!ok) { failed++; console.log('FAIL ' + name); }
}
console.log(`test_streamdown: ${results.length - failed}/${results.length} passed`);
if (failed) process.exit(1);
