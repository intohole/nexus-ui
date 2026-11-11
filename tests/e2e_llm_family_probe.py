#!/usr/bin/env python3
"""LLM 组件族视觉走查夹具渲染探针：badge/indicator/tool-call/citations/task-progress/代码块。

亮暗双主题截图（供 visual-judge 走查），断言：
  1. 夹具六块全部渲染（组件注册面+mount 无异常）
  2. 代码块高亮注入（hljs span 在场）
  3. 三态工具卡状态徽标齐全
  4. 引用 verdict 徽标三档在位
  5. 零 pageerror

用法: python3 nexus-ui/tests/e2e_llm_family_probe.py
截图: out/v2870/llm_family_{theme}.png
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_llm_family.html"
OUT = REPO / "out" / "v2870"


async def run_theme(pw, port: str, theme: str) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []
    browser = await pw.chromium.launch()
    page = await browser.new_page(viewport={"width": 1024, "height": 1600})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(f"http://127.0.0.1:{port}{FIXTURE}")
    page.set_default_timeout(8000)
    if theme == "dark":
        await page.evaluate("document.documentElement.setAttribute('data-theme','dark')")

    try:
        await page.wait_for_function("window.__E2E.phase === 'done'", timeout=8000)
        ok_mount = True
        note = "六块组件挂载完成"
    except Exception as e:
        ok_mount = False
        note = f"挂载未完成: {str(e)[:60]}"
    results.append((f"{theme}: 组件族夹具挂载", ok_mount, note))

    counts = await page.evaluate(
        "() => ({"
        " badges: document.querySelectorAll('.nx-ai-badge').length,"
        " indicators: document.querySelectorAll('.nx-ai-indicator, [class*=indicator]').length,"
        " tools: document.querySelectorAll('[class*=tool-call]').length,"
        " cites: document.querySelectorAll('.nx-citation').length,"
        " tasks: document.querySelectorAll('[class*=nux-ai-task]').length,"
        " hljs: document.querySelectorAll('#md-code [class*=hljs]').length })")
    ok_counts = counts.get("badges", 0) >= 3 and counts.get("tools", 0) >= 3 \
        and counts.get("cites", 0) >= 3 and counts.get("tasks", 0) >= 2
    results.append((f"{theme}: 组件渲染计数", ok_counts, f"counts={counts}"))

    ok_hljs = counts.get("hljs", 0) > 0
    results.append((f"{theme}: 代码块高亮注入", ok_hljs, f"hljs spans={counts.get('hljs')}"))

    verdicts = await page.evaluate(
        "() => document.querySelectorAll('[class*=citation-verdict]').length")
    results.append((f"{theme}: 引用 verdict 徽标", verdicts >= 2, f"verdict 徽标={verdicts}"))

    results.append((f"{theme}: 零 pageerror", not errors, f"errors={errors[:3]}" if errors else "clean"))
    OUT.mkdir(parents=True, exist_ok=True)
    code_block = page.locator("#md-code pre").first
    await code_block.hover()
    await page.wait_for_timeout(350)
    await page.screenshot(path=str(OUT / f"llm_family_{theme}.png"), full_page=True)
    await page.close()
    await browser.close()
    return results


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
    port = str(srv.server_address[1])
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    results: list[tuple[str, bool, str]] = []
    async with async_playwright() as pw:
        for theme in ("light", "dark"):
            results.extend(await run_theme(pw, port, theme))
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
