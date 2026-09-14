#!/usr/bin/env python3
"""菜单入口组件一致性检查（跨项目）。

业务项目应把「用户中心 / 关于」做成一贯的菜单栏入口，而不是浮在页面上的按钮：

静态契约（入口 HTML）
  1. 不再引用 nux-float-user-center.js / nux-float-about.js；
  2. 引用 nux-menu-user.js / nux-menu-about.js；
  3. 使用 <nux-menu-user> / <nux-menu-about> 且带 label（保证有文字，不是只有一个字母）。

运行时表现（桌面 1280x800 + 移动 390x844）
  4. 不渲染浮动入口（.nux-uc-floating / body 直属的"关于我们"链接）；
  5. 无横向溢出；
  6. 组件一旦渲染，文字标签必须非空。

说明：页面异常（pageerror）作为"注意"输出而不判失败。各项目真实接口返回结构与统一桩不同，
由桩数据引发的异常属于检查环境噪声，不应据此修改业务代码。

用法:
    python3 nexus-ui/check_menu_components.py <项目目录> [--entry static/index.html] [--app-name 应用名]
"""
import argparse
import http.server
import json
import mimetypes
import re
import sys
import threading
from pathlib import Path
from urllib.parse import urlparse

WORKSPACE = Path(__file__).resolve().parent.parent
NEXUS = WORKSPACE / "nexus-ui"
NEXUS_CDN_RE = re.compile(r"^/nexus-ui/v[0-9.]+/(.*)$")
VIEWPORTS = [(390, 844), (1280, 800)]
FORBIDDEN_SCRIPTS = ("nux-float-user-center.js", "nux-float-about.js")
REQUIRED_SCRIPTS = ("nux-menu-user.js", "nux-menu-about.js")
MENU_USER_TAG_RE = re.compile(r"<nux-menu-user\b[^>]*>")
MENU_ABOUT_TAG_RE = re.compile(r"<nux-menu-about\b[^>]*>")
LABEL_RE = re.compile(r":?label\s*=")

PROBE = """
() => {
  const text = (sel) => { const el = document.querySelector(sel); return el ? (el.textContent || '').trim() : null; };
  return {
    userEl: !!document.querySelector('.nux-menu-user'),
    aboutEl: !!document.querySelector('.nux-menu-about'),
    userText: text('.nux-menu-user'),
    aboutText: text('.nux-menu-about'),
    floatUserCenter: !!document.querySelector('.nux-uc-floating'),
    floatAbout: !!document.querySelector('body > a[aria-label="关于我们"]'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
}
"""


class _Handler(http.server.SimpleHTTPRequestHandler):
    root = ""
    entry_name = "index.html"

    def translate_path(self, path: str) -> str:
        clean = path.split("?", 1)[0].split("#", 1)[0]
        matched = NEXUS_CDN_RE.match(clean)
        if matched:
            return str(NEXUS / matched.group(1))
        root = Path(_Handler.root)
        if clean in ("/", ""):
            return str(root / _Handler.entry_name)
        rel = clean.lstrip("/")
        candidate = root / rel
        if candidate.is_file():
            return str(candidate)
        # 真实部署里 / 与 /static/ 指向同一目录，这里逐级剥离前缀回落，
        # 兼容 index.html 内 "static/xxx" 这类相对引用
        parts = rel.split("/")
        for i in range(1, len(parts)):
            fallback = root / "/".join(parts[i:])
            if fallback.is_file():
                return str(fallback)
        return str(candidate)

    def log_message(self, *args) -> None:
        pass


def start_server(serve_root: Path, entry_name: str) -> str:
    _Handler.root = str(serve_root)
    _Handler.entry_name = entry_name
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    host, port = server.server_address
    return f"http://{host}:{port}"


def _shell_surface(entry_path: Path) -> list[Path]:
    """入口 + 入口引用的本地 JS + 项目内所有本地 HTML（排除 vendor/node_modules）。

    菜单入口可能写在入口 HTML、外壳模板或外壳 JS 里（如 sidebar-app.js / templates/shell.html），
    因此静态契约必须覆盖整个"外壳表面"，而不是只看入口文件。
    """
    project = entry_path.parent
    while project.name in ("static", "frontend", "client", "assets") and project.parent != project:
        project = project.parent
    skip = {".git", "node_modules", "vendor", "__pycache__", "data", "logs", "dist", "build"}
    files: list[Path] = [entry_path]
    content = entry_path.read_text(encoding="utf-8", errors="ignore")
    for ref in re.findall(r'(?:src|href)\s*=\s*["\']([^"\']+)["\']', content):
        path = ref.split("?", 1)[0].split("#", 1)[0]
        if not path or path.startswith(("http://", "https://", "//", "data:", "#")):
            continue
        if not path.endswith(".js"):
            continue
        candidates = [
            entry_path.parent / path.lstrip("/"),
            project / path.lstrip("/"),
            entry_path.parent / Path(path).name,
        ]
        for cand in candidates:
            if cand.is_file():
                files.append(cand)
                break
    for path in project.rglob("*.html"):
        if any(part in skip for part in path.parts):
            continue
        files.append(path)
    seen: set[str] = set()
    unique: list[Path] = []
    for path in files:
        key = str(path.resolve())
        if key not in seen:
            seen.add(key)
            unique.append(path)
    return unique


