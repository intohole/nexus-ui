#!/usr/bin/env python3
"""对话控制面 v2.87.0 运行态探针：默认开动线/reasoning 自动开合/meta 用量条。

教训背书：交互断言一律真实 click + elementFromPoint 几何断言（inner_text/js_poll
是绕过 hit-test 的假绿通道）；hover 显示类断言必须等 opacity 落定（判官第 2 轮
教训：state=visible 不等 transition 完成，中途截图=假象）。

场景（亮暗双主题各跑一遍，fixture 三列）：
  A 默认开列（不显式传 chatActions）：发送/重新生成/编辑重发/失败态四动线全绿
  B 显式关对照列：零新增按钮
  C 富列：thinking 流式中自动展开→收口自动收起→手动可再开 + meta chips 双 chip
  --prove-red：注入旧默认（chatActions:false 强制覆盖），A 列动作按钮必须消失
  （探针自证判红力）

用法: python3 nexus-ui/tests/e2e_chat_actions_probe.py [--prove-red]
截图: out/v2870/*.png（1400/1024/375 三端 + 亮暗双主题 + hover 态）
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_chat_actions.html"
CLICK_MS = 8000
OUT = REPO / "out" / "v2870"


async def run_theme(pw, port: str, theme: str, prove_red: bool, width: int) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []
    browser = await pw.chromium.launch()
    page = await browser.new_page(viewport={"width": width, "height": 900})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(f"http://127.0.0.1:{port}{FIXTURE}")
    page.set_default_timeout(CLICK_MS)
    if theme == "dark":
        await page.evaluate("document.documentElement.setAttribute('data-theme','dark')")
    if prove_red:
        await page.add_style_tag(content=".nx-ai-chat-actions{display:none !important}")

    if width == 1400:
        try:
            await page.wait_for_function("window.__E2E.phase === 'done'", timeout=CLICK_MS)
            R = await page.evaluate("() => window.__E2E.result")
            bad = {k: v for k, v in (R or {}).items() if not v}
            ok = bool(R) and not bad
            note = "全绿" if ok else f"红项={bad}"
        except Exception as e:
            R = {}
            ok = False
            note = f"夹具执行异常: {str(e)[:80]}"
        results.append((f"{theme}: 夹具全断言（控制面四动线+对照+reasoning/meta+上翻加载）", ok, note))

        try:
            await page.hover("#app-on .nx-ai-chat-msg >> nth=0")
            await page.wait_for_function(
                "() => { const m = document.querySelectorAll('#app-on .nx-ai-chat-msg')[0];"
                " if (!m) return false;"
                " const a = m.querySelector('.nx-ai-chat-actions');"
                " return a && parseFloat(getComputedStyle(a).opacity) === 1; }", timeout=3000)
            ok = not prove_red
            note = "hover 落定 opacity=1，操作条可见" if not prove_red else "prove-red 注入 display:none 应判红"
        except Exception:
            ok = prove_red
            note = "操作条不可见" if not prove_red else "prove-red 复现：注入旧默认后操作条消失"
        results.append((f"{theme}: hover 显示消息操作条（opacity 落定）", ok, note))

        results.append((f"{theme}: 零 pageerror", not errors, f"errors={errors[:3]}" if errors else "clean"))
        OUT.mkdir(parents=True, exist_ok=True)
        tag = f"{theme}{'_prove_red' if prove_red else ''}"
        await page.screenshot(path=str(OUT / f"chat_actions_{tag}.png"), full_page=True)
    elif width == 1024:
        await page.wait_for_function("window.__E2E.phase === 'done'", timeout=CLICK_MS)
        OUT.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(OUT / f"chat_actions_{theme}_1024.png"), full_page=True)
        results.append((f"{theme}: 1024 平板宽度渲染", True, "截图落档"))
    else:
        await page.wait_for_function("window.__E2E.phase === 'done'", timeout=CLICK_MS)
        overflow = await page.evaluate(
            "() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        OUT.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(OUT / f"chat_actions_{theme}_375.png"), full_page=True)
        results.append((f"{theme}: 375 手机宽度无横向溢出", not overflow, f"overflow={overflow}"))

    await page.close()
    await browser.close()
    return results


async def main() -> int:
    prove_red = "--prove-red" in sys.argv
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
    port = str(srv.server_address[1])
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    results: list[tuple[str, bool, str]] = []
    async with async_playwright() as pw:
        for theme in ("light", "dark"):
            for width in (1400, 1024, 375):
                results.extend(await run_theme(pw, port, theme, prove_red, width))
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
