from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import cast

ROOT = Path(__file__).resolve().parent.parent
JS_DIR = ROOT / "js"
COMPONENTS_DIR = JS_DIR / "components"
REGISTRY_PATH = JS_DIR / "nexus-components.js"
CHAT_PATH = JS_DIR / "nexus-chat.js"
CONTRACT_PATH = ROOT / "contract" / "nexus-ui.contract.json"
SCHEMA_PATH = ROOT / "contract" / "ai-events.schema.json"
LLMS_PATH = ROOT / "llms.txt"
DEPS_PATH = ROOT / "deps.json"

BLOCK_BEGIN = "<!-- nux:generated:components BEGIN -->"
BLOCK_END = "<!-- nux:generated:components END -->"

REGISTRY_RE = re.compile(r"'(nux-[a-z0-9-]+)':\s*'([A-Za-z]\w+)'")
EMITS_RE = re.compile(r"emits:\s*\[([^\]]*)\]")
PROP_RE = re.compile(r"([A-Za-z_]\w*):\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|[A-Za-z][\w,\s\[\]]*)")
STATIC_RE_TMPL = r"{gn}\.(\w+)\s*="
WINDOW_EXPORT_RE = re.compile(r"window\.([A-Z][A-Za-z0-9]+)\s*=(?!=)")
METHOD_KEY_RE = re.compile(r"([A-Za-z_]\w*)\s*:")
ROUTE_EVENT_RE = re.compile(r"type === '([a-z_]+)'")
ROUTE_FN = "function routeRichEvent"


def read_registry() -> dict[str, str]:
    src = REGISTRY_PATH.read_text(encoding="utf-8")
    return dict(REGISTRY_RE.findall(src))


def deps_version() -> str:
    deps = json.loads(DEPS_PATH.read_text(encoding="utf-8"))
    return cast(str, deps["deps"]["nexus-ui"]["version"])


