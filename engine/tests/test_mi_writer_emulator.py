"""Integration acceptance test for Stage 5; requires Firestore Emulator."""
from __future__ import annotations

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
