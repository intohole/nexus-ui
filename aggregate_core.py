#!/usr/bin/env python3
"""全工作区把分散的核心 nexus-ui JS 引用折叠为单个 nexus-all.js 聚合包。

用法:
    python3 nexus-ui/aggregate_core.py [工作区根目录]

仅折叠 nexus-all.js 已包含的核心库；nux-* 组件与 composables 保持独立引用。
"""
import json
import os
import re
import sys

CORE = {
    "nexus-utils", "nexus-validators", "nexus-api-error", "nexus-api",
    "nexus-markdown", "nexus-chat", "nexus-store", "nexus-crud",
    "nexus-mobile", "user-center-sdk", "user-center-api",
}
_SKIP_DIRS = {".git", "node_modules", "vendor", "__pycache__", "data"}

TAG = re.compile(
    r'<script[^>]*\bsrc="(?P<url>[^"]*songguokr\.com/nexus-ui/v[\d.]+/js/(?P<name>[a-z0-9-]+)\.js)"[^>]*></script>'
)


def load_ignore(root: str) -> tuple:
    try:
        with open(os.path.join(root, "nexus-ui", "deps.json"), encoding="utf-8") as f:
            data = json.load(f)
        return tuple(os.path.normpath(os.path.join(root, p)).lower() for p in data.get("ignore_paths", []))
    except Exception:
        return ()


def process(path: str) -> int:
    with open(path, encoding="utf-8") as f:
        text = f.read()
    fixed = re.sub(r"(nexus-ui/v[\d.]+/)(nexus-all\.js)", r"\1js/\2", text)
    if fixed != text:
        text = fixed
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
    matches = [m for m in TAG.finditer(text)]
    core = [m for m in matches if m.group("name") in CORE]
    if len(core) < 2:
        return 0
    first = core[0]
    base = first.group("url")[: -len("/js/" + first.group("name") + ".js")]
    agg = f'<script src="{base}/js/nexus-all.js"></script>'
    new_text = text.replace(text[first.start():first.end()], agg, 1)
    for m in core[1:]:
        new_text = new_text.replace(text[m.start():m.end()], "", 1)
    if new_text == text:
        return 0
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_text)
    return len(core)


def main() -> int:
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ignore = load_ignore(root)
    changed = 0
    total = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in _SKIP_DIRS]
        if any(p in dirpath.lower() for p in ("/node_modules/", "/.git/", "/vendor/", "/data/")):
            continue
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(dirpath, fn)
            if path.lower().startswith(ignore):
                continue
            n = process(path)
            if n:
                changed += 1
                total += n
                print(f"[聚合] {os.path.relpath(path, root)} 折叠 {n} 个核心 JS")
    print(f"\n聚合完成: 变更文件 {changed} 个,折叠 {total} 处")
    return 0


if __name__ == "__main__":
    sys.exit(main())