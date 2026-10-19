#!/usr/bin/env python3
"""全工作区 nexus-ui 组件引用反向门禁（r114 立案）。

背景：2026-10-10 下架轮（d33d3d3）以「三形态甄别全零」下架 4 组件，实际
challengePlanet(8-22)/nexus-agent(9-06)/goldenFish(9-30)/WisePath 已在消费——
单向「组件→消费方」检查漏检了反向引用，生产静默断链 9 天。本门禁补反向两查：

  C1 脚本引用存在性：业务仓引用的 /nexus-ui/vX.Y.Z/js/... 文件必须在 nexus-ui 盘上存在
  C2 标签可解析性：业务代码里的 <nux-*> 标签必须能被现有机制解析
     （在 NexusComponents 注册表内，或在 nexus-all.js 内置集内，或页面显式加载了对应组件脚本）

用法:
    python3 nexus-ui/check_component_refs.py [工作区根目录] [--skip-c2]

退出码: 存在 fail 级命中时返回 1，否则 0。
"""
import argparse
import re
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent
NEXUS_UI = Path(__file__).resolve().parent

SCAN_SUFFIXES = (".html", ".js")
SKIP_DIRS = {
    ".git", ".venv", "venv", "node_modules", "vendor", "__pycache__", "dist",
    "build", "logs", "data", ".trae", ".trae-html-share-packages", "handoff",
    ".know", "drawio", "tests", "test", "e2e", ".mypy_cache", ".pytest_cache",
    "out", "v2.68.0", "v2.69.0", "v2.70.0", "v2.70.1", "v2.70.2", "v2.70.3",
    "v2.70.4", "v2.70.5", "v2.70.6", "v2.70.7",
}
SKIP_NAME_PARTS = ("e2e", ".min.", "audit", "verify_")
# miniDeploy 的 nexus-ui rsync 镜像 = 库本体非消费方
SKIP_PATH_PREFIXES = ("miniDeploy/static/nexus-ui",)
SCRIPT_REF_RE = re.compile(r"nexus-ui/v\d+\.\d+\.\d+/(js/[\w./-]+?\.(?:js|css))")
TAG_RE = re.compile(r"<(nux-[a-z0-9-]+)")


def iter_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in SCAN_SUFFIXES:
            continue
        rel = path.relative_to(root)
        parts = set(rel.parts)
        if parts & SKIP_DIRS:
            continue
        if any(p in rel.as_posix() for p in SKIP_PATH_PREFIXES):
            continue
        if any(seg in rel.as_posix() for seg in SKIP_NAME_PARTS):
            continue
        yield path, rel


def load_registry_tags() -> set:
    reg = NEXUS_UI / "js" / "nexus-components.js"
    if not reg.is_file():
        return set()
    return set(re.findall(r"'(nux-[a-z0-9-]+)':\s*'Nux", reg.read_text(encoding="utf-8")))


def load_builtin_tags() -> set:
    """nexus-all.js 内置组件（bundle FILES 内的 components/*.js 定义的全局件）。"""
    build = NEXUS_UI / "build_all.py"
    if not build.is_file():
        return set()
    text = build.read_text(encoding="utf-8")
    files_block = text.split("FILES: list[str] = [", 1)[1].split("]", 1)[0]
    tags = set()
    for src in re.findall(r'"(components/[\w./-]+\.js)"', files_block):
        f = NEXUS_UI / "js" / src
        if f.is_file():
            body = f.read_text(encoding="utf-8")
            for m in re.finditer(r"window\.(Nux[A-Za-z0-9]+)\s*=", body):
                cls = m.group(1)
                tag = "nux-" + re.sub(r"(?<!^)(?=[A-Z])", "-", cls[3:]).lower()
                tags.add(tag)
    return tags


def load_anchor_tags() -> set:
    """库内部 JS 以字符串引用的 nux-* 锚点（如 nux-footer 挂载点 nux-footer-placeholder）。"""
    anchors = set()
    for f in (NEXUS_UI / "js").rglob("*.js"):
        if f.name == "nexus-all.js":
            continue
        try:
            anchors.update(re.findall(r"['\"](nux-[a-z0-9-]+)['\"]", f.read_text(encoding="utf-8")))
        except (UnicodeDecodeError, OSError):
            continue
    return anchors


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?", default=str(WORKSPACE))
    ap.add_argument("--skip-c2", action="store_true", help="跳过标签可解析性检查（过渡期豁免）")
    args = ap.parse_args()
    root = Path(args.root).resolve()

    registry = load_registry_tags()
    builtin = load_builtin_tags()
    library_known = registry | builtin | load_anchor_tags()

    missing_scripts: dict[str, list[str]] = {}
    unknown_tags: dict[str, set[str]] = {}
    quoted_by_repo: dict[str, set] = {}
    scanned = 0
    for path, rel in iter_files(root):
        scanned += 1
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        repo = rel.parts[0]
        quoted_by_repo.setdefault(repo, set()).update(re.findall(r"['\"](nux-[a-z0-9-]+)['\"]", text))
        for m in SCRIPT_REF_RE.finditer(text):
            target = m.group(1)
            if not (NEXUS_UI / target).is_file():
                missing_scripts.setdefault(target, []).append(str(rel))
        if not args.skip_c2:
            page_scripts = set(SCRIPT_REF_RE.findall(text))
            for tag in set(TAG_RE.findall(text)):
                if tag in library_known:
                    continue
                if any(s.endswith(f"components/{tag}.js") for s in page_scripts):
                    continue
                unknown_tags.setdefault(tag, set()).add(str(rel))

    # 本仓局部注册/自定义的 nux-*（app.component('nux-x',...) 等字符串形态）视为可解析
    unknown_tags = {
        tag: pages for tag, pages in unknown_tags.items()
        if not any(tag in quoted_by_repo.get(p.split('/')[0], set()) for p in pages)
    }

    fail = False
    if missing_scripts:
        fail = True
        print("[C1][FAIL] 引用了 nexus-ui 盘上不存在的文件（下架/改名未同步消费方）：")
        for target, pages in sorted(missing_scripts.items()):
            print(f"  {target}  <- {', '.join(sorted(pages)[:4])}")
    if unknown_tags:
        fail = True
        print("[C2][FAIL] 页面使用了无法解析的 nux-* 标签（不在注册表/内置集，也未显式加载组件脚本）：")
        for tag, pages in sorted(unknown_tags.items()):
            print(f"  <{tag}>  <- {', '.join(sorted(pages)[:4])}")
    if not fail:
        print(f"check_component_refs: OK（{scanned} 文件扫描，C1/C2 零命中）")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
