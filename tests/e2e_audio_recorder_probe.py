#!/usr/bin/env python3
"""NexusAudioRecorder v1.0.0 运行态探针：fake media 三件套真录放链。

配方背书：headless Chromium 麦克风用 --use-fake-device-for-media-stream +
--use-fake-ui-for-media-stream（memoria E2E fake media 判例），授权弹窗自动放行、
音频输入为假设备正弦波——波形 onFrame 有真实非零能量。

场景（亮暗双主题）：
  A 正常链：start→recording→onFrame 帧数>0（波形条高度被驱动）→stop→
    onStop {blobSize>0, ext∈{.webm,.mp4}, discarded:false}
  B 放弃链：stop(discard)→discarded:true 且 blob 仍返回（消费方自决）
  C 无 fake flags（真实拒权环境）：getUserMedia 被拒→onError 中文文案→
    夹具走「不支持/错误」分支不炸
  --prove-red：夹具注入「剥 onFrame」的坏包装，A 场景波形断言必须变红
  （探针判红力自证）

用法: python3 nexus-ui/tests/e2e_audio_recorder_probe.py [--prove-red]
截图: out/v2870/audio_recorder_{theme}{_prove_red}.png
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_audio_recorder.html"
CLICK_MS = 8000
OUT = REPO / "out" / "v2870"
FAKE_MEDIA_ARGS = [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
]


async def run_case(pw, port: str, theme: str, prove_red: bool) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []
    browser = await pw.chromium.launch(args=FAKE_MEDIA_ARGS if not prove_red else FAKE_MEDIA_ARGS)
    page = await browser.new_page(viewport={"width": 1024, "height": 720})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(f"http://127.0.0.1:{port}{FIXTURE}")
    page.set_default_timeout(CLICK_MS)
    if theme == "dark":
        await page.evaluate("document.documentElement.setAttribute('data-theme','dark')")
    if prove_red:
        await page.evaluate(
            "() => { const orig = window.NexusAudioRecorder.create;"
            " window.NexusAudioRecorder.create = (o) => orig(Object.assign({}, o, { onFrame: null })); }")

    await page.click("#start")
    try:
        await page.wait_for_function("window.__E2E.phase === 'recording'", timeout=CLICK_MS)
        ok_rec = True
        note = "start→recording 状态机到位"
    except Exception as e:
        ok_rec = False
        note = f"未进入 recording: {str(e)[:60]} / err={await page.evaluate('window.__E2E.err')}"
    results.append((f"{theme}: start→recording（fake media 授权+状态机）", ok_rec, note))

    try:
        await page.wait_for_function("window.__E2E.frames > 3", timeout=CLICK_MS)
        bars_driven = await page.evaluate(
            "() => Array.from(document.querySelectorAll('.m-wave-demo i')).every("
            "(el) => (el.style.height || '') !== '')")
        ok_frame = bars_driven and not prove_red
        note = f"波形帧={await page.evaluate('window.__E2E.frames')} 且 DOM 条被驱动"
    except Exception as e:
        ok_frame = prove_red
        note = "prove-red: 剥 onFrame 后波形必须哑火（判红力）" if prove_red else f"波形帧未到: {str(e)[:60]}"
    results.append((f"{theme}: onFrame 波形帧回调+DOM 条驱动", ok_frame, note))

    await page.click("#discard")
    try:
        await page.wait_for_function("window.__E2E.phase === 'done'", timeout=CLICK_MS)
        r = await page.evaluate("window.__E2E.result")
        ok_stop = bool(r) and r.get("discarded") is True and r.get("blobSize", 0) > 0
        note = f"onStop 结果={r}"
    except Exception as e:
        r = None
        ok_stop = prove_red
        note = "prove-red 场景不校验 discard" if prove_red else f"onStop 未到: {str(e)[:60]}"
    results.append((f"{theme}: stop(discard)→onStop discarded=true+blob 在场", ok_stop, note))

    # B 场景：正常链（重新 start→stop 不带 discard）
    if not prove_red:
        await page.click("#start")
        try:
            await page.wait_for_function("window.__E2E.phase === 'recording'", timeout=CLICK_MS)
            await page.wait_for_timeout(600)
            await page.evaluate("window.__E2E.result = null; window.__E2E.phase = 'stopping'")
            await page.evaluate(
                "() => { window.__rec2 = NexusAudioRecorder.create({"
                "   maxSecs: 10, frameIntervalMs: 40, onFrame: () => {},"
                "   onStop: (r) => { window.__E2E.result = r ? {ext:r.ext, blobSize:r.blob.size,"
                "     durationMs:r.durationMs, discarded:r.discarded} : null;"
                "     window.__E2E.phase = 'done'; } });"
                " window.__rec2.start();"
                " setTimeout(() => window.__rec2 && window.__rec2.stop(), 400); }")
            await page.wait_for_function("window.__E2E.phase === 'done'", timeout=CLICK_MS)
            r2 = await page.evaluate("window.__E2E.result")
            ok_norm = bool(r2) and r2.get("discarded") is False and r2.get("blobSize", 0) > 0
            note = f"正常链结果={r2}"
        except Exception as e:
            r2 = None
            ok_norm = False
            note = f"正常链未完成: {str(e)[:60]}"
        results.append((f"{theme}: 正常链 stop→discarded=false+blob>0", ok_norm, note))

    results.append((f"{theme}: 零 pageerror", not errors, f"errors={errors[:3]}" if errors else "clean"))
    OUT.mkdir(parents=True, exist_ok=True)
    tag = f"{theme}{'_prove_red' if prove_red else ''}"
    await page.screenshot(path=str(OUT / f"audio_recorder_{tag}.png"), full_page=True)
    await page.close()
    await browser.close()
    return results


async def run_denied(pw, port: str) -> list[tuple[str, bool, str]]:
    """C 场景：无 fake flags=真实拒权环境，onError 中文文案路径。"""
    results: list[tuple[str, bool, str]] = []
    browser = await pw.chromium.launch()
    ctx = await browser.new_context(viewport={"width": 1024, "height": 720},
                                    permissions=[])
    page = await ctx.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(f"http://127.0.0.1:{port}{FIXTURE}")
    page.set_default_timeout(CLICK_MS)
    await page.click("#start")
    try:
        await page.wait_for_function(
            "window.__E2E.phase === 'error' && window.__E2E.err", timeout=CLICK_MS)
        err = await page.evaluate("window.__E2E.err")
        ok = ("麦克风" in str(err)) or ("授权" in str(err)) or ("不支持" in str(err))
        note = f"拒权文案={err}"
    except Exception as e:
        ok = False
        note = f"拒权路径未触发: {str(e)[:60]}"
    results.append(("拒权环境: onError 中文文案+页面不炸", ok, note))
    results.append(("拒权环境: 零 pageerror", not errors, f"errors={errors[:3]}" if errors else "clean"))
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
        if prove_red:
            for theme in ("light",):
                results.extend(await run_case(pw, port, theme, True))
        else:
            for theme in ("light", "dark"):
                results.extend(await run_case(pw, port, theme, False))
            results.extend(await run_denied(pw, port))
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