def check_static(entry_path: Path) -> list[str]:
    surface = _shell_surface(entry_path)
    text = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in surface)
    rel = lambda path: path.relative_to(entry_path.parent).as_posix() if str(path).startswith(str(entry_path.parent)) else path.name
    failures: list[str] = []
    for name in FORBIDDEN_SCRIPTS:
        for path in surface:
            if name in path.read_text(encoding="utf-8", errors="ignore"):
                failures.append(f"{rel(path)} 仍引用浮动组件 {name}")
    for name in REQUIRED_SCRIPTS:
        if name not in text:
            failures.append(f"外壳未引用菜单组件 {name}")
    for tag_name, pattern in (("nux-menu-user", MENU_USER_TAG_RE), ("nux-menu-about", MENU_ABOUT_TAG_RE)):
        tags = pattern.findall(text)
        if not tags:
            failures.append(f"外壳未使用 <{tag_name}>")
            continue
        if not any(LABEL_RE.search(tag) for tag in tags):
            failures.append(f"<{tag_name}> 未设置 label（会退化成只有一个图标/字母，用户无法识别）")
    return failures


def check_runtime(entry_path: Path, app_name: str) -> tuple[list[str], list[str]]:
    from playwright.sync_api import sync_playwright

    base = start_server(entry_path.parent, entry_path.name)
    url = f"{base}/{entry_path.name}"
    failures: list[str] = []
    warnings: list[str] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for width, height in VIEWPORTS:
            page = browser.new_page(viewport={"width": width, "height": height})
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)[:160]))

            def api(route):
                # 静态资源路径本身也可能含 /api/（如 assets/js/api/*.js），
                # 这类脚本请求必须放行，否则被返回 JSON 会触发脚本语法错误（假失败）
                if urlparse(route.request.url).path.endswith((".js", ".css")):
                    route.continue_()
                    return
                if "/auth/config" in route.request.url:
                    body = json.dumps({"enabled": True, "base_url": f"{base}/uc-api", "app_key": "menu-check"})
                else:
                    body = json.dumps({"data": [], "success": True})
                route.fulfill(status=200, content_type="application/json", body=body)

            def cdn(route):
                local = NEXUS / NEXUS_CDN_RE.match(urlparse(route.request.url).path).group(1)
                if not local.is_file():
                    route.fulfill(status=404, body="not found")
                    return
                ctype = mimetypes.guess_type(str(local))[0] or "application/octet-stream"
                route.fulfill(status=200, content_type=ctype, body=local.read_bytes())

            page.route("**/api/**", api)
            page.route("https://songguokr.com/nexus-ui/**", cdn)
            page.route("**/uc-api/**", lambda r: r.fulfill(status=200, content_type="application/json",
                                                           body='{"success":true,"data":{"id":1,"username":"tester"}}'))
            page.route("**/notify/**", lambda r: r.fulfill(status=200, content_type="application/json", body='{"data":[]}'))
            page.add_init_script(
                "localStorage.setItem('uc_access_token','fake-token');"
                "localStorage.setItem('uc_refresh_token','fake-token');"
                "localStorage.setItem('uc_token_expires_at','99999999999999');"
            )
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_timeout(2500)
            probe = page.evaluate(PROBE)
            tag = f"{width}x{height}"

            if errors:
                warnings.append(f"[{tag}] 页面异常(多为桩数据导致，仅供参考): {errors[:2]}")
            if probe["floatUserCenter"] or probe["floatAbout"]:
                failures.append(f"[{tag}] 仍渲染浮动入口: floatUserCenter={probe['floatUserCenter']} floatAbout={probe['floatAbout']}")
            if probe["overflow"] > 1:
                failures.append(f"[{tag}] 横向溢出 {probe['overflow']}px")
            if probe["userEl"] and not (probe["userText"] or "").strip():
                failures.append(f"[{tag}] nux-menu-user 渲染但无文字标签")
            if probe["aboutEl"] and not (probe["aboutText"] or "").strip():
                failures.append(f"[{tag}] nux-menu-about 渲染但无文字标签")
            if app_name and (probe["userText"] or "").strip() == app_name:
                failures.append(f"[{tag}] 用户中心入口误显示应用名: {probe['userText']!r}")
            page.close()
        browser.close()
    return failures, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="菜单入口组件一致性检查")
    parser.add_argument("project", help="项目目录（相对工作区或绝对路径）")
    parser.add_argument("--entry", default="static/index.html", help="入口 HTML（相对项目目录）")
    parser.add_argument("--app-name", default="", help="应用展示名（可选，用于排除误用）")
    args = parser.parse_args()

    project = Path(args.project)
    if not project.is_absolute():
        project = (WORKSPACE / args.project).resolve()
    entry_path = project / args.entry
    if not entry_path.is_file():
        print(f"FAIL {project.name}\n  - 入口文件不存在: {entry_path}")
        return 1

    failures = check_static(entry_path)
    runtime_failures, warnings = check_runtime(entry_path, args.app_name)
    failures += runtime_failures
    for item in warnings:
        print(f"  注意 {project.name}: {item}")
    if failures:
        print(f"FAIL {project.name}")
        for item in failures:
            print("  -", item)
        return 1
    print(f"PASS {project.name} 菜单入口一致（无浮动入口、标签齐全、无溢出）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
