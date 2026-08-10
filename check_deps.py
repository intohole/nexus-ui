#!/usr/bin/env python3
"""检查全工作区公共库版本与 nexus-ui/deps.json 一致。

用法:
    python3 nexus-ui/check_deps.py [工作区根目录]

退出码:
    0 全部一致
    1 存在版本不一致或缺失
"""
import json
import os
import re
import sys


def load_deps(root: str) -> dict:
    with open(os.path.join(root, "nexus-ui", "deps.json"), encoding="utf-8") as f:
        return json.load(f)


def check_file(path: str, deps: dict, ignore_prefixes: tuple) -> list:
    with open(path, encoding="utf-8") as f:
        content = f.read()
    problems = []
    for name, spec in deps.items():
        expected = spec["version"]
        if name == "vue":
            pattern = r"ajax/libs/vue/([0-9.]+)/"
        else:
            pattern = r"ajax/libs/%s/([0-9.]+)/" % re.escape(name)
        for actual in re.findall(pattern, content):
            if actual != expected:
                problems.append(f"  {name}: 引用 {actual}, 规范 {expected}")
        if name == "nexus-ui":
            for actual in re.findall(r"nexus-ui@v([0-9.]+)/", content):
                if actual != expected:
                    problems.append(f"  nexus-ui: 引用 v{actual}, 规范 v{expected}")
    return problems


def main() -> int:
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        data = load_deps(root)
    except FileNotFoundError:
        print("未找到 nexus-ui/deps.json,请确认工作区根目录")
        return 1
    deps = data["deps"]
    ignore = data.get("ignore_paths", [])
    ignore_prefixes = tuple(os.path.normpath(os.path.join(root, p)).lower() for p in ignore)

    total = 0
    skipped = 0
    bad_files = 0
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
            content = open(path, encoding="utf-8").read()
            if "cdn.bootcdn.net" not in content and "nexus-ui" not in content:
                continue
            total += 1
            problems = check_file(path, deps, ignore_prefixes)
            if problems:
                bad_files += 1
                print(f"[不一致] {os.path.relpath(path, root)}")
                for p_ in problems:
                    print(p_)
            else:
                skipped += 1

    print(f"\n扫描完成: 引用公共库的 HTML {total} 个,一致 {skipped} 个,不一致文件 {bad_files} 个")
    return 1 if bad_files else 0


if __name__ == "__main__":
    sys.exit(main())