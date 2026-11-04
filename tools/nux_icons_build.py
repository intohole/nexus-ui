#!/usr/bin/env python3
"""nux-icons 子集 CSS 构建器（S98 立项，fontawesome 退役承载件）。

输入 = Font Awesome 官方 npm 包源料（svgs/{solid,regular,brands}/ + metadata）
     + 目标仓消费名清单（fontawesome_census 的 icon_names 口径）
输出 = 仓内可 vendored 的 nux-icons.css：
  - .fa/.fas/.far/.fab/.fa-solid 等容器类 = currentColor + mask 承载（暗色自动适配，零色值）
  - .fa-<name> = mask-image data URI（按仓消费子集生成）
  - 动画类 fa-spin/fa-pulse 与尺寸类 fa-lg..fa-10x/fa-fw 等价实现
消费名→v6 官方名经 ALIASES 归一；style 按目录存在性探测（solid→brands→regular）。
用法：python3 tools/nux_icons_build.py --repo <name> --fa-src <dir> [--out <file>] [--css-class-only]
"""
import argparse
import re
import sys
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fontawesome_census import iter_targets, icon_names, MODIFIERS

WORKSPACE = Path(__file__).resolve().parents[2]

ALIASES = {
    "times": "xmark",
    "times-circle": "circle-xmark",
    "close": "xmark",
    "check-circle": "circle-check",
    "exclamation-triangle": "triangle-exclamation",
    "exclamation-circle": "circle-exclamation",
    "info-circle": "circle-info",
    "question-circle": "circle-question",
    "sync-alt": "arrows-rotate",
    "sync": "arrows-rotate",
    "rotate": "arrows-rotate",
    "rotate-left": "arrow-rotate-left",
    "rotate-right": "arrow-rotate-right",
    "redo": "arrow-rotate-right",
    "undo": "arrow-rotate-left",
    "history": "clock-rotate-left",
    "trash-alt": "trash-can",
    "edit": "pen",
    "pencil-alt": "pencil",
    "external-link-alt": "arrow-up-right-from-square",
    "up-right-from-square": "arrow-up-right-from-square",
    "shield-alt": "shield-halved",
    "file-alt": "file-lines",
    "cog": "gear",
    "cogs": "gears",
    "sliders-h": "sliders",
    "th-list": "table-list",
    "th": "table-cells",
    "th-large": "table-cells-large",
    "sign-out-alt": "right-from-bracket",
    "sign-in-alt": "right-to-bracket",
    "map-marker-alt": "location-dot",
    "angle-right": "chevron-right",
    "angle-left": "chevron-left",
    "angle-down": "chevron-down",
    "angle-up": "chevron-up",
    "ellipsis-v": "ellipsis-vertical",
    "ellipsis-h": "ellipsis",
    "minus-circle": "circle-minus",
    "plus-circle": "circle-plus",
    "check-square": "square-check",
    "sort-amount-up": "arrow-down-wide-short",
    "tachometer-alt": "gauge-high",
    "tachometer": "gauge",
    "cloud-upload-alt": "cloud-arrow-up",
    "cloud-download-alt": "cloud-arrow-down",
    "exchange-alt": "right-left",
    "balance-scale": "scale-balanced",
    "save": "floppy-disk",
    "search": "magnifying-glass",
    "search-plus": "magnifying-glass-plus",
    "sort": "arrow-down-short-wide",
    "sort-down": "arrow-down-short-wide",
    "sort-up": "arrow-up-short-wide",
    "long-arrow-alt-right": "arrow-right-long",
    "long-arrow-alt-left": "arrow-left-long",
    "arrow-alt-circle-right": "circle-right",
    "arrow-alt-circle-left": "circle-left",
    "expand-arrows-alt": "maximize",
    "compress-arrows-alt": "minimize",
    "compress-alt": "down-left-and-up-right-to-center",
    "expand-alt": "up-right-and-down-left-from-center",
    "chart-bar": "chart-column",
    "bar-chart": "chart-column",
    "line-chart": "chart-line",
    "area-chart": "chart-area",
    "pie-chart": "chart-pie",
    "calendar-alt": "calendar-days",
    "calendar-times": "calendar-xmark",
    "user-circle": "circle-user",
    "user-edit": "user-pen",
    "user-friends": "user-group",
    "comment-alt": "message",
    "microphone-alt": "microphone-lines",
    "shopping-cart": "cart-shopping",
    "university": "building-columns",
    "bank": "building-columns",
    "institution": "building-columns",
    "heart-beat": "heart-pulse",
    "heartbeat": "heart-pulse",
    "hands-helping": "handshake-angle",
    "hospital-alt": "hospital",
    "clinic-medical": "house-medical-circle-clinic",
    "first-aid": "kit-medical",
    "medkit": "kit-medical",
    "weight": "weight-scale",
    "temperature-high": "temperature-three-quarters",
    "tools": "screwdriver-wrench",
    "tool-box": "toolbox",
    "drafting-compass": "compass-drafting",
    "compasses": "compass-drafting",
    "certificate-2": "certificate",
    "graduation": "graduation-cap",
    "chalkboard-teachers": "chalkboard-user",
    "layers": "layer-group",
    "js-square": "square-js",
    "wechat": "weixin",
    "bot": "robot",
    "magic": "wand-magic",
    "wand": "wand-magic-sparkles",
    "hand-paper": "hand",
    "hand-holding": "hand-holding-hand",
    "hands": "hand-holding-hand",
    "rmb": "yen-sign",
    "percentage": "percent",
    "trending-up": "arrow-trend-up",
    "trending-down": "arrow-trend-down",
    "level-up-alt": "arrow-up-from-dotted-line",
    "level-down-alt": "arrow-down",
    "share": "share-nodes",
    "share-alt": "share-nodes",
    "share-square": "share-from-square",
    "rss-square": "square-rss",
    "blocked": "ban",
    "do-not-enter": "ban",
    "quarter-rest": "circle-quarter-stroke",
    "zap": "bolt",
    "bulb": "lightbulb",
    "target": "bullseye",
    "photo-video": "photo-film",
    "smile": "face-smile",
    "smile-beam": "face-smile-beam",
    "meh": "face-meh",
    "frown": "face-frown",
    "dizzy": "face-dizzy",
    "headset": "headphones",
    "phone-alt": "phone-flip",
    "map-marked": "map-location-dot",
    "marker": "location-dot",
    "running": "person-running",
    "hiking": "person-hiking",
    "ambulance": "truck-medical",
    "user-md": "user-doctor",
    "stethoscope-2": "stethoscope",
    "feather-alt": "feather-pointed",
    "keyboard-2": "keyboard",
    "signature": "file-signature",
    "send": "paper-plane",
    "mail-bulk": "envelopes-bulk",
    "pin": "thumbtack",
    "pin22": "thumbtack",
    "arrow": "arrow-up-right-from-square",
    "arrows-alt": "up-down-left-right",
    "arrows": "up-down-left-right",
    "arrows-h": "left-right",
    "arrows-v": "up-down",
    "arrows-alt-h": "left-right",
    "arrows-alt-v": "up-down",
    "expand": "up-right-and-down-left-from-center",
    "compress": "down-left-and-up-right-to-center",
    "external-link": "arrow-up-right-from-square",
    "external-link-square": "square-arrow-up-right",
    "hdd": "hard-drive",
    "save-2": "floppy-disk",
    "grid": "table-cells",
    "grid-2": "table-cells-large",
    "columns": "table-columns",
    "project-diagram": "diagram-project",
    "meter": "gauge-high",
    "speedometer": "gauge-high",
    "dashboard": "gauge-high",
    "concierge-bell": "bell-concierge",
    "user-cog": "user-gear",
    "users-cog": "users-gear",
    "user-shield-2": "user-shield",
    "halo": "angel",
    "tshirt": "shirt",
    "home": "house",
    "home-alt": "house",
    "refresh": "arrows-rotate",
    "star-half-alt": "star-half-stroke",
    "play-circle": "circle-play",
    "unlink": "link-slash",
    "tasks": "list-check",
    "mouse-pointer": "arrow-pointer",
    "smoking-ban": "ban-smoking",
    "stream": "diagram-project",
    "keywords": "tags",
    "book-reader": "book-open-reader",
    "archive": "box-archive", "sticky-note": "note-sticky",
    "sparkles": "wand-sparkles", "grid-2-plus": "circle-plus",
    "calc": "calculator",
    "square-root": "square-root-variable",
    "radiation-alt": "circle-radiation",
    "band-aid": "bandage",
    "vials-2": "vials",
    "circle-h": "hospital",
    "hospital-wide": "hospital",
    "syringe-2": "syringe",

}

