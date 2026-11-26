#!/usr/bin/env python3
"""S212 bell 缺省 baseUrl canon 探针：零 base-url 实例请求必须落 /api/notify/*。

handoff/93 契约：base-url="" 是唯一 canon（走应用自带 /api/notify 反代）；
组件缺省 '/notifycenter' 是断链形态（打宿主 /notifycenter/* 恒 404）。
红态=缺省 '/notifycenter'（请求落静态 404，route 拦不到）；绿态=缺省 ''。
"""
from __future__ import annotations

import asyncio
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CANON_FIXTURE = "/tests/e2e_notification_bell_canon.html"

hits: list[str] = []


async def route_handler(route):
    url = route.request.url
    path = url.split("?")[0]
    hits.append(url.split("?")[0])
    if path.endswith("/unread-count"):
        await route.fulfill(json={"count": 3})
    elif path.endswith("/inbox-digest"):
        await route.fulfill(json={"action_items": [], "streams": [], "counts": {"unread_total": 0}})
    elif path.endswith("/notifications"):
        await route.fulfill(json={"items": [], "total": 0, "page": 1, "page_size": 10})
    else:
        await route.fulfill(json={"success": True})


async def main() -> int:
    from playwright.async_api import async_playwright
    import http.server
    import socketserver
    import threading

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(REPO), **kwargs)

        def log_message(self, *args):
            pass

    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = srv.server_address[1]

    def _serve():
        try:
            srv.serve_forever()
        except Exception as exc:
            print(f"[server-thread] {exc!r}", flush=True)

    threading.Thread(target=_serve, daemon=True).start()

    results: list[tuple[str, bool, str]] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        pageerrors: list[str] = []
        page.on("pageerror", lambda e: pageerrors.append(str(e)))
        await page.route("**/api/notify/**", route_handler)
        await page.goto(f"http://127.0.0.1:{port}{CANON_FIXTURE}")
        await page.wait_for_function("window.__E2E_READY === true")
        await page.wait_for_timeout(800)

        canon_hits = [h for h in hits if "/api/notify/unread-count" in h and "/notifycenter/" not in h]
        results.append(("F bell 缺省 baseUrl=canon（请求落 /api/notify/*）", len(canon_hits) >= 1,
                        f"canonHits={canon_hits[:1]} allHits={hits[:3]}"))
        results.append(("F1 canon 面零 pageerror", len(pageerrors) == 0, "; ".join(pageerrors)[:120]))
        await browser.close()
    srv.shutdown()

    fail = 0
    for name, ok, note in results:
        print(f"[{'PASS' if ok else 'FAIL'}] {name} | {note}")
        if not ok:
            fail += 1
    print(f"=== {len(results) - fail}/{len(results)} PASS ===")
    return 1 if fail else 0


if __name__ == "__main__":
    sys_exit = asyncio.run(main())
    raise SystemExit(sys_exit)
