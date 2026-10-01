#!/usr/bin/env python3
"""版本快照发布器：把当前工作树冻结为仓库根的 v<version>/ 真实快照。

背景：nginx 对 /nexus-ui/vX.Y.Z/* 的 immutable(30天) 缓存以 URL 版本段为过期依据，
若版本 URL 背后的内容跟随仓库根漂移，已缓存旧内容的浏览器将拿到新旧混血资产，
个别截断/坏资产会被钉死 30 天不可自愈（portalHome 2026-10-01 apps 白屏事故）。
发布新版本后在本机（或部署节点）运行本脚本，快照落盘后 nginx 优先直出快照，
版本 URL 从此与仓库根演进解耦；未生成快照的旧版本自动回退旧的剥版本逻辑。

用法：
    python3 publish_version.py            # 为 package.json 的当前版本生成快照
    python3 publish_version.py --check    # 只校验已存在快照的完整性，不创建

规则：
    - 快照目录 = 仓库根/v<version>/，排除 .git、__pycache__、logs、已有 v* 快照
    - 幂等：快照已存在且内容一致 → no-op；内容不一致 → 非零退出（已发布版本禁改写）
      （补丁级纠错必须升版本号重发，这正是 immutable 语义的一部分）
"""
from __future__ import annotations

import argparse
import filecmp
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
EXCLUDE_DIRS = {".git", "__pycache__", "logs", "node_modules", "dist", ".venv", "venv", "data"}
SNAPSHOT_RE = re.compile(r"^v\d+(?:\.\d+)+$")
HASH_PARAM_RE = re.compile(r"(^|[&?])h=[0-9a-f]{10}(?=&|$)")


def tree_files(root: Path) -> dict[str, Path]:
    out: dict[str, Path] = {}
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(root)
        parts = rel.parts
        if any(part in EXCLUDE_DIRS or SNAPSHOT_RE.match(part) for part in parts):
            # 例外: js/data/ 是组件演示数据, 随 .gitignore 的 !js/data/ 语义保留
            if not (len(parts) >= 2 and parts[0] == "js" and parts[1] == "data"):
                continue
        if p.suffix == ".pyc":
            continue
        out[rel.as_posix()] = p
    return out


def fingerprint(files: dict[str, Path]) -> str:
    h = hashlib.sha256()
    for rel in sorted(files):
        h.update(rel.encode())
        h.update(hashlib.sha256(files[rel].read_bytes()).digest())
    return h.hexdigest()[:16]


def current_version() -> str:
    pkg = json.loads((REPO / "package.json").read_text(encoding="utf-8"))
    version = str(pkg.get("version", "")).strip()
    if not re.match(r"^\d+(?:\.\d+)+$", version):
        raise SystemExit(f"package.json version 非法: {version!r}")
    return version


def copy_tree(files: dict[str, Path], dest: Path) -> None:
    for rel, src in files.items():
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, target)


def diff_report(a: dict[str, Path], b_root: Path) -> list[str]:
    problems: list[str] = []
    b_files = tree_files(b_root)
    for rel in sorted(set(a) | set(b_files)):
        pa, pb = a.get(rel), b_root / rel
        if pa is None:
            problems.append(f"快照多出文件: {rel}")
        elif not pb.is_file():
            problems.append(f"快照缺文件: {rel}")
        elif not filecmp.cmp(pa, pb, shallow=False):
            problems.append(f"快照内容漂移: {rel}")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="只校验已存在快照，不创建")
    args = parser.parse_args()

    version = current_version()
    snap = REPO / f"v{version}"
    files = tree_files(REPO)

    if snap.is_dir():
        problems = diff_report(files, snap)
        if not problems:
            print(f"[publish_version] v{version} 快照已存在且与工作树一致，no-op ({len(files)} 文件)")
            return 0
        print(f"[publish_version] v{version} 快照与当前工作树不一致，已发布版本禁改写：", file=sys.stderr)
        for line in problems[:20]:
            print(f"  - {line}", file=sys.stderr)
        hint = "请升版本号(package.json)后重新发布，或删除快照目录后重跑(仅限确认无人引用时)。"
        print(f"  {hint}", file=sys.stderr)
        return 2

    if args.check:
        print(f"[publish_version] v{version} 快照不存在(将回退旧剥版本逻辑)")
        return 1

    copy_tree(files, snap)
    ok = not diff_report(files, snap)
    print(f"[publish_version] v{version} 快照已生成 ({len(files)} 文件, fp={fingerprint(files)})"
          + ("" if ok else "，但校验发现差异，请检查"))
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
