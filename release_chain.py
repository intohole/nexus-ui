#!/usr/bin/env python3
"""nexus-ui 发版链一键化：脚本化+每步校验点+dry-run。

针对历史 P0 的校验点设计：
- r69 快照直出活动根 P0 → C1 双版本源一致（package.json vs deps.json）+ C4 快照完整性；
- r54 旧聚合包 P0 → C2 build 确定性（连续两次构建输出一致）；
- 教训#74 指纹停旧值 → C3 sync_asset_hash --check；
- 教训#22 版本 URL 200≠快照存在 → C5 当前版本引用必须有本地快照；
- 教训#31 CSS 腐蚀三版带病 → C6 check_duplication fail=0。

链序（--apply 实际执行本地步骤；rsync 分发永远只打印命令，留给夜轮）:
    bump(人工) → build_all → sync_asset_hash → publish_version → [rsync 打印]
    → sync_version → 外科提交(人工) → check_deps/check_duplication

用法:
    python3 nexus-ui/release_chain.py             # dry-run：只跑校验点+预演
    python3 nexus-ui/release_chain.py --apply     # 执行本地链（build/hash/publish）
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
WORKSPACE = REPO.parent
SKIP_DIRS = {".git", "node_modules", "vendor", "__pycache__", "dist", ".venv", "venv", "data", "logs", "out", "handoff", ".know", ".trae"}
SNAPSHOT_RE = re.compile(r"^v\d+(?:\.\d+)+$")
REF_RE = re.compile(r"nexus-ui/v(\d+(?:\.\d+)+)")


class Check:
    def __init__(self, cid: str, name: str) -> None:
        self.cid, self.name = cid, name
        self.ok: bool = False
        self.detail: str = ""

    def report(self) -> str:
        mark = "PASS" if self.ok else "FAIL"
        extra = f" — {self.detail}" if self.detail else ""
        return f"[{self.cid}] {mark} {self.name}{extra}"


def sh(cmd: list[str], cwd: Path) -> tuple[int, str]:
    proc = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, errors="replace")
    return proc.returncode, (proc.stdout + proc.stderr).strip()


def file_md5(p: Path) -> str:
    return hashlib.md5(p.read_bytes()).hexdigest()


def load_versions() -> tuple[str, str]:
    pkg = json.loads((REPO / "package.json").read_text(encoding="utf-8"))["version"]
    deps = json.loads((REPO / "deps.json").read_text(encoding="utf-8"))["deps"]["nexus-ui"]["version"]
    return str(pkg), str(deps)


def c1_version_sync() -> Check:
    c = Check("C1", "双版本源一致 package.json == deps.json")
    pkg, deps = load_versions()
    c.ok = pkg == deps
    c.detail = f"package.json={pkg} deps.json={deps}"
    return c


def c2_build_determinism() -> Check:
    c = Check("C2", "build_all 确定性（两次构建输出一致）")
    bundle = REPO / "js" / "nexus-all.js"
    if not bundle.exists():
        c.detail = "js/nexus-all.js 不存在，先跑一次 build_all"
        return c
    before = file_md5(bundle)
    code1, out1 = sh([sys.executable, "build_all.py"], REPO)
    mid = file_md5(bundle)
    code2, out2 = sh([sys.executable, "build_all.py"], REPO)
    after = file_md5(bundle)
    c.ok = code1 == 0 and code2 == 0 and mid == after
    c.detail = f"两次构建 md5 {'一致' if mid == after else '漂移'} ({mid[:8]}→{after[:8]})"
    if before != mid:
        c.detail = f"工作树聚合包过期（{before[:8]}→{mid[:8]}，构建已刷新）," + c.detail
    return c


def c3_asset_hash() -> Check:
    c = Check("C3", "sync_asset_hash --check 全工作区零陈旧指纹")
    code, out = sh([sys.executable, "sync_asset_hash.py", "--check"], REPO)
    c.ok = code == 0
    c.detail = "零陈旧" if code == 0 else (out.splitlines()[-1] if out else "非零退出")
    return c


def snapshot_key_files(version: str) -> list[str]:
    snap = REPO / f"v{version}"
    keys = ["package.json", "deps.json", "js/nexus-all.js", "index.html"]
    return [k for k in keys if not (snap / k).is_file()]


def c4_snapshot_integrity() -> Check:
    c = Check("C4", "快照存在且完整（publish_version --check + 关键文件）")
    _, version = load_versions()
    snap = REPO / f"v{version}"
    if not snap.is_dir():
        c.detail = f"v{version}/ 快照不存在（未发布或未 publish）"
        return c
    missing = snapshot_key_files(version)
    code, out = sh([sys.executable, "publish_version.py", "--check"], REPO)
    c.ok = code == 0 and not missing
    c.detail = f"v{version}/ {'完整' if not missing else '缺文件: ' + ','.join(missing)}; publish --check exit={code}"
    return c


def scan_refs() -> dict[str, list[str]]:
    hits: dict[str, list[str]] = {}
    for p in WORKSPACE.rglob("*"):
        if not p.is_file() or p.suffix not in (".html", ".js", ".md", ".json"):
            continue
        rel = p.relative_to(WORKSPACE)
        if rel.parts[0] in SKIP_DIRS or any(SNAPSHOT_RE.match(x) for x in rel.parts[:2]):
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for m in REF_RE.finditer(text):
            hits.setdefault(m.group(1), []).append(rel.as_posix())
    return hits


def c5_current_ref_snapshot() -> tuple[Check, list[str]]:
    c = Check("C5", "当前版本全工作区引用与本地快照匹配")
    _, version = load_versions()
    refs = scan_refs()
    cur = refs.get(version, [])
    has_snap = (REPO / f"v{version}").is_dir()
    other = sorted(set(refs) - {version})
    if not cur:
        c.ok = False
        c.detail = f"没有任何文件引用当前版本 v{version}（sync_version 未跑？）"
    elif not has_snap:
        c.ok = False
        c.detail = f"{len(cur)} 处引用 v{version} 但本地无快照（r69 形态：引用无快照版本）"
    else:
        c.ok = True
        c.detail = f"{len(cur)} 处引用 v{version}，快照在场"
    return c, other


def c6_external_gates() -> Check:
    c = Check("C6", "外部门禁 check_deps + check_duplication")
    code1, out1 = sh([sys.executable, "check_deps.py"], REPO)
    code2, out2 = sh([sys.executable, "check_duplication.py"], REPO)
    c.ok = code1 == 0 and code2 == 0
    c.detail = f"check_deps exit={code1}, check_duplication exit={code2}"
    return c


def plan_rsync() -> list[str]:
    _, version = load_versions()
    return [
        "rsync -av --delete nexus-ui/ <node>:~/workspace/nexus-ui/",
        f"ssh <node> 'mkdir -p ~/workspace/nexus-ui/v{version} && rsync -av --delete ~/workspace/nexus-ui/ ~/workspace/nexus-ui/v{version}/'",
        "（节点以 07 文档为准；本脚本永不执行 SSH/rsync，由夜轮收口）",
    ]


def run_apply() -> list[str]:
    steps: list[str] = []
    for name, cmd in [
        ("build_all", [sys.executable, "build_all.py"]),
        ("sync_asset_hash", [sys.executable, "sync_asset_hash.py", "--fix"]),
        ("publish_version", [sys.executable, "publish_version.py"]),
        ("sync_version", [sys.executable, "sync_version.py"]),
    ]:
        code, out = sh(cmd, REPO)
        steps.append(f"{name}: exit={code} {'ok' if code == 0 else out.splitlines()[-1] if out else 'FAILED'}")
    return steps


def main() -> int:
    parser = argparse.ArgumentParser(description="nexus-ui 发版链一键化（默认 dry-run）")
    parser.add_argument("--apply", action="store_true", help="执行本地链（build/hash/publish/sync_version）")
    args = parser.parse_args()

    print("=== nexus-ui 发版链（dry-run 预演）===" if not args.apply else "=== nexus-ui 发版链（apply 本地执行）===")
    if args.apply:
        for line in run_apply():
            print(f"  [apply] {line}")
    checks = [c1_version_sync(), c2_build_determinism(), c3_asset_hash(), c4_snapshot_integrity()]
    c5, other_refs = c5_current_ref_snapshot()
    checks.append(c5)
    checks.append(c6_external_gates())
    failed = 0
    for c in checks:
        print("  " + c.report())
        failed += 0 if c.ok else 1
    if other_refs:
        print(f"  [info] 工作区还引用历史版本 {', '.join(other_refs[:8])}{' …' if len(other_refs) > 8 else ''}（节点侧快照，非本地校验范围）")
    print("=== rsync 分发（只打印，禁自动执行）===")
    for line in plan_rsync():
        print(f"  {line}")
    print(f"=== 结论: {'全绿' if failed == 0 else f'{failed} 项 FAIL'} ===")
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
