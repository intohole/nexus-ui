#!/usr/bin/env python3
"""同步全工作区 HTML 中公共库 CDN 版本到 nexus-ui/deps.json 规范版本。

用法:
    python3 nexus-ui/sync_deps.py [工作区根目录]

先修改 deps.json 中的目标版本,再运行本脚本即可全量同步。
"""
import json
import os
import re
import sys


def load_deps(root: str) -> dict:
    with open(os.path.join(root, "nexus-ui", "deps.json"), encoding="utf-8") as f:
        return json.load(f)


def replacements_for_dep(name: str, expected: str) -> list:
    if name == "nexus-ui":
        return [("nexus-ui@v([0-9.]+)/", f"nexus-ui@v{expected}/")]
    return [(r"ajax/libs/%s/([0-9.]+)/" % re.escape(name), f"ajax/libs/{name}/{expected}/")]


def sync_file(path: str, deps: dict) -> int:
    with open(path, encoding="utf-8") as f:
        content = f.read()
    total = 0
    for name, spec in deps.items():
        expected = spec["version"]
        for pattern, repl in replacements_for_dep(name, expected):
            content, n = re.subn(pattern, repl, content)
            total += n
    if total:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
    return total


def main() -> int:
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data = load_deps(root)
    deps = data["deps"]
    ignore = data.get("ignore_paths", [])
    ignore_prefixes = tuple(os.path.normpath(os.path.join(root, p)).lower() for p in ignore)

    changed = 0
    total_repl = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules", "vendor", "__pycache__")]
        if any(p in dirpath.lower() for p in ("/node_modules/", "/.git/", "/vendor/")):
            continue
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(dirpath, fn)
            if path.lower().startswith(ignore_prefixes):
                continue
            n = sync_file(path, deps)
            if n:
                changed += 1
                total_repl += n
                print(f"[同步] {os.path.relpath(path, root)} (+{n})")
    print(f"\n同步完成: 变更文件 {changed} 个,替换 {total_repl} 处")
    return 0


if __name__ == "__main__":
    sys.exit(main())
