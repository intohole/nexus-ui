#!/usr/bin/env python3
"""NuxAppCard NexusTip 接线探针（s135 试点消费首例+s137 update 动态首例）。

场景：
  T1 组件挂载+editable 按钮在场
  T2 hover 编辑按钮 → [data-nux-tip] open+文案正确（NexusTip 消费链）
  T3 移出 → tip 关闭
  T4 零 pageerror
  T5 showFav 卡片挂载+fav 钮在场且无 title 属性（防双弹）
  T6 hover fav 钮（未收藏）→ tip open 文案「收藏」
  T7 翻转 faved → hover → tip 文案「取消收藏」（watch+update 生效）+仍无 title 属性
  T8 aria-label 动态跟随（无障碍保底）
  T9 降级内核（QQ UA 无 popover）：fav 钮原生 title 降级在位+翻转后 update fallback 改文案
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_app_card_tip.html"
OUT = REPO / "out" / "s135"


async def main() -> int:
    fixture = REPO / "tests" / "e2e_app_card_tip.html"
    fixture.write_text(
        """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>app-card tip</title>
<link rel="stylesheet" href="/css/nexus-all.css"></head>
<body style="padding:24px;font-family:system-ui">
<div id="app">
  <nux-app-card :app="app" editable></nux-app-card>
  <nux-app-card id="favcard" :app="app" show-fav :faved="faved" @fav="flip"></nux-app-card>
