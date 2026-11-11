#!/usr/bin/env python3
"""NuxBacktop IO 化探针：行为等价+scroll 监听移除双断言。

场景：
  A 首屏不显示：scrollY=0 < threshold →按钮不可见
  B 滚过阈值显示：scrollY=600 > 300 →按钮可见
  C 回顶隐藏：scrollY=0 →按钮不可见
  D 阈值边界：scrollY=150 < 300 不显示；scrollY=450 > 300 显示
  E scroll 监听移除：组件挂载全程 window scroll 监听零新增（IO 化判据）
  F toTop 动作：点击回顶+emit click
  --prove-red：注入坏组件（保留旧 scroll 监听形态），E 断言必红

用法: python3 nexus-ui/tests/e2e_backtop_io_probe.py [--prove-red]
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_backtop_io.html"
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
                const bt = document.querySelector('.nux-backtop');
                window.addEventListener('scroll', () => {}, { passive: true });
            }"""
        )

    async def btn_visible() -> bool:
        return await page.evaluate(
            "() => { const b = document.querySelector('.nux-backtop'); "
            "if (!b) return false; const r = b.getBoundingClientRect(); "
            "const cs = getComputedStyle(b); "
            "return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05 && r.width > 0; }"
        )

    async def scroll_to(y: int) -> None:
        await page.evaluate(f"window.scrollTo(0, {y})")
        await page.wait_for_timeout(350)

    vis0 = await btn_visible()
    results.append(("A 首屏不显示", not vis0, f"visible={vis0}"))

    await scroll_to(600)
    vis600 = await btn_visible()
    results.append(("B 滚过阈值显示（600>300）", vis600, f"visible={vis600}"))

    await scroll_to(150)
    vis150 = await btn_visible()
    results.append(("D1 阈值内不显示（150<300）", not vis150, f"visible={vis150}"))

    await scroll_to(450)
    vis450 = await btn_visible()
    results.append(("D2 阈值外显示（450>300）", vis450, f"visible={vis450}"))

    await scroll_to(0)
    visTop = await btn_visible()
    results.append(("C 回顶隐藏", not visTop, f"visible={visTop}"))

    listener_added = await page.evaluate("window.__E2E.scrollListenerAdded")
    results.append(("E scroll 监听零新增（IO 化判据）", not listener_added, f"added={listener_added}"))

    await scroll_to(600)
    clicked = await page.evaluate(
        """(async () => {
            const b = document.querySelector('.nux-backtop');
            if (!b) return 'no-btn';
            b.click();
            await new Promise(r => setTimeout(r, 300));
            return 'clicked:' + Math.round(window.scrollY);
        })()"""
    )
    results.append(("F toTop 点击回顶", clicked.startswith("clicked:") and int(clicked.split(":")[1]) < 300, clicked))

    page_errors_ok = not errors
    results.append(("零 pageerror", page_errors_ok, "; ".join(errors)[:100] or "干净"))

    await page.screenshot(path=str(OUT / "backtop_io.png"))
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
