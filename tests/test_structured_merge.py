from __future__ import annotations

import http.server
import json
import threading
import time

import pytest
from playwright.sync_api import sync_playwright

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PORT = 18639

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}


class _SSEHandler(http.server.BaseHTTPRequestHandler):
    def _cors(self) -> None:
        for k, v in CORS.items():
            self.send_header(k, v)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self) -> None:
        if self.path == "/sse-ok":
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            chunks = [
                {"type": "structured_text", "content": "段0"},
                {"type": "structured_text", "content": "段1"},
                {"type": "structured_item", "item": {"type": "action", "name": "open", "params": {}}},
                {"type": "structured_done"},
            ]
            for chunk in chunks:
                time.sleep(0.05)
                self.wfile.write(f"data: {json.dumps(chunk)}\n\n".encode())
        elif self.path == "/sse-401":
            self.send_response(401)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"message": "token expired"}')
        elif self.path == "/sse-500":
            self.send_response(500)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"message": "server boom"}')
        elif self.path == "/sse-slow":
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            self.wfile.write(b'data: {"type": "structured_text", "content": "first"}\n\n')
            self.wfile.flush()
            time.sleep(3.0)
            self.wfile.write(b'data: {"type": "structured_done"}\n\n')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args: object) -> None:
        return


@pytest.fixture(scope="module")
def sse_server():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), _SSEHandler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield srv
    srv.shutdown()


def _run_controller(page, path: str, timeout: int, stop_after_ms: int | None = None) -> list[str]:
    return page.evaluate(
        """async ([path, timeout, stopAfterMs]) => {
            const out = [];
            const c = new NexusStructured.StructuredController({
                url: 'http://127.0.0.1:%d/' + path, body: {}, timeout: timeout,
                onText: (t) => out.push('text:' + t),
                onAction: (a) => out.push('action:' + JSON.stringify(a)),
                onDone: (n) => out.push('done:' + n),
                onError: (m) => out.push('error:' + m),
            });
            const p = c.start();
            if (stopAfterMs) { await new Promise(r => setTimeout(r, stopAfterMs)); c.stop(); }
            await p;
            return out;
        }""" % PORT,
        [path, timeout, stop_after_ms],
    )


@pytest.fixture(scope="module")
def structured_page(sse_server):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        js_all = (REPO_ROOT / "js" / "nexus-all.js").read_text()
        page.set_content(f"<script>{js_all}</script><body></body>")
        page.wait_for_function("() => window.NexusStructured && window.NexusStream", timeout=8000)
        yield page
        browser.close()


def test_stream_events_dispatch(structured_page):
    out = _run_controller(structured_page, "sse-ok", 5000)
    assert "text:段0" in out and "text:段1" in out
    assert any(x.startswith("action:") for x in out)
    assert any(x.startswith("done:") for x in out)


def test_unauthorized_human_message(structured_page):
    out = _run_controller(structured_page, "sse-401", 5000)
    assert "error:登录已过期，请重新登录" in out


def test_http_error_message_extracted(structured_page):
    out = _run_controller(structured_page, "sse-500", 5000)
    assert "error:server boom" in out


def test_idle_timeout_after_first_chunk(structured_page):
    out = _run_controller(structured_page, "sse-slow", 800)
    assert "text:first" in out
    assert any(x.startswith("error:") for x in out)


def test_user_stop_calls_done(structured_page):
    out = _run_controller(structured_page, "sse-slow", 5000, stop_after_ms=300)
    assert "text:first" in out
    assert any(x.startswith("done:") for x in out)
