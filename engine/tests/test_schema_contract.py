import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_schema_contract_uses_final_collection_names():
    contract = json.loads((ROOT / "engine/config/mi_schema_contract.json").read_text(encoding="utf-8"))
    expected = {
        "mi_sources", "mi_source_state", "mi_items", "mi_story_clusters",
        "mi_issues", "mi_review_tasks", "mi_sync_runs", "mi_daily_metrics",
        "mi_audit_logs", "mi_public",
    }
    assert set(contract["collections"]) == expected
    assert contract["public_snapshot"]["document"] == "current"


def test_public_snapshot_limits_match_master_plan():
    contract = json.loads((ROOT / "engine/config/mi_schema_contract.json").read_text(encoding="utf-8"))
    assert contract["public_snapshot"]["limits"] == {
        "latest_items": 30,
        "top_stories": 10,
        "top_issues": 10,
        "trend_7d": 7,
    }


def test_rules_expose_only_public_snapshot_to_anonymous_users():
    rules = (ROOT / "firestore.rules").read_text(encoding="utf-8")
    assert "allow read: if docId == 'current';" in rules
    for collection in (
        "mi_sources", "mi_items", "mi_source_state", "mi_sync_runs",
        "mi_story_clusters", "mi_issues", "mi_review_tasks",
        "mi_daily_metrics", "mi_audit_logs",
    ):
        block_start = rules.index(f"match /{collection}/")
        block = rules[block_start:rules.index("}", block_start) + 1]
        assert "if true" not in block


def test_firebase_config_declares_rules_and_indexes():
    config = json.loads((ROOT / "firebase.json").read_text(encoding="utf-8"))
    assert config["firestore"]["rules"] == "firestore.rules"
    assert config["firestore"]["indexes"] == "firestore.indexes.json"
