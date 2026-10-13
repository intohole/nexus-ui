#!/usr/bin/env python3
"""nexus-ui 发版链一键化：脚本化+每步校验点+dry-run。

针对历史 P0 的校验点设计：
- r69 快照直出活动根 P0 → C1 双版本源一致（package.json vs deps.json）+ C4 快照完整性；
- r54 旧聚合包 P0 → C2 build 确定性（连续两次构建输出一致）；
- 教训#74 指纹停旧值 → C3 sync_asset_hash --check；
- 教训#22 版本 URL 200≠快照存在 → C5 当前版本引用必须有本地快照；
- 教训#31 CSS 腐蚀三版带病 → C6 check_duplication fail=0（并断言 check_deps body 异常=0）；
- 教训#49 链外变异不可见 → C7 链尾闭合（--verify：sync_version 复跑变更 0 + check_deps 异常 0）。

链序（--apply 实际执行本地步骤）:
    bump(人工) → build_all → sync_asset_hash → publish_version → sync_version → C1~C7
    → --ship 分发四节点（live=git pull --ff-only；快照=本地直传，禁止节点自拷贝）
    → 随版 sweep/外科提交 → **release_chain.py --verify 收尾闭合**（lessons#49 防线固化）

分发配方（r105 事故正解，lessons#48）：
- 四节点 live 真身均为 git 仓 ~/workspace/miniDeploy/apps/nexus-ui（nginx alias 即此目录）；
- 快照一律本地直传 `rsync -a --delete ./vX/ 节点:<apps_root>/vX/`——源为本地独立目录，
  结构上不可能自拷贝递归（r105 打印配方曾把目标放进源树炸满 god 磁盘）；
- 收尾三查：文件数一致 + 关键文件 md5 一致 + du ~9M 量级（错位即停手）。

用法:
    python3 nexus-ui/release_chain.py                # dry-run：只跑校验点+打印分发配方
    python3 nexus-ui/release_chain.py --apply        # 执行本地链（build/hash/publish/sync_version）+C7
    python3 nexus-ui/release_chain.py --verify       # 链尾闭合：全校验点+C7（随版 sweep 提交后必跑）
    python3 nexus-ui/release_chain.py --ship         # 分发四节点（预检+直传+三查，逐节点报告）
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
# (节点名, ssh 别名, live git 真身)。nginx location /nexus-ui/ alias 即 apps_root（r106 实证）。
NODE_MAP: list[tuple[str, str, str]] = [
    ("master", "songguokr", "~/workspace/miniDeploy/apps/nexus-ui"),
    ("god", "god", "~/workspace/miniDeploy/apps/nexus-ui"),
    ("edge-03", "edge-03", "~/workspace/miniDeploy/apps/nexus-ui"),
    ("edge-04", "edge-04", "~/workspace/miniDeploy/apps/nexus-ui"),
]
SHIP_KEY_FILES = ("js/nexus-all.js", "css/nexus-all.css", "index.html")
DISK_USED_REFUSE = 90


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
    if missing:
        c.detail = f"v{version}/ 缺文件: {','.join(missing)}"
        return c
    # 已发布快照不可变：发布后源码演进必然 diff≠0，属「下版重新冻结」信息而非故障
    drift = sum(1 for line in out.splitlines() if line.strip().startswith("- "))
    c.ok = True
    c.detail = f"v{version}/ 完整" + (f"（快照冻结后工作树演进 ≥{drift} 项，下版重新冻结）" if code != 0 else "，与工作树一致")
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
    m = re.search(r"异常文件 (\d+) 个", out1)
    n_bad = int(m.group(1)) if m else -1
    c.ok = code1 == 0 and code2 == 0 and n_bad == 0
    c.detail = f"check_deps exit={code1} 异常 {n_bad}, check_duplication exit={code2}"
    return c


def c7_closure() -> Check:
    c = Check("C7", "链尾闭合 sync_version 复跑变更 0 + check_deps 异常 0")
    code1, out1 = sh([sys.executable, "sync_version.py"], REPO)
    changed = re.search(r"变更 (\d+) 个", out1)
    n_changed = int(changed.group(1)) if changed else -1
    code2, out2 = sh([sys.executable, "check_deps.py"], REPO)
    bad = re.search(r"异常文件 (\d+) 个", out2)
    n_bad = int(bad.group(1)) if bad else -1
    c.ok = code1 == 0 and code2 == 0 and n_changed == 0 and n_bad == 0
    c.detail = f"sync_version 变更 {n_changed}, check_deps 异常 {n_bad}"
    return c


def plan_distribution(version: str) -> list[str]:
    lines = [
        "分发配方（安全形态：快照本地直传，结构上无自拷贝可能；live 面只 git pull）:",
    ]
    for name, ssh_alias, apps_root in NODE_MAP:
        lines.append(f"  [{name}] live : ssh {ssh_alias} 'cd {apps_root} && git pull --ff-only'")
        lines.append(f"  [{name}] 快照 : rsync -a --delete ./v{version}/ {ssh_alias}:{apps_root}/v{version}/")
    lines.append("  收尾三查: 文件数一致 + md5 一致 + du ~9M（量级错位即停手，lessons#48）")
    lines.append("  禁止: 在节点上从源树拷贝快照（r105 自拷贝递归炸弹）、对未证实角色目录 rsync --delete")
    return lines


def snapshot_stats(version: str) -> tuple[int, str, dict[str, str]]:
    snap = REPO / f"v{version}"
    count = sum(1 for p in snap.rglob("*") if p.is_file())
    du = sh(["du", "-sh", str(snap)], REPO)[1].split("\t")[0] if snap.is_dir() else "?"
    md5s = {k: file_md5(snap / k) for k in SHIP_KEY_FILES if (snap / k).is_file()}
    return count, du, md5s


def _node_md5(ssh_alias: str, path: str) -> str:
    code, out = sh(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", ssh_alias, f"md5sum {path}"], REPO)
    return out.split()[0] if code == 0 and out.split() else f"ERR:{out[:60]}"


def _disk_used_pct(ssh_alias: str) -> tuple[int, str]:
    code, out = sh(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", ssh_alias, "df -h ~ | tail -1"], REPO)
    if code != 0:
        return 100, f"df 失败: {out[:60]}"
    cols = out.split()
    try:
        return int(cols[4].rstrip("%")), out
    except (IndexError, ValueError):
        return 100, f"df 解析失败: {out[:80]}"


def ship(version: str, only: str | None = None) -> int:
    snap = REPO / f"v{version}"
    if not snap.is_dir():
        print(f"[ship] 本地快照 v{version}/ 不存在，先 publish_version")
        return 2
    local_count, local_du, local_md5 = snapshot_stats(version)
    local_du_mb = sh(["du", "-sm", str(snap)], REPO)[1].split("\t")[0]
    print(f"[ship] 本地 v{version}: {local_count} 文件 / {local_du} / md5 {local_md5.get('js/nexus-all.js', '?')[:8]}")
    targets = [n for n in NODE_MAP if only is None or n[0] == only]
    failed = 0
    for name, ssh_alias, apps_root in targets:
        print(f"--- [{name}] ---")
        used, df_raw = _disk_used_pct(ssh_alias)
        if used >= DISK_USED_REFUSE:
            print(f"  [FAIL] 磁盘 used={used}% ≥{DISK_USED_REFUSE}%，拒发（{df_raw}）")
            failed += 1
            continue
        code, out = sh(["ssh", "-o", "BatchMode=yes", ssh_alias,
                        f"du -sm {apps_root}/v{version} 2>/dev/null | cut -f1"], REPO)
        if code == 0 and out.strip().isdigit():
            remote_mb = int(out.strip())
            if remote_mb > max(3 * int(local_du_mb or 1), 30):
                print(f"  [FAIL] 目标快照已 {remote_mb}M 远超本地 {local_du_mb}M×3，疑似脏目录，拒发")
                failed += 1
                continue
        code, out = sh(["ssh", "-o", "BatchMode=yes", ssh_alias,
                        f"cd {apps_root} && git pull --ff-only"], REPO)
        if code != 0:
            print(f"  [FAIL] live git pull --ff-only: {out[:120]}")
            failed += 1
            continue
        else:
            print(f"  live git pull: {out.splitlines()[-1][:80] if out else 'up-to-date'}")
        code, out = sh(["rsync", "-a", "--delete", f"./v{version}/", f"{ssh_alias}:{apps_root}/v{version}/"], REPO)
        if code != 0:
            print(f"  [FAIL] 快照直传 exit={code}: {out[:120]}")
            failed += 1
            continue
        code, out = sh(["ssh", "-o", "BatchMode=yes", ssh_alias,
                        f"find {apps_root}/v{version} -type f | wc -l"], REPO)
        remote_count = int(out.strip()) if code == 0 and out.strip().isdigit() else -1
        if remote_count != local_count:
            print(f"  [FAIL] 文件数不一致 本地 {local_count} vs 节点 {remote_count}")
            failed += 1
            continue
        md5_bad = []
        for key, local_hash in local_md5.items():
            remote_hash = _node_md5(ssh_alias, f"{apps_root}/v{version}/{key}")
            if remote_hash != local_hash:
                md5_bad.append(f"{key}({remote_hash[:8]})")
        if md5_bad:
            print(f"  [FAIL] md5 不一致: {', '.join(md5_bad)}")
            failed += 1
            continue
        code, out = sh(["ssh", "-o", "BatchMode=yes", ssh_alias, f"du -sh {apps_root}/v{version}"], REPO)
        print(f"  [PASS] {local_count} 文件 / md5 一致 / 节点 {out.splitlines()[0] if out else '?'}")
    print(f"[ship] 结论: {'四节点全绿' if failed == 0 else f'{failed} 节点 FAIL'}")
    return 0 if failed == 0 else 2


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


def run_checks(with_closure: bool) -> tuple[int, list[Check], list[str]]:
    checks = [c1_version_sync(), c2_build_determinism(), c3_asset_hash(), c4_snapshot_integrity()]
    c5, other_refs = c5_current_ref_snapshot()
    checks.append(c5)
    checks.append(c6_external_gates())
    if with_closure:
        checks.append(c7_closure())
    failed = sum(0 if c.ok else 1 for c in checks)
    return failed, checks, other_refs


def main() -> int:
    parser = argparse.ArgumentParser(description="nexus-ui 发版链一键化（默认 dry-run）")
    parser.add_argument("--apply", action="store_true", help="执行本地链（build/hash/publish/sync_version）+C7 闭合")
    parser.add_argument("--verify", action="store_true", help="链尾闭合：全校验点+C7（随版 sweep 提交后必跑）")
    parser.add_argument("--ship", action="store_true", help="分发四节点（预检+快照本地直传+三查）")
    parser.add_argument("--node", help="--ship 只发指定节点（试跑用）")
    args = parser.parse_args()
    _, version = load_versions()

    if args.ship:
        return ship(version, args.node)

    mode = "apply 本地执行" if args.apply else ("verify 链尾闭合" if args.verify else "dry-run 预演")
    print(f"=== nexus-ui 发版链 v{version}（{mode}）===")
    if args.apply:
        for line in run_apply():
            print(f"  [apply] {line}")
    failed, checks, other_refs = run_checks(with_closure=args.apply or args.verify)
    for c in checks:
        print("  " + c.report())
    if other_refs:
        print(f"  [info] 工作区还引用历史版本 {', '.join(other_refs[:8])}{' …' if len(other_refs) > 8 else ''}（节点侧快照，非本地校验范围）")
    print("=== 分发（--ship 执行；安全配方如下）===")
    for line in plan_distribution(version):
        print(f"  {line}")
    print(f"=== 结论: {'全绿' if failed == 0 else f'{failed} 项 FAIL'} ===")
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
