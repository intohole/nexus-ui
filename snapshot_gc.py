#!/usr/bin/env python3
"""nexus-ui 节点快照保留策略：报告/回收（默认只报告）。

背景（r105 遗留#2）：每次发版向四节点 apps 真身直传一份 ~9M 不可变快照，
无保留策略则无限增长；nginx 对缺快照的钉版 URL 回退活动根（lessons#22），
因此只允许删除「近期钉版不可能引用」的老快照——保留最近 KEEP 版。

口径：
- 伺服根 = 各节点 ~/workspace/miniDeploy/apps/nexus-ui/v*/（nginx alias 即此目录，r106 实证）；
- 本地仓内 v*/ 为 gitignored 工件副本（.gitignore v[0-9]*/，r110 实测）：--apply --local 直接删除，无需提交；
  节点侧用 `command rm -rf`（lessons#48：节点 rm 多为 trash 别名，rm 只移位不释放）；
- 删除前回读全工作区钉版（check_deps 语义）：老版本若仍被引用则该版跳过不删；
- god/edge-03 的 ~/workspace/nexus-ui legacy rsync 根角色未实证，不在本工具范围内。

用法:
    python3 nexus-ui/snapshot_gc.py                       # 报告：本地+四节点快照清单与回收候选
    python3 nexus-ui/snapshot_gc.py --apply               # 执行节点侧回收（保留最近 3 版）
    python3 nexus-ui/snapshot_gc.py --apply --keep 3 --node edge-03
    python3 nexus-ui/snapshot_gc.py --apply --local       # 本地旧快照一并删除（gitignored 工件）
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
NODE_MAP: list[tuple[str, str, str]] = [
    ("master", "songguokr", "~/workspace/miniDeploy/apps/nexus-ui"),
    ("god", "god", "~/workspace/miniDeploy/apps/nexus-ui"),
    ("edge-03", "edge-03", "~/workspace/miniDeploy/apps/nexus-ui"),
    ("edge-04", "edge-04", "~/workspace/miniDeploy/apps/nexus-ui"),
]
VER_RE = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")


def sh(cmd: list[str], cwd: Path | None = None) -> tuple[int, str]:
    proc = subprocess.run(cmd, capture_output=True, text=True, errors="replace",
                          cwd=str(cwd) if cwd else None)
    return proc.returncode, (proc.stdout + proc.stderr).strip()


def vkey(name: str) -> tuple[int, int, int] | None:
    m = VER_RE.match(name)
    return (int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None


def list_snapshots(root: str, remote: str | None = None) -> list[str]:
    if remote:
        code, out = sh(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", remote,
                        f"ls -1 {root}/ 2>/dev/null"])
        if code != 0:
            return []
    else:
        p = Path(root)
        if not p.is_dir():
            return []
        out = "\n".join(x.name for x in p.iterdir())
    return sorted((n for n in out.splitlines() if vkey(n)), key=lambda n: vkey(n) or (0, 0, 0))


def referenced_versions() -> set[str]:
    """被工作区源码钉版引用的版本集合（这些版本不删）。"""
    refs: set[str] = set()
    for p in REPO.parent.rglob("*"):
        if not p.is_file() or p.suffix not in (".html", ".js", ".md", ".json", ".py"):
            continue
        rel = p.relative_to(REPO.parent)
        if rel.parts[0] in (".git", "node_modules", "handoff", "jinnang_archive"):
            continue
        if rel.parts[0] == "nexus-ui" and len(rel.parts) > 1 and (
            VER_RE.match(rel.parts[1]) or rel.parts[1] in ("tests", "out", "logs")
        ):
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        refs.update(re.findall(r"nexus-ui/v(\d+(?:\.\d+)+)", text))
    return refs


def gc_target(snapshots: list[str], keep: int, refs: set[str]) -> tuple[list[str], list[str]]:
    keep_set = set(snapshots[-keep:]) if keep else set()
    delete, spared = [], []
    for name in snapshots:
        if name in keep_set:
            continue
        (spared if name[1:] in refs else delete).append(name)
    return delete, spared


def main() -> int:
    ap = argparse.ArgumentParser(description="nexus-ui 节点快照保留策略（默认只报告）")
    ap.add_argument("--apply", action="store_true", help="执行节点侧删除")
    ap.add_argument("--local", action="store_true", help="附带本地旧快照删除（gitignored 工件，无需提交）")
    ap.add_argument("--keep", type=int, default=3)
    ap.add_argument("--node", help="只处理指定节点")
    args = ap.parse_args()
    refs = referenced_versions()
    print(f"工作区钉版引用版本: {sorted(refs) or '无'}（引用中的版本一律不删）")

    failed = 0
    local_snaps = list_snapshots(str(REPO))
    d, s = gc_target(local_snaps, args.keep, refs)
    print(f"\n[本地] {REPO.name}: {len(local_snaps)} 版, 保留 {local_snaps[-args.keep:]}, "
          f"回收候选 {len(d)} 个{', 引用中豁免 ' + ','.join(s) if s else ''}")
    if args.apply and args.local and d:
        import shutil
        for name in d:
            try:
                shutil.rmtree(REPO / name)
                print(f"  删除本地 {name}: ok")
            except OSError as e:
                print(f"  删除本地 {name}: {e}")
                failed += 1
        print("  （本地快照为 gitignored 工件，删除即终局，无需提交）")

    for name, ssh_alias, apps_root in NODE_MAP:
        if args.node and name != args.node:
            continue
        snaps = list_snapshots(apps_root, ssh_alias)
        if not snaps:
            print(f"\n[{name}] {apps_root}: 无快照或不可达，跳过")
            continue
        d, s = gc_target(snaps, args.keep, refs)
        du_code, du_out = sh(["ssh", "-o", "BatchMode=yes", ssh_alias,
                              f"du -sh {apps_root}/v* 2>/dev/null | tail -1"])
        print(f"\n[{name}] {apps_root}: {len(snaps)} 版, 保留 {snaps[-args.keep:]}, "
              f"回收候选 {len(d)} 个{', 引用中豁免 ' + ','.join(s) if s else ''}")
        if not args.apply or not d:
            continue
        paths = " ".join(f"{apps_root}/{n}" for n in d)
        code, out = sh(["ssh", "-o", "BatchMode=yes", ssh_alias,
                        f"df -h ~ | tail -1 | awk '{{print $4}}'; command rm -rf -- {paths} && "
                        f"ls -d {apps_root}/v* 2>/dev/null | wc -l"])
        if code != 0:
            print(f"  [FAIL] {out[:120]}")
            failed += 1
            continue
        lines = out.splitlines()
        print(f"  删除 {len(d)} 版（删除前可用 {lines[0] if lines else '?'}），余 {lines[-1] if lines else '?'} 版")
    print(f"\n结论: {'完成' if failed == 0 else f'{failed} 项 FAIL'}")
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
