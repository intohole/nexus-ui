#!/usr/bin/env python3
"""同步前端静态资源的 h= 内容指纹（md5 前 10 位），防止浏览器/CDN 命中旧缓存。

HTML 引用: src/href 中带 h= 的本地资源 -> 按文件内容重算指纹
CSS 引用: @import 的本地样式 -> 缺失则补 h=，陈旧则重算

用法:
    python3 nexus-ui/sync_asset_hash.py --check [路径]   # 只检查(默认)，有陈旧指纹退出码 1
    python3 nexus-ui/sync_asset_hash.py --fix   [路径]   # 修复陈旧指纹
    python3 nexus-ui/sync_asset_hash.py --fix promptGenius
"""
import hashlib
import json
import os
import re
import sys

HTML_REF_RE = re.compile(r'(?P<attr>src|href)="(?P<url>[^"]+)"')
CSS_IMPORT_RE = re.compile(r'@import\s+(?:url\(\s*)?["\'](?P<url>[^"\']+)["\']')
HASH_IN_QUERY_RE = re.compile(r'(?P<prefix>[?&])h=(?P<hash>[0-9a-zA-Z]+)')
HASH_VALUE_RE = re.compile(r'h=[0-9a-zA-Z]+')
VERSION_PARAM_RE = re.compile(r'[?&][a-z_]+=')
HTML_TARGET_RE = re.compile(r'\.html?$', re.I)
SKIP_DIRS = (".git", "node_modules", "vendor", "__pycache__", "dist", ".venv", "venv", "logs", "data")
SKIP_URL_PREFIX = ("http://", "https://", "//", "data:", "#", "mailto:")


def load_ignore(root: str) -> tuple:
    try:
        with open(os.path.join(root, "nexus-ui", "deps.json"), encoding="utf-8") as f:
            data = json.load(f)
        return tuple(os.path.normpath(os.path.join(root, p)).lower() for p in data.get("ignore_paths", []))
    except Exception:
        return ()


def file_hash(path: str) -> str:
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:10]


def resolve(base_dir: str, url: str) -> str:
    clean = url.split("?")[0].split("#")[0]
    if not clean:
        return ""
    direct = os.path.normpath(os.path.join(base_dir, clean))
    if os.path.isfile(direct):
        return direct
    parts = [p for p in clean.split("/") if p not in ("", ".", "..")]
    for i in range(len(parts)):
        target = os.path.normpath(os.path.join(base_dir, *parts[i:]))
        if os.path.isfile(target):
            return target
    return ""


def sync_html(path: str, base_dir: str, fix: bool, add: bool = False):
    content = open(path, encoding="utf-8").read()
    stale = []

    def repl(match: "re.Match[str]") -> str:
        url = match.group("url")
        if url.startswith(SKIP_URL_PREFIX) or HTML_TARGET_RE.search(url.split("?")[0]):
            return match.group(0)
        if "h=" not in url:
            if not add or VERSION_PARAM_RE.search(url):
                return match.group(0)
            target = resolve(base_dir, url)
            if not target or os.path.abspath(target) == os.path.abspath(path):
                return match.group(0)
            sep = "&" if "?" in url else "?"
            new_url = "%s%sh=%s" % (url, sep, file_hash(target))
            stale.append("%s: h=- -> h=%s" % (url.split("?")[0], file_hash(target)))
            return match.group(0).replace(url, new_url)
        target = resolve(base_dir, url)
        if not target or os.path.abspath(target) == os.path.abspath(path):
            return match.group(0)
        actual = file_hash(target)
        declared = HASH_IN_QUERY_RE.search(url)
        if declared and declared.group("hash") == actual:
            return match.group(0)
        stale.append("%s: h=%s -> h=%s" % (url.split("?")[0], declared.group("hash") if declared else "-", actual))
        new_url = HASH_VALUE_RE.sub("h=%s" % actual, url, count=1)
        return match.group(0).replace(url, new_url)

    updated = HTML_REF_RE.sub(repl, content)
    if stale and fix and updated != content:
        open(path, "w", encoding="utf-8").write(updated)
    return stale


def sync_css(path: str, base_dir: str, fix: bool):
    content = open(path, encoding="utf-8").read()
    stale = []

    def repl(match: "re.Match[str]") -> str:
        url = match.group("url")
        if url.startswith(SKIP_URL_PREFIX):
            return match.group(0)
        target = resolve(base_dir, url)
        if not target:
            return match.group(0)
        actual = file_hash(target)
        declared = HASH_IN_QUERY_RE.search(url)
        if declared:
            if declared.group("hash") == actual:
                return match.group(0)
            new_url = HASH_VALUE_RE.sub("h=%s" % actual, url, count=1)
        else:
            sep = "&" if "?" in url else "?"
            new_url = "%s%sh=%s" % (url, sep, actual)
        stale.append("%s: h=%s -> h=%s" % (url.split("?")[0], declared.group("hash") if declared else "-", actual))
        return match.group(0).replace(url, new_url)

    updated = CSS_IMPORT_RE.sub(repl, content)
    if stale and fix and updated != content:
        open(path, "w", encoding="utf-8").write(updated)
    return stale


def scan_once(target: str, root: str, ignore: tuple, fix: bool, add: bool = False):
    scanned, changed, issues = 0, 0, 0
    for dirpath, dirnames, filenames in os.walk(target):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if not fn.endswith((".html", ".css")):
                continue
            path = os.path.join(dirpath, fn)
            if path.lower().startswith(ignore):
                continue
            scanned += 1
            stale = sync_html(path, dirpath, fix, add) if fn.endswith(".html") else sync_css(path, dirpath, fix)
            if not stale:
                continue
            changed += 1
            issues += len(stale)
            print("[%s] %s" % ("已修复" if fix else "陈旧", os.path.relpath(path, root)))
            for s in stale:
                print("  " + s)
    return scanned, changed, issues


def main() -> int:
    args = [a for a in sys.argv[1:]]
    fix = "--fix" in args
    add = "--add" in args
    args = [a for a in args if a not in ("--fix", "--check", "--add")]
    default_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target = os.path.abspath(args[0]) if args else default_root
    root = default_root
    ignore = load_ignore(root)

    scanned, changed, issues, rounds = 0, 0, 0, 0
    while True:
        rounds += 1
        scanned, changed, issues = scan_once(target, root, ignore, fix, add)
        if not fix or not issues or rounds >= 3:
            break
    print("\n扫描完成: 文件 %d 个, 指纹异常文件 %d 个, 异常引用 %d 处%s" % (scanned, changed, issues, " (含 --add 注入)" if add else ""))
    if not fix and issues:
        print("执行 python3 nexus-ui/sync_asset_hash.py --fix 修复")
    return 1 if (issues and not fix) else 0


if __name__ == "__main__":
    sys.exit(main())