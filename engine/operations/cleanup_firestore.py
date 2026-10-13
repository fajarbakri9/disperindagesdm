"""Bounded, auditable cleanup for Media Intelligence Firestore data."""
from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from collector.mi_firestore_writer import create_client
from collector.story_intelligence import severity_from_relevance

VERIFIED_STATUSES = {"VERIFIED_DIRECT", "VERIFIED_FEED", "MANUAL_VERIFIED"}
CLOSED_REVIEW_STATUSES = {"RESOLVED", "DISMISSED"}


@dataclass(frozen=True)
class CleanupPolicy:
    verified_days: int = 730
    operational_days: int = 90
    max_deletes: int = 400
    max_rebuild_reads: int = 1000


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


def _cluster_repair_plan(db, cluster_id: str, docs: list, *, read_budget: int) -> tuple[dict, int]:
    """Preflight one cluster repair without writing anything.

    Returns a repair description and the number of remaining-item reads consumed.
    Missing cluster metadata fails closed because deleting referenced items while
    the cluster is already inconsistent would make recovery harder.
    """
    cluster_ref = db.collection("mi_story_clusters").document(cluster_id)
    cluster_snapshot = cluster_ref.get()
    if not cluster_snapshot.exists:
        raise RuntimeError(
            f"Cleanup dibatalkan: mi_story_clusters/{cluster_id} tidak ditemukan "
            "padahal kandidat item masih mereferensikannya."
        )

    cluster = cluster_snapshot.to_dict() or {}
    planned_ids = {doc.id for doc in docs}
    remaining_ids = [
        item_id for item_id in (cluster.get("item_ids") or [])
        if item_id not in planned_ids
    ]
    if len(remaining_ids) > read_budget:
        raise RuntimeError(
            f"Cleanup dibatalkan: rebuild cluster {cluster_id} membutuhkan "
            f"{len(remaining_ids)} reads, melebihi sisa budget {read_budget}."
        )

    remaining_items = []
    for item_id in remaining_ids:
        snapshot = db.collection("mi_items").document(item_id).get()
        if not snapshot.exists:
            continue
        data = snapshot.to_dict() or {}
        data["_id"] = snapshot.id
        remaining_items.append(data)

    return {
        "cluster_id": cluster_id,
        "cluster_ref": cluster_ref,
        "cluster": cluster,
        "delete_docs": docs,
        "remaining_items": remaining_items,
    }, len(remaining_ids)


def _summary_from_remaining(items: list[dict]) -> dict:
    item_ids = [item["_id"] for item in items]
    source_ids = list(dict.fromkeys(
        item.get("source_id") for item in items if item.get("source_id")
    ))
    timestamps = [
        timestamp_value(item, "published_at", "created_at")
        for item in items
    ]
    timestamps = [value for value in timestamps if value]
    max_relevance = max(
        (int(item.get("relevance_score", 0) or 0) for item in items),
        default=0,
    )
    return {
        "item_ids": item_ids,
        "item_count": len(item_ids),
        "source_ids": source_ids,
        "source_count": len(source_ids),
        "max_relevance_score": max_relevance,
        "first_item_at": min(timestamps) if timestamps else None,
        "last_item_at": max(timestamps) if timestamps else None,
    }


def apply_cleanup(db, plan: dict[str, list], policy: CleanupPolicy) -> dict[str, int]:
    """Apply bounded retention with cluster/issue consistency and read guards."""
    counts = {key: len(value) for key, value in plan.items()}
    total = sum(counts.values())
    if total > policy.max_deletes:
        raise RuntimeError(f"Cleanup menolak {total} delete; batas per run {policy.max_deletes}.")

    item_docs = list(plan.get("mi_items", []))
    clustered_items: dict[str, list] = defaultdict(list)
    unclustered_items = []
    for doc in item_docs:
        cluster_id = (doc.to_dict() or {}).get("story_cluster_id")
        if cluster_id:
            clustered_items[cluster_id].append(doc)
        else:
            unclustered_items.append(doc)

    # Preflight every affected cluster before the first write so read-budget or
    # integrity errors cannot leave a partially-started cleanup run.
    repairs = []
    rebuild_reads = 0
    for cluster_id, docs in clustered_items.items():
        remaining_budget = policy.max_rebuild_reads - rebuild_reads
        repair, used_reads = _cluster_repair_plan(
            db, cluster_id, docs, read_budget=remaining_budget
        )
        repairs.append(repair)
        rebuild_reads += used_reads

    # Each cluster is internally atomic: deleted items, rebuilt story metadata,
    # and issue metadata are committed together. max_deletes <= 400 keeps each
    # batch below Firestore's 500-write ceiling even with two metadata writes.
    for repair in repairs:
        cluster_id = repair["cluster_id"]
        cluster_ref = repair["cluster_ref"]
        cluster = repair["cluster"]
        remaining_items = repair["remaining_items"]
        batch = db.batch()

        for doc in repair["delete_docs"]:
            batch.delete(doc.reference)

        issue_ref = db.collection("mi_issues").document(
            f"issue-{cluster_id.removeprefix('story-')}"
        )
        if remaining_items:
            summary = _summary_from_remaining(remaining_items)
            now = utcnow()
            batch.set(
                cluster_ref,
                {
                    **summary,
                    "updated_at": now,
                },
                merge=True,
            )
            batch.set(
                issue_ref,
                {
                    "schema_version": 1,
                    "issue_id": issue_ref.id,
                    "story_cluster_id": cluster_id,
                    "title": cluster.get("representative_title", ""),
                    "topic_ids": cluster.get("topic_ids", []),
                    "district_ids": cluster.get("district_ids", []),
                    "severity": severity_from_relevance(summary["max_relevance_score"]),
                    "item_count": summary["item_count"],
                    "source_count": summary["source_count"],
                    "opened_at": summary["first_item_at"],
                    "last_item_at": summary["last_item_at"],
                    "updated_at": now,
                },
                merge=True,
            )
        else:
            batch.delete(cluster_ref)
            batch.delete(issue_ref)

        batch.commit()

    # Documents without story metadata plus operational/history documents have no
    # cluster dependency. The full plan is already bounded by max_deletes.
    independent_docs = [
        *unclustered_items,
        *plan.get("mi_sync_runs", []),
        *plan.get("mi_review_tasks", []),
    ]
    if independent_docs:
        batch = db.batch()
        for doc in independent_docs:
            batch.delete(doc.reference)
        batch.commit()

    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Media Intelligence retention cleanup")
    parser.add_argument("--apply", action="store_true", help="Apply deletes; default is dry-run")
    parser.add_argument("--verified-days", type=int, default=730)
    parser.add_argument("--operational-days", type=int, default=90)
    parser.add_argument("--max-deletes", type=int, default=400)
    parser.add_argument("--max-rebuild-reads", type=int, default=1000)
    args = parser.parse_args()
    policy = CleanupPolicy(
        args.verified_days,
        args.operational_days,
        args.max_deletes,
        args.max_rebuild_reads,
    )
    if (
        policy.verified_days < 365
        or policy.operational_days < 30
        or policy.max_deletes > 450
        or policy.max_rebuild_reads < 0
        or policy.max_rebuild_reads > 2000
    ):
        raise SystemExit("Retention/batas operasi di luar policy aman.")
    db = create_client()
    plan = plan_cleanup(db, policy)
    counts = {key: len(value) for key, value in plan.items()}
    print({"mode": "APPLY" if args.apply else "DRY_RUN", "candidates": counts})
    if args.apply:
        print({"deleted": apply_cleanup(db, plan, policy)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
