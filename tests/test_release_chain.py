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


def test_plan_distribution_never_self_copies(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """r105 事故不变量：任何打印配方都不得出现「目标目录在源树内」的自拷贝形态。"""
    lines = rc.plan_distribution("2.70.0")
    text = "\n".join(lines)
    for _, _, apps_root in rc.NODE_MAP:
        assert f"rsync -a --delete {apps_root}/ {apps_root}/v" not in text
        assert f"mkdir -p {apps_root}/v" not in text
    for name, ssh_alias, apps_root in rc.NODE_MAP:
        assert f"ssh {ssh_alias} 'cd {apps_root} && git pull --ff-only'" in text
        assert f"rsync -a --delete ./v2.70.0/ {ssh_alias}:{apps_root}/v2.70.0/" in text


def test_c6_fails_on_body_anomaly(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """教训#45/#49：exit=0 但 body 异常非 0 必须判 FAIL（r105 C6 假绿形态）。"""
    repo = _fake_repo(tmp_path, "2.69.0", "2.69.0")
    monkeypatch.setattr(rc, "REPO", repo)

    def fake_sh(cmd, cwd):
        if "check_deps" in cmd[1]:
            return 0, "扫描完成: 含 CDN 引用的 HTML 107 个,一致 89 个,异常文件 18 个,跳过非文本 0 个"
        return 0, "ok"

    monkeypatch.setattr(rc, "sh", fake_sh)
    c = rc.c6_external_gates()
    assert c.ok is False
    assert "18" in c.detail


def test_c7_closure_pass_and_fail(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _fake_repo(tmp_path, "2.69.0", "2.69.0")
    monkeypatch.setattr(rc, "REPO", repo)

    def ok_sh(cmd, cwd):
        if "sync_version" in cmd[1]:
            return 0, "同步完成: 扫描 100 个文件, 变更 0 个, 跳过非文本 0 个, 目标版本 v2.69.0"
        return 0, "扫描完成: 含 CDN 引用的 HTML 107 个,一致 107 个,异常文件 0 个,跳过非文本 0 个"

    monkeypatch.setattr(rc, "sh", ok_sh)
    assert rc.c7_closure().ok is True

    def drift_sh(cmd, cwd):
        if "sync_version" in cmd[1]:
            return 0, "同步完成: 扫描 100 个文件, 变更 18 个, 跳过非文本 0 个, 目标版本 v2.69.0"
        return ok_sh(cmd, cwd)

    monkeypatch.setattr(rc, "sh", drift_sh)
    c = rc.c7_closure()
    assert c.ok is False
    assert "18" in c.detail


def test_node_map_apps_roots_are_git_bodies() -> None:
    """四节点 live 真身统一为 apps git 仓（r106 实证；rsync 型 legacy 根不在分发路径）。"""
    assert len(rc.NODE_MAP) == 4
    for name, ssh_alias, apps_root in rc.NODE_MAP:
        assert apps_root.endswith("miniDeploy/apps/nexus-ui")
        assert ssh_alias
