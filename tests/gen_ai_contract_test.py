from __future__ import annotations

import importlib.util
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCRIPTS = REPO / "scripts"

spec = importlib.util.spec_from_file_location("gen_ai_contract", SCRIPTS / "gen_ai_contract.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def test_check_green() -> None:
    assert mod.main(["--check"]) == 0


def test_generated_block_matches_contract() -> None:
    text = (REPO / "llms.txt").read_text(encoding="utf-8")
    contract = mod.build_contract()
    cur = text[text.index(mod.BLOCK_BEGIN): text.index(mod.BLOCK_END) + len(mod.BLOCK_END)]
    assert cur.strip() == mod.generated_table(contract).strip()


def test_check_red_on_generated_block_drift(tmp_path: Path, monkeypatch: object) -> None:
    llms_tmp = tmp_path / "llms.txt"
    llms_tmp.write_text(
        (REPO / "llms.txt").read_text(encoding="utf-8").replace(mod.BLOCK_BEGIN, "<!-- blocked -->"),
        encoding="utf-8",
    )
    monkeypatch.setattr(mod, "LLMS_PATH", llms_tmp)
    problems = mod.check_drift(mod.build_contract())
    assert any("generated block" in p for p in problems)


def test_check_red_on_registry_tag_drift(tmp_path: Path, monkeypatch: object) -> None:
    reg_tmp = tmp_path / "nexus-components.js"
    reg_tmp.write_text(
        (REPO / "js" / "nexus-components.js").read_text(encoding="utf-8")
        + "\n    'nux-fake-future': 'NuxFakeFuture',\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(mod, "REGISTRY_PATH", reg_tmp)
    problems = mod.check_drift(mod.build_contract())
    assert any("nux-fake-future" in p for p in problems)


def test_schema_covers_route_events() -> None:
    enum = mod.schema_event_enum()
    required = {"meta", "tool", "interrupt", "subagent_started", "activity_snapshot", "activity_delta", "reasoning_end"}
    assert required <= enum


def test_extract_props_shapes() -> None:
    src = (
        "props: { items: { type: Array, default: function () { return []; } }, "
        "title: { type: String, default: 'x' }, open: Boolean, mix: { type: [Array, String] } }"
    )
    props = mod.extract_props(src)
    assert props["items"] == "Array"
    assert props["title"] == "String"
    assert props["open"] == "Boolean"
    assert "Array" in props["mix"]


def test_registry_and_route_events_real() -> None:
    contract = mod.build_contract()
    assert contract["registryCount"] == len(mod.read_registry())
    assert contract["registryCount"] == 78
    assert {"meta", "tool", "widget", "subagent_finish", "thinking_end"} <= set(contract["routeRichEvents"])


def test_new_primitives_in_contract() -> None:
    contract = mod.build_contract()
    tags = {c["tag"]: c for c in contract["components"]}
    for tag in ("nux-diff-review", "nux-plan-card", "nux-run-telemetry"):
        assert tag in tags, tag
        assert tags[tag].get("hasTemplate") is True
    assert "decide" in tags["nux-diff-review"]["emits"]
    assert "item-click" in tags["nux-plan-card"]["emits"]
    assert "parse" in tags["nux-diff-review"]["statics"]
    assert "collect" in tags["nux-run-telemetry"]["statics"]
