#!/usr/bin/env python3
"""NuxResultView inline-edit+instruct 双 variant 探针（s165 FE8 判例）。

场景：
  T1 组件挂载 table 形态（.nrv-table 在场）+默认只读（editable=false 点击无编辑态）
  T2 editable 开启→点击单元格进编辑态（input.nrv-edit-input + focus）
  T3 回车提交→emit('edit') 载荷 {kind,row,column,oldValue,newValue}
  T4 Esc 取消→编辑态退出+值不变+零 emit
  T5 readonly=true 守卫→点击不进编辑态
  T6 kv 形态字段级编辑→emit('edit') 载荷 {kind:'kv',key,...}
  T7 instruct 开启→常驻指令框在场（.nrv-instruct）
  T8 输入指令回车→emit('instruct') 载荷 {instruction,target}（锚定最后点击格）
  T9 空指令/纯空白提交→零 emit 守卫
  T10 busy=true→输入框 disabled 提交中态
  T11 零 pageerror
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURE = "/tests/e2e_result_view_edit.html"
OUT = REPO / "out" / "s165"


async def main() -> int:
    fixture = REPO / "tests" / "e2e_result_view_edit.html"
    fixture.write_text(
        """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>result-view edit</title>
<link rel="stylesheet" href="/css/nexus-all.css"></head>
<body style="padding:24px;font-family:system-ui">
<div id="app">
  <nux-result-view id="rv-default" :struct="tableStruct"></nux-result-view>
  <nux-result-view id="rv-edit" :struct="tableStruct" editable instruct :busy="busy"
      @edit="onEdit" @instruct="onInstruct"></nux-result-view>
  <nux-result-view id="rv-readonly" :struct="tableStruct" editable readonly></nux-result-view>
  <nux-result-view id="rv-kv" :struct="kvStruct" editable @edit="onEdit"></nux-result-view>
  <pre id="events">{{ eventsText }}</pre>
