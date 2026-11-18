#!/usr/bin/env python3
"""digest 消费面 E2E（r26 立·fe5 扩）：bell 弹层面+原生 panel 面真渲染真点击。

形态沿 e2e_overlay_probe（静态夹具+Playwright 真点击，绕过 hit-test 的断言一律不采）：
  bell 面
  A 弹层 digest 两段渲染（待你处理/今日简报+计数徽章）
  A3 action 行 appLabel 人话（无 raw app_id 泄漏）
  A4 action 行摘要行在场（首屏价值可判）
  B 流卡真实点击 → stream-items 展开（aria-expanded 翻转+3 条流内条目）
  B3 chevron mask 图标真渲染（子集 glyph 在场，非实心色块）
  C digest 条目真实点击 → POST click 计量 + PUT read 已读（双请求都打到 mock）
  D 375 移动端视口渲染 + 全程零 pageerror
  原生 panel 面（fe5 新增，resumeAI 宿主形态）
  E1 流卡点击 → stream-items 请求+展开体+aria-expanded=true+chevron 旋转
  E2 再点收起 + E3 展开第二张卡互斥（前卡收起）
  E4 流内条目点击 → PUT read 真链
  E5 原生面零 pageerror
  截图 desktop/375/暗色 落 out/fe5/
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BELL_FIXTURE = "/tests/e2e_notification_digest.html"
PANEL_FIXTURE = "/tests/e2e_notification_panel_digest.html"
OUT = REPO / "out" / "fe5"

DIGEST = {
    "action_items": [
        {"id": 101, "app_id": "userFeedback", "type": "feedback", "priority": 2,
         "title": "你的反馈有新回复：希望门户支持自定义排序", "content": "已采纳，下版上线。另外排序记忆功能在评估中",
         "link": "/app/portal", "created_at": "2026-11-10 15:00:00"},
    ],
    "streams": [
        {"app_id": "mountain", "notif_type": "report", "count": 3, "latest_id": 9,
         "latest_title": "望岳晚报：Anthropic IPO定价", "latest_created_at": "2026-11-10 20:30:00"},
        {"app_id": "goldenstock", "notif_type": "report", "count": 2, "latest_id": 12,
         "latest_title": "金股智投晨报：金龙指数反弹", "latest_created_at": "2026-11-10 08:10:00"},
    ],
    "counts": {"unread_total": 6, "action_unread": 1, "stream_unread": 5, "folded_unread": 1, "action_hidden": 0},
}
LIST_ITEMS = {
    "items": [
        {"id": 101, "app_id": "userFeedback", "type": "feedback", "is_read": False,
         "title": "你的反馈有新回复", "content": "已采纳", "link": "/app/portal", "created_at": "2026-11-10 15:00:00", "data": {}},
        {"id": 110, "app_id": "mountain", "type": "report", "is_read": False,
         "title": "望岳晚报", "content": "Anthropic IPO", "link": "", "created_at": "2026-11-10 20:30:00", "data": {}},
    ],
    "total": 6, "page": 1, "page_size": 10,
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


async def route_handler(route):
    url = route.request.url
    path = url.split("?")[0]
    if path.endswith("/inbox-digest"):
        await route.fulfill(json=DIGEST)
    elif path.endswith("/stream-items"):
        hits.append("GET " + path)
        await route.fulfill(json=STREAM_ITEMS)
    elif path.endswith("/click"):
        hits.append("POST " + path)
        await route.fulfill(json={"clicked_at": "2026-11-10T21:00:00", "link": "/app/portal"})
    elif path.endswith("/read"):
        hits.append("PUT " + path)
        await route.fulfill(json={"success": True})
    elif path.endswith("/unread-count"):
        await route.fulfill(json={"count": 6})
    elif "/notifications?" in url or path.endswith("/notifications"):
        await route.fulfill(json=LIST_ITEMS)
    else:
        await route.continue_()


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
        page.on("pageerror", lambda e: pageerrors.append(str(e)))
        await page.route("**/notifycenter/api/**", route_handler)
        await page.route("**/api/notify/**", route_handler)
        await page.goto(f"http://127.0.0.1:{port}{BELL_FIXTURE}")
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
            row_text = await page.locator(".nux-notify-digest .nux-notify-item").first.inner_text()
            ok_app = "意见反馈" in row_text and "userFeedback" not in row_text
            results.append(("A3 action 行 appLabel 人话（raw id 零泄漏）", ok_app, row_text.replace("\n", " / ")[:80]))
            has_sum = await page.evaluate(
                "() => !!document.querySelector('.nux-notify-digest .nux-notify-item-summary')")
            results.append(("A4 action 行摘要行在场", has_sum, f"summary={has_sum}"))
        except Exception as exc:
            results.append(("A3/A4 action 行升级", False, repr(exc)[:120]))

        try:
            head = page.locator(".nux-notify-stream-head").first
            mask = await head.evaluate("el => getComputedStyle(el.querySelector('i')).maskImage || getComputedStyle(el.querySelector('i')).webkitMaskImage")
            results.append(("B3 chevron mask 真渲染（非色块）", "data:image" in mask, mask[:60]))
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
        await page.evaluate("() => { const el = document.querySelector('.nux-notify-scroll'); if (el) el.scrollTop = 0; }")
        await page.wait_for_timeout(200)
        await page.screenshot(path=str(OUT / "fe5_bell_desktop_light.png"))

        # 暗色主题截图（C 点击会离页导航，主题截图必须先行）
        await page.evaluate("() => document.documentElement.setAttribute('data-theme', 'dark')")
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / "fe5_bell_desktop_dark.png"))
        await page.evaluate("() => document.documentElement.setAttribute('data-theme', 'light')")
        await page.wait_for_timeout(300)

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
        await m.route("**/api/notify/**", route_handler)
        await m.goto(f"http://127.0.0.1:{port}{BELL_FIXTURE}")
        await m.wait_for_function("window.__E2E_READY === true")
        await m.wait_for_timeout(300)
        try:
            await m.click(".nux-notify-bell", timeout=5000)
            await m.wait_for_selector(".nux-notify-digest-label", state="visible", timeout=5000)
            results.append(("D2 375 视口 digest 渲染", True, "ok"))
            ov = await m.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth")
            results.append(("D2b 375 无横向溢出", not ov, f"overflowX={ov}"))
        except Exception as exc:
            results.append(("D2 375 视口 digest 渲染", False, repr(exc)[:120]))
        results.append(("D3 移动端零 pageerror", len(pageerrors) == 0, "; ".join(pageerrors)[:120]))
        await m.screenshot(path=str(OUT / "fe5_bell_375_light.png"))
        await m.evaluate("() => document.documentElement.setAttribute('data-theme', 'dark')")
        await m.wait_for_timeout(300)
        await m.screenshot(path=str(OUT / "fe5_bell_375_dark.png"))
        await m.close()

        # ---- 原生 panel 面（resumeAI 宿主形态）----
        n = await browser.new_page(viewport={"width": 1280, "height": 800})
        nerrors: list[str] = []
        n.on("pageerror", lambda e: nerrors.append(str(e)))
        await n.route("**/notifycenter/api/**", route_handler)
        await n.route("**/api/notify/**", route_handler)
        await n.goto(f"http://127.0.0.1:{port}{PANEL_FIXTURE}")
        await n.click("#open-panel")
        await n.wait_for_function("window.__PANEL_READY === true")
        await n.wait_for_selector(".nux-notif-digest-stream", timeout=5000)
        try:
            card = n.locator(".nux-notif-digest-stream").first
            await card.click(timeout=5000)
            await n.wait_for_selector(".nux-notify-stream-body[data-open-key]", timeout=5000)
            aria = await card.get_attribute("aria-expanded")
            await n.wait_for_selector(".nux-notify-stream-item", state="visible", timeout=5000)
            n_items = await n.locator(".nux-notify-stream-item").count()
            stream_hits = [h for h in hits if "/stream-items" in h]
            results.append(("E1 原生流卡点击展开真链", aria == "true" and n_items == 3 and len(stream_hits) >= 1,
                            f"aria={aria} items={n_items} streamHits={len(stream_hits)}"))
            await n.wait_for_timeout(300)
            rot = await card.evaluate("el => getComputedStyle(el.querySelector('i')).transform")
            results.append(("E1b chevron 旋转信号", rot not in ("", "none"), f"transform={rot}"))
            await card.click(timeout=5000)
            await n.wait_for_timeout(300)
            n_after = await n.locator(".nux-notify-stream-item").count()
            results.append(("E2 再点收起", n_after == 0, f"items={n_after}"))
            await n.locator(".nux-notif-digest-stream").nth(0).click(timeout=5000)
            await n.wait_for_timeout(200)
            await n.locator(".nux-notif-digest-stream").nth(1).click(timeout=5000)
            await n.wait_for_timeout(400)
            open_keys = await n.eval_on_selector_all(
                ".nux-notify-stream-body[data-open-key]", "els => els.map(e => e.getAttribute('data-open-key'))")
            aria0 = await n.locator(".nux-notif-digest-stream").nth(0).get_attribute("aria-expanded")
            results.append(("E3 双卡互斥（前卡收起）", open_keys == ["goldenstock:report"] and aria0 == "false",
                            f"openKeys={open_keys} aria0={aria0}"))
            await n.locator(".nux-notify-stream-item").first.click(timeout=5000)
            await n.wait_for_timeout(400)
            reads = [h for h in hits if h.endswith("/read")]
            results.append(("E4 流内条目点击 → read 真链", len(reads) >= 1, f"reads={reads[:2]}"))
        except Exception as exc:
            results.append(("E 原生面交互", False, repr(exc)[:120]))
        results.append(("E5 原生面零 pageerror", len(nerrors) == 0, "; ".join(nerrors)[:120]))
        await n.screenshot(path=str(OUT / "fe5_panel_desktop_light.png"))
        await n.evaluate("() => document.documentElement.setAttribute('data-theme', 'dark')")
        await n.wait_for_timeout(300)
        await n.screenshot(path=str(OUT / "fe5_panel_desktop_dark.png"))
        await n.close()

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
