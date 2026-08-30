"""Bounded, auditable cleanup for Media Intelligence Firestore data."""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from collector.mi_firestore_writer import create_client

VERIFIED_STATUSES = {"VERIFIED_DIRECT", "VERIFIED_FEED", "MANUAL_VERIFIED"}
CLOSED_REVIEW_STATUSES = {"RESOLVED", "DISMISSED"}


@dataclass(frozen=True)
class CleanupPolicy:
    verified_days: int = 730
    operational_days: int = 90
    max_deletes: int = 400


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def timestamp_value(data: dict, *fields: str):
    for field in fields:
        value = data.get(field)
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return None


def plan_cleanup(db, policy: CleanupPolicy, *, now: datetime | None = None) -> dict[str, list]:
    reference = now or utcnow()
    verified_cutoff = reference - timedelta(days=policy.verified_days)
    operational_cutoff = reference - timedelta(days=policy.operational_days)
    plan = {"mi_items": [], "mi_sync_runs": [], "mi_review_tasks": []}

    for doc in db.collection("mi_items").limit(5000).stream():
        data = doc.to_dict()
        published = timestamp_value(data, "published_at", "created_at")
        if data.get("verification_status") in VERIFIED_STATUSES and published and published < verified_cutoff:
            plan["mi_items"].append(doc)

    for doc in db.collection("mi_sync_runs").limit(2000).stream():
        finished = timestamp_value(doc.to_dict(), "finished_at", "started_at")
        if finished and finished < operational_cutoff:
            plan["mi_sync_runs"].append(doc)

    for doc in db.collection("mi_review_tasks").limit(2000).stream():
        data = doc.to_dict()
        updated = timestamp_value(data, "updated_at", "created_at")
        if data.get("status") in CLOSED_REVIEW_STATUSES and updated and updated < operational_cutoff:
            plan["mi_review_tasks"].append(doc)
    return plan


def apply_cleanup(db, plan: dict[str, list], policy: CleanupPolicy) -> dict[str, int]:
    total = sum(len(docs) for docs in plan.values())
    if total > policy.max_deletes:
        raise RuntimeError(f"Cleanup menolak {total} delete; batas per run {policy.max_deletes}.")

    deleted_item_ids = {doc.id for doc in plan["mi_items"]}
    affected_clusters = set()
    for doc in plan["mi_items"]:
        cluster_id = (doc.to_dict() or {}).get("story_cluster_id")
        if cluster_id:
            affected_clusters.add(cluster_id)

    batch = db.batch()
    for docs in plan.values():
        for doc in docs:
            batch.delete(doc.reference)
    batch.commit()

    # Keep story/issue metadata consistent when old verified items expire.
    for cluster_id in affected_clusters:
        ref = db.collection("mi_story_clusters").document(cluster_id)
        snapshot = ref.get()
        if not snapshot.exists:
            continue
        remaining = [value for value in (snapshot.to_dict().get("item_ids") or [])
                     if value not in deleted_item_ids]
        if remaining:
            ref.set({"item_ids": remaining, "item_count": len(remaining),
                     "updated_at": utcnow()}, merge=True)
        else:
            ref.delete()
            db.collection("mi_issues").document(
                f"issue-{cluster_id.removeprefix('story-')}").delete()
    return {key: len(value) for key, value in plan.items()}


def main() -> int:
    parser = argparse.ArgumentParser(description="Media Intelligence retention cleanup")
    parser.add_argument("--apply", action="store_true", help="Apply deletes; default is dry-run")
    parser.add_argument("--verified-days", type=int, default=730)
    parser.add_argument("--operational-days", type=int, default=90)
    parser.add_argument("--max-deletes", type=int, default=400)
    args = parser.parse_args()
    policy = CleanupPolicy(args.verified_days, args.operational_days, args.max_deletes)
    if policy.verified_days < 365 or policy.operational_days < 30 or policy.max_deletes > 450:
        raise SystemExit("Retention/batas delete di luar policy aman.")
    db = create_client()
    plan = plan_cleanup(db, policy)
    counts = {key: len(value) for key, value in plan.items()}
    print({"mode": "APPLY" if args.apply else "DRY_RUN", "candidates": counts})
    if args.apply:
        print({"deleted": apply_cleanup(db, plan, policy)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
