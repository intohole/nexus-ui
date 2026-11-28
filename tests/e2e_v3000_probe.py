#!/usr/bin/env python3
"""v3.0.0 AI 原语三件族运行态探针：nux-diff-review / nux-plan-card / nux-run-telemetry。

场景（亮暗双主题）：
  A plan-card 直挂：进度头 1/4+25%、running 1、error 1、折叠块文案在席
  B diff-review 直挂：双 hunk 渲染、+/- stats、逐块标记后整体决定 scope=hunk、decide-note 落地
  C run-telemetry 直挂：两次 run（r1 interrupted 1.2k tok + 2 工具 + 1 席；r2 error 2.5k）、汇总 tokens
  D widget 路由：plan/diff/telemetry 三型经 nux-ai-widgets 分发渲染 + plan item-click → open 动作

--prove-red：fixture 清空 routeWidgets → D 段三型渲染断言必须变红（判红力自证）
用法: python3 nexus-ui/tests/e2e_v3000_probe.py [--prove-red]
截图: nexus-ui/out/v3000/v3000_{theme}{_prove_red}.png
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_v3000_family.html"
OUT = REPO / "out" / "v3000"


async def run_theme(pw, port: str, theme: str, prove_red: bool) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []
    browser = await pw.chromium.launch()
    page = await browser.new_page(viewport={"width": 1024, "height": 1600})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(f"http://127.0.0.1:{port}{FIXTURE}" + ("?prove_red" if prove_red else ""))
    await page.evaluate(f"document.documentElement.setAttribute('data-theme','{theme}')")
    await page.wait_for_timeout(600)

    tag = f"{theme}{'/prove_red' if prove_red else ''}"

    # A. plan-card 直挂
    plan = page.locator("#plan-direct.nx-plan-card")
    results.append((f"{tag}: A plan-card 渲染", await plan.count() == 1, f"count={await plan.count()}"))
    if await plan.count():
        count_txt = await plan.locator(".nx-plan-card-count").inner_text()
        results.append((f"{tag}: A 进度头 1/4", count_txt.strip() == "1/4", f"count={count_txt!r}"))
        progress = await plan.get_attribute("data-progress")
        results.append((f"{tag}: A data-progress=25", progress == "25", f"got={progress}"))
        run_n = await plan.locator(".nx-plan-card-item.is-running").count()
        err_n = await plan.locator(".nx-plan-card-item.is-error").count()
        results.append((f"{tag}: A running/error 各一", run_n == 1 and err_n == 1, f"run={run_n} err={err_n}"))
        done_btn = await plan.locator(".nx-plan-card-done-btn").inner_text()
        results.append((f"{tag}: A 折叠块「已完成 1 项」", "已完成 1 项" in done_btn, f"btn={done_btn!r}"))

    # B. diff-review 直挂
    diff = page.locator("#diff-direct.nx-diff")
    results.append((f"{tag}: B diff-card 渲染", await diff.count() == 1, f"count={await diff.count()}"))
    if await diff.count():
        files = await diff.locator(".nx-diff-file").count()
        hunks = await diff.locator(".nx-diff-hunk").count()
        results.append((f"{tag}: B 一文件两 hunk", files == 1 and hunks == 2, f"files={files} hunks={hunks}"))
        adds = await diff.locator(".nx-diff-head .nx-diff-stats .is-add").inner_text()
        dels = await diff.locator(".nx-diff-head .nx-diff-stats .is-del").inner_text()
        results.append((f"{tag}: B 头部 stats +23/-1（hunk1 2 加 1 删 + hunk2 21 加）", adds == "+23" and dels == "-1", f"adds={adds!r} dels={dels!r}"))
        collapsed = await diff.locator(".nx-diff-body.is-collapsed").count()
        results.append((f"{tag}: B 长 hunk 折叠在席", collapsed == 1, f"collapsed={collapsed}"))
        await diff.locator(".nx-diff-hunk").first.locator(".nx-diff-hunk-btn.is-approve").click()
        marked = await diff.locator(".nx-diff-hunk.is-approve").count()
        results.append((f"{tag}: B 逐块标记 is-approve 落块", marked == 1, f"marked={marked}"))
        hint = await diff.locator(".nx-diff-foot-hint").inner_text()
        results.append((f"{tag}: B 计数提示 1/2", "1/2" in hint, f"hint={hint!r}"))
        await diff.locator(".nx-diff-btn.is-approve").click()
        note = await page.locator("#decide-note").inner_text()
        results.append((f"{tag}: B decide 事件 scope=hunk 只含标记块",
                        note.startswith("decide:approve:hunk:") and "(1)" in note and "foo.js(1)" in note,
                        f"note={note!r}"))

    # C. run-telemetry 直挂
    tel = page.locator("#tel-direct.nx-run-tel")
    results.append((f"{tag}: C telemetry 渲染", await tel.count() == 1, f"count={await tel.count()}"))
    if await tel.count():
        rows = await tel.locator(".nx-run-tel-item").count()
        results.append((f"{tag}: C 两 run 两行（user 消息不计）", rows == 2, f"rows={rows}"))
        err_n = await tel.locator(".nx-run-tel-item.is-error").count()
        stop_n = await tel.locator(".nx-run-tel-item.is-interrupted").count()
        results.append((f"{tag}: C r2=error + r1=interrupted", err_n == 1 and stop_n == 1, f"err={err_n} stop={stop_n}"))
        chips = await tel.locator(".nx-run-tel-chip").all_inner_texts()
        results.append((f"{tag}: C chips 1.2k tok/2 工具/1 席在席",
                        any("1.2k tok" in c for c in chips) and any("2 工具" in c for c in chips) and any("1 席" in c for c in chips),
                        f"chips={chips}"))
        summary = await tel.locator(".nx-run-tel-sum").inner_text()
        results.append((f"{tag}: C 汇总 2 次 · 3.7k tokens", "2 次" in summary and "3.7k" in summary, f"sum={summary!r}"))

    # D. widget 路由
    route = page.locator("#widgets-route")
    if prove_red:
        await page.wait_for_timeout(300)
        rendered = await route.locator(".nx-plan-card, .nx-diff, .nx-run-tel").count()
        results.append((f"{tag}: [判红] routeWidgets 空 → 三型全缺席", rendered == 0, f"rendered={rendered}"))
    else:
        n_plan = await route.locator(".nx-plan-card").count()
        n_diff = await route.locator(".nx-diff").count()
        n_tel = await route.locator(".nx-run-tel").count()
        results.append((f"{tag}: D 三型各渲染一", n_plan == 1 and n_diff == 1 and n_tel == 1,
                        f"plan={n_plan} diff={n_diff} tel={n_tel}"))
        await route.locator(".nx-plan-card-item").first.click()
        action = await page.locator("#action-note").inner_text()
        results.append((f"{tag}: D plan item-click → open 动作透传（interactive=true 首个活跃项 p1）",
                        action.startswith("action:plan:open:") and '"p1"' in action, f"action={action!r}"))

    if errors:
        results.append((f"{tag}: 零页面异常", False, f"errors={errors[:2]}"))
    else:
        results.append((f"{tag}: 零页面异常", True, "clean"))

    OUT.mkdir(parents=True, exist_ok=True)
    suffix = "_prove_red" if prove_red else ""
    await page.screenshot(path=str(OUT / f"v3000_{theme}{suffix}.png"), full_page=True)
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
    print(f"\n== v3000 probe {'PROVE-RED' if prove_red else ''}: {total - fail}/{total} ==")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
