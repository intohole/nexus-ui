#!/usr/bin/env python3
"""element-plus 退役进度普查（r156 立项，handoff/31 §五 契约配套）。

三维度统计每仓退役面，输出进度矩阵：
  load   = HTML 里 element-plus vendor 加载行数（css/js/locale，0=已摘 CDN）
  cmd    = JS 里 ElMessage/ElMessageBox/ElLoading/ElementPlus 命令式调用点
  tmpl   = 模板 <el-* 标签出现次数

分档：done(全零) / cmd-only(仅命令层) / light(tmpl<=150) / heavy(tmpl>150)。
用法：python3 tools/element_retire_census.py [--json]
"""
import argparse
import json
import re
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[2]

LOAD_RE = re.compile(r"nexus-ui/v[\d.]+/vendor/element-plus/")
CMD_RE = re.compile(r"\b(?:ElementPlus\.)?El(?:Message|MessageBox|Loading)\b")
TMPL_RE = re.compile(r"<el-[a-z-]+")
SKIP_DIRS = {"node_modules", ".git", "venv", ".venv", "snapshot", "site", "demo", "out", "docs", "build", "dist"}
SKIP_FILE_PARTS = ("v2.", "readme", "snapshot")
SKIP_REPOS = {"nexus-ui", "handoff", "backups"}

# 轮次档案（r156 定谳；新仓迁移后更新此表，census 输出与表格冲突即报警）
KNOWN = {
    "usercenter": "heavy", "smartCode": "heavy", "promptManager": "heavy",
    "moutain": "heavy",
    "WisePath": "light",
    "goldenStock": "done", "goldenFish": "done", "lyra": "done", "aiPet": "done",
    "promptGenius": "done", "userFeedback": "done",
}


def iter_targets(repo: Path):
    for p in repo.rglob("*"):
        if not p.is_file() or p.suffix not in (".html", ".js", ".vue", ".css"):
            continue
        parts = p.parts
        if any(s in parts for s in SKIP_DIRS):
            continue
        if any(part in SKIP_FILE_PARTS or part.startswith(("v2.", "out")) for part in parts):
            continue
        yield p


def census_repo(repo: Path) -> dict:
    load = cmd = tmpl = 0
    for p in iter_targets(repo):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        load += len(LOAD_RE.findall(text))
        if p.suffix in (".js", ".vue", ".html"):
            cmd += len(CMD_RE.findall(text))
            tmpl += len(TMPL_RE.findall(text))
    if load == 0 and cmd == 0 and tmpl == 0:
        band = "n/a"
    elif load == 0 and cmd == 0 and tmpl == 0:
        band = "done"
    elif tmpl == 0:
        band = "cmd-only"
    elif tmpl <= 150:
        band = "light"
    else:
        band = "heavy"
    return {"load": load, "cmd": cmd, "tmpl": tmpl, "band": band}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true", help="输出 JSON 矩阵")
    args = ap.parse_args()

    rows = {}
    done_repos = []
    for repo in sorted(WORKSPACE.iterdir()):
        if not (repo / ".git").exists() or repo.name in SKIP_REPOS:
            continue
        r = census_repo(repo)
        if r["band"] == "n/a":
            done_repos.append(repo.name)
        else:
            rows[repo.name] = r

    drift = []
    for name, expect in KNOWN.items():
        r = rows.get(name)
        actual = r["band"] if r else "n/a"
        actual_done = actual in ("done", "n/a")
        if expect == "done" and not actual_done:
            drift.append(f"{name}: 台账=done 实测={actual}")
        elif expect != "done" and actual_done:
            drift.append(f"{name}: 台账={expect} 实测=done（请更新 KNOWN 表）")

    width = max(len(n) for n in rows) if rows else 10
    if not args.json:
        print(f"{'repo'.ljust(width)}  load  cmd  tmpl  band")
        for name, r in sorted(rows.items(), key=lambda kv: (kv[1]["band"], -kv[1]["tmpl"])):
            print(f"{name.ljust(width)}  {r['load']:>4}  {r['cmd']:>3}  {r['tmpl']:>4}  {r['band']}")
        if drift:
            print("\n台账漂移：")
            for d in drift:
                print("  " + d)
        total = len(rows) + len(done_repos)
        print(f"\n进度: {len(done_repos)}/{total} 仓已摘 CDN；在役 {len(rows)} 仓（heavy {sum(1 for r in rows.values() if r['band']=='heavy')} / light {sum(1 for r in rows.values() if r['band']=='light')} / cmd-only {sum(1 for r in rows.values() if r['band']=='cmd-only')}）")
    else:
        print(json.dumps({"census": rows, "drift": drift}, ensure_ascii=False, indent=1))

    return 1 if drift else 0


if __name__ == "__main__":
    sys.exit(main())
