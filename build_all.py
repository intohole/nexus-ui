#!/usr/bin/env python3
"""从 js/ 独立源文件确定性重建 nexus-all.js 聚合包, 消除手工同步导致的转义损坏与内容漂移。

用法:
    python3 nexus-ui/build_all.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
JS_DIR = os.path.join(ROOT, "js")
OUT = os.path.join(JS_DIR, "nexus-all.js")

FILES: list[str] = [
    "nexus-utils.js",
    "nexus-validators.js",
    "nexus-api-error.js",
    "nexus-api.js",
    "nexus-markdown.js",
    "nexus-chat.js",
    "nexus-structured.js",
    "nexus-store.js",
    "nexus-crud.js",
    "nexus-mobile.js",
    "user-center-sdk.js",
    "user-center-api.js",
    "components/nux-result-view.js",
    "core/nexus-user.js",
    "core/nexus-error-text.js",
    "components/nux-ai-badge.js",
    "components/nux-skeleton.js",
    "components/nux-empty.js",
    "components/nux-empty-state.js",
    "components/nux-error-state.js",
    "components/nux-ai-indicator.js",
    "components/nux-export-button.js",
    "components/nux-plan-progress.js",
    "core/nexus-app.js",
]


def main() -> int:
    parts: list[str] = []
    for name in FILES:
        with open(os.path.join(JS_DIR, name), encoding="utf-8") as f:
            content: str = f.read()
        parts.append(f"/* ===== {name} ===== */\n{content.rstrip()}\n")
    output: str = "\n".join(parts)
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(output)
    print(f"[build] {len(FILES)} 个文件 -> js/nexus-all.js ({len(output.encode())} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())