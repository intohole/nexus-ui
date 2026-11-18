from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path

import pytest

import release_chain as rc
import sri_link


def _write(path: Path, data: bytes | str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, str):
        path.write_text(data, encoding="utf-8")
    else:
        path.write_bytes(data)


def _sha384(data: bytes) -> str:
    return base64.b64encode(hashlib.sha384(data).digest()).decode()


def _fake_nexus_ui(tmp_path: Path, worktree_js: bytes, snapshot_js: bytes | None) -> Path:
    repo = tmp_path / "nexus-ui"
    _write(repo / "js" / "a.js", worktree_js)
    _write(repo / "package.json", json.dumps({"version": "1.0.0"}))
    _write(repo / "deps.json", json.dumps({"deps": {"nexus-ui": {"version": "1.0.0"}}}))
    if snapshot_js is not None:
        _write(repo / "v1.0.0" / "js" / "a.js", snapshot_js)
    return repo


REF_OK = '<script src="https://songguokr.com/nexus-ui/v1.0.0/js/a.js" crossorigin="anonymous" integrity="sha384-{h}"></script>'
REF_STALE = '<script src="https://songguokr.com/nexus-ui/v1.0.0/js/a.js" crossorigin="anonymous" integrity="sha384-AAAAAAAA"></script>'
REF_BARE = '<script src="https://songguokr.com/nexus-ui/v1.0.0/js/a.js"></script>'
REF_PAGE = '<a href="https://songguokr.com/nexus-ui/v1.0.0/agreement.html">条款</a>'


def test_guard_red_on_stale_integrity(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_nexus_ui(tmp_path, b"worktree-bytes", None)
    _write(tmp_path / "appA" / "index.html", REF_STALE)
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    c = sri_link.c8_sri_guard()
    assert c.ok is False
    assert "MISMATCH" in c.detail or "mismatch" in c.detail


def test_guard_green_on_fresh_integrity(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_nexus_ui(tmp_path, b"worktree-bytes", None)
    h = _sha384(b"worktree-bytes")
    _write(tmp_path / "appA" / "index.html", REF_OK.format(h=h))
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    c = sri_link.c8_sri_guard()
    assert c.ok is True


def test_guard_ignores_page_refs_and_bare(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_nexus_ui(tmp_path, b"worktree-bytes", None)
    _write(tmp_path / "appA" / "index.html", REF_PAGE + "\n" + REF_BARE)
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    c = sri_link.c8_sri_guard()
    assert c.ok is True
    assert "0" in c.detail


def test_snapshot_priority_over_worktree(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_nexus_ui(tmp_path, b"new-bytes", b"old-bytes")
    h = _sha384(b"old-bytes")
    _write(tmp_path / "appA" / "index.html", REF_OK.format(h=h))
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    c = sri_link.c8_sri_guard()
    assert c.ok is True

    wrong = _sha384(b"new-bytes")
    _write(tmp_path / "appA" / "index.html", REF_OK.format(h=wrong))
    c = sri_link.c8_sri_guard()
    assert c.ok is False


def test_resync_adds_and_fixes(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_nexus_ui(tmp_path, b"worktree-bytes", None)
    _write(tmp_path / "appA" / "index.html", REF_STALE + "\n" + REF_BARE)
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    added, fixed = sri_link.sri_resync()
    assert added == 1 and fixed == 1
    h = _sha384(b"worktree-bytes")
    text = (tmp_path / "appA" / "index.html").read_text(encoding="utf-8")
    assert text.count(f'sha384-{h}') == 2
    assert sri_link.c8_sri_guard().ok is True


def test_resync_after_version_bump_keeps_valid_hash(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_nexus_ui(tmp_path, b"same-bytes", None)
    h = _sha384(b"same-bytes")
    _write(tmp_path / "appA" / "index.html", '<script src="https://songguokr.com/nexus-ui/v2.0.0/js/a.js" crossorigin="anonymous" integrity="sha384-AAAA"></script>')
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    added, fixed = sri_link.sri_resync()
    assert fixed == 1
    text = (tmp_path / "appA" / "index.html").read_text(encoding="utf-8")
    assert f"sha384-{h}" in text
    assert sri_link.c8_sri_guard().ok is True


def test_guard_skips_missing_asset_source(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_nexus_ui(tmp_path, b"worktree-bytes", None)
    _write(tmp_path / "appA" / "index.html", '<script src="https://songguokr.com/nexus-ui/v1.0.0/js/gone.js" crossorigin="anonymous" integrity="sha384-BBBB"></script>')
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    c = sri_link.c8_sri_guard()
    assert c.ok is True


def test_c8_wired_into_run_checks(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_nexus_ui(tmp_path, b"x", None)
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    failed, checks, _ = rc.run_checks(with_closure=False)
    ids = [c.cid for c in checks]
    assert "C8" in ids


def test_apply_chain_includes_sri_step() -> None:
    names = [n for n, _ in rc.APPLY_CHAIN()]
    assert "sri_resync" in names


def test_generated_products_excluded(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_nexus_ui(tmp_path, b"worktree-bytes", None)
    _write(tmp_path / "arcade" / "data" / "g1" / "index.html", REF_BARE)
    _write(tmp_path / "arcade" / "blueprints" / "g2" / "index.html", REF_BARE)
    _write(tmp_path / ".v2c" / "serve" / "p.html", REF_BARE)
    _write(tmp_path / ".v2c" / "serve" / "sub" / "p2.html", REF_BARE)
    _write(tmp_path / "appA" / "index.html", REF_BARE)
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    added, fixed = sri_link.sri_resync()
    assert added == 1 and fixed == 0
    assert 'integrity="sha384-' in (tmp_path / "appA" / "index.html").read_text(encoding="utf-8")
    assert 'integrity=' not in (tmp_path / "arcade" / "data" / "g1" / "index.html").read_text(encoding="utf-8")
    assert 'integrity=' not in (tmp_path / "arcade" / "blueprints" / "g2" / "index.html").read_text(encoding="utf-8")
    assert 'integrity=' not in (tmp_path / ".v2c" / "serve" / "p.html").read_text(encoding="utf-8")