KNOWN_NOISE = {"chevron"}

CONTAINER_CSS = """.fa,.fas,.far,.fab,.fad,.fal,.fat,.fa-solid,.fa-regular,.fa-brands,.fa-duotone,.fa-light,.fa-thin{display:inline-block;width:1em;height:1em;vertical-align:-.125em;background-color:currentColor;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain}
.fa-xs{width:.75em;height:.75em}.fa-sm{width:.875em;height:.875em}.fa-lg{width:1.33333em;height:1.33333em;vertical-align:-.2em}.fa-xl{width:2em;height:2em}
.fa-2x{width:2em;height:2em}.fa-3x{width:3em;height:3em}.fa-4x{width:4em;height:4em}.fa-5x{width:5em;height:5em}
.fa-6x{width:6em;height:6em}.fa-7x{width:7em;height:7em}.fa-8x{width:8em;height:8em}.fa-9x{width:9em;height:9em}.fa-10x{width:10em;height:10em}
.fa-fw{width:1.25em;text-align:center}
.fa-pull-left{float:left;margin-right:.3em}.fa-pull-right{float:right;margin-left:.3em}
.fa-spin{-webkit-animation:nuxfa-spin 2s linear infinite;animation:nuxfa-spin 2s linear infinite}
.fa-pulse,.fa-spin-pulse{-webkit-animation:nuxfa-spin 1s steps(8) infinite;animation:nuxfa-spin 1s steps(8) infinite}
.fa-inverse{background-color:#fff}
@-webkit-keyframes nuxfa-spin{0%{-webkit-transform:rotate(0);transform:rotate(0)}100%{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}
@keyframes nuxfa-spin{0%{-webkit-transform:rotate(0);transform:rotate(0)}100%{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}
"""