def brace_block(src: str, open_idx: int) -> str:
    depth = 0
    in_str: str | None = None
    i = open_idx
    while i < len(src):
        ch = src[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == in_str:
                in_str = None
        elif ch in "'\"`":
            in_str = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return src[open_idx : i + 1]
        i += 1
    return src[open_idx:]


def split_top_level(block: str) -> list[str]:
    parts: list[str] = []
    depth = 0
    in_str: str | None = None
    start = 1
    i = 1
    while i < len(block) - 1:
        ch = block[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == in_str:
                in_str = None
        elif ch in "'\"`":
            in_str = ch
        elif ch in "{[(}])":
            if ch in "{[(":
                depth += 1
            else:
                depth -= 1
        elif ch == "," and depth == 0:
            parts.append(block[start:i])
            start = i + 1
        i += 1
    if start < len(block) - 1:
        parts.append(block[start : len(block) - 1])
    return parts


def extract_props(src: str) -> dict[str, str]:
    match = re.search(r"\bprops:\s*\{", src)
    if not match:
        return {}
    block = brace_block(src, match.end() - 1)
    props: dict[str, str] = {}
    for part in split_top_level(block):
        pm = re.match(r"\s*([A-Za-z_]\w*)\s*:\s*(.+)$", part.strip(), re.S)
        if not pm:
            continue
        name, raw = pm.group(1), pm.group(2).strip()
        tm = re.search(r"type:\s*(\[?[A-Za-z][\w,\s\[\]]*?)(?:,\s*default|,\s*required|\}\s*$|$)", raw, re.S)
        if tm:
            props[name] = tm.group(1).strip().rstrip(",")
        elif re.fullmatch(r"[A-Za-z][\w,\s\[\]]*", raw):
            props[name] = raw
        else:
            props[name] = "untyped"
    return props


def extract_emits(src: str) -> list[str]:
    m = EMITS_RE.search(src)
    if not m:
        return []
    return [s.strip().strip("'\"") for s in m.group(1).split(",") if s.strip()]


def extract_statics(src: str, global_name: str) -> list[str]:
    return sorted(set(re.findall(STATIC_RE_TMPL.format(gn=global_name), src)))


def object_export_methods(src: str, global_name: str) -> list[str]:
    methods: list[str] = []
    for m in re.finditer(rf"window\.{global_name}\s*=\s*(?:\{{|\w+\s*\|\|\s*\(window\.{global_name}\s*=\s*\{{)", src):
        block = brace_block(src, m.end() - 1)
        for part in split_top_level(block):
            km = METHOD_KEY_RE.match(part.strip())
            if km:
                methods.append(km.group(1))
    for m in re.finditer(rf"Object\.assign\(window\.{global_name},\s*\{{", src):
        block = brace_block(src, m.end() - 1)
        for part in split_top_level(block):
            km = METHOD_KEY_RE.match(part.strip())
            if km:
                methods.append(km.group(1))
    for m in re.finditer(rf"{global_name}\.([A-Za-z_]\w*)\s*=\s*(function|\()", src):
        methods.append(m.group(1))
    return sorted(set(methods))


def build_component(tag: str, global_name: str) -> dict[str, object]:
    path = COMPONENTS_DIR / f"{tag}.js"
    entry: dict[str, object] = {
        "tag": tag,
        "global": global_name,
        "file": f"js/components/{tag}.js",
        "props": {},
        "emits": [],
        "statics": [],
        "hasTemplate": False,
    }
    if not path.exists():
        entry["missing"] = True
        return entry
    src = path.read_text(encoding="utf-8")
    entry["props"] = extract_props(src)
    entry["emits"] = extract_emits(src)
    entry["statics"] = extract_statics(src, global_name)
    entry["hasTemplate"] = "template:" in src or "render(" in src
    return entry


TOOL_FILES_EXCLUDE = {"nexus-all.js"}


def build_tools() -> list[dict[str, object]]:
    tools: list[dict[str, object]] = []
    for path in sorted(JS_DIR.glob("nexus-*.js")):
        if path.name in TOOL_FILES_EXCLUDE:
            continue
        src = path.read_text(encoding="utf-8")
        exports: dict[str, list[str]] = {}
        for m in WINDOW_EXPORT_RE.finditer(src):
            name = m.group(1)
            if name in exports:
                continue
            methods = object_export_methods(src, name)
            if methods:
                exports[name] = methods
        if exports:
            tools.append({"file": f"js/{path.name}", "exports": exports})
    return tools


def extract_route_events() -> list[str]:
    src = CHAT_PATH.read_text(encoding="utf-8")
    start = src.find(ROUTE_FN)
    if start < 0:
        return []
    block = brace_block(src, src.find("{", start))
    events = set(ROUTE_EVENT_RE.findall(block))
    return sorted(events)


def schema_event_enum() -> set[str]:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    names: set[str] = set()
    for e in schema["eventFace"]:
        for alias in str(e["event"]).split("/"):
            alias = alias.strip()
            if alias:
                names.add(alias)
    return names


def build_contract() -> dict[str, object]:
    registry = read_registry()
    components = [build_component(tag, g) for tag, g in sorted(registry.items())]
    return {
        "version": deps_version(),
        "registryCount": len(registry),
        "components": components,
        "tools": build_tools(),
        "routeRichEvents": extract_route_events(),
    }


def generated_table(contract: dict[str, object]) -> str:
    lines = [BLOCK_BEGIN, "", "### 组件机读索引（GENERATED，勿手改；真源 js/components/，由 scripts/gen_ai_contract.py 产出）", ""]
    lines.append("| tag | window 全局 | props | emits |")
    lines.append("|------|------|------|------|")
    comps = cast(list[dict[str, object]], contract["components"])
    for c in comps:
        props = cast(dict[str, str], c["props"])
        emits = cast(list[str], c["emits"])
        lines.append(
            f"| {c['tag']} | {c['global']} | {', '.join(props.keys()) if props else '—'} | {', '.join(emits) if emits else '—'} |"
        )
    lines += ["", f"注册表 {contract['registryCount']} 个，与 NexusComponents.list() 同步。", "", BLOCK_END]
    return "\n".join(lines)


def update_llms(contract: dict[str, object]) -> str:
    text = LLMS_PATH.read_text(encoding="utf-8")
    table = generated_table(contract)
    if BLOCK_BEGIN in text and BLOCK_END in text:
        pre = text[: text.index(BLOCK_BEGIN)]
        post = text[text.index(BLOCK_END) + len(BLOCK_END):]
        return pre + table + post
    anchor = "<!-- nux:generated:components 注入位 -->"
    if anchor in text:
        return text.replace(anchor, table)
    return text.rstrip() + "\n\n" + table + "\n"


def check_drift(contract: dict[str, object]) -> list[str]:
    problems: list[str] = []
    registry = read_registry()
    on_disk = json.loads(CONTRACT_PATH.read_text(encoding="utf-8")) if CONTRACT_PATH.exists() else {}
    if on_disk.get("registryCount") != len(registry):
        problems.append(f"contract registryCount {on_disk.get('registryCount')} != registry {len(registry)}")
    disk_tags = {cast(dict[str, str], c)["tag"] for c in cast(list[dict[str, object]], on_disk.get("components", []))}
    if disk_tags != set(registry):
        problems.append(f"contract tags drift: -{sorted(disk_tags - set(registry))} +{sorted(set(registry) - disk_tags)}")
    text = LLMS_PATH.read_text(encoding="utf-8")
    table = generated_table(contract)
    if BLOCK_BEGIN in text:
        cur = text[text.index(BLOCK_BEGIN) : text.index(BLOCK_END) + len(BLOCK_END)]
        if cur.strip() != table.strip():
            problems.append("llms.txt generated block drift")
    else:
        problems.append("llms.txt missing generated block")
    heading = re.search(r"### 全部组件索引（(\d+) 个", text)
    if heading and int(heading.group(1)) != len(registry):
        problems.append(f"llms.txt hand heading count {heading.group(1)} != registry {len(registry)}")
    route_events = extract_route_events()
    try:
        enum = schema_event_enum()
        missing = [e for e in route_events if e not in enum]
        if missing:
            problems.append(f"ai-events.schema.json missing events: {missing}")
    except (FileNotFoundError, KeyError):
        problems.append("ai-events.schema.json unreadable")
    return problems


def main(argv: list[str]) -> int:
    check = "--check" in argv
    contract = build_contract()
    if check:
        problems = check_drift(contract)
        for p in problems:
            print(f"[contract] FAIL {p}", file=sys.stderr)
        print(f"[contract] {'FAIL' if problems else 'OK'} registry={contract['registryCount']} routeEvents={len(contract['routeRichEvents'])}")
        return 1 if problems else 0
    CONTRACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONTRACT_PATH.write_text(json.dumps(contract, ensure_ascii=False, indent=1), encoding="utf-8")
    LLMS_PATH.write_text(update_llms(contract), encoding="utf-8")
    print(f"[contract] wrote {CONTRACT_PATH.relative_to(ROOT)} + llms.txt block (registry={contract['registryCount']})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
