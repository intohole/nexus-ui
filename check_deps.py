#!/usr/bin/env python3
"""检查全工作区公共库版本与 nexus-ui/deps.json 一致。

以 deps.json 的 cdn 模板为唯一事实来源，扫描所有 HTML 中公共库引用：
- 版本不一致 / 缺失 -> error(exit 1)
- 未纳管库 / 未锁定版本 / URL与规范不一致 -> warn(不拦截)

支持 CDN: registry.npmmirror.com(主), cdn.jsdmirror.com, cdn.jsdelivr.net,
cdn.bootcdn.net, cdnjs.cloudflare.com, cdn.staticfile.org, unpkg.com, cdn.tailwindcss.com

用法:
    python3 nexus-ui/check_deps.py [工作区根目录]
"""
import json
import os
import re
import sys

VERSION_RE = r"[0-9][0-9a-zA-Z.\-]*"
URL_RE = re.compile(r"https://[^\"' <>]+")
ALIASES = {"font-awesome": "@fortawesome/fontawesome-free"}
CDN_HOSTS = (
    "registry.npmmirror.com",
    "cdn.jsdmirror.com",
    "cdn.jsdelivr.net",
    "cdn.bootcdn.net",
    "cdnjs.cloudflare.com",
    "cdn.staticfile.org",
    "unpkg.com",
    "cdn.tailwindcss.com",
)

PKG_PATTERNS = [
    re.compile(r"^registry\.npmmirror\.com/((?:@[^/]+/)?[^/]+)/(%s)/" % VERSION_RE),
    re.compile(r"^(?:cdn\.jsdmirror\.com|cdn\.jsdelivr\.net)/npm/((?:@[^/]+/)?[^@/]+)(?:@(%s))?/" % VERSION_RE),
    re.compile(r"^(?:cdn\.bootcdn\.net|cdnjs\.cloudflare\.com)/ajax/libs/([^/]+)/(%s)/" % VERSION_RE),
    re.compile(r"^cdn\.staticfile\.org/([^/]+)/(%s)/" % VERSION_RE),
    re.compile(r"^unpkg\.com/((?:@[^/]+/)?[^@/]+)(?:@(%s))?/" % VERSION_RE),
]


def load_deps(root: str) -> dict:
    with open(os.path.join(root, "nexus-ui", "deps.json"), encoding="utf-8") as f:
        return json.load(f)


def build_index(deps: dict):
    pkg2dep = {}
    nx_version = None
    for name, spec in deps.items():
        if spec["pkg"]:
            pkg2dep[spec["pkg"]] = name
        if name == "nexus-ui":
            nx_version = spec["version"]
    return pkg2dep, nx_version


def parse_url(url: str):
    path = url[len("https://"):]
    for pat in PKG_PATTERNS:
        m = pat.match(path)
        if m:
            pkg = ALIASES.get(m.group(1), m.group(1))
            return pkg, m.group(2)
    if path.startswith("cdn.tailwindcss.com"):
        m = re.match(r"^cdn\.tailwindcss\.com/(%s)$" % VERSION_RE, path)
        return "tailwindcss", (m.group(1) if m else None)
    return None, None


def check_file_content(content: str, deps: dict, pkg2dep: dict, nx_version: str):
    problems = []
    warns = []
    reported = set()
    refs = {u.rstrip(",);\"'") for u in URL_RE.findall(content)}
    for u in refs:
        pkg, ver = parse_url(u)
        if pkg is None:
            continue
        name = pkg2dep.get(pkg)
        if name is None:
            warns.append("[未纳管] %s" % u)
            continue
        if ver is None:
            warns.append("[未锁版本] %s" % u)
            continue
        exp = deps[name]["version"]
        if ver != exp and (pkg, "ver") not in reported:
            problems.append("  %s: 引用 %s, 规范 %s" % (name, ver, exp))
            reported.add((pkg, "ver"))
        prefix = deps[name]["cdn"].replace("{version}", exp)
        if (prefix.endswith("/") and not u.startswith(prefix)) or (not prefix.endswith("/") and u != prefix):
            if (pkg, "url") not in reported:
                warns.append("[URL与规范不一致] %s" % u)
                reported.add((pkg, "url"))
    if nx_version:
        for ver in re.findall(r"nexus-ui/v([0-9.]+)/", content):
            if ver != nx_version:
                problems.append("  nexus-ui: 引用 v%s, 规范 v%s" % (ver, nx_version))
    return problems, warns


def main() -> int:
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data = load_deps(root)
    deps = data["deps"]
    pkg2dep, nx_version = build_index(deps)
    ignore = tuple(os.path.normpath(os.path.join(root, p)).lower() for p in data.get("ignore_paths", []))
    skip_dirs = (".git", "node_modules", "vendor", "__pycache__", "dist", ".venv", "venv")

    total, bad = 0, 0
    warns = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        if any(p in dirpath.lower() for p in ("/node_modules/", "/.git/", "/vendor/")):
            continue
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(dirpath, fn)
            if path.lower().startswith(ignore):
                continue
            rel = os.path.relpath(path, root)
            content = open(path, encoding="utf-8").read()
            if not any(h in content for h in CDN_HOSTS):
                continue
            problems, file_warns = check_file_content(content, deps, pkg2dep, nx_version)
            total += 1
            if problems:
                bad += 1
                print("[不一致] %s" % rel)
                for p in problems:
                    print(p)
            for w in file_warns:
                warns.append("%s (%s)" % (w, rel))

    for w in warns:
        print("[警告] %s" % w)
    print("\n扫描完成: 含 CDN 引用的 HTML %d 个,一致 %d 个,异常文件 %d 个" % (total, total - bad, bad))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
