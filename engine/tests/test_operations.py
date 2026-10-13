import gzip
import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from backup_firestore import BACKUP_COLLECTIONS, create_backup
from cleanup_firestore import CleanupPolicy, apply_cleanup, plan_cleanup
from mi_firestore_writer import create_client


def test_cleanup_dry_run_and_apply_are_bounded():
    db = create_client("demo-media-intelligence")
    suffix = uuid.uuid4().hex
    old = datetime.now(timezone.utc) - timedelta(days=800)
    recent = datetime.now(timezone.utc) - timedelta(days=5)
    old_item, recent_item = f"old-{suffix}", f"recent-{suffix}"
    cluster_id, issue_id = f"story-{suffix}", f"issue-{suffix}"
    db.collection("mi_items").document(old_item).set({
        "verification_status": "VERIFIED_DIRECT", "published_at": old,
        "story_cluster_id": cluster_id})
    db.collection("mi_items").document(recent_item).set({
        "verification_status": "VERIFIED_DIRECT", "published_at": recent,
        "source_id": f"source-{suffix}", "title": "Fixture retention recent"})
    db.collection("mi_story_clusters").document(cluster_id).set({"item_ids": [old_item]})
    db.collection("mi_issues").document(issue_id).set({"story_cluster_id": cluster_id})
    db.collection("mi_sync_runs").document(f"run-{suffix}").set({"finished_at": old})
    db.collection("mi_review_tasks").document(f"review-{suffix}").set(
        {"status": "RESOLVED", "updated_at": old})

    policy = CleanupPolicy(max_deletes=10)
    plan = plan_cleanup(db, policy)
    assert old_item in {doc.id for doc in plan["mi_items"]}
    assert recent_item not in {doc.id for doc in plan["mi_items"]}
    assert db.collection("mi_items").document(old_item).get().exists
    apply_cleanup(db, plan, policy)
    assert not db.collection("mi_items").document(old_item).get().exists
    assert db.collection("mi_items").document(recent_item).get().exists
    assert not db.collection("mi_story_clusters").document(cluster_id).get().exists
    assert not db.collection("mi_issues").document(issue_id).get().exists


def test_cleanup_rebuilds_cluster_and_issue_summaries():
    db = create_client("demo-media-intelligence")
    suffix = uuid.uuid4().hex
    old = datetime.now(timezone.utc) - timedelta(days=800)
    recent = datetime.now(timezone.utc) - timedelta(days=5)
    old_item, recent_item = f"old-shared-{suffix}", f"recent-shared-{suffix}"
    cluster_id, issue_id = f"story-shared-{suffix}", f"issue-shared-{suffix}"

    db.collection("mi_items").document(old_item).set({
        "verification_status": "VERIFIED_DIRECT",
        "published_at": old,
        "story_cluster_id": cluster_id,
        "source_id": f"old-source-{suffix}",
        "relevance_score": 95,
    })
    db.collection("mi_items").document(recent_item).set({
        "verification_status": "VERIFIED_DIRECT",
        "published_at": recent,
        "story_cluster_id": cluster_id,
        "source_id": f"recent-source-{suffix}",
        "relevance_score": 70,
    })
    db.collection("mi_story_clusters").document(cluster_id).set({
        "item_ids": [old_item, recent_item],
        "source_ids": [f"old-source-{suffix}", f"recent-source-{suffix}"],
        "item_count": 2,
        "source_count": 2,
        "max_relevance_score": 95,
        "representative_title": "Fixture shared story",
        "topic_ids": ["perdagangan"],
        "district_ids": ["pinrang"],
        "first_item_at": old,
        "last_item_at": recent,
    })
    db.collection("mi_issues").document(issue_id).set({
        "story_cluster_id": cluster_id,
        "verification_status": "VERIFIED",
        "status": "MONITORING",
        "severity": "CRITICAL",
        "item_count": 2,
        "source_count": 2,
    })

    policy = CleanupPolicy(max_deletes=10, max_rebuild_reads=10)
    plan = plan_cleanup(db, policy)
    apply_cleanup(db, plan, policy)

    cluster = db.collection("mi_story_clusters").document(cluster_id).get().to_dict()
    assert cluster["item_ids"] == [recent_item]
    assert cluster["item_count"] == 1
    assert cluster["source_ids"] == [f"recent-source-{suffix}"]
    assert cluster["source_count"] == 1
    assert cluster["max_relevance_score"] == 70
    assert cluster["first_item_at"] == recent
    assert cluster["last_item_at"] == recent

    issue = db.collection("mi_issues").document(issue_id).get().to_dict()
    assert issue["verification_status"] == "VERIFIED"
    assert issue["status"] == "MONITORING"
    assert issue["severity"] == "MEDIUM"
    assert issue["item_count"] == 1
    assert issue["source_count"] == 1
    assert issue["opened_at"] == recent
    assert issue["last_item_at"] == recent

    assert not db.collection("mi_items").document(old_item).get().exists
    assert db.collection("mi_items").document(recent_item).get().exists


def test_cleanup_refuses_oversized_plan():
    with pytest.raises(RuntimeError, match="batas"):
        apply_cleanup(
            None,
            {"mi_items": [object(), object()], "mi_sync_runs": [], "mi_review_tasks": []},
            CleanupPolicy(max_deletes=1),
        )


def test_backup_is_gzipped_json_with_manifest(tmp_path):
    db = create_client("demo-media-intelligence")
    suffix = uuid.uuid4().hex
    db.collection("mi_sources").document(f"backup-{suffix}").set(
        {"name": "Test", "updated_at": datetime.now(timezone.utc)})
    output = tmp_path / "mi-test.json.gz"
    manifest = create_backup(db, output)
    with gzip.open(output, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)
    assert output.with_suffix(".gz.manifest.json").exists()
    assert set(payload["collections"]) == set(BACKUP_COLLECTIONS)
    assert any(doc["id"] == f"backup-{suffix}"
               for doc in payload["collections"]["mi_sources"])
    assert len(manifest["sha256"]) == 64
    assert manifest["complete"] is True


def test_backup_refuses_silent_collection_truncation(tmp_path):
    db = create_client("demo-media-intelligence")
    suffix = uuid.uuid4().hex
    for index in range(2):
        db.collection("mi_sources").document(f"bounded-{suffix}-{index}").set(
            {"name": f"Bounded {index}", "updated_at": datetime.now(timezone.utc)})

    output = tmp_path / "mi-truncated.json.gz"
    with pytest.raises(RuntimeError, match="melebihi batas"):
        create_backup(db, output, max_docs_per_collection=1)

    assert not output.exists()
    assert not output.with_suffix(".gz.manifest.json").exists()