</div>
<script src="/vendor/vue.global.prod.js"></script>
<script src="/js/nexus-all.js"></script>
<script src="/js/components/nux-result-view.js"></script>
<script>
(function () {
    const app = Vue.createApp({ data() { return {
        busy: false,
        tableStruct: { kind: 'table', columns: ['answer', 'confidence'], rows: [{ answer: '旧答案', confidence: '80' }] },
        kvStruct: { kind: 'kv', pairs: [{ k: 'summary', v: '旧摘要' }] },
        events: []
    }; },
    computed: { eventsText() { return this.events.map(e => JSON.stringify(e)).join('\\n'); } },
    methods: {
        onEdit(p) { this.events.push({ type: 'edit', ...p }); },
        onInstruct(p) { this.events.push({ type: 'instruct', ...p }); }
    } });
    app.component('NuxResultView', window.NuxResultView);
    const vm = app.mount('#app');
    window.__setBusy = () => { vm.busy = true; };
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

        tbl = await pg.query_selector("#rv-default .nrv-table")
        results.append(("T1a 默认挂载 table 形态", tbl is not None, ""))
        if tbl:
            cell = await tbl.query_selector("tbody td")
            await cell.click()
            await pg.wait_for_timeout(150)
            inp = await pg.query_selector("#rv-default .nrv-edit-input")
            results.append(("T1b 默认只读（editable=false 点击无编辑态）", inp is None, ""))

        await pg.click("#rv-edit tbody tr:first-child td:first-child")
        await pg.wait_for_timeout(150)
        inp = await pg.query_selector("#rv-edit .nrv-edit-input")
        focused = False
        if inp:
            focused = await inp.evaluate("el => el === document.activeElement")
        results.append(("T2 editable 点击进编辑态+focus", inp is not None and focused, ""))
        if not inp:
            results.append(("T3 回车提交→edit 载荷完整", False, "编辑态未进入"))
            results.append(("T4 Esc 取消→退出+值不变+零 emit", False, "编辑态未进入"))

        if inp:
            await inp.fill("新答案")
            await inp.press("Enter")
            await pg.wait_for_timeout(200)
            ev = await pg.evaluate("() => document.querySelector('#events').textContent")
            ok = '"type":"edit"' in ev and '"kind":"table"' in ev and '"row":0' in ev and '"column":"answer"' in ev and '"oldValue":"旧答案"' in ev and '"newValue":"新答案"' in ev
            results.append(("T3 回车提交→edit 载荷完整", ok, ev[:160]))

        await pg.click("#rv-edit tbody tr:first-child td:nth-child(2)")
        await pg.wait_for_timeout(150)
        inp2 = await pg.query_selector("#rv-edit .nrv-edit-input")
        if inp2:
            await inp2.fill("不该生效")
            await inp2.press("Escape")
            await pg.wait_for_timeout(200)
            gone = await pg.query_selector("#rv-edit .nrv-edit-input")
            cell_txt = await pg.eval_on_selector("#rv-edit tbody td:nth-child(2)", "el => el.textContent")
            ev = await pg.evaluate("() => document.querySelector('#events').textContent")
            no_emit = '"不该生效"' not in ev
            results.append(("T4 Esc 取消→退出+值不变+零 emit", gone is None and "80" in (cell_txt or "") and no_emit, f"gone={gone is None} cell={cell_txt}"))

        ro = await pg.query_selector("#rv-readonly tbody td")
        await ro.click()
        await pg.wait_for_timeout(150)
        inp3 = await pg.query_selector("#rv-readonly .nrv-edit-input")
        results.append(("T5 readonly 守卫→无编辑态", inp3 is None, ""))

        await pg.click("#rv-kv .nrv-kv-val")
        await pg.wait_for_timeout(150)
        inp4 = await pg.query_selector("#rv-kv .nrv-edit-input")
        if inp4:
            await inp4.fill("新摘要")
            await inp4.press("Enter")
            await pg.wait_for_timeout(200)
            ev = await pg.evaluate("() => document.querySelector('#events').textContent")
            ok = '"kind":"kv"' in ev and '"key":"summary"' in ev and '"oldValue":"旧摘要"' in ev and '"newValue":"新摘要"' in ev
            results.append(("T6 kv 字段级编辑载荷", ok, ev[:160]))
        else:
            results.append(("T6 kv 字段级编辑载荷", False, "kv 编辑态未进入"))

        box = await pg.query_selector("#rv-edit .nrv-instruct")
        results.append(("T7 instruct 常驻指令框在场", box is not None, ""))
        if not box:
            results.append(("T7b 锚定提示在位（最后点击格）", False, "指令框不在场"))
            results.append(("T8 指令提交→instruct 载荷（含锚定 target）", False, "指令框不在场"))
            results.append(("T9 空白指令零 emit", False, "指令框不在场"))
            results.append(("T8b 清锚后 target=null（全文）", False, "指令框不在场"))
        if box:
            anchor = await pg.query_selector("#rv-edit .nrv-instruct-anchor")
            anchor_txt = await anchor.inner_text() if anchor else ""
            results.append(("T7b 锚定提示在位（最后点击格）", anchor is not None and "confidence" in anchor_txt, anchor_txt[:60]))
            await box.fill("语气再正式一点")
            await box.press("Enter")
            await pg.wait_for_timeout(200)
            ev = await pg.evaluate("() => document.querySelector('#events').textContent")
            ok = '"type":"instruct"' in ev and '"instruction":"语气再正式一点"' in ev and '"target"' in ev
            results.append(("T8 指令提交→instruct 载荷（含锚定 target）", ok, ev[:160]))

            await box.fill("   ")
            await box.press("Enter")
            await pg.wait_for_timeout(150)
            ev2 = await pg.evaluate("() => document.querySelector('#events').textContent")
            n_before = ev.count('"type":"instruct"')
            n_after = ev2.count('"type":"instruct"')
            results.append(("T9 空白指令零 emit", n_after == n_before, f"{n_before}->{n_after}"))

            await pg.evaluate("() => { const app=document.querySelector('#app').__vue_app__; }")
            await pg.click("#rv-edit .nrv-instruct-anchor-clear") if await pg.query_selector("#rv-edit .nrv-instruct-anchor-clear") else None
            await pg.wait_for_timeout(100)
            await pg.fill("#rv-edit .nrv-instruct", "全文精简")
            await pg.press("#rv-edit .nrv-instruct", "Enter")
            await pg.wait_for_timeout(200)
            ev3 = await pg.evaluate("() => document.querySelector('#events').textContent")
            ok3 = '"instruction":"全文精简"' in ev3 and '"target":null' in ev3
            results.append(("T8b 清锚后 target=null（全文）", ok3, ev3[-160:]))

        await pg.evaluate("() => { window.__setBusy && window.__setBusy(); }")
        await pg.wait_for_timeout(100)
        busy_el = await pg.query_selector("#rv-edit .nrv-instruct")
        disabled = await busy_el.get_attribute("disabled") if busy_el else None
        results.append(("T10 busy 提交中态 disabled", busy_el is not None and disabled is not None, f"disabled={disabled}"))

        results.append(("T11 零 pageerror", not errors, ";".join(errors)[:120]))

        await b.close()

    srv.shutdown()
    passed = sum(1 for _, ok, _ in results if ok)
    lines = [f"{'PASS' if ok else 'FAIL'} {name} {detail}".rstrip() for name, ok, detail in results]
    (OUT / "result_view_edit_probe.txt").write_text("\n".join(lines) + f"\n\n{passed}/{len(results)} passed\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"\n{passed}/{len(results)} passed")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
