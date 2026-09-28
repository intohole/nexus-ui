"""nexus-ui 构建/门禁脚本共享工具：deps.json 读取与 ignore_paths 装配。"""
from __future__ import annotations

import json
import os


def load_deps(root: str) -> dict:
    with open(os.path.join(root, "nexus-ui", "deps.json"), encoding="utf-8") as f:
        return json.load(f)


def load_ignore(root: str) -> tuple:
    try:
        data = load_deps(root)
        return tuple(os.path.normpath(os.path.join(root, p)).lower() for p in data.get("ignore_paths", []))
    except Exception:
        return ()
