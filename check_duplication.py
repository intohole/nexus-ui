#!/usr/bin/env python3
"""全工作区「禁止自实现」扫描：把重复造轮子固化为可执行门禁。

业务应用里凡是已经由 nexus-ui 提供统一出口的能力，都不允许再自行实现一份，
否则会形成多套并行实现（同一能力多处维护、修复只改一处、线上表现漂移）。

用法:
    python3 nexus-ui/check_duplication.py [工作区根目录] [--warn-only]

退出码: 存在 fail 级命中时返回 1，否则 0。
"""
import argparse
import json
import re
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent
NEXUS_UI = "nexus-ui"
REGISTRY = Path(__file__).resolve().parent / "js" / "nexus-components.js"

SCAN_SUFFIXES = (".js", ".html", ".htm")
SKIP_DIRS = {
    ".git", ".venv", "venv", "node_modules", "vendor", "__pycache__", "dist",
    "build", "logs", "data", ".trae", ".trae-html-share-packages", "handoff",
    ".know", "drawio", "tests", "test", "e2e", ".mypy_cache", ".pytest_cache",
}
SKIP_NAME_PARTS = ("e2e", "audit", "verify_", "_test", "test_", ".min.")
MAX_FILE_BYTES = 800_000
MAX_LINE_LEN = 3000

# 已知例外：key 为 "<仓库相对路径>#<规则名>"，必须写清原因与收归条件。
# 仅豁免已明确记录的单条命中，不豁免整个文件，避免掩盖后续新增违规。
KNOWN_EXCEPTIONS = {
    "gezhi/static/js/api.js#sse-reader":
        "gezhi 后端 SSE 用 event: 行协议，与 NexusStream 的 data.type 协议不一致，待后端 schema 对齐后收归",
    "wanxiang/static/index.html#clipboard":
        "万象资产服务为独立单文件页、未引入 nexus-ui，待该页整体迁移后收归",
}

RULES = [
    ("clipboard", "fail", r"navigator\.clipboard\s*&&\s*navigator\.clipboard\.writeText|navigator\.clipboard\.writeText",
     "自实现剪贴板写入 → NexusUtils.copyText / NexusUtils.copyToClipboard（内置 execCommand 回退）"),
    ("exec-command-copy", "fail", r"execCommand\(\s*['\"]copy['\"]",
     "自实现 execCommand 复制回退 → NexusUtils.copyToClipboard"),
    ("sse-reader", "fail", r"\.getReader\(\)",
     "自实现 SSE 流分块解析 → NexusStream.post / NexusStream.read"),
    ("intersection-observer", "fail", r"new\s+IntersectionObserver",
     "自实现滚动加载观察器 → nux-infinite-scroll"),
    ("local-format-util", "warn",
     r"function\s+(formatDate|formatTime|formatMoney|formatCurrency|debounce|throttle|escapeHtml|formatBytes)\s*\(",
     "自实现通用工具函数 → 确认 NexusUtils 是否已有等价实现（formatDate/debounce/formatCurrency/escapeHtml…）"),
    ("local-toast", "warn", r"function\s+showToast\s*\([^)]*\)\s*\{",
     "自实现 toast → window.showToast（nexus-overlay-host 统一宿主）"),
]


def load_registry_tags() -> set[str]:
    if not REGISTRY.is_file():
        return set()
    text = REGISTRY.read_text(encoding="utf-8")
    return set(re.findall(r"'([a-z0-9-]+)':\s*'Nux", text))


def iter_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in SCAN_SUFFIXES:
            continue
        parts = set(path.relative_to(root).parts)
        if parts & SKIP_DIRS:
            continue
        if any(part in path.name for part in SKIP_NAME_PARTS):
            continue
        if path.stat().st_size > MAX_FILE_BYTES:
            continue
        yield path


DELEGATING_RULES = {"local-format-util", "local-toast"}
DELEGATE_MARKERS = ("NexusUtils.", "window.showToast", "window.nuxConfirm", "NexusApi.")


def is_delegating(lines: list[str], index: int) -> bool:
    """判断命中处是否为「薄包装」：函数体直接委托给 nexus-ui 统一出口。

    这类包装保留了业务侧短名调用点，本身就是收归后的形态，不应再报警。
    """
    for line in lines[index:index + 4]:
        if any(marker in line for marker in DELEGATE_MARKERS):
            return True
        if "}" in line and line.strip() in ("}", "};"):
            return False
    return False


def scan_file(path: Path, root: Path, tags: set[str]) -> list[tuple[str, str, int, str]]:
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return []
    rel = path.relative_to(root).as_posix()
    hits: list[tuple[str, str, int, str]] = []
    for no, line in enumerate(lines, 1):
        if len(line) > MAX_LINE_LEN:
            continue
        for rule_id, level, pattern, message in RULES:
            if not re.search(pattern, line):
                continue
            if rule_id in DELEGATING_RULES and is_delegating(lines, no - 1):
                continue
            hits.append((rule_id, level, no, message))
        for tag in re.findall(r"app\.component\(\s*['\"]([a-z0-9-]+)['\"]", line):
            if tag in tags:
                hits.append(("manual-register", "fail", no,
                             f"手写 {tag} 注册 → NexusComponents.register(app) 一次性注册"))
    return hits


def main() -> int:
    parser = argparse.ArgumentParser(description="全工作区禁止自实现扫描")
    parser.add_argument("root", nargs="?", default=str(WORKSPACE), help="工作区根目录")
    parser.add_argument("--warn-only", action="store_true", help="仅输出报告，不因 fail 返回非零")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    tags = load_registry_tags()
    report: dict[str, list[dict]] = {}
    counts = {"fail": 0, "warn": 0}
    skipped: list[str] = []

    for path in sorted(iter_files(root)):
        rel = path.relative_to(root).as_posix()
        if rel.split("/")[0] == NEXUS_UI:
            continue
        for rule_id, level, no, message in scan_file(path, root, tags):
            if f"{rel}#{rule_id}" in KNOWN_EXCEPTIONS:
                skipped.append(f"{rel}#{rule_id}")
                continue
            counts[level] += 1
            report.setdefault(rel, []).append(
                {"rule": rule_id, "level": level, "line": no, "message": message})

    if args.json:
        print(json.dumps({"counts": counts, "files": report, "skipped": sorted(set(skipped))},
                         ensure_ascii=False, indent=2))
    else:
        for rel in sorted(report):
            print(rel)
            for item in report[rel]:
                flag = "FAIL" if item["level"] == "fail" else "WARN"
                print(f"  {flag} L{item['line']} [{item['rule']}] {item['message']}")
        for key in sorted(set(skipped)):
            print(f"  已知例外 {key}: {KNOWN_EXCEPTIONS[key]}")
        print(f"\n汇总: fail={counts['fail']} warn={counts['warn']} 文件={len(report)}")
        if not counts["fail"]:
            print("PASS 未发现必须收归的自实现（warn 项请人工确认）")

    if counts["fail"] and not args.warn_only:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