</div>
<script src="/vendor/vue.global.prod.js"></script>
<script src="/js/nexus-all.js"></script>
<script src="/js/components/nux-app-card.js"></script>
<script>
(function () {
    const app = Vue.createApp({ data() { return {
        faved: false,
        app: { name: '示例应用', display_name: '示例应用', url: 'https://example.com', description: 'desc' }
    }; },
    methods: { flip() { this.faved = !this.faved; } } });
    app.component('NuxAppCard', window.NuxAppCard);
    app.mount('#app');
})();
</script>
</body></html>
""",
        encoding="utf-8",
    )

    import http.server
    import socketserver
    import threading

    OUT.mkdir(parents=True, exist_ok=True)

    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(REPO), **k)

        def log_message(self, *a):
            pass

    srv = socketserver.TCPServer(("127.0.0.1", 0), H)
    port = str(srv.server_address[1])
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    from playwright.async_api import async_playwright

    results: list[tuple[str, bool, str]] = []
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await b.new_page(viewport={"width": 1024, "height": 720})
        errors: list[str] = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{port}{FIXTURE}")
        await pg.wait_for_timeout(400)

        btn = await pg.query_selector(".nux-app-card-edit")
        results.append(("T1 组件挂载+editable 按钮在场", btn is not None, ""))

        if btn:
            await btn.hover()
            await pg.wait_for_timeout(250)
            tip_state = await pg.evaluate(
                """() => { const t = document.querySelector('[data-nux-tip]');
                if (!t) return { open: false, txt: '' };
                return { open: t.matches(':popover-open') || t.hasAttribute('open'), txt: t.textContent }; }"""
            )
            results.append(("T2 hover 编辑按钮→tip open+文案", tip_state["open"] and "编辑应用信息" in tip_state["txt"], str(tip_state)[:80]))
            await pg.mouse.move(10, 10)
            await pg.wait_for_timeout(250)
            closed = await pg.evaluate(
                """() => { const t = document.querySelector('[data-nux-tip]');
                return !t || (!t.matches(':popover-open') && !t.hasAttribute('open')); }"""
            )
            results.append(("T3 移出→tip 关闭", bool(closed), f"closed={closed}"))
        else:
            results.append(("T2 hover 编辑按钮→tip open+文案", False, "按钮不在场"))
            results.append(("T3 移出→tip 关闭", False, "按钮不在场"))

        fav = await pg.query_selector(".nux-app-card-fav")
        results.append(("T5 showFav 卡片挂载+fav 钮在场", fav is not None, ""))
        if fav:
            has_title = await fav.get_attribute("title")
            results.append(("T5 fav 钮无 title 属性（防双弹）", has_title is None, f"title={has_title}"))
            await fav.hover()
            await pg.wait_for_timeout(250)
            fav_tip = await pg.evaluate(
                """() => { const tips = [...document.querySelectorAll('[data-nux-tip]')];
                const open = tips.find(t => t.matches(':popover-open') || t.hasAttribute('open'));
                return open ? { txt: open.textContent } : null; }"""
            )
            results.append(("T6 hover fav（未收藏）→tip「收藏」", bool(fav_tip) and "收藏" in (fav_tip or {}).get("txt", ""), str(fav_tip)[:80]))
            await pg.mouse.move(10, 10)
            await pg.wait_for_timeout(200)
            await pg.click(".nux-app-card-fav")
            await pg.wait_for_timeout(300)
            aria = await fav.get_attribute("aria-label")
            results.append(("T8 aria-label 动态跟随", aria == "取消收藏", f"aria={aria}"))
            await pg.mouse.move(10, 10)
            await pg.wait_for_timeout(200)
            await fav.hover()
            await pg.wait_for_timeout(250)
            fav_tip2 = await pg.evaluate(
                """() => { const tips = [...document.querySelectorAll('[data-nux-tip]')];
                const open = tips.find(t => t.matches(':popover-open') || t.hasAttribute('open'));
                return open ? { txt: open.textContent } : null; }"""
            )
            has_title2 = await fav.get_attribute("title")
            results.append(("T7 翻转 faved→tip「取消收藏」+无 title",
                            bool(fav_tip2) and "取消收藏" in (fav_tip2 or {}).get("txt", "") and has_title2 is None,
                            f"{str(fav_tip2)[:60]} title={has_title2}"))
        else:
            results.append(("T5 fav 钮无 title 属性（防双弹）", False, "fav 不在场"))
            results.append(("T6 hover fav（未收藏）→tip「收藏」", False, "fav 不在场"))
            results.append(("T7 翻转 faved→tip「取消收藏」+无 title", False, "fav 不在场"))
            results.append(("T8 aria-label 动态跟随", False, "fav 不在场"))

        results.append(("T4 零 pageerror", not errors, "; ".join(errors)[:100]))

        ctx = await b.new_context()
        await ctx.add_init_script("HTMLElement.prototype.showPopover = undefined; HTMLElement.prototype.hidePopover = undefined;")
        pg2 = await ctx.new_page()
        errs2: list[str] = []
        pg2.on("pageerror", lambda e: errs2.append(str(e)))
        await pg2.goto(f"http://127.0.0.1:{port}{FIXTURE}")
        await pg2.wait_for_timeout(400)
        sup = await pg2.evaluate("() => NexusTip.supported()")
        t9a = await pg2.evaluate(
            """() => { const el = document.querySelector('.nux-app-card-fav');
            return el ? el.getAttribute('title') : 'NOBTN'; }"""
        )
        await pg2.click(".nux-app-card-fav")
        await pg2.wait_for_timeout(300)
        t9b = await pg2.evaluate(
            """() => { const el = document.querySelector('.nux-app-card-fav');
            return el ? el.getAttribute('title') : 'NOBTN'; }"""
        )
        results.append(("T9 降级内核 title 双态跟随", (not sup) and t9a == "收藏" and t9b == "取消收藏",
                        f"supported={sup} t9a={t9a} t9b={t9b}"))
        results.append(("T9 降级内核零 pageerror", not errs2, "; ".join(errs2)[:100]))
        await ctx.close()
        await pg.screenshot(path=str(OUT / "app_card_tip.png"))
        await b.close()
    srv.shutdown()

    fail = 0
    for name, ok, note in results:
        print(f"[{'PASS' if ok else 'FAIL'}] {name} | {note}")
        if not ok:
            fail += 1
    print(f"\n== {len(results) - fail}/{len(results)} PASS ==")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
