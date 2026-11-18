#!/usr/bin/env python3
"""nux-icons 子集覆盖门禁（fe5 立案）。

背景：r26 digest 流卡用了 fa-chevron-down/up，S98 子集（tools/nux_icons_build.py
产出）未回锅——平台 mask 承载下子集外图标 = currentColor 实心色块
（promptManager fe5 同族病，寄生在平台自身 digest 模板，生产全宿主潜伏 4 天）。

本门禁 = census 消费名 ⊆ css/nux-icons.css 子集：
  扫 js/（components+顶层）与 tests/*.html 的 fa-<name> 字面与拼接候选，
  逐一比对 nux-icons.css 定义的 .fa-<name> 规则；拼接形态（'fa-chevron-' + x）
  由 CANDIDATES 前缀枚举人工登记。

用法: python3 nexus-ui/check_icon_subset.py
退出码: 缺口非空返回 1。
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
CSS = REPO / "css" / "nux-icons.css"
SCAN_FILES = sorted((REPO / "js").rglob("*.js")) + sorted((REPO / "tests").glob("*.html"))
SKIP_PARTS = ("nexus-all.js", "nux-icon-data.js")

ICON_RE = re.compile(r"\bfa-([a-z0-9]+(?:-[a-z0-9]+)*)")
CONCAT_RE = re.compile(r"fa-([a-z0-9-]+)['\s]*\+")
CONCAT_CANDIDATES = {
    "fa-chevron-": ["chevron-down", "chevron-up"],
}


def main() -> int:
    css = CSS.read_text(encoding="utf-8")
    have = set(re.findall(r"^\.fa-([a-z0-9-]+)", css, re.M))
    used: set[str] = set()
    for f in SCAN_FILES:
        if any(p in str(f) for p in SKIP_PARTS):
            continue
        text = f.read_text(encoding="utf-8", errors="ignore")
        used |= set(ICON_RE.findall(text))
        for prefix in CONCAT_RE.findall(text):
            used |= set(CONCAT_CANDIDATES.get("fa-" + prefix, []))
    used = {u for u in used if u not in ("solid", "regular", "brands", "spin", "pulse", "inverse", "fw", "xs", "sm", "lg", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x", "pull", "li")}
    used = {u for u in used if ("fa-" + u + "-") not in CONCAT_CANDIDATES}
    missing = sorted(used - have)
    for name in sorted(used):
        status = "ok" if name in have else "MISSING"
        if status == "MISSING":
            print(f"[FAIL] fa-{name} 消费在场，nux-icons.css 子集缺席 → 渲染实心色块")
    print(f"=== census {len(used)} 消费名 / 子集 {len(have)} 定义 / 缺口 {len(missing)} ===")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
