#!/usr/bin/env python3
"""全工作区图标收归：从 lucide-static(ISC, Feather 后继) 抽取路径, 输出统一图标数据。

产出 js/components/nux-icon-data.js: window.NuxIconData = { 语义名: [path d, ...] }
所有图形(circle/rect/line/polyline/polygon/ellipse)在生成期统一归一化为 <path>,
使 nux-icon 组件保持单一渲染通道(仅 <path :d>), 无需运行时解析节点。

用法:
    python3 nexus-ui/tools/gen_icons.py [--check]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tarfile
import tempfile

LUCIDE_VERSION = "1.52.0"
TARBALL = f"https://registry.npmmirror.com/lucide-static/-/lucide-static-{LUCIDE_VERSION}.tgz"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "js", "components", "nux-icon-data.js")

MAP: dict[str, str] = {
    "home": "house", "menu": "menu", "grid": "layout-grid", "list": "list",
    "dashboard": "layout-dashboard", "sidebar": "panel-left", "panel": "panel-left",
    "rows": "rows-3", "columns": "columns-3", "maximize": "maximize", "minimize": "minimize",
    "search": "search", "filter": "funnel", "sliders": "sliders-horizontal",
    "settings": "settings", "more": "ellipsis", "more-vertical": "ellipsis-vertical",
    "external": "external-link", "move": "move", "grip": "grip-vertical", "pin": "pin",
    "chevron-left": "chevron-left", "chevron-right": "chevron-right",
    "chevron-down": "chevron-down", "chevron-up": "chevron-up", "chevron": "chevron-down",
    "arrow-left": "arrow-left", "arrow-right": "arrow-right",
    "arrow-up": "arrow-up", "arrow-down": "arrow-down", "arrow": "chevron-down",
    "arrow-up-down": "arrow-up-down", "back": "arrow-left", "chat": "message-circle",
    "plus": "plus", "minus": "minus", "check": "check", "close": "x", "x": "x",
    "edit": "pencil", "trash": "trash", "copy": "copy", "download": "download",
    "upload": "upload", "share": "share-2", "link": "link", "send": "send", "save": "save",
    "print": "printer", "refresh": "refresh-cw", "rotate": "rotate-ccw", "undo": "undo-2",
    "redo": "redo-2", "qrcode": "qr-code", "scan": "scan", "paste": "clipboard-paste",
    "clipboard": "clipboard", "reply": "reply", "log-in": "log-in", "logout": "log-out",
    "external-link": "external-link", "share-2": "share-2", "export": "download",
    "mail": "mail", "phone": "smartphone",
    "info": "info", "warning": "triangle-alert", "alert": "triangle-alert",
    "alert-circle": "circle-alert", "check-circle": "circle-check", "x-circle": "circle-x",
    "help": "circle-question-mark", "loader": "loader-circle", "bell": "bell", "bell-off": "bell-off",
    "clock": "clock", "calendar": "calendar", "calendar-check": "calendar-check",
    "eye": "eye", "eye-off": "eye-off", "lock": "lock", "unlock": "lock-open",
    "shield": "shield", "shield-check": "shield-check", "star": "star", "heart": "heart",
    "bookmark": "bookmark", "flag": "flag", "zap": "zap", "sparkle": "sparkles",
    "flame": "flame", "crown": "crown", "award": "award", "medal": "medal",
    "target": "target", "gift": "gift", "ticket": "ticket", "badge-check": "badge-check",
    "circle": "circle", "dot": "dot", "plus-circle": "circle-plus",
    "minus-circle": "circle-minus", "check-check": "check-check", "list-checks": "list-checks",
    "copy-check": "copy-check",
    "image": "image", "file": "file", "file-text": "file-text", "folder": "folder",
    "folder-open": "folder-open", "archive": "archive", "inbox": "inbox",
    "paperclip": "paperclip", "camera": "camera", "mic": "mic", "video": "video",
    "play": "play", "pause": "pause", "music": "music", "headphones": "headphones",
    "file-spreadsheet": "file-spreadsheet", "file-code": "file-code",
    "user": "user", "users": "users", "user-plus": "user-plus", "bot": "bot", "key": "key",
    "id-card": "id-card", "contact": "contact", "circle-user": "circle-user",
    "chart": "chart-column", "chart-line": "chart-line", "chart-pie": "chart-pie",
    "chart-bar": "chart-column", "trending-up": "trending-up", "trending-down": "trending-down",
    "trenddown": "trending-down", "activity": "activity", "database": "database",
    "table": "table", "tag": "tag", "wallet": "wallet", "credit-card": "credit-card",
    "cart": "shopping-cart", "package": "package", "inventory": "package", "box": "package",
    "shipping": "truck", "truck": "truck", "monitor": "monitor", "building-2": "building",
    "briefcase": "briefcase", "compose": "shopping-bag", "sessions": "message-square",
    "opportunity": "search", "price": "circle-dollar-sign", "aftersales": "shield",
    "strategy": "chart-no-axes-column", "ledger": "notebook-text", "graph": "share-2",
    "health": "heart-pulse", "up": "thumbs-up", "down": "thumbs-down", "source": "download",
    "docs": "files", "workbench": "chart-column",
    "graduation-cap": "graduation-cap", "book": "book", "book-open": "book-open",
    "lightbulb": "lightbulb", "flask": "flask-conical", "microscope": "microscope",
    "palette": "palette", "brush": "brush", "languages": "languages", "puzzle": "puzzle",
    "trophy": "trophy", "rocket": "rocket", "brain": "brain", "sigma": "sigma",
    "calculator": "calculator", "scale": "scale", "percent": "percent", "dna": "dna",
    "atom": "atom", "notebook": "notebook-text",
    "map-pin": "map-pin", "compass": "compass", "navigation": "navigation", "globe": "globe",
    "coffee": "coffee", "sun": "sun", "moon": "moon", "droplet": "droplet", "leaf": "leaf",
    "sprout": "sprout", "thermometer": "thermometer", "recycle": "recycle", "cloud": "cloud",
    "wifi": "wifi", "battery": "battery-full", "signal": "signal", "cpu": "cpu",
    "hard-drive": "hard-drive", "terminal": "terminal", "git-branch": "git-branch",
    "layers": "layers", "keyboard": "keyboard", "history": "rotate-ccw-clock", "code": "code",
    "message-circle": "message-circle", "message-square": "message-square",
    "thumbs-up": "thumbs-up", "thumbs-down": "thumbs-down", "heart-pulse": "heart-pulse",
    "wand": "wand", "magic": "wand-sparkles", "empty-box": "package-open",
}

CUSTOM: dict[str, list[str]] = {
    "logo": ["M7 4c0 8-2.4 12.5-4 15", "M12 4v16", "M17 4c0 8 2.4 12.5 4 15", "M5.5 13.5h13"],
    "deck": ["M3.5 5h17v10.5h-17z", "M12 15.5V21", "M8.5 21h7", "M7 9h10"],
    "doc": ["M6 3h7.5L18 7.5V21H6z", "M13.5 3v4.5H18", "M9 12h6", "M9 16h4"],
    "sheet": ["M4 4.5h16v15H4z", "M4 9.5h16", "M4 14.5h16", "M10 4.5v15", "M15 4.5v15"],
    "poster": ["M4.5 3.5h15v17h-15z", "M4.5 16.5l4-4 3 3 3-3 5 4.5", "M15.5 7.5h.01"],
    "mindmap": ["M3 10h4v4H3z", "M7 12h3.5", "M10.5 6.5v11", "M10.5 6.5h6.5",
                "M10.5 12h6.5", "M10.5 17.5h6.5", "M17 5h4v3h-4z", "M17 10.5h4v3h-4z",
                "M17 16h4v3h-4z"],
    "report": ["M6 3h7.5L18 7.5V21H6z", "M13.5 3v4.5H18", "M9.5 17.5v-3", "M12 17.5v-5.5",
               "M14.5 17.5v-2"],
    "file-pdf": ["M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z", "M14 3v5h5",
                 "M8.5 16.5v-4h1.2a1.3 1.3 0 0 1 0 2.6H8.5"],
    "file-doc": ["M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z", "M14 3v5h5",
                 "M8.5 12.5l1.6 4 1.6-4"],
    "file-sheet": ["M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z", "M14 3v5h5",
                   "M8.5 12.5h7M8.5 16h7M12 12.5V16"],
    "file-md": ["M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z", "M14 3v5h5",
                "M8 16v-4l2 2 2-2v4", "M15.5 12v4m0 0l-1.2-1.2M15.5 16l1.2-1.2"],
}


def fetch_nodes() -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        tgz = os.path.join(tmp, "lucide.tgz")
        subprocess.run(["curl", "-sL", "--max-time", "120", "-o", tgz, TARBALL], check=True)
        with tarfile.open(tgz) as tf:
            member = next(m for m in tf.getmembers() if m.name.endswith("icon-nodes.json"))
            with tf.extractfile(member) as fh:
                return json.load(fh)


def num(v: object) -> str:
    s = str(v)
    return s[:-2] if s.endswith(".0") else s


def pts(raw: str) -> list[tuple[str, str]]:
    tokens = re.split(r"[ ,]+", raw.strip())
    return [(tokens[i], tokens[i + 1]) for i in range(0, len(tokens) - 1, 2)]


def rect_path(a: dict) -> str:
    x, y = num(a["x"]), num(a["y"])
    w, h = num(a["width"]), num(a["height"])
    rx = num(a.get("rx", 0))
    if rx in ("0", "0.0"):
        return f"M{x} {y}H{float(x) + float(w)}V{float(y) + float(h)}H{x}z"
    x2, y2 = float(x) + float(w), float(y) + float(h)
    r = float(rx)
    return (f"M{float(x) + r} {y}H{x2 - r}a{r} {r} 0 0 1 {r} {r}V{y2 - r}"
            f"a{r} {r} 0 0 1 -{r} {r}H{float(x) + r}a{r} {r} 0 0 1 -{r} -{r}V{float(y) + r}"
            f"a{r} {r} 0 0 1 {r} -{r}z")


def ellipse_path(cx: float, cy: float, rx: float, ry: float) -> str:
    return (f"M{cx - rx} {cy}a{rx} {ry} 0 1 0 {rx * 2} 0a{rx} {ry} 0 1 0 -{rx * 2} 0z")


def to_d(tag: str, a: dict) -> str:
    if tag == "path":
        return a["d"]
    if tag == "line":
        return f"M{a['x1']} {a['y1']}L{a['x2']} {a['y2']}"
    if tag in ("polyline", "polygon"):
        seq = pts(a["points"])
        d = f"M{seq[0][0]} {seq[0][1]}" + "".join(f"L{p[0]} {p[1]}" for p in seq[1:])
        return d + "z" if tag == "polygon" else d
    if tag == "rect":
        return rect_path(a)
    if tag == "circle":
        return ellipse_path(float(a["cx"]), float(a["cy"]), float(a["r"]), float(a["r"]))
    if tag == "ellipse":
        return ellipse_path(float(a["cx"]), float(a["cy"]), float(a["rx"]), float(a["ry"]))
    raise ValueError(f"unsupported tag: {tag}")


def build(nodes: dict) -> tuple[dict, list[str]]:
    out: dict[str, list] = {k: list(v) for k, v in CUSTOM.items()}
    missing: list[str] = []
    geom = {"d", "cx", "cy", "r", "rx", "ry", "x", "y",
            "width", "height", "x1", "y1", "x2", "y2", "points"}
    for name, icon in MAP.items():
        raw = nodes.get(icon)
        if raw is None:
            missing.append(f"{name}->{icon}")
            continue
        entries: list = []
        ok = True
        for tag, attrs in raw:
            extra = set(attrs) - geom - {"fill"}
            if extra or (attrs.get("fill") and attrs.get("fill") != "currentColor"):
                missing.append(f"{name}->{icon} 含非几何属性 {sorted(extra) or attrs.get('fill')}")
                ok = False
                break
            d = to_d(tag, attrs)
            entries.append([d, 1] if attrs.get("fill") == "currentColor" else d)
        if ok:
            out[name] = entries
    return out, missing


def render(data: dict) -> str:
    lines = ["window.NuxIconData = {"]
    for name in sorted(data):
        body = ",".join(json.dumps(e, ensure_ascii=False) for e in data[name])
        lines.append(f'    "{name}":[{body}],')
    lines.append("};")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    nodes = fetch_nodes()
    data, missing = build(nodes)
    if missing:
        print("[gen_icons] 映射未解析:", file=sys.stderr)
        for m in missing:
            print(f"  - {m}", file=sys.stderr)
        return 2
    output = render(data)
    if args.check:
        with open(OUT, encoding="utf-8") as f:
            if f.read() == output:
                print(f"[gen_icons] 一致 ({len(data)} 图标, {len(output.encode())} bytes)")
                return 0
        print("[gen_icons] nux-icon-data.js 与生成结果不一致", file=sys.stderr)
        return 1
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(output)
    print(f"[gen_icons] {len(data)} 图标 -> {os.path.relpath(OUT, ROOT)} "
          f"({len(output.encode())} bytes, lucide {LUCIDE_VERSION})")
    return 0


if __name__ == "__main__":
    sys.exit(main())