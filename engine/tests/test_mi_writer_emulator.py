"""Integration acceptance test for Stage 5; requires Firestore Emulator."""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone

import pytest

from mi_firestore_writer import MediaIntelligenceWriter, create_client


pytestmark = pytest.mark.skipif(
    not os.environ.get("FIRESTORE_EMULATOR_HOST"),
    reason="Firestore Emulator is not running",
)


def test_three_runs_are_idempotent_and_auditable():
    writer = MediaIntelligenceWriter(create_client("demo-media-intelligence"))
    namespace = uuid.uuid4().hex
    source_id = f"source-{namespace}"
    url_hash = f"url-{namespace}"
    source = {
        "id": source_id, "name": "Pilot Source", "domain": "example.test",
        "allowed_domains": ["example.test"], "source_class": "earned_media",
        "priority": "high", "enabled": True, "parser_version": 1,
        "discovery": {"type": "rss", "urls": ["https://example.test/feed"]},
    }
    item = {
        "source_id": source_id, "source_name": "Pilot Source",
        "source_class": "earned_media", "url": "https://example.test/pinrang",
        "normalized_url": "https://example.test/pinrang",
        "canonical_url": "https://example.test/pinrang", "url_hash": url_hash,
        "title": "Harga bahan pokok di Pinrang stabil", "excerpt": "Laporan pasar.",
        "published_at": datetime.now(timezone.utc), "published_at_source": "RSS",
        "verification_status": "VERIFIED_DIRECT", "verification_notes": [],
        "content_hash": f"content-{namespace}", "relevanceScore": 75,
        "matchedGeo": ["pinrang"], "matchedClusters": ["perdagangan"],
    }

    writer.sync_sources([source])
    outcomes = []
    for number in range(1, 4):
        run_id = f"run-{namespace}-{number}"
        writer.start_run(run_id, trigger="test", sources_total=1, engine_version="test")
        writer.update_source_state(source_id, success=True, article_count=1)
        outcome = writer.write_item(item)
        outcomes.append(outcome)
        counters = {"sources_ok": 1, "sources_failed": 0, "candidates_found": 1,
                    "items_new": int(outcome == "new"), "items_updated": 0,
                    "duplicates": int(outcome == "duplicate"), "rejected": 0,
                    "needs_review": 0}
        writer.finish_run(run_id, status="SUCCESS", counters=counters, runtime_seconds=0.1)

    assert outcomes == ["new", "duplicate", "duplicate"]
    assert writer.db.collection("mi_items").document(url_hash).get().exists
    runs = [writer.db.collection("mi_sync_runs").document(
        f"run-{namespace}-{number}").get().to_dict() for number in range(1, 4)]
    assert [run["status"] for run in runs] == ["SUCCESS"] * 3
    assert [run["items_new"] for run in runs] == [1, 0, 0]
    assert [run["duplicates"] for run in runs] == [0, 1, 1]
    state = writer.db.collection("mi_source_state").document(source_id).get().to_dict()
    assert state["health"] == "OK"
    assert state["consecutive_failures"] == 0
    assert writer.backfill_intelligence() >= 1
    linked = writer.db.collection("mi_items").document(url_hash).get().to_dict()
    assert linked["story_cluster_id"]
    assert linked["issue_id"]
    writer.db.collection("mi_items").document(url_hash).set(
        {"verification_status": "MANUAL_VERIFIED"}, merge=True)
    review_run = f"review-snapshot-{namespace}"
    writer.start_run(review_run, trigger="test", sources_total=1, engine_version="test")
    writer.finish_run(review_run, status="SUCCESS", counters={}, runtime_seconds=0.1)
    snapshot = writer.generate_public_snapshot(sync_run_id=review_run)
    assert any(entry["title"] == item["title"] for entry in snapshot["latest_items"])


def test_four_portals_create_four_mentions_but_one_story():
    writer = MediaIntelligenceWriter(create_client("demo-media-intelligence"))
    namespace = uuid.uuid4().hex
    titles = [
        "Kelangkaan LPG 3 Kg di Bungi Picu Antrean Warga",
        "Warga Bungi Antre akibat LPG 3 Kg Langka",
        "LPG 3 Kg Langka, Warga Bungi Terpaksa Mengantre",
        "Antrean Warga Bungi Terjadi karena Kelangkaan LPG 3 Kg",
    ]
    cluster_ids, issue_ids = set(), set()
    for index, title in enumerate(titles):
        source_id = f"portal-{namespace}-{index}"
        item_id = f"story-item-{namespace}-{index}"
        item = {
            "source_id": source_id, "source_name": source_id,
            "source_class": "earned_media", "url": f"https://{source_id}.test/news",
            "normalized_url": f"https://{source_id}.test/news",
            "canonical_url": f"https://{source_id}.test/news", "url_hash": item_id,
            "title": title, "excerpt": "Laporan kejadian yang sama.",
            "published_at": datetime.now(timezone.utc), "published_at_source": "test",
            "verification_status": "VERIFIED_DIRECT", "verification_notes": [],
            "content_hash": f"content-{namespace}-{index}", "relevanceScore": 80,
            "matchedGeo": [f"duampanua-{namespace}"], "matchedClusters": ["lpg"],
        }
        assert writer.write_item(item) == "new"
        cluster_id, issue_id = writer.assign_story_and_issue(item_id)
        cluster_ids.add(cluster_id)
        issue_ids.add(issue_id)
        if index == 2:
            writer.db.collection("mi_issues").document(issue_id).set(
                {"verification_status": "VERIFIED"}, merge=True)

    assert len(cluster_ids) == 1
    assert len(issue_ids) == 1
    cluster = writer.db.collection("mi_story_clusters").document(cluster_ids.pop()).get().to_dict()
    assert cluster["item_count"] == 4
    assert cluster["source_count"] == 4
    issue = writer.db.collection("mi_issues").document(issue_ids.pop()).get().to_dict()
    assert issue["item_count"] == 4
    assert issue["verification_status"] == "VERIFIED"
    metrics = writer.update_metrics()
    assert metrics["earned_mentions_24h"] >= 4
    assert metrics["unique_stories_24h"] >= 1
    assert metrics["active_sources_24h"] >= 4
    assert metrics["active_critical_issues"] >= 1

    run_id = f"snapshot-run-{namespace}"
    writer.start_run(run_id, trigger="test", sources_total=4, engine_version="test")
    writer.finish_run(run_id, status="SUCCESS", counters={"sources_ok": 4}, runtime_seconds=1)
    snapshot = writer.generate_public_snapshot(sync_run_id=run_id)
    required = {"schema_version", "generated_at", "sync_run_id", "system_status",
                "last_run_at", "last_data_update_at", "last_full_success_at",
                "source_health", "kpis", "top_stories", "top_issues", "latest_items",
                "trend_7d"}
    assert required <= snapshot.keys()
    assert snapshot["kpis"]["mentions_trend_pct"] == "BARU" or isinstance(
        snapshot["kpis"]["mentions_trend_pct"], (int, float))
    assert len(snapshot["latest_items"]) <= 30
    assert len(snapshot["top_stories"]) <= 10
    assert len(snapshot["top_issues"]) <= 10
    assert len(snapshot["trend_7d"]) <= 7
    serialized = json.dumps(snapshot, default=str)
    assert len(serialized.encode("utf-8")) < 1_000_000
    for forbidden in ("review_notes", "admin_identity", "internal_disposition",
                      "last_error_message", "email", "phone"):
        assert f'"{forbidden}"' not in serialized
