from __future__ import annotations

import json
from pathlib import Path

import pytest

import release_chain as rc


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _fake_repo(tmp_path: Path, pkg_v: str, deps_v: str) -> Path:
    repo = tmp_path / "nexus-ui"
    _write(repo / "package.json", json.dumps({"version": pkg_v}))
    _write(repo / "deps.json", json.dumps({"deps": {"nexus-ui": {"version": deps_v}}}))
    return repo


def test_c1_detects_version_drift(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_repo(tmp_path, "2.66.0", "2.67.0")
    monkeypatch.setattr(rc, "REPO", repo)
    c = rc.c1_version_sync()
    assert c.ok is False
    assert "2.66.0" in c.detail and "2.67.0" in c.detail


def test_c1_passes_when_synced(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_repo(tmp_path, "2.67.0", "2.67.0")
    monkeypatch.setattr(rc, "REPO", repo)
    assert rc.c1_version_sync().ok is True


def test_c4_missing_snapshot_fails(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_repo(tmp_path, "9.9.9", "9.9.9")
    monkeypatch.setattr(rc, "REPO", repo)
    c = rc.c4_snapshot_integrity()
    assert c.ok is False
    assert "不存在" in c.detail


def test_c4_snapshot_missing_key_files(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_repo(tmp_path, "1.2.3", "1.2.3")
    _write(repo / "v1.2.3" / "package.json", "{}")
    _write(repo / "v1.2.3" / "deps.json", "{}")
    monkeypatch.setattr(rc, "REPO", repo)
    missing = rc.snapshot_key_files("1.2.3")
    assert "js/nexus-all.js" in missing
    assert "index.html" in missing


def test_scan_refs_collects_versions(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root = tmp_path
    _write(root / "appA" / "index.html", '<script src="https://x/nexus-ui/v2.67.0/js/a.js"></script>')
    _write(root / "appB" / "page.html", '<script src="https://x/nexus-ui/v2.65.0/js/a.js"></script>')
    _write(root / "appA" / "sub" / "note.md", "引用 nexus-ui/v2.67.0/ 说明")
    monkeypatch.setattr(rc, "WORKSPACE", root)
    monkeypatch.setattr(rc, "REPO", _fake_repo(tmp_path, "2.67.0", "2.67.0"))
    refs = rc.scan_refs()
    assert set(refs) == {"2.67.0", "2.65.0"}
    assert len(refs["2.67.0"]) == 2
    assert refs["2.65.0"] == ["appB/page.html"]


def test_c5_fails_when_ref_without_snapshot(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_repo(tmp_path, "3.0.0", "3.0.0")
    _write(tmp_path / "appC" / "index.html", '<script src="https://x/nexus-ui/v3.0.0/js/a.js"></script>')
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    c, other = rc.c5_current_ref_snapshot()
    assert c.ok is False
    assert "无快照" in c.detail or "r69" in c.detail
    assert other == []


def test_c5_fails_when_no_current_refs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_repo(tmp_path, "3.0.0", "3.0.0")
    _write(repo / "v3.0.0" / "package.json", "{}")
    _write(tmp_path / "appD" / "index.html", '<script src="https://x/nexus-ui/v2.60.0/js/a.js"></script>')
    monkeypatch.setattr(rc, "REPO", repo)
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    c, other = rc.c5_current_ref_snapshot()
    assert c.ok is False
    assert "没有任何文件引用" in c.detail
    assert other == ["2.60.0"]


def test_scan_refs_skips_snapshot_dirs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _write(tmp_path / "nexus-ui" / "v2.65.0" / "index.html", "self nexus-ui/v2.65.0/")
    monkeypatch.setattr(rc, "WORKSPACE", tmp_path)
    refs = rc.scan_refs()
    assert refs == {}


def test_ref_re_versions() -> None:
    assert rc.REF_RE.search("https://songguokr.com/nexus-ui/v2.67.0/js/x.js").group(1) == "2.67.0"
    assert rc.REF_RE.search("nexus-ui/v10.20.30/css") is not None
    assert rc.REF_RE.search("nexus-ui/v2/not-a-version") is None
