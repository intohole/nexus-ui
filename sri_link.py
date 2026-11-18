"""SRI 发版链联动件：业务仓 nexus-ui CDN 资产引用的 integrity 重算+守底（C8）。

hash 源按引用版本号优先取 nexus-ui/v<ver>/ 快照（发版后工作树演进，快照才是 CDN 真字节）；
快照缺失（发版中途 bump 后 publish 前）回退工作树。S171。
"""
from __future__ import annotations

import base64
import hashlib
import re
from pathlib import Path

import release_chain as rc

CDN_RE = re.compile(
    r'(src|href)="(https://songguokr\.com/nexus-ui/(v[\d.]+)/([^"]+\.(?:js|css)))([^"]*)"'
)
INTEGRITY_RE = re.compile(r'crossorigin="anonymous"\s+integrity="sha384-([A-Za-z0-9+/=]+)"')
EXTRA_SKIP_DIRS = {"blueprints", "games"}


def sha384_b64(data: bytes) -> str:
    return base64.b64encode(hashlib.sha384(data).digest()).decode()


def resolve_asset(repo: Path, version: str, subpath: str) -> Path | None:
    snap = repo / version / subpath
    if snap.is_file():
        return snap
    work = repo / subpath
    return work if work.is_file() else None


def _html_targets(workspace: Path, repo: Path) -> list[Path]:
    repo_root = repo.resolve()
    out: list[Path] = []
    for p in sorted(workspace.rglob("*.html")):
        try:
            rp = p.resolve()
        except OSError:
            continue
        if rp == repo_root or repo_root in rp.parents:
            continue
        rel = p.relative_to(workspace)
        if any(x.startswith(".") for x in rel.parts):
            continue
        if any(x in rc.SKIP_DIRS or x in EXTRA_SKIP_DIRS for x in rel.parts):
            continue
        if any(rc.SNAPSHOT_RE.match(x) for x in rel.parts[:2]):
            continue
        out.append(p)
    return out


def _process(html_path: Path, repo: Path, fix: bool) -> tuple[int, int, int]:
    src = html_path.read_text(encoding="utf-8")
    added = fixed = checked = 0
    out_lines: list[str] = []
    for line in src.splitlines(keepends=True):
        m = CDN_RE.search(line)
        if not m:
            out_lines.append(line)
            continue
        local = resolve_asset(repo, m.group(3), m.group(4))
        if local is None:
            out_lines.append(line)
            continue
        digest = sha384_b64(local.read_bytes())
        existing = INTEGRITY_RE.search(line)
        if existing:
            checked += 1
            if existing.group(1) != digest:
                if fix:
                    newline = line.replace(f"sha384-{existing.group(1)}", f"sha384-{digest}", 1)
                    out_lines.append(newline)
                    fixed += 1
                    continue
                fixed += 1
        else:
            if fix:
                tail = m.group(5)
                newline = line.replace(
                    m.group(0),
                    f'{m.group(1)}="{m.group(2)}{tail}" crossorigin="anonymous" integrity="sha384-{digest}"',
                    1,
                )
                out_lines.append(newline)
                added += 1
                continue
            checked += 1
        out_lines.append(line)
    if fix and (added or fixed):
        html_path.write_text("".join(out_lines), encoding="utf-8")
    return added, fixed, checked


def sri_resync() -> tuple[int, int]:
    added, fixed, _total = _scan_all(fix=True)
    return added, fixed


def _scan_all(fix: bool) -> tuple[int, int, int]:
    repo: Path = rc.REPO
    workspace: Path = rc.WORKSPACE
    a = f = c = 0
    for hf in _html_targets(workspace, repo):
        try:
            ha, hf_, hc = _process(hf, repo, fix)
        except UnicodeDecodeError:
            print(f"  [skip-non-utf8] {hf}")
            continue
        a += ha
        f += hf_
        c += hc
    return a, f, c


def c8_sri_guard() -> rc.Check:
    c = rc.Check("C8", "SRI 守底：全工作区 nexus-ui 资产引用 integrity 与快照/工作树一致")
    _, mismatch, checked = _scan_all(fix=False)
    c.ok = mismatch == 0
    c.detail = f"checked {checked}, mismatch {mismatch}"
    return c
