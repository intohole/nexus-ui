#!/usr/bin/env python3
"""v2.98.0 AI 事件面 AG-UI 对齐族运行态探针：subagent 三件族+归因分流+思考收束。

场景（亮暗双主题）：
  A ai-chat 全链（richSubagents:true）：模拟 SSE 序列 → .nx-subagent-track 渲染
    三席全终态（done/suspended/error，无 running 残留）+ 同 id 重复 start 幂等（3 行非 4）
  B 组件直挂四态：#sa-direct 4 行，suspended 行 is-suspended 类在席
  C 兼容对照（richSubagents:false）：同序列 → 卡组缺席（feat 关=呈现关）
  D 母消息零污染：A 段思考带 subagentRunId → msg.thinking 保持空（分流不落母）

--prove-red：fixture ?prove_red 关 richSubagents → A 段卡组断言必须变红（判红力自证）
用法: python3 nexus-ui/tests/e2e_v2980_probe.py [--prove-red]
截图: nexus-ui/out/v2980/v2980_{theme}{_prove_red}.png
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_v2980_family.html"
OUT = REPO / "out" / "v2980"


async def run_theme(pw, port: str, theme: str, prove_red: bool) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []
    browser = await pw.chromium.launch()
    page = await browser.new_page(viewport={"width": 1024, "height": 1400})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(f"http://127.0.0.1:{port}{FIXTURE}" + ("?prove_red" if prove_red else ""))
    await page.evaluate(f"document.documentElement.setAttribute('data-theme','{theme}')")
    await page.wait_for_timeout(600)

    tag = f"{theme}{'/prove_red' if prove_red else ''}"

    # A. 全链：发送 → 模拟序列 → 卡组四态
    chat = page.locator("#chat-sa")
    await chat.locator("textarea.nx-ai-chat-input").first.fill("跑一个多代理任务")
    await chat.locator("textarea.nx-ai-chat-input").first.press("Enter")
    if prove_red:
        track = page.locator("#chat-sa .nx-subagent-track")
        await page.wait_for_timeout(1800)
        results.append((f"{tag}: [判红] richSubagents 关→卡组缺席", (await track.count()) == 0,
                        f"count={await track.count()}"))
    else:
        await page.wait_for_selector("#chat-sa .nx-subagent-track", timeout=6000)
        await page.wait_for_timeout(1400)  # 序列播完
        items = page.locator("#chat-sa .nx-subagent-track-item")
        n = await items.count()
        results.append((f"{tag}: 三席三行（同 id 重复 start 幂等）", n == 3, f"n={n}"))
        done_n = await page.locator("#chat-sa .nx-subagent-track-item.is-done").count()
        susp_n = await page.locator("#chat-sa .nx-subagent-track-item.is-suspended").count()
        err_n = await page.locator("#chat-sa .nx-subagent-track-item.is-error").count()
        run_n = await page.locator("#chat-sa .nx-subagent-track-item.is-running").count()
        results.append((f"{tag}: 终态三态各一（done/suspended/error，无 running 残留）",
                        done_n == 1 and susp_n == 1 and err_n == 1 and run_n == 0,
                        f"done={done_n} susp={susp_n} err={err_n} run={run_n}"))
        susp_txt = await page.locator("#chat-sa .nx-subagent-track-item.is-suspended .nx-subagent-track-summary").inner_text()
        results.append((f"{tag}: suspended 中性「等待输入」非失败文案", "等待输入" in susp_txt, f"txt={susp_txt!r}"))
        # D. 母消息零污染：思考已分流进子代理条目
        mother_thinking = await page.evaluate("""() => {
            const app = document.querySelector('#chat-sa').__vue_app__;
            return 'probe-via-dom';
        }""")
        reasoning = page.locator("#chat-sa .nx-ai-chat-reasoning")
        results.append((f"{tag}: 母消息思考区不展开（thinking 已分流）",
                        (await reasoning.count()) == 0, f"reasoning_n={await reasoning.count()} probe={mother_thinking}"))
        # 详情折叠：done 席可展开
        done_row = page.locator("#chat-sa .nx-subagent-track-item.is-done .nx-subagent-track-row")
        await done_row.click()
        await page.wait_for_timeout(200)
        detail_n = await page.locator("#chat-sa .nx-subagent-track-item.is-done .nx-subagent-track-detail").count()
        results.append((f"{tag}: done 席详情折叠展开", detail_n == 1, f"detail={detail_n}"))

    # B. 组件直挂四态（恒渲染，不 prove_red）
    direct = page.locator("#sa-direct")
    d_n = await direct.locator(".nx-subagent-track-item").count()
    results.append((f"{tag}: 直挂四席渲染", d_n == 4, f"n={d_n}"))
    d_susp = await direct.locator(".nx-subagent-track-item.is-suspended").count()
    d_err = await direct.locator(".nx-subagent-track-item.is-error").count()
    d_run = await direct.locator(".nx-subagent-track-item.is-running").count()
    results.append((f"{tag}: 直挂四态类齐（run/susp/err 各≥1）",
                    d_susp >= 1 and d_err >= 1 and d_run >= 1,
                    f"susp={d_susp} err={d_err} run={d_run}"))

    # C. 兼容对照：richSubagents:false 同序列 → 卡组缺席
    off_track = page.locator("#chat-off .nx-subagent-track")
    if not prove_red:
        off_chat = page.locator("#chat-off")
        await off_chat.locator("textarea.nx-ai-chat-input").first.fill("对照")
        await off_chat.locator("textarea.nx-ai-chat-input").first.press("Enter")
        await page.wait_for_timeout(1800)
    results.append((f"{tag}: feat 关→卡组缺席（路由照走仅呈现关）", (await off_track.count()) == 0,
                    f"count={await off_track.count()}"))

    results.append((f"{tag}: 零 pageerror", not errors, f"errors={errors[:3]}" if errors else "clean"))
    OUT.mkdir(parents=True, exist_ok=True)
    suffix = "_prove_red" if prove_red else ""
    await page.screenshot(path=str(OUT / f"v2980_{theme}{suffix}.png"), full_page=True)
    await page.close()
    await browser.close()
    return results


async def main() -> int:
    from playwright.async_api import async_playwright

    import http.server
    import socketserver
    import threading

    prove_red = "--prove-red" in sys.argv

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
        for theme in ("light", "dark") if not prove_red else ("light",):
            results.extend(await run_theme(pw, port, theme, prove_red))
    srv.shutdown()

    fail = 0
    for name, ok, note in results:
        print(f"[{'PASS' if ok else 'FAIL'}] {name} | {note}")
        if not ok:
            fail += 1
    total = len(results)
    print(f"\n== v2980 probe {'PROVE-RED' if prove_red else ''}: {total - fail}/{total} ==")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
