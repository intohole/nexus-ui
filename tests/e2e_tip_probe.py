#!/usr/bin/env python3
"""NexusTip v1.0.0 运行态探针：Popover API 轻量提示层+fallback 退化。

场景（headless Chromium 原生支持 Popover API）：
  A 原生链：bind 后 mouseenter→tip 元素 open+文本正确+popover 属性在位
  B 移出隐藏：mouseleave→tip 关闭
  C 键盘可达：focusin→tip open
  D fallback 链（stub showPopover=undefined）→触发元素退化 title 属性+不炸
  E bind 幂等：同元素重复 bind 不重复建 tip
  F unbind 清理：tip 元素移除+事件解绑
  G API 面：version/supported/bind/unbind
  --prove-red：剥 bind 事件绑定，A 断言必红（探针判红力自证）

用法: python3 nexus-ui/tests/e2e_tip_probe.py [--prove-red]
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_tip.html"
OUT = REPO / "out" / "s135"


async def run_case(pw, port: str, prove_red: bool) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []
    browser = await pw.chromium.launch()
    page = await browser.new_page(viewport={"width": 1024, "height": 720})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(f"http://127.0.0.1:{port}{FIXTURE}")
    page.set_default_timeout(6000)

    if prove_red:
        await page.evaluate("() => { window.NexusTip.bind = () => {}; window.NexusTip.update = () => {}; }")

    async def check(name: str, expr: str) -> None:
        try:
            val = await page.evaluate(expr)
            ok = bool(val.get("pass"))
            note = val.get("note", "")
        except Exception as e:
            ok, note = False, f"evaluate 异常: {str(e)[:80]}"
        results.append((name, ok, note))

    await check(
        "G API 面与 supported",
        """() => {
            const T = window.NexusTip;
            if (!T) return { pass: false, note: '原语未挂载' };
            const okApi = T.version === '1.1.0' && typeof T.supported === 'function'
                && typeof T.bind === 'function' && typeof T.unbind === 'function'
                && typeof T.update === 'function';
            return { pass: okApi && T.supported() === true, note: `supported=${T.supported()}` };
        }""",
    )

    await check(
        "A 原生链：mouseenter→tip open+文本+popover 属性",
        """(async () => {
            const el = document.getElementById('t1');
            window.NexusTip.bind(el, { text: '轻提示内容A' });
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
            await new Promise(r => setTimeout(r, 120));
            const tip = document.querySelector('[data-nux-tip]');
            const open = tip ? (tip.matches(':popover-open') || tip.hasAttribute('open')) : false;
            const txt = tip ? tip.textContent : '';
            return { pass: !!tip && open && txt.indexOf('轻提示内容A') >= 0, note: `tip=${!!tip} open=${open} txt=${txt.slice(0, 12)}` };
        })()""",
    )

    await check(
        "B 移出隐藏：mouseleave→tip 关闭",
        """(async () => {
            const el = document.getElementById('t1');
            el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
            await new Promise(r => setTimeout(r, 120));
            const tip = document.querySelector('[data-nux-tip]');
            const closed = tip ? (!tip.matches(':popover-open') && !tip.hasAttribute('open')) : true;
            return { pass: closed, note: `closed=${closed}` };
        })()""",
    )

    await check(
        "C 键盘可达：focusin→tip open",
        """(async () => {
            const el = document.getElementById('t1');
            el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
            await new Promise(r => setTimeout(r, 120));
            const tip = document.querySelector('[data-nux-tip]');
            const open = tip ? (tip.matches(':popover-open') || tip.hasAttribute('open')) : false;
            el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
            return { pass: open, note: `open=${open}` };
        })()""",
    )

    await check(
        "E bind 幂等：重复 bind 不重复建 tip",
        """() => {
            const el = document.getElementById('t1');
            window.NexusTip.bind(el, { text: '轻提示内容A' });
            const n = document.querySelectorAll('[data-nux-tip]').length;
            return { pass: n === 1, note: `tip_count=${n}` };
        }""",
    )

    await check(
        "F unbind 清理：tip 元素移除",
        """() => {
            const el = document.getElementById('t1');
            window.NexusTip.unbind(el);
            const n = document.querySelectorAll('[data-nux-tip]').length;
            return { pass: n === 0, note: `tip_count_after=${n}` };
        }""",
    )

    await check(
        "D fallback：无 popover API→退化 title 属性",
        """(async () => {
            window.__E2E.stubNoPopover();
            const el = document.getElementById('t2');
            let threw = false;
            try { window.NexusTip.bind(el, { text: '降级提示' }); } catch (e) { threw = true; }
            const titleSet = el.getAttribute('title') === '降级提示';
            window.__E2E.restorePopover();
            window.NexusTip.unbind(el);
            return { pass: titleSet && !threw, note: `title=${titleSet} threw=${threw}` };
        })()""",
    )

    await check(
        "H update：open 态换文案+重定位",
        """(async () => {
            const el = document.getElementById('t3');
            window.NexusTip.bind(el, { text: '收藏' });
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
            await new Promise(r => setTimeout(r, 120));
            window.NexusTip.update(el, '取消收藏并移出常用列表');
            await new Promise(r => setTimeout(r, 120));
            const tip = document.querySelector('[data-nux-tip]');
            const open = tip ? (tip.matches(':popover-open') || tip.hasAttribute('open')) : false;
            const txt = tip ? tip.textContent : '';
            const positioned = tip ? (tip.style.left !== '' && tip.style.top !== '') : false;
            const stillHost = el.hasAttribute('data-nux-tip-host');
            return { pass: !!tip && open && txt === '取消收藏并移出常用列表' && positioned && stillHost,
                     note: `open=${open} txt=${txt.slice(0, 14)} pos=${positioned}` };
        })()""",
    )

    await check(
        "I update 边界：未 bind 零炸+fallback title 同步",
        """(async () => {
            let threw = false;
            try {
                window.NexusTip.update(document.getElementById('t1'), 'x');
                window.NexusTip.update(null, 'x');
                window.NexusTip.update(document.getElementById('t3'), '');
            } catch (e) { threw = true; }
            window.__E2E.stubNoPopover();
            const el = document.getElementById('t3');
            window.NexusTip.update(el, '降级新文案');
            const titleSynced = el.getAttribute('title') === '降级新文案';
            window.__E2E.restorePopover();
            window.NexusTip.unbind(el);
            return { pass: !threw && titleSynced, note: `threw=${threw} titleSynced=${titleSynced}` };
        })()""",
    )

    page_errors_ok = not errors
    results.append(("零 pageerror", page_errors_ok, "; ".join(errors)[:100] or "干净"))

    await page.screenshot(path=str(OUT / "tip.png"))
    await browser.close()
    return results


async def main() -> int:
    import http.server
    import socketserver
    import threading

    OUT.mkdir(parents=True, exist_ok=True)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(REPO), **kwargs)

        def log_message(self, *args):
            pass

    srv = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = str(srv.server_address[1])
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    from playwright.async_api import async_playwright

    results: list[tuple[str, bool, str]] = []
    async with async_playwright() as pw:
        results.extend(await run_case(pw, port, prove_red="--prove-red" in sys.argv))
    srv.shutdown()

    fail = 0
    for name, ok, note in results:
        print(f"[{'PASS' if ok else 'FAIL'}] {name} | {note}")
        if not ok:
            fail += 1
    total = len(results)
    print(f"\n== {total - fail}/{total} PASS ==")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
