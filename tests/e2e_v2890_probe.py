#!/usr/bin/env python3
"""v2.89.0 对话面扩展族运行态探针：附件三通道+Interrupt 卡+task 终态+会话重命名。

场景（亮暗双主题）：
  A Interrupt 卡：approve 直发 action/reject/pause/rendered resolved 态/edit 两段式
    （点修改→输入→确认，emit 带 input）
  B ai-chat 附件：DataTransfer 注入文件（拖拽通道）→ 附件条渲染 → 上传状态机
    uploading→done → 发送带附件气泡渲染 → remove 通道；paste 通道经
    ClipboardEvent.files 注入
  C task-progress：done 态 ✓+全勾+无进度条；error 态 ✕+当前步红+detail 注脚
  D conversation-list staticItems：渲染 3 条+本地搜索过滤+行内改名 emit
  --prove-red：剥掉 interrupt-card 的 action emit，A 场景必须变红（判红力自证）

用法: python3 nexus-ui/tests/e2e_v2890_probe.py [--prove-red]
截图: out/v2890/v2890_{theme}{_prove_red}.png
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_v2890_family.html"
OUT = REPO / "out" / "v2890"


async def run_theme(pw, port: str, theme: str, prove_red: bool) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []
    browser = await pw.chromium.launch()
    page = await browser.new_page(viewport={"width": 1024, "height": 900})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(f"http://127.0.0.1:{port}{FIXTURE}")
    await page.evaluate(f"document.documentElement.setAttribute('data-theme','{theme}')")
    await page.wait_for_timeout(600)

    # 挂载检查
    mounted = await page.evaluate(
        "() => ({ it: document.querySelectorAll('.nc-it').length,"
        " chat: !!document.querySelector('.nx-ai-chat'),"
        " task: document.querySelectorAll('.nux-ai-task').length,"
        " conv: document.querySelectorAll('.nx-conv-list-item').length })")
    results.append((f"{theme}: 夹具四件挂载", mounted.get("it", 0) >= 3 and mounted.get("chat")
                    and mounted.get("task", 0) >= 2 and mounted.get("conv", 0) >= 3, f"counts={mounted}"))

    # A. Interrupt 卡交互
    await page.locator("#it-open .nc-it-btn.is-primary").first.click()
    log1 = await page.text_content("#it-log")
    results.append((f"{theme}: interrupt approve emit", log1 == "open:approve", f"log={log1}"))

    edit_btn = page.locator("#it-open .nc-it-btn", has_text="修改").first
    await edit_btn.click()
    await page.fill("#it-open .nc-it-edit textarea", "只读最近三天")
    await page.locator("#it-open .nc-it-btn", has_text="确认修改").first.click()
    log2 = await page.text_content("#it-log")
    results.append((f"{theme}: interrupt edit 两段式", log2 == "open:edit/只读最近三天", f"log={log2}"))

    resolved_cnt = await page.evaluate("() => document.querySelectorAll('.nc-it-resolved').length")
    results.append((f"{theme}: resolved 态渲染", resolved_cnt >= 1, f"resolved={resolved_cnt}"))

    if prove_red:
        # 判红力自证：挂一枚「剥 emit」的坏卡变体（emit 吞掉不透传），点击后
        # 好卡日志前进而坏卡日志恒空——证明探针的 click→log 链能抓 emit 断链。
        mounted = await page.evaluate(
            """() => {
                const BrokenCard = Object.assign({}, window.NuxInterruptCard, {
                    setup(props, ctx) {
                        return window.NuxInterruptCard.setup(props, Object.assign({}, ctx, { emit: function () {} }));
                    }
                });
                const host = document.createElement('div');
                host.id = 'app-broken';
                document.body.appendChild(host);
                Vue.createApp({
                    template: '<nux-interrupt-card id="it-broken" title="坏卡" body="emit 被吞" :actions="[\\'approve\\']"></nux-interrupt-card>'
                }).component('nux-interrupt-card', BrokenCard).mount('#app-broken');
                return !!document.querySelector('#it-broken .nc-it-btn');
            }""")
        results.append(("prove-red: 坏卡变体挂载", mounted, "setup 层吞 emit"))
        log_before = await page.text_content("#it-log")
        await page.locator("#it-broken .nc-it-btn.is-primary").first.click()
        log_after = await page.text_content("#it-log")
        results.append(("prove-red: 坏卡点击日志不前进（好卡对照此前已前进）",
                        log_after == log_before and log_before != "", f"log={log_after}"))
        # prove-red 只跑亮色一轮
        results.append((f"{theme}: 零 pageerror", not errors, f"errors={errors[:3]}" if errors else "clean"))
        OUT.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(OUT / f"v2890_{theme}_prove_red.png"), full_page=True)
        await page.close()
        await browser.close()
        return results

    # B. ai-chat 附件：DataTransfer 拖拽注入
    await page.evaluate(
        """() => {
            const wrap = document.querySelector('.nx-ai-chat-input-wrap');
            const dt = new DataTransfer();
            dt.items.add(new File([new Uint8Array(1024)], 'report.pdf', { type: 'application/pdf' }));
            dt.items.add(new File([new Uint8Array(512)], 'shot.png', { type: 'image/png' }));
            const ev = new DragEvent('drop', { bubbles: true, cancelable: true });
            Object.defineProperty(ev, 'dataTransfer', { value: dt });
            wrap.dispatchEvent(ev);
        }""")
    await page.wait_for_timeout(80)
    bar = await page.evaluate(
        "() => ({ chips: document.querySelectorAll('.nx-ai-chat-att-bar .nx-ai-chat-att').length,"
        " names: Array.from(document.querySelectorAll('.nx-ai-chat-att-bar .nx-ai-chat-att-name')).map(n => n.textContent) })")
    results.append((f"{theme}: 拖拽进附件条 2 件", bar.get("chips") == 2
                    and "report.pdf" in bar.get("names", []), f"bar={bar}"))

    uploading = await page.evaluate(
        "() => Array.from(document.querySelectorAll('.nx-ai-chat-att-state')).some(s => s.textContent.includes('上传中'))")
    results.append((f"{theme}: 上传态可见", uploading, "uploading 徽标"))

    await page.wait_for_timeout(300)
    done_cnt = await page.evaluate(
        "() => Array.from(document.querySelectorAll('.nx-ai-chat-att-bar .nx-ai-chat-att')).filter(a => !a.className.includes('is-uploading')).length")
    results.append((f"{theme}: 上传收口 done", done_cnt == 2, f"done={done_cnt}"))

    # 发送 → 用户气泡带附件
    await page.fill(".nx-ai-chat-input", "帮我看看这份报告")
    await page.keyboard.press("Enter")
    await page.wait_for_timeout(500)
    bubble_atts = await page.evaluate(
        "() => Array.from(document.querySelectorAll('.nx-ai-chat-msg')).filter(m => m.className.includes('nx-ai-chat-user'))"
        ".map(m => m.querySelectorAll('.nx-ai-chat-atts .nx-ai-chat-att').length)")
    results.append((f"{theme}: 发送后气泡带附件", bubble_atts and bubble_atts[-1] == 2, f"userAtts={bubble_atts}"))
    att_log = await page.evaluate("() => window.__fixture.attLog.value")
    results.append((f"{theme}: composer 附件条清空", await page.evaluate(
        "() => document.querySelectorAll('.nx-ai-chat-att-bar .nx-ai-chat-att').length") == 0, f"log={att_log}"))

    # paste 通道
    await page.evaluate(
        """() => {
            const ta = document.querySelector('.nx-ai-chat-input');
            const dt = new DataTransfer();
            dt.items.add(new File([new Uint8Array(64)], 'paste.txt', { type: 'text/plain' }));
            const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
            Object.defineProperty(ev, 'clipboardData', { value: dt });
            ta.dispatchEvent(ev);
        }""")
    await page.wait_for_timeout(80)
    paste_cnt = await page.evaluate(
        "() => document.querySelectorAll('.nx-ai-chat-att-bar .nx-ai-chat-att').length")
    results.append((f"{theme}: 粘贴进附件条", paste_cnt == 1, f"paste={paste_cnt}"))

    # C. task-progress 终态
    task_states = await page.evaluate(
        """() => Array.from(document.querySelectorAll('.nux-ai-task')).map(t => ({
             cls: t.className, marks: t.querySelectorAll('.nux-ai-task-mark').length,
             bars: t.querySelectorAll('.nux-ai-task-bar').length,
             doneStages: t.querySelectorAll('.nux-ai-task-stage.is-done').length,
             errStages: t.querySelectorAll('.nux-ai-task-stage.is-error').length,
             details: t.querySelectorAll('.nux-ai-task-stage-detail').length }))""")
    ok_done = task_states[0]["marks"] == 1 and task_states[0]["bars"] == 0 and task_states[0]["doneStages"] >= 2
    ok_err = task_states[1]["marks"] == 1 and task_states[1]["errStages"] == 1 and task_states[1]["details"] >= 1
    results.append((f"{theme}: task done 态(✓/无进度条/全勾)", ok_done, f"{task_states[0]}"))
    results.append((f"{theme}: task error 态(✕/红步/detail)", ok_err, f"{task_states[1]}"))

    # D. conversation-list staticItems + 重命名
    await page.fill(".nx-conv-list-search-input", "复盘")
    await page.wait_for_timeout(200)
    filtered = await page.evaluate(
        "() => Array.from(document.querySelectorAll('.nx-conv-list-item-title')).map(t => t.textContent)")
    results.append((f"{theme}: static 本地过滤", filtered == ["每晚复盘"], f"items={filtered}"))
    await page.fill(".nx-conv-list-search-input", "")
    await page.wait_for_timeout(150)
    await page.locator(".nx-conv-list-item-btn", has_text="改名").first.click()
    await page.fill(".nx-conv-list-rename-input", "睡前复盘")
    await page.keyboard.press("Enter")
    await page.wait_for_timeout(200)
    conv_log = await page.text_content("#conv-log")
    title_after = await page.evaluate(
        "() => Array.from(document.querySelectorAll('.nx-conv-list-item-title')).map(t => t.textContent)[0]")
    results.append((f"{theme}: 行内改名 emit+UI 刷新", conv_log == "renamed:c1/睡前复盘" and title_after == "睡前复盘",
                    f"log={conv_log} title={title_after}"))

    results.append((f"{theme}: 零 pageerror", not errors, f"errors={errors[:3]}" if errors else "clean"))
    OUT.mkdir(parents=True, exist_ok=True)
    # hover-only 面先 hover 再拍（前17 判例：静态截图判「按钮缺失」是伪雷）
    await page.locator(".nx-conv-list-item").last.hover()
    await page.wait_for_timeout(250)
    await page.screenshot(path=str(OUT / f"v2890_{theme}.png"), full_page=True)
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
    print(f"\n== {total - fail}/{total} PASS ==")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
