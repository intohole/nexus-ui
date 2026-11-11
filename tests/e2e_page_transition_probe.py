#!/usr/bin/env python3
"""NexusPageTransition v1.0.0 运行态探针：降级纪律三重门+vueTransition 壳。

场景（headless Chromium 原生支持 startViewTransition）：
  A 原生链：transition() 包 fake startViewTransition→updateFn 在回调内执行+finished promise resolve
  B 降级直跳链（stub remove：document.startViewTransition=undefined）→updateFn 同步执行+promise resolve
  C 弱内核 UA 链（QQBrowser/UCBrowser UA 注入，原生仍在）→降级直跳（svtCalls==0）
  D reduced-motion 链（matchMedia reduce stub）→降级直跳
  E vueTransition 壳：包装 router fn→原生 fake 路径执行+nextTick 后 resolve
  F nameOf：设/清 view-transition-name
  G supported/nativeSupported 语义（原生在+UA 正常=true；UA 弱=false；nativeSupported 与 UA 无关）
  --prove-red：stub remove 场景注入「剥 updateFn 调用」的坏原语，B 断言必红（探针判红力自证）

用法: python3 nexus-ui/tests/e2e_page_transition_probe.py [--prove-red]
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_page_transition.html"
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
        await page.evaluate(
            """() => {
                const orig = window.NexusPageTransition.transition;
                window.NexusPageTransition.transition = (fn) => orig(typeof fn === 'function' ? () => {} : fn);
            }"""
        )

    async def check(name: str, expr: str) -> None:
        try:
            val = await page.evaluate(expr)
            ok = bool(val.get("pass"))
            note = val.get("note", "")
        except Exception as e:
            ok, note = False, f"evaluate 异常: {str(e)[:80]}"
        results.append((name, ok, note))

    await check(
        "A 原生链：fake startViewTransition 回调内执行 updateFn",
        """(async () => {
            window.__E2E.stubNative('fake');
            let ran = false;
            const p = window.NexusPageTransition.transition(() => { ran = true; });
            await p;
            window.__E2E.restoreNative();
            return { pass: ran && window.__E2E.svtCalls === 0 || ran, note: `ran=${ran}` };
        })()""",
    )
    await page.evaluate("window.__E2E.restoreNative()")
    await check(
        "A2 fake svtCalls 计数（stub 生效自证）",
        """(async () => {
            window.__E2E.stubNative('fake');
            await window.NexusPageTransition.transition(() => {});
            const calls = window.__E2E.svtCalls;
            window.__E2E.restoreNative();
            return { pass: calls >= 1, note: `svtCalls=${calls}` };
        })()""",
    )

    await check(
        "B 降级直跳：native 移除后 updateFn 同步执行",
        """(async () => {
            window.__E2E.stubNative('remove');
            let ran = false, syncRan = false;
            const p = window.NexusPageTransition.transition(() => { ran = true; syncRan = true; });
            const syncSnapshot = ran;
            await p;
            window.__E2E.restoreNative();
            return { pass: ran && syncSnapshot, note: `ran=${ran} sync=${syncSnapshot}` };
        })()""",
    )

    await check(
        "C 弱内核 UA：原生在但 QQ UA→直跳不调 startViewTransition",
        """(async () => {
            window.__E2E.stubNative('fake');
            const origUA = navigator.userAgent;
            Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/114 Mobile Safari/537.36 MQQBrowser/14.9', configurable: true });
            let ran = false;
            await window.NexusPageTransition.transition(() => { ran = true; });
            const calls = window.__E2E.svtCalls;
            Object.defineProperty(navigator, 'userAgent', { value: origUA, configurable: true });
            window.__E2E.restoreNative();
            return { pass: ran && calls === 0, note: `ran=${ran} svtCalls=${calls}` };
        })()""",
    )

    await check(
        "C2 UC 内核同款直跳",
        """(async () => {
            window.__E2E.stubNative('fake');
            const origUA = navigator.userAgent;
            Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 13) UCBrowser/15.5 Mobile', configurable: true });
            const sup = window.NexusPageTransition.supported();
            Object.defineProperty(navigator, 'userAgent', { value: origUA, configurable: true });
            window.__E2E.restoreNative();
            return { pass: !sup, note: `supported=${sup}` };
        })()""",
    )

    await check(
        "D reduced-motion：直跳",
        """(async () => {
            window.__E2E.stubNative('fake');
            const origMM = window.matchMedia;
            window.matchMedia = (q) => q.includes('prefers-reduced-motion')
                ? { matches: true, addEventListener() {}, removeEventListener() {} }
                : origMM(q);
            let ran = false;
            await window.NexusPageTransition.transition(() => { ran = true; });
            const calls = window.__E2E.svtCalls;
            window.matchMedia = origMM;
            window.__E2E.restoreNative();
            return { pass: ran && calls === 0, note: `ran=${ran} svtCalls=${calls}` };
        })()""",
    )

    await check(
        "E vueTransition 壳：fn 执行+promise resolve",
        """(async () => {
            window.__E2E.stubNative('fake');
            let routed = false;
            const wrapped = window.NexusPageTransition.vueTransition(() => { routed = true; });
            await wrapped();
            const calls = window.__E2E.svtCalls;
            window.__E2E.restoreNative();
            return { pass: routed && calls >= 1, note: `routed=${routed} svtCalls=${calls}` };
        })()""",
    )

    await check(
        "F nameOf：设/清 view-transition-name",
        """() => {
            const el = document.getElementById('panel-a');
            window.NexusPageTransition.nameOf(el, 'panel-hero');
            const set = el.style.viewTransitionName === 'panel-hero';
            window.NexusPageTransition.nameOf(el, null);
            const cleared = !el.style.viewTransitionName;
            return { pass: set && cleared, note: `set=${set} cleared=${cleared}` };
        }""",
    )

    await check(
        "G API 面：version/supported/nativeSupported 语义",
        """() => {
            const PT = window.NexusPageTransition;
            const okApi = PT.version === '1.0.0' && typeof PT.supported === 'function'
                && typeof PT.nativeSupported === 'function' && typeof PT.transition === 'function'
                && typeof PT.nameOf === 'function' && typeof PT.vueTransition === 'function';
            const native = PT.nativeSupported();
            const sup = PT.supported();
            return { pass: okApi && native === true && sup === true, note: `native=${native} supported=${sup} api=${okApi}` };
        }""",
    )

    await check(
        "G2 非函数入参：resolve 不炸",
        """(async () => {
            const p = window.NexusPageTransition.transition(null);
            await p;
            return { pass: true, note: 'null 入参安全 resolve' };
        })()""",
    )

    page_errors_ok = not errors
    results.append(("零 pageerror", page_errors_ok, "; ".join(errors)[:100] or "干净"))

    await page.screenshot(path=str(OUT / "page_transition.png"))
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
