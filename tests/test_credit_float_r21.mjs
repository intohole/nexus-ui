import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

const storage = {};
global.window = {
    addEventListener() {},
    location: { pathname: '/app.html' },
    localStorage: {
        getItem: (k) => (k in storage ? storage[k] : null),
        setItem: (k, v) => { storage[k] = String(v); }
    },
    NexusUtils: { authToken: () => 'tok' }
};
const docEl = {};
global.document = {
    readyState: 'complete',
    addEventListener() {},
    getElementById: (id) => docEl[id] || null,
    createElement: () => ({ id: '', textContent: '', innerHTML: '' }),
    head: { appendChild() {} },
    body: { appendChild() {} },
    querySelector: () => null,
    hidden: false
};

const src = readFileSync(ROOT + 'nexus-credit-float.js', 'utf-8');
{
    // r21 E3 三态消费：源码级守底（组件 IIFE 自动启动难以完整桩化 DOM，
    // 关键行为用源码断言钉住 + applySummary 行为级验证）
    check('applySummary 消费 register_gift', src.includes('data.register_gift') && src.includes('pending_unlock'));
    check('首见待解锁提示（localStorage 一次性）', src.includes('maybeUnlockHintToast') && src.includes('nux_cf_rg_seen'));
    check('解锁时刻 toast（pending 翻转检测）', src.includes('maybeUnlockDoneToast') && src.includes('首次使用达成'));
    check('badge title 待解锁提示', src.includes('分待解锁'));
    check('解锁 toast 不被 throttle 吞（独立于 flushCostToast）', src.indexOf('maybeUnlockDoneToast') < src.indexOf('function flushCostToast'));
}

{
    // 行为级：applySummary 抽出执行（去 IIFE 头尾），桩 render/toast 面验证翻转逻辑
    const segMaybe = src.slice(src.indexOf('function maybeCheckinToast'), src.indexOf('function ensureDom'));
    const segApply = src.slice(src.indexOf('function applySummary'), src.indexOf('function fetchSummary'));
    const state = {
        balance: 300, pendingUnlock: 700, giftUnlocked: false,
        overdraftUsed: 0, checkinDone: true, lastToastAt: 0, pendingCost: 0,
        lowWarned: true, toastTimer: null
    };
    const toasts = [];
    const pulses = [];
    const fn = new Function(
        'state', 'toasts', 'pulses',
        `
        let pulseCount = 0;
        const showToast = (t) => toasts.push(t);
        const pulse = () => { pulseCount++; };
        const renderBalance = () => {};
        const renderBadgeState = () => {};
        const flushCostToast = () => {};
        const flushCreditToast = () => {};
        const warnIfLow = () => {};
        ${segMaybe}
        ${segApply}
        return { applySummary, getPulse: () => pulseCount };
        `
    );
    const ctx = fn(state, toasts, pulses);
    // 解锁时刻：pending 700→0 且 unlocked 翻 true
    ctx.applySummary({
        balance: 1000, overdraft: {},
        register_gift: { amount: 1000, granted: true, pending_unlock: 0, unlocked: true }
    });
    check('解锁时刻 toast 出现', toasts.some(t => t.includes('首次使用达成') && t.includes('700')));
    check('解锁时刻 pulse 触发', ctx.getPulse() >= 1);
    // 从未待解锁的用户：pending null→0 不触发
    const toasts2 = [];
    const state2 = { ...state, balance: 500, pendingUnlock: null, giftUnlocked: false };
    const ctx2 = fn(state2, toasts2, pulses);
    ctx2.applySummary({ balance: 500, overdraft: {}, register_gift: { amount: 0, granted: false, pending_unlock: 0, unlocked: false } });
    check('从未待解锁用户不误触解锁 toast', toasts2.length === 0);
    // 无 register_gift 键（旧 UC）不炸
    const state3 = { ...state, balance: 100, pendingUnlock: null, giftUnlocked: false, lowWarned: false };
    const ctx3 = fn(state3, toasts2, pulses);
    let ok3 = true;
    try { ctx3.applySummary({ balance: 100, overdraft: {} }); } catch (e) { ok3 = false; }
    check('旧 UC 无 register_gift 键零异常', ok3);
}

let pass = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
    if (ok) pass++;
}
console.log(pass + '/' + results.length + ' passed');
process.exit(pass === results.length ? 0 : 1);
