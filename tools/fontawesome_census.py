#!/usr/bin/env python3
"""fontawesome 退役进度普查（S98 立项，handoff/31 §5.2c 契约配套）。

五形态统计每仓退役面，输出进度矩阵：
  link   = HTML 里 fontawesome CDN link/script 引用行数（0=已摘 CDN）
  static = 静态 fa-* 图标 class 消费（html/js/vue 里 <i class="fa*"> 等）
  dyn    = 动态拼接形态（模板字面量 fa fa-${x} / 字符串拼接 "fa-"+x）
  cssuc  = CSS content 伪元素 unicode 引用（\fxxx 形态，fa 专属码位段）
  jscls  = JS className 动态赋值含 fa- 的调用点

分档（S98 mask css 承载方案语义）：done(link=0，消费由仓内 vendored nux-icons.css 承载) / link-only(纯挂 CDN 零消费) / light(<=50) / heavy(>50)。
豁免：promptManager 移交 harness 辖区；chrome-extension/ 重打包风险面单列。
用法：python3 tools/fontawesome_census.py [--json] [--topn N]
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[2]

LINK_RE = re.compile(r"(?:font-?awesome|use\.fontawesome)", re.IGNORECASE)
STATIC_RE = re.compile(r"""(?:class|classList(?:\.add\()?)\s*[:=(]\s*["'`][^"'`]*\bfa[srbld]?\s+fa-[a-z0-9-]+|<i\s+class="fa[^"]*fa-[^"]*"|class="fa-solid\s+fa-|class="fa-regular\s+fa-|class="fa-brands\s+fa-""")
DYN_RE = re.compile(r"""fa[srbld]?\s+fa-\$\{|fa-\$\{|["'`]fa[srbld]?\s+fa-["'`]\s*\+|["']fa-["']\s*\+|\+\s*["']\s*fa-|iconClass|icon:\s*["'`]fa""")
CSS_UC_RE = re.compile(r"""content\s*:\s*["']\\f[0-9a-f]{3,4}["']""")
JS_CLS_RE = re.compile(r"""className\s*=\s*[^;\n]*fa-|classList\.add\(\s*["'`]fa-|setAttribute\(\s*["']class["']\s*,\s*["'`]fa""")
ICON_NAME_RE = re.compile(r"\bfa-([a-z0-9]+(?:-[a-z0-9]+)*)")
MODIFIERS = {
    "spin", "pulse", "fw", "lg", "xs", "sm", "xl", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x",
    "pull-left", "pull-right", "border", "inverse", "stack", "stack-1x", "stack-2x", "layers", "layers-text",
    "flip-horizontal", "flip-vertical", "flip-both", "rotate-90", "rotate-180", "rotate-270", "rotate-by",
    "shake", "beat", "beat-fade", "fade", "bounce", "solid", "regular", "brands", "duotone", "light", "thin",
    "sharp", "width-auto", "width-fixed", "dnone",
}
SKIP_DIRS = {"node_modules", ".git", "venv", ".venv", "snapshot", "demo", "out", "docs", "build", "dist", "vendor", "serve", "chrome-extension"}
SKIP_FILE_PARTS = ("v2.", "readme", "snapshot")
SKIP_REPOS = {"nexus-ui", "handoff", "backups"}

KNOWN = {
    "resumeAI": "done", "smartCode": "done", "LifeCompass": "done", "goldenStock": "done",
    "challengePlanet": "done", "adSmart": "done", "aiPet": "done", "beeMemory": "done",
    "portalHome": "done", "chroma-embedding-server": "done", "travelMate": "done",
    "verseCraft": "done", "nexus-agent": "done", "notifyCenter": "done",
}
EXEMPT = {"promptManager": "harness 辖区（S95 仓，与 element 移交同向）"}


def icon_names(text: str) -> Counter:
    c = Counter()
    for name in ICON_NAME_RE.findall(text):
        if name not in MODIFIERS:
            c[name] += 1
    return c


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
    link = static = dyn = cssuc = jscls = 0
    icons: Counter = Counter()
    for p in iter_targets(repo):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if p.suffix == ".html":
            for line in text.splitlines():
                if "<link" in line or "<script" in line:
                    if LINK_RE.search(line):
                        link += 1
        if p.suffix in (".html", ".js", ".vue"):
            static += len(STATIC_RE.findall(text))
            icons.update(icon_names(text))
        if p.suffix in (".js", ".vue", ".html"):
            d = len(DYN_RE.findall(text))
            j = len(JS_CLS_RE.findall(text))
            dyn += d
            jscls += j
        if p.suffix == ".css":
            cssuc += len(CSS_UC_RE.findall(text))
    total = link + static + dyn + cssuc + jscls
    if total == 0:
        band = "n/a"
    elif link == 0:
        band = "done"
    elif static + dyn + cssuc + jscls == 0:
        band = "link-only"
    elif static + dyn <= 50:
        band = "light"
    else:
        band = "heavy"
    return {"link": link, "static": static, "dyn": dyn, "cssuc": cssuc, "jscls": jscls,
            "band": band, "icons": dict(icons.most_common(30))}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--topn", type=int, default=0, help="附带输出全舰队图标频次 Top-N")
    args = ap.parse_args()

    rows = {}
    done_repos = []
    fleet_icons: Counter = Counter()
    for repo in sorted(WORKSPACE.iterdir()):
        if not (repo / ".git").exists() or repo.name in SKIP_REPOS:
            continue
        r = census_repo(repo)
        if r["band"] == "n/a":
            done_repos.append(repo.name)
        else:
            rows[repo.name] = r
        for name, cnt in r.get("icons", {}).items():
            fleet_icons[name] += cnt

    ext = WORKSPACE / "adSmart" / "chrome-extension"
    ext_note = ""
    if ext.exists():
        er = census_repo(ext)
        ext_note = f"extension 面 static={er['static']} dyn={er['dyn']}（豁免登记，不入施工）"

    drift = []
    for name, expect in KNOWN.items():
        r = rows.get(name)
        actual = r["band"] if r else "n/a"
        if expect == "done" and actual not in ("done", "n/a"):
            drift.append(f"{name}: 台账=done 实测={actual}")
    for name in rows:
        if name not in KNOWN and rows[name]["band"] not in ("link-only",):
            pass
    unexpected = [n for n in rows if n not in KNOWN]

    width = max(len(n) for n in rows) if rows else 10
    if not args.json:
        print(f"{'repo'.ljust(width)}  link  static  dyn  cssuc  jscls  band")
        for name, r in sorted(rows.items(), key=lambda kv: (kv[1]["band"], -(kv[1]["static"] + kv[1]["dyn"]))):
            print(f"{name.ljust(width)}  {r['link']:>4}  {r['static']:>6}  {r['dyn']:>3}  {r['cssuc']:>5}  {r['jscls']:>5}  {r['band']}")
        if ext_note:
            print(f"\nadSmart {ext_note}")
        if drift:
            print("\n台账漂移：")
            for d in drift:
                print("  " + d)
        total = len(rows) + len(done_repos)
        print(f"\n进度: {len(done_repos)}/{total} 仓已清零；在役 {len(rows)} 仓（heavy {sum(1 for r in rows.values() if r['band']=='heavy')} / light {sum(1 for r in rows.values() if r['band']=='light')} / link-only {sum(1 for r in rows.values() if r['band']=='link-only')}）")
        if args.topn:
            print(f"\n全舰队图标频次 Top-{args.topn}：")
            for name, cnt in fleet_icons.most_common(args.topn):
                print(f"  {name}: {cnt}")
    else:
        print(json.dumps({"census": rows, "drift": drift, "unexpected": unexpected,
                          "fleet_icons_top30": dict(fleet_icons.most_common(30))}, ensure_ascii=False, indent=1))

    return 1 if drift else 0


if __name__ == "__main__":
    sys.exit(main())
