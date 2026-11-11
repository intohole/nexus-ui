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
    check('静默窗常量存在', src.includes('SETTLE_DELAY_MS'));
    check('下降路径走 armSettle', src.includes('state.settlePending = true') && src.includes('armSettle()'));
    check('结算时才 pulse+toast', src.includes('function settleNow') && src.indexOf('function settleNow') < src.indexOf('function ensureDom'));
    check('点击浮标先结算再开面板', /addEventListener\('click'[\s\S]*?settleNow\(\);[\s\S]*?NexusCreditPanel/.test(src));
    check('stop 清理结算定时器', src.includes('cancelSettle();') && /function stop[\s\S]*?cancelSettle\(\);/.test(src));
}

function makeCtx(init) {
    const state = Object.assign({
        balance: null, overdraftUsed: 0, overdraftLimit: null, overdraftExhausted: false,
        checkinDone: null, failures: 0, timer: null, lastToastAt: 0, pendingCost: 0,
        lowWarned: false, toastTimer: null, settleTimer: null, settlePending: false,
        settleOverdraft: false, pendingUnlock: null, giftUnlocked: false
    }, init || {});
    const renders = [];
    const toasts = [];
    const segMaybe = src.slice(src.indexOf('function maybeCheckinToast'), src.indexOf('function ensureDom'));
    const segFlush = src.slice(src.indexOf('function flushCostToast'), src.indexOf('function applySummary'));
    const segApply = src.slice(src.indexOf('function applySummary'), src.indexOf('function fetchSummary'));
    const fn = new Function(
        'state', 'renders', 'toasts', 'LOW_BALANCE', 'TOAST_THROTTLE_MS', 'SETTLE_DELAY_MS',
        `
        let pulseCount = 0;
        const renderBalance = () => renders.push(state.balance);
        const renderBadgeState = () => {};
        const pulse = () => { pulseCount++; };
        const showToast = (t) => toasts.push(String(t));
        ${segMaybe}
        ${segFlush}
        ${segApply}
        return {
            applySummary,
            settleNow,
            getPulse: () => pulseCount,
            getState: () => state,
            renders, toasts
        };
        `
    );
    return fn(state, renders, toasts, 200, 30000, 30000);
}

{
    // 场景 A：首渲立即 → 下降静默合并 → 结算一次性曝光
    const ctx = makeCtx();
    ctx.applySummary({ balance: 500, overdraft: {} });
    check('首次加载立即渲染', ctx.renders.length === 1 && ctx.renders[0] === 500);

    ctx.applySummary({ balance: 460, overdraft: {} });
    check('下降不立即重绘数字', ctx.renders.length === 1);
    check('下降不触发 pulse', ctx.getPulse() === 0);
    check('下降不弹消耗 toast', ctx.toasts.length === 0);
    check('下降进入静默窗挂起', ctx.getState().settleTimer !== null && ctx.getState().settlePending === true);

    ctx.applySummary({ balance: 430, overdraft: {} });
    check('窗内再降继续静默', ctx.renders.length === 1 && ctx.getPulse() === 0);
    check('窗内消耗累计合并', ctx.getState().pendingCost === 70);

    ctx.getState().lastToastAt = 0;
    ctx.settleNow();
    check('结算一次性重绘终值', ctx.renders[ctx.renders.length - 1] === 430);
    check('结算触发 pulse', ctx.getPulse() >= 1);
    check('结算弹合并消耗 toast', ctx.getState().pendingCost === 0 && ctx.toasts.some(t => t.includes('消耗') && t.includes('430')));
    check('结算清理挂起标记', ctx.getState().settlePending === false && ctx.getState().settleTimer === null);
}

{
    // 场景 A2：结算后余额低于阈值 → 低余额预警随结算触发
    const ctx = makeCtx();
    ctx.applySummary({ balance: 500, overdraft: {} });
    ctx.applySummary({ balance: 180, overdraft: {} });
    ctx.settleNow();
    check('低余额预警随结算出现', ctx.getState().lowWarned === true && ctx.toasts.some(t => t.includes('积分即将用完')));
}

{
    // 场景 B：余额上升（充值/签到入账）立即渲染 + pulse
    const ctx = makeCtx({ balance: 300 });
    ctx.applySummary({ balance: 380, overdraft: {} });
    check('上升立即渲染', ctx.renders[ctx.renders.length - 1] === 380);
    check('上升立即 pulse', ctx.getPulse() >= 1);
    check('上升不进静默窗', ctx.getState().settleTimer === null && ctx.getState().settlePending === false);
}

{
    // 场景 C：垫付增长（trial 欠费）静默，结算才弹垫付提示
    const ctx = makeCtx({ balance: 600 });
    ctx.applySummary({ balance: 600, overdraft: { used: 30, limit: 100 } });
    check('垫付增长不立即弹提示', ctx.toasts.length === 0 && ctx.getPulse() === 0);
    check('垫付增长进静默窗', ctx.getState().settleOverdraft === true && ctx.getState().settleTimer !== null);

    ctx.getState().lastToastAt = 0;
    ctx.settleNow();
    check('结算弹垫付 toast', ctx.toasts.some(t => t.includes('垫付') && t.includes('30')));
    check('垫付结算无消耗 toast', !ctx.toasts.some(t => t.includes('消耗')));
}

{
    // 场景 D：下降后上升（消耗又入账）→ 立即结算挂起值
    const ctx = makeCtx();
    ctx.applySummary({ balance: 500, overdraft: {} });
    ctx.applySummary({ balance: 460, overdraft: {} });
    check('下降挂起中数字不动', ctx.renders.length === 1);
    ctx.applySummary({ balance: 480, overdraft: {} });
    check('上升打断静默立即结算', ctx.renders[ctx.renders.length - 1] === 480);
    check('打断结算清空挂起', ctx.getState().settleTimer === null && ctx.getState().settlePending === false);
}

{
    // 场景 E：余额不变（对话结束后的空轮询）→ 不续期不打扰
    const ctx = makeCtx();
    ctx.applySummary({ balance: 500, overdraft: {} });
    ctx.applySummary({ balance: 460, overdraft: {} });
    const timerAtDrop = ctx.getState().settleTimer;
    ctx.applySummary({ balance: 460, overdraft: {} });
    check('空轮询不重绘不 pulse', ctx.renders.length === 1 && ctx.getPulse() === 0);
    check('空轮询保持既有静默窗', ctx.getState().settlePending === true && ctx.getState().settleTimer !== null);
    void timerAtDrop;
}

let pass = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
    if (ok) pass++;
}
console.log(pass + '/' + results.length + ' passed');
process.exit(pass === results.length ? 0 : 1);