HEADER = "/* nux-icons.css - fontawesome-free 6.7.2 subset (CC BY 4.0, Fonticons Inc.) built by nexus-ui/tools/nux_icons_build.py - S98 */\n"


def find_svg(fa_src: Path, name: str):
    for style in ("solid", "brands", "regular"):
        p = fa_src / "svgs" / style / f"{name}.svg"
        if p.exists():
            return p
    return None


def mask_url(svg_path: Path) -> str:
    raw = svg_path.read_text(encoding="utf-8")
    raw = re.sub(r"<\?xml[^>]*\?>", "", raw).strip()
    raw = re.sub(r"<!--.*?-->", "", raw, flags=re.S)
    return "url('data:image/svg+xml;utf8," + quote(raw, safe="/:=,- ") + "')"


def build_repo_css(repo: Path, fa_src: Path) -> tuple[str, list, list]:
    from collections import Counter
    icons: Counter = Counter()
    for p in iter_targets(repo):
        if p.name == "nux-icons.css":
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        icons.update(icon_names(text))
    lines = [HEADER, CONTAINER_CSS]
    missing = []
    built = []
    for name in sorted(icons):
        if name in KNOWN_NOISE:
            continue
        target = ALIASES.get(name, name)
        svg = find_svg(fa_src, target)
        if svg is None and target != name:
            svg = find_svg(fa_src, name)
            if svg is not None:
                target = name
        if svg is None:
            missing.append(name)
            continue
        url = mask_url(svg)
        sel = f".fa-{name},.fa-{target}" if target != name else f".fa-{name}"
        lines.append(f"{sel}{{-webkit-mask-image:{url};mask-image:{url}}}")
        built.append(name)
    return "\n".join(lines) + "\n", built, missing


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--fa-src", default=str(WORKSPACE / "out/s98/fa_src/package"))
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    repo = WORKSPACE / args.repo
    if not repo.exists():
        print(f"repo not found: {repo}")
        return 2
    css, built, missing = build_repo_css(repo, Path(args.fa_src))
    out = Path(args.out) if args.out else (repo / "nux-icons.css")
    out.write_text(css, encoding="utf-8")
    size = out.stat().st_size
    print(f"{args.repo}: built {len(built)} icons ({size} bytes) -> {out}")
    if missing:
        print(f"  MISSING({len(missing)}): {' '.join(missing)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
