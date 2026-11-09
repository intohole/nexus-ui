// S57 弹层带制根修守底（v2.85.0）：token 带值、confirm 专档规则、死 token 退役、聚合产物同步。
// 撤守卫必红：任一带值回退/confirm 规则丢失/死 token 复活任一即 fail。
import { readFileSync, existsSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url).pathname;
const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

const tokens = readFileSync(ROOT + 'css/nexus-tokens.css', 'utf8');
const feedback = readFileSync(ROOT + 'css/nexus-components-feedback.css', 'utf8');
const allCss = readFileSync(ROOT + 'css/nexus-all.css', 'utf8');
const creditPanel = readFileSync(ROOT + 'js/nexus-credit-panel.js', 'utf8');
const allJs = readFileSync(ROOT + 'js/nexus-all.js', 'utf8');

// ---- 带值在位 ----
const zVal = (src, name) => {
    const m = src.match(new RegExp('--nx-z-' + name + '\\s*:\\s*(\\d+)'));
    return m ? Number(m[1]) : null;
};
check('tokens: modal=9000（恒压应用覆盖层≤3000）', zVal(tokens, 'modal') === 9000);
check('tokens: toast-host=9100（防回归雷：toast 恒在 modal 上）', zVal(tokens, 'toast-host') === 9100);
check('tokens: confirm=9995（全平台最高交互带）', zVal(tokens, 'confirm') === 9995);

// ---- 带序数值断言（不是子串在场，是真实大小关系）----
const modal = zVal(tokens, 'modal'), toastHost = zVal(tokens, 'toast-host'), confirmZ = zVal(tokens, 'confirm');
const drawer = zVal(tokens, 'drawer'), floatPanel = zVal(tokens, 'float-panel');
check('带序: drawer(999) < modal(9000) < toast-host(9100) < confirm(9995)', drawer < modal && modal < toastHost && toastHost < confirmZ);
check('带序: float-panel(1600) < modal（焦点弹窗压浮动面板）', floatPanel < modal);
check('带序: confirm(9995) > S57 过渡裁决档 9990（裁决态仓里 modal 内 confirm 不被盖）', confirmZ > 9990);
check('带序: confirm(9995) < 瞬态加载屏地板 9998', confirmZ < 9998);

// ---- 死 token 退役（全工作区已证零消费）----
check('死 token: --nx-z-toast 已删', !/--nx-z-toast\s*:/.test(tokens));
check('死 token: --nx-z-unlock 已删', !/--nx-z-unlock\s*:/.test(tokens));

// ---- confirm 专档规则在位（overlay-host 双类挂载，JS 零改动兑现）----
check('feedback: .nx-modal-overlay.nux-confirm-overlay 专档规则在位', /\.nx-modal-overlay\.nux-confirm-overlay[^}]*z-index:\s*var\(--nx-z-confirm\)/.test(feedback));

// ---- 聚合产物同步（build_all 重建后必须同值，防「源改了聚合没跑」）----
check('聚合 css: modal=9000', zVal(allCss, 'modal') === 9000);
check('聚合 css: confirm=9995', zVal(allCss, 'confirm') === 9995);
check('聚合 css: toast-host=9100', zVal(allCss, 'toast-host') === 9100);
check('聚合 css: 死 token 已退役', !/--nx-z-toast\s*:|--nx-z-unlock\s*:/.test(allCss));
check('聚合 css: confirm 专档规则在位', /\.nx-modal-overlay\.nux-confirm-overlay/.test(allCss));

// ---- JS fallback 对齐（token 缺席页面的诚实降级，不再谎报旧带值）----
check('credit-panel: fallback 9000 在位（×2）', (creditPanel.match(/var\(--nx-z-modal,\s*9000\)/g) || []).length === 2);
check('credit-panel: 旧 fallback 1600 已清', !/var\(--nx-z-modal,\s*1600\)/.test(creditPanel));
check('聚合 js: credit-panel fallback 9000 同步', /var\(--nx-z-modal,\s*9000\)/.test(allJs));

// ---- e2e 样张在位（真实 click 探针的载体页）----
check('e2e 样张页在位', existsSync(ROOT + 'tests/e2e_overlay_stack.html'));
check('样张引用 confirm 专档类所在 feedback css', /nexus-components-feedback\.css/.test(readFileSync(ROOT + 'tests/e2e_overlay_stack.html', 'utf8')));

let fail = 0;
for (const [name, ok] of results) {
    console.log((ok ? '[PASS] ' : '[FAIL] ') + name);
    if (!ok) fail++;
}
console.log(`\n== ${results.length - fail}/${results.length} PASS ==`);
process.exit(fail ? 1 : 0);
