#!/usr/bin/env python3
"""统一全工作区 nexus-ui CDN 引用版本到 deps.json 事实源。

用法:
    python3 nexus-ui/sync_version.py [工作区根目录]

仅替换 nexus-ui/vX.Y.Z/ -> nexus-ui/v{spec}/；跳过 deps.json ignore_paths。
"""
import json
import os
import re
import sys

NX_RE = re.compile(r"(nexus-ui/v[0-9.]+/)")


def _load_spec(root: str) -> str:
    with open(os.path.join(root, "nexus-ui", "deps.json"), encoding="utf-8") as f:
        data = json.load(f)
    return str(data["deps"]["nexus-ui"]["version"])


def _load_ignore(root: str) -> tuple:
    try:
        with open(os.path.join(root, "nexus-ui", "deps.json"), encoding="utf-8") as f:
            data = json.load(f)
        return tuple(os.path.normpath(os.path.join(root, p)).lower() for p in data.get("ignore_paths", []))
    except Exception:
        return ()


def _fix_content(text: str, target: str) -> str:
    def _repl(m: "re.Match[str]") -> str:
        return f"nexus-ui/v{target}/"
    return NX_RE.sub(_repl, text)


def main() -> int:
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    target = _load_spec(root)
    ignore = _load_ignore(root)
    self_dir = os.path.normpath(os.path.join(root, "nexus-ui")).lower()
    skip_dirs = (".git", "node_modules", "vendor", "__pycache__", "dist", ".venv", "venv", "data", "logs")
    changed, total = 0, 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        if os.path.normpath(dirpath).lower() == self_dir:
            dirnames[:] = []
            continue
        for fn in filenames:
            if not (fn.endswith(".html") or fn.endswith(".js")):
                continue
            path = os.path.join(dirpath, fn)
            if path.lower().startswith(ignore):
                continue
            text = open(path, encoding="utf-8").read()
            if "nexus-ui/v" not in text:
                continue
            new_text = _fix_content(text, target)
            if new_text != text:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_text)
                changed += 1
                print("[同步] %s -> v%s" % (os.path.relpath(path, root), target))
            total += 1
    print(f"\n同步完成: 扫描 {total} 个文件, 变更 {changed} 个, 目标版本 v{target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())