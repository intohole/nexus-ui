#!/usr/bin/env python3
"""NexusVitals v1.0.0 运行态探针：web-vitals 四指标采集+sendBeacon 上报+降级三态。

场景（headless Chromium 原生支持 PerformanceObserver 四族）：
  G API 面：version/supported/init/flush 四函数在位
  A init 返回态：supported 内核返回 'ok'+app/endpoint 采编
  B TTFB 真链：init 后 flush→上报请求捕获+metrics 含 TTFB 数值>0
  C sendBeacon 链：page.on('request') 捕获 /mock-vitals POST+载荷结构（app/session_id/metrics）
  D 降级链 1：覆盖 navigator.sendBeacon=undefined→flush 走 fetch keepalive 仍达
  E 采样率 0：sampleRate=0→flush 上报 metrics 为空（采样丢弃）
  F 弱内核降级：覆盖 PerformanceObserver=undefined→init 返回 'unsupported'+零 pageerror
  H 数值有界：value 超界（>60000ms）不入 buffer
  V pagehide flush：dispatchEvent pagehide→缓冲清空（已 flush 计数增加）
  --prove-red：init 后覆盖 flush 为 noop，C 断言必红（探针判红力自证）

用法: python3 nexus-ui/tests/e2e_vitals_probe.py [--prove-red]
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_vitals.html"
OUT = REPO / "out" / "s138"


async def run_case(pw, port: str, prove_red: bool) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []
    browser = await pw.chromium.launch()
    page = await browser.new_page(viewport={"width": 1024, "height": 720})
    errors: list[str] = []
    requests: list[dict] = []

    async def _capture(route):
        req = route.request
        requests.append({"url": req.url, "method": req.method, "post": (req.post_data or "")[:400]})
        await route.fulfill(status=200, content_type="application/json", body='{"accepted": 1}')

    await page.route("**/mock-vitals*", _capture)
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(f"http://127.0.0.1:{port}{FIXTURE}")
    page.set_default_timeout(6000)

    if prove_red:
        await page.evaluate("() => { window.NexusVitals.flush = () => 0; }")

    async def check(name: str, expr: str) -> None:
        try:
            val = await page.evaluate(expr)
            ok = bool(val.get("pass"))
            note = val.get("note", "")
        except Exception as e:
            ok, note = False, f"evaluate 异常: {str(e)[:80]}"
        results.append((name, ok, note))

    await check(
        "G API 面与 supported",
        """() => {
            const V = window.NexusVitals;
            if (!V) return { pass: false, note: '原语未挂载' };
            const okApi = V.version === '1.0.0' && typeof V.supported === 'function'
                && typeof V.init === 'function' && typeof V.flush === 'function';
            return { pass: okApi && V.supported() === true, note: `v=${V.version}` };
        }""",
    )

    await check(
        "A init 返回态",
        """() => {
            const r = window.__E2E.initResult;
            return { pass: r === 'ok', note: 'initResult=' + r };
        }""",
    )

    await page.evaluate("() => window.NexusVitals.flush()")
    await page.wait_for_timeout(400)
    vit = [r for r in requests if r]
    c_ok = bool(vit) and vit[0]["method"] == "POST"
    note = ""
    if c_ok:
        import json as _json
        try:
            body = _json.loads(vit[0]["post"])
            c_ok = body.get("app") == "fixture-app" and isinstance(body.get("session_id"), str) \
                and isinstance(body.get("metrics"), list) and len(body["metrics"]) > 0
            names = [m.get("name") for m in body["metrics"]]
            note = f"metrics={names}"
        except Exception as e:
            c_ok, note = False, f"载荷解析失败: {e}"
    else:
        note = "无 /mock-vitals 请求捕获"
    results.append(("C sendBeacon 链：上报请求+载荷结构", c_ok, note))

    await check(
        "B TTFB 真链数值",
        """() => {
            const b = window.NexusVitals.lastBody;
            if (!b) return { pass: false, note: '无最近载荷' };
            const t = (b.metrics || []).find(m => m.name === 'TTFB');
            return { pass: !!t && typeof t.value === 'number' && t.value > 0,
                     note: t ? 'TTFB=' + t.value.toFixed(1) : 'metrics 无 TTFB' };
        }""",
    )

    await check(
        "E 采样率 0 丢弃",
        """(async () => {
            const before = window.NexusVitals.stats().sent;
            window.NexusVitals.init({ app: 's0', endpoint: '/mock-vitals', sampleRate: 0 });
            window.NexusVitals._push('INP', 150);
            window.NexusVitals.flush();
            await new Promise(r => setTimeout(r, 250));
            const after = window.NexusVitals.stats().sent;
            return { pass: after === before, note: 'sent ' + before + '->' + after + '（采样丢弃零发出）' };
        })()""",
    )

    await check(
        "D 降级链 1：sendBeacon 不可用→fetch keepalive 仍达",
        """(async () => {
            window.NexusVitals.lastBody = null;
            const keep = navigator.sendBeacon;
            Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
            try {
                window.NexusVitals.init({ app: 'fallback', endpoint: '/mock-vitals' });
                window.NexusVitals.flush();
                await new Promise(r => setTimeout(r, 350));
            } finally { Object.defineProperty(navigator, 'sendBeacon', { value: keep, configurable: true }); }
            const b = window.NexusVitals.lastBody;
            return { pass: !!b && b.app === 'fallback', note: b ? 'app=' + b.app : 'fetch 降级未达' };
        })()""",
    )

    await check(
        "H 数值有界：超界值不入缓冲",
        """() => {
            const before = window.NexusVitals.stats().buffered;
            window.NexusVitals._push('INP', 999999);
            const after = window.NexusVitals.stats().buffered;
            return { pass: before === after, note: `buf ${before}->${after}` };
        }""",
    )

    await check(
        "V pagehide flush：卸载清缓冲",
        """(async () => {
            const sent0 = window.NexusVitals.stats().sent;
            window.NexusVitals.init({ app: 'hide', endpoint: '/mock-vitals' });
            window.NexusVitals._push('INP', 180);
            window.dispatchEvent(new Event('pagehide'));
            await new Promise(r => setTimeout(r, 300));
            const sent1 = window.NexusVitals.stats().sent;
            const bufLen = window.NexusVitals.stats().buffered;
            return { pass: sent1 > sent0 && bufLen === 0, note: `sent ${sent0}->${sent1} buf=${bufLen}` };
        })()""",
    )

    weak_errors: list[str] = []
    weak_page = await browser.new_page()
    weak_page.on("pageerror", lambda e: weak_errors.append(str(e)))
    await weak_page.goto(f"http://127.0.0.1:{port}{FIXTURE}")
    weak_result = await weak_page.evaluate(
        """() => {
            window.PerformanceObserver = undefined;
            const r = window.NexusVitals.init({ app: 'weak', endpoint: '/mock-vitals' });
            return r;
        }"""
    )
    results.append(("F 弱内核降级：unsupported+零 pageerror",
                    weak_result == "unsupported" and not weak_errors,
                    f"r={weak_result} err={len(weak_errors)}"))
    await weak_page.close()

    page_errors_ok = not errors
    results.append(("零 pageerror", page_errors_ok, "; ".join(errors)[:100] or "干净"))

    await page.screenshot(path=str(OUT / "vitals.png"))
    await browser.close()
    return results


async def main() -> int:
    import http.server
    import socketserver
    import threading

    OUT.mkdir(parents=True, exist_ok=True)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(REPO), **kwargs)

        def log_message(self, *args):
            pass

    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), Handler)
    srv.daemon_threads = True
    port = str(srv.server_address[1])
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    from playwright.async_api import async_playwright

    results: list[tuple[str, bool, str]] = []
    async with async_playwright() as pw:
        results.extend(await run_case(pw, port, prove_red="--prove-red" in sys.argv))
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
