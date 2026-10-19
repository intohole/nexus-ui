#!/usr/bin/env python3
"""S17 bootstrap 夹具探针：起本地静态服务加载 harness 页，劫持三类 config 响应，逐项断言。

用法: python3 nexus-ui/scripts/fx_bootstrap_probe.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
HARNESS = REPO / "demo" / "bootstrap_harness.html"

CONFIG_STUBS = {
    "a-config": '{"app_key": "a-key-9"}',
    "b-config": '{"user_center": {"base_url": "https://uc.example.com/uc", "app_key": "b-key-7"}}',
    "data-config": '{"data": {"app_key": "d-key-3"}}',
}


async def main() -> int:
    from playwright.async_api import async_playwright

    # file:// 协议下 Chromium 禁止相对 fetch（config 探测三态全静默失败），
    # 必须 http 形态：spawn nexus-ui 目录静态服务。
    import http.server
    import socketserver
    import threading

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(REPO), **kwargs)

        def log_message(self, *args):
            pass

    srv = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    fails: list[str] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page()

        # route handler 必须 async def（S15 判例：同步 handler 在 async API 下静默失效，请求穿透 mock）
        async def stub_config(route):
            key = route.request.url.split("/fx/", 1)[1]
            await route.fulfill(status=200, content_type="application/json", body=CONFIG_STUBS.get(key, "{}"))

        await page.route("**/fx/*", stub_config)
        await page.goto(f"http://127.0.0.1:{port}/demo/bootstrap_harness.html")
        await page.wait_for_function("window.__fxDone === true")
        await page.wait_for_timeout(300)
        rows = await page.eval_on_selector_all(
            "#out div", "els => els.map(e => ({name: e.className.replace('fx-',''), ok: e.getAttribute('data-ok'), note: e.getAttribute('data-note') || ''}))")
        for r in rows:
            mark = "PASS" if r["ok"] == "1" else "FAIL"
            print(f"[{mark}] {r['name']} | {r['note']}")
            if r["ok"] != "1":
                fails.append(r["name"])
        if not rows:
            fails.append("no-rows")
        await browser.close()
    srv.shutdown()
    print(f"\n== {len(rows) - len(fails)}/{len(rows)} PASS ==")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
