import gzip
import json
import uuid
from datetime import datetime, timedelta, timezone

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


def test_cleanup_refuses_oversized_plan():
    try:
        apply_cleanup(None, {"mi_items": [object(), object()], "mi_sync_runs": [],
                             "mi_review_tasks": []}, CleanupPolicy(max_deletes=1))
    except RuntimeError as error:
        assert "batas" in str(error)
    else:
        raise AssertionError("Oversized cleanup harus ditolak")


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
