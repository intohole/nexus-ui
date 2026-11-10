#!/usr/bin/env python3
"""r26 收件箱 digest 浏览器真渲染 E2E：真实 click 断言 digest 两段/流展开/点击计量。

形态沿 e2e_overlay_probe（静态夹具+Playwright 真点击，绕过 hit-test 的断言一律不采）：
  A 弹层 digest 两段渲染（待你处理/今日简报+计数徽章）
  B 流卡真实点击 → stream-items 展开（aria-expanded 翻转+3 条流内条目）
  C digest 条目真实点击 → POST click 计量 + PUT read 已读（双请求都打到 mock）
  D 375 移动端视口渲染 + 全程零 pageerror
  截图 desktop/mobile 落 out/r26/

用法: python3 nexus-ui/tests/e2e_notification_digest.py
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_notification_digest.html"
OUT = REPO / "out" / "r26"

DIGEST = {
    "action_items": [
        {"id": 101, "app_id": "userFeedback", "type": "feedback", "priority": 2,
         "title": "你的反馈有新回复：希望门户支持自定义排序", "content": "已采纳，下版上线", "link": "/app/portal", "created_at": "2026-11-10 15:00:00"},
    ],
    "streams": [
        {"app_id": "mountain", "notif_type": "report", "count": 3, "latest_id": 9,
         "latest_title": "望岳晚报：Anthropic IPO定价", "latest_created_at": "2026-11-10 20:30:00"},
    ],
    "counts": {"unread_total": 5, "action_unread": 1, "stream_unread": 3, "folded_unread": 1, "action_hidden": 0},
}
LIST_ITEMS = {
    "items": [
        {"id": 101, "app_id": "userFeedback", "type": "feedback", "is_read": False,
         "title": "你的反馈有新回复", "content": "已采纳", "link": "/app/portal", "created_at": "2026-11-10 15:00:00", "data": {}},
        {"id": 102, "app_id": "mountain", "type": "report", "is_read": False,
         "title": "望岳晚报", "content": "Anthropic IPO", "link": "", "created_at": "2026-11-10 20:30:00", "data": {}},
    ],
    "total": 5, "page": 1, "page_size": 10,
}
STREAM_ITEMS = {
    "items": [
        {"id": 9, "app_id": "mountain", "type": "report", "title": "望岳晚报：Anthropic IPO定价", "content": "目标估值", "link": "", "created_at": "2026-11-10 20:30:00"},
        {"id": 8, "app_id": "mountain", "type": "report", "title": "望岳晚报：早报", "content": "美团 30 条", "link": "", "created_at": "2026-11-10 08:00:00"},
        {"id": 7, "app_id": "mountain", "type": "report", "title": "望岳晚报：昨日", "content": "开源脉搏", "link": "", "created_at": "2026-11-09 21:00:00"},
    ],
    "total": 3,
}

hits: list[str] = []


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

    srv = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    results: list[tuple[str, bool, str]] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        pageerrors: list[str] = []

        async def route_handler(route):
            url = route.request.url
            path = url.split("?")[0]
            if path.endswith("/inbox-digest"):
                await route.fulfill(json=DIGEST)
            elif path.endswith("/stream-items"):
                await route.fulfill(json=STREAM_ITEMS)
            elif path.endswith("/click"):
                hits.append("POST " + path)
                await route.fulfill(json={"clicked_at": "2026-11-10T21:00:00", "link": "/app/portal"})
            elif path.endswith("/read"):
                hits.append("PUT " + path)
                await route.fulfill(json={"success": True})
            elif path.endswith("/unread-count"):
                await route.fulfill(json={"count": 5})
            elif "/notifications?" in url or path.endswith("/notifications"):
                await route.fulfill(json=LIST_ITEMS)
            else:
                await route.continue_()

        await page.route("**/notifycenter/api/**", route_handler)
        page.on("pageerror", lambda e: pageerrors.append(str(e)))
        await page.goto(f"http://127.0.0.1:{port}{FIXTURE}")
        await page.wait_for_function("window.__E2E_READY === true")
        await page.wait_for_timeout(300)

        await page.click(".nux-notify-bell", timeout=5000)
        await page.wait_for_selector(".nux-notify-panel", state="visible")

        try:
            await page.wait_for_selector(".nux-notify-digest-label", state="visible", timeout=5000)
            labels = await page.locator(".nux-notify-digest-label").all_inner_texts()
            ok_a = any("待你处理" in t for t in labels) and any("今日简报" in t for t in labels)
            results.append(("A digest 两段渲染（待你处理+今日简报）", ok_a, str(labels)))
            badge = await page.locator(".nux-notify-digest-n").first.inner_text()
            results.append(("A2 计数徽章渲染", badge.strip() != "", f"badge={badge}"))
        except Exception as exc:
            results.append(("A digest 两段渲染", False, repr(exc)[:120]))

        try:
            head = page.locator(".nux-notify-stream-head").first
            await head.click(timeout=5000)
            await page.wait_for_selector(".nux-notify-stream-item", state="visible", timeout=5000)
            n_items = await page.locator(".nux-notify-stream-item").count()
            expanded = await head.get_attribute("aria-expanded")
            results.append(("B 流卡点击展开 3 条", n_items == 3 and expanded == "true", f"items={n_items} aria={expanded}"))
            await head.click(timeout=5000)
            await page.wait_for_timeout(200)
            n_after = await page.locator(".nux-notify-stream-item").count()
            results.append(("B2 再点收起", n_after == 0, f"items={n_after}"))
        except Exception as exc:
            results.append(("B 流卡展开", False, repr(exc)[:120]))

        OUT.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(OUT / "digest_desktop.png"))

        try:
            item = page.locator(".nux-notify-digest .nux-notify-item").first
            await item.click(timeout=5000)
            await page.wait_for_timeout(400)
            clicked = [h for h in hits if h.endswith("/click")]
            readed = [h for h in hits if h.endswith("/read")]
            results.append(("C 点击计量+已读双请求", len(clicked) >= 1 and len(readed) >= 1,
                            f"click={clicked[:1]} read={readed[:1]}"))
        except Exception as exc:
            results.append(("C 点击计量", False, repr(exc)[:120]))

        results.append(("D1 桌面零 pageerror", len(pageerrors) == 0, "; ".join(pageerrors)[:120]))

        m = await browser.new_page(viewport={"width": 375, "height": 720})
        m.on("pageerror", lambda e: pageerrors.append("mobile:" + str(e)))
        await m.route("**/notifycenter/api/**", route_handler)
        await m.goto(f"http://127.0.0.1:{port}{FIXTURE}")
        await m.wait_for_function("window.__E2E_READY === true")
        await m.wait_for_timeout(300)
        try:
            await m.click(".nux-notify-bell", timeout=5000)
            await m.wait_for_selector(".nux-notify-digest-label", state="visible", timeout=5000)
            results.append(("D2 375 视口 digest 渲染", True, "ok"))
        except Exception as exc:
            results.append(("D2 375 视口 digest 渲染", False, repr(exc)[:120]))
        results.append(("D3 移动端零 pageerror", len(pageerrors) == 0, "; ".join(pageerrors)[:120]))
        await m.screenshot(path=str(OUT / "digest_mobile.png"))
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
    sys.exit(asyncio.run(main()))
