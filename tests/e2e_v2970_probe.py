#!/usr/bin/env python3
"""v2.97.0 AI 交互原语族运行态探针：停止终态签名行+timeline current+select 富选项+chips 折叠。

场景（亮暗双主题）：
  A ai-chat 停止终态：流式中点停止 → 部分内容签名行（.nx-ai-chat-stopped-line）
    文案逐字（「已停止 · 以上是停止前已生成的部分」）+content 不被污染；
    B 对照 chat（stopNote:false）→ 旧占位「（已停止生成）」回退形态
  C timeline：is-current 高亮类在当前项+item 动作钮点切 current 迁移+空态 #empty 文本
  D select：freeText 原值显示+双语检索（输 'shorthair' 命中 desc）+rich 选项
    （desc 副行+tag 徽标+disabled 拒点）+键盘 Enter 首个非 disabled 选中
  E chips：maxVisible=3 折叠「还有 2 个」→展开→收起；stat 副文案在场；
    action 形态无 aria-pressed；remove 钮 keydown 不冒泡触 chip

--prove-red：fixture ?prove_red 关 stopNote → A 段签名行断言必须变红（判红力自证）
用法: python3 nexus-ui/tests/e2e_v2970_probe.py [--prove-red]
截图: nexus-ui/out/v2970/v2970_{theme}{_prove_red}.png
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_v2970_family.html"
OUT = REPO / "out" / "v2970"

NOTE_PARTIAL = "已停止 · 以上是停止前已生成的部分"
NOTE_EMPTY = "你已停止了这次提问"
NOTE_LEGACY = "（已停止生成）"


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

    # A. 停止终态签名行
    note_chat = page.locator("#chat-note")
    await note_chat.locator("textarea.nx-ai-chat-input").first.fill("讲个故事")
    await note_chat.locator("textarea.nx-ai-chat-input").first.press("Enter")
    await page.wait_for_selector("#chat-note .nx-ai-chat-stop", timeout=5000)
    await page.wait_for_timeout(350)  # 攒部分内容
    await note_chat.locator(".nx-ai-chat-stop").click()
    await page.wait_for_timeout(400)
    note_line = page.locator("#chat-note .nx-ai-chat-stopped-line")
    if prove_red:
        results.append((f"{tag}: [判红] stopNote 关→签名行缺席", (await note_line.count()) == 0,
                        f"count={await note_line.count()}"))
    else:
        line_txt = (await note_line.inner_text()) if note_line.count() else ""
        results.append((f"{tag}: 停止→部分内容签名行逐字", NOTE_PARTIAL in line_txt, f"line={line_txt!r}"))
        content = await page.evaluate(
            "() => { const b = document.querySelectorAll('#chat-note .nx-ai-chat-bubble'); return b[b.length-1].querySelector('.nx-ai-chat-content').textContent; }")
        results.append((f"{tag}: 停止内容不被占位污染", NOTE_LEGACY not in content and len(content) > 0,
                        f"content={content[:40]!r}"))
        stream_ended = await page.evaluate(
            "() => document.querySelectorAll('#chat-note .nx-ai-chat-stop').length")
        results.append((f"{tag}: 停止后发送钮回归（stopping 即时收口）", stream_ended == 0, f"stop 残留={stream_ended}"))

    # B. opt-out 对照
    legacy_chat = page.locator("#chat-legacy")
    await legacy_chat.locator("textarea.nx-ai-chat-input").first.fill("再讲一个")
    await legacy_chat.locator("textarea.nx-ai-chat-input").first.press("Enter")
    await page.wait_for_selector("#chat-legacy .nx-ai-chat-stop", timeout=5000)
    await page.wait_for_timeout(350)
    await legacy_chat.locator(".nx-ai-chat-stop").click()
    await page.wait_for_timeout(400)
    if not prove_red:
        legacy_txt = await page.locator("#chat-legacy .nx-ai-chat-bubble").last.inner_text()
        legacy_line_n = await page.locator("#chat-legacy .nx-ai-chat-stopped-line").count()
        results.append((f"{tag}: opt-out 部分停止=内容保留无签名（旧形态守恒）",
                        "这是一段用于停止演示" in legacy_txt and legacy_line_n == 0,
                        f"txt={legacy_txt[-60:]!r} line={legacy_line_n}"))

    # C. timeline current + 动作 + 空态
    cur = page.locator("#tl-main .nx-timeline-item.is-current")
    results.append((f"{tag}: timeline is-current 恰一项", (await cur.count()) == 1,
                    f"count={cur.count()}"))
    note = await cur.inner_text()
    results.append((f"{tag}: 当前项带动作插槽注记", "当前使用中" in note, f"note={note[:40]!r}"))
    restore_btn = page.locator("#tl-main .tl-restore").first
    await restore_btn.click()
    await page.wait_for_timeout(350)
    cur_after = await page.evaluate(
        "() => Array.from(document.querySelectorAll('#tl-main .nx-timeline-item')).map(i => i.classList.contains('is-current'))")
    results.append((f"{tag}: 切回后 current 迁移", cur_after == [True, False], f"states={cur_after}"))
    empty_txt = await page.locator("#tl-empty-text").inner_text()
    results.append((f"{tag}: #empty 空态文本", "还没有版本" in empty_txt, f"txt={empty_txt!r}"))

    # D. select 富选项
    sel = page.locator("#sel-rich")
    disp = await sel.locator("input.nux-select-input").input_value()
    results.append((f"{tag}: freeText 原值显示", disp == "田园猫", f"disp={disp!r}"))
    await sel.locator("input.nux-select-input").click()
    await page.wait_for_selector("#sel-rich .nux-select-dropdown", timeout=3000)
    rich = page.locator("#sel-rich .nux-select-option--rich")
    results.append((f"{tag}: 富选项渲染（desc+tag）", (await rich.count()) == 3 and
                    await rich.first.locator(".nux-select-option-desc").inner_text() == "Ragdoll" and
                    await rich.first.locator(".nux-select-option-tag").inner_text() == "4-6kg",
                    f"rich={rich.count()}"))
    disabled_opt = rich.nth(2)
    results.append((f"{tag}: disabled 选项 aria 感知", await disabled_opt.get_attribute("aria-disabled") == "true", "aria-disabled"))
    await disabled_opt.click(force=True)
    picked = await sel.locator("input.nux-select-input").input_value()
    results.append((f"{tag}: disabled 拒点", picked == "田园猫", f"picked={picked!r}"))
    await sel.locator("input.nux-select-input").fill("shorthair")
    await page.wait_for_timeout(200)
    filtered = page.locator("#sel-rich .nux-select-option--rich")
    results.append((f"{tag}: filterFields desc 双语检索（英文命中）", (await filtered.count()) == 1,
                    f"n={filtered.count()}"))
    await filtered.first.click()
    picked2 = await sel.locator("input.nux-select-input").input_value()
    results.append((f"{tag}: 选中回填 label", picked2 == "英国短毛猫", f"picked={picked2!r}"))

    # E. chips 折叠+action+remove keydown
    fold = page.locator("#chips-fold")
    fold_n = await fold.locator(".nux-chip").count()
    more_txt = await fold.locator(".nux-chip-more").inner_text()
    results.append((f"{tag}: maxVisible 裁渲染+还有 N 个（含已选口径）", fold_n == 3 and more_txt == "还有 2 个",
                    f"n={fold_n} more={more_txt!r}"))
    stat_n = await fold.locator(".nux-chip-stat").count()
    results.append((f"{tag}: stat 副文案在场", stat_n == 3, f"stats={stat_n}"))
    await fold.locator(".nux-chip-more").click()
    await page.wait_for_timeout(150)
    expanded_n = await fold.locator(".nux-chip").count()
    results.append((f"{tag}: 展开全量", expanded_n == 5, f"n={expanded_n}"))
    act = page.locator("#chips-action")
    aria_cnt = await act.locator(".nux-chip[aria-pressed]").count()
    results.append((f"{tag}: action 形态无 aria-pressed", aria_cnt == 0, f"aria={aria_cnt}"))
    await act.locator(".nux-chip").first.click()
    await page.wait_for_timeout(120)
    log1 = await page.locator(".picked-log").last.inner_text()
    await act.locator(".nux-chip").first.locator(".nux-chip-remove").click()
    await page.wait_for_timeout(120)
    log2 = await page.locator(".picked-log").last.inner_text()
    results.append((f"{tag}: action change 恒发被点值+remove 事件", "act:tsmc" in log1 and "rm:tsmc" in log2,
                    f"log1={log1!r} log2={log2!r}"))

    results.append((f"{tag}: 零 pageerror", not errors, f"errors={errors[:3]}" if errors else "clean"))
    OUT.mkdir(parents=True, exist_ok=True)
    suffix = "_prove_red" if prove_red else ""
    await page.screenshot(path=str(OUT / f"v2970_{theme}{suffix}.png"), full_page=True)
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
    print(f"\n== v2970 probe {'PROVE-RED' if prove_red else ''}: {total - fail}/{total} ==")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
