#!/usr/bin/env python3
"""S57 弹层带制根修运行态探针（v2.85.0）：真实 click hit-test 断言三态层序。

教训背书：弹窗类断言用 inner_text/js_poll 是绕过 hit-test 的假绿通道——本探针一律
Playwright 真实 click（被覆盖层拦截即 TimeoutError=红）+ elementFromPoint 几何断言。

场景（亮暗双主题各跑一遍）：
  A 抽屉内 confirm（lyra 事故复现位）：confirm(9995) > drawer(999)，点确定必须 resolve
  B 应用持久覆盖层 z3000 在场：confirm 恒压应用覆盖层（S57 契约第一条）
  C toast(9100) 在 modal(9000) 之上且 confirm 最顶（防回归雷）
  --prove-red：注入旧带制 z200，A/B 必须变红（探针自证能抓真雷）；C 跳过（旧带制下
  toast 1100 本就高于 modal 200，该场景对旧带制不敏感，无判红力）

用法: python3 nexus-ui/tests/e2e_overlay_probe.py [--prove-red]
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_overlay_stack.html"
CLICK_MS = 5000


async def open_and_confirm(page, trigger: str, key: str) -> None:
    """点开 confirm 并真实点击确定；被覆盖层拦截时 click 抛 TimeoutError。"""
    await page.click(trigger, timeout=CLICK_MS)
    await page.wait_for_selector(".nux-confirm-overlay.is-in", state="visible")
    await page.click(".nux-confirm-overlay [data-role=confirm]", timeout=CLICK_MS)
    await page.wait_for_function(f"window.__E2E.{key} === true", timeout=3000)


async def cleanup_layers(page) -> None:
    """防御性清层：残留弹层/抽屉/应用覆盖层，保证场景间零状态泄漏（fe6 判例）。"""
    await page.evaluate(
        "() => {"
        " document.querySelectorAll('.nux-confirm-overlay').forEach(n => n.remove());"
        " const ov = document.querySelector('#app-overlay'); if (ov) ov.remove();"
        " const dr = document.querySelector('.nx-drawer'); if (dr) dr.remove();"
        " const do_ = document.querySelector('.nx-drawer-overlay'); if (do_) do_.remove();"
        " const tc = document.querySelector('.nux-toast-container'); if (tc) tc.remove();"
        "}"
    )


async def element_from_point(page, selector: str) -> bool:
    """几何断言：元素中心点的 top 层命中自身或后代（hit-test 真实判据）。"""
    return await page.evaluate(
        """(sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return !!hit && (hit === el || el.contains(hit));
        }""",
        selector,
    )


async def run_theme(pw, port: str, theme: str, prove_red: bool) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []
    browser = await pw.chromium.launch()
    page = await browser.new_page()
    await page.goto(f"http://127.0.0.1:{port}{FIXTURE}")
    page.set_default_timeout(CLICK_MS)
    if theme == "dark":
        await page.evaluate("document.documentElement.setAttribute('data-theme','dark')")
    if prove_red:
        # 复刻 v2.84 旧带制：confirm/modal 族被压回 z200（!important 压过 confirm 专档规则）
        await page.add_style_tag(content=".nx-modal-overlay{z-index:200 !important}")

    # A 抽屉内 confirm（nux-drawer 面板走内联 transform，开态锚=overlay 的 .open 类）
    try:
        await page.click("#btn-open-drawer", timeout=CLICK_MS)
        await page.wait_for_selector(".nx-drawer-overlay.open", state="visible")
        await page.click("#btn-drawer-confirm", timeout=CLICK_MS)
        await page.wait_for_selector(".nux-confirm-overlay.is-in", state="visible")
        # 等淡入动画落定（.nx-modal-overlay transition opacity .2s；判官第 2 轮教训：
        # state=visible 不等 opacity，中途截图=弹窗半透明灰化假象）
        await page.wait_for_function(
            "() => { const o = document.querySelector('.nux-confirm-overlay');"
            " return o && getComputedStyle(o).opacity === '1'; }", timeout=3000)
        shot = Path(f"/tmp/nexus_ui_overlay_{theme}{'_prove_red' if prove_red else ''}.png")
        await page.screenshot(path=str(shot))
        await page.click(".nux-confirm-overlay [data-role=confirm]", timeout=CLICK_MS)
        await page.wait_for_function("window.__E2E.drawerConfirmResolved === true", timeout=3000)
        ok = not prove_red
        note = "旧带制下应被拦截" if prove_red else "confirm(9995) > drawer(999)，真实 click 命中"
    except Exception:
        ok = prove_red
        note = "确认弹窗被盖死=hit-test 拦截（旧带制复现）" if prove_red else "抽屉内 confirm 不可点"
    results.append((f"{theme}: A 抽屉内 confirm 真实 click", ok, note))
    await cleanup_layers(page)

    # B 应用持久覆盖层 z3000 下 confirm（触发钮在覆盖层内部=真实应用形态）
    try:
        await page.click("#btn-toggle-app-overlay")
        await page.wait_for_selector("#app-overlay", state="visible")
        await open_and_confirm(page, "#btn-overlay-confirm", "pageConfirmResolved")
        ok = not prove_red
        note = "confirm 恒压应用覆盖层 z3000" if not prove_red else "旧带制下应被拦截"
    except Exception:
        ok = prove_red
        note = "被应用覆盖层压死=hit-test 拦截（旧带制复现）" if prove_red else "confirm 被应用覆盖层 z3000 压死"
    results.append((f"{theme}: B 应用覆盖层 z3000 下 confirm 可点", ok, note))
    await cleanup_layers(page)

    # C toast/modal/confirm 运行态带值落地（toast 容器 pointer-events:none，elementFromPoint
    # 穿透它；裸 modal(9000) 无独立入口，toast>modal 关系由 test_overlay_stack.mjs 数值断言覆盖。
    # 场景内可比的真三态：toast=9100 / confirm=9995 / confirm hit-test 最顶；toast 15s 防中途蒸发）
    if prove_red:
        results.append((f"{theme}: C toast/modal 层序", True, "prove-red 模式跳过（旧带制下无判红力）"))
    else:
        try:
            await page.click("#btn-toast")
            await page.wait_for_selector(".nux-toast-item", state="visible")
            await page.click("#btn-open-modal")
            await page.wait_for_selector(".nux-confirm-overlay.is-in", state="visible")
            zs = await page.evaluate(
                """() => ({
                    toast: parseInt(getComputedStyle(document.querySelector('.nux-toast-container')).zIndex, 10),
                    confirm: parseInt(getComputedStyle(document.querySelector('.nux-confirm-overlay')).zIndex, 10),
                })"""
            )
            confirm_top = await element_from_point(page, ".nux-confirm-overlay .nx-modal")
            ok = zs["toast"] == 9100 and zs["confirm"] == 9995 and zs["toast"] < zs["confirm"] and confirm_top
            note = f"toast z={zs['toast']}, confirm z={zs['confirm']}, confirm 最顶={confirm_top}"
        except Exception:
            ok = False
            note = "toast/modal 场景异常"
        results.append((f"{theme}: C toast(9100)/confirm(9995) 运行态带值+confirm 最顶", ok, note))
    await cleanup_layers(page)

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
