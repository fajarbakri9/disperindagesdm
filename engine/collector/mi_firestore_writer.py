"""Firestore writer for the final Media Intelligence ``mi_*`` schema.

Authentication intentionally uses Application Default Credentials. In CI this
must come from Workload Identity Federation; local integration tests use the
Firestore Emulator. Service-account JSON is deliberately unsupported here.
"""
from __future__ import annotations

import hashlib
import os
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import firestore
from google.api_core.exceptions import AlreadyExists
from google.auth.credentials import AnonymousCredentials
from google.cloud import firestore as google_firestore

from normalizers import normalize_url
from story_intelligence import find_matching_story, severity_from_relevance


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def title_fingerprint(title: str) -> str:
    normalized = " ".join((title or "").lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest() if normalized else ""


def create_client(project_id: str | None = None):
    project = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCLOUD_PROJECT")
    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT wajib diisi (WIF atau Firestore Emulator).")
    if os.environ.get("FIRESTORE_EMULATOR_HOST"):
        return google_firestore.Client(project=project, credentials=AnonymousCredentials())
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={"projectId": project})
    return firestore.client()


class MediaIntelligenceWriter:
    def __init__(self, db=None):
        self.db = db or create_client()

    def sync_sources(self, sources: list[dict]) -> None:
        now = utcnow()
        for source in sources:
            discovery = source.get("discovery", {})
            ref = self.db.collection("mi_sources").document(source["id"])
            previous = ref.get().to_dict() or {}
            ref.set({
                "name": source["name"],
                "domain": source["domain"],
                "allowed_domains": source.get("allowed_domains", []),
                "source_class": source.get("source_class", "earned_media"),
                "priority": source.get("priority", "normal"),
                "enabled": bool(source.get("enabled", True)),
                "discovery_type": discovery.get("type", source.get("discovery_type")),
                "discovery_urls": discovery.get("urls", source.get("discovery_urls", [])),
                "robots_checked_at": source.get("robots_checked_at"),
                "robots_status": source.get("robots_status"),
                "robots_http_status": source.get("robots_http_status"),
                "onboarding_status": source.get("onboarding_status", "PILOT_VERIFIED"),
                "verification_checked_at": source.get("verification_checked_at"),
                "verification_sample_count": int(source.get("verification_sample_count", 5)),
                "verification_pass_count": int(source.get("verification_pass_count", 5)),
                "parser_version": int(source.get("parser_version", 1)),
                "updated_at": now,
                "created_at": previous.get("created_at") or now,
            }, merge=True)

    def start_run(self, run_id: str, *, trigger: str, sources_total: int,
                  engine_version: str) -> None:
        self.db.collection("mi_sync_runs").document(run_id).create({
            "run_id": run_id, "trigger": trigger, "started_at": utcnow(),
            "finished_at": None, "status": "RUNNING", "sources_total": sources_total,
            "sources_ok": 0, "sources_failed": 0, "candidates_found": 0,
            "items_new": 0, "items_updated": 0, "duplicates": 0,
            "rejected": 0, "needs_review": 0, "runtime_seconds": 0,
            "secondary_candidates": 0, "secondary_verified": 0,
            "secondary_duplicates": 0, "unknown_domains": 0, "secondary_failed": 0,
            "engine_version": engine_version,
        })

    def finish_run(self, run_id: str, *, status: str, counters: dict,
                   runtime_seconds: float) -> None:
        allowed = {"sources_ok", "sources_failed", "candidates_found", "items_new",
                   "items_updated", "duplicates", "rejected", "needs_review",
                   "secondary_candidates", "secondary_verified",
                   "secondary_duplicates", "unknown_domains", "secondary_failed"}
        payload = {key: int(counters.get(key, 0)) for key in allowed}
        payload.update({"finished_at": utcnow(), "status": status,
                        "runtime_seconds": round(runtime_seconds, 3)})
        self.db.collection("mi_sync_runs").document(run_id).set(payload, merge=True)

    def update_source_state(self, source_id: str, *, success: bool,
                            article_count: int = 0, error_code: str | None = None,
                            error_message: str | None = None,
                            http_status: int | None = None) -> None:
        ref = self.db.collection("mi_source_state").document(source_id)
        previous = ref.get().to_dict() or {}
        now = utcnow()
        failures = 0 if success else int(previous.get("consecutive_failures", 0)) + 1
        health = "OK" if success else ("FAILED" if failures >= 3 else "DEGRADED")
        ref.set({
            "source_id": source_id, "last_checked_at": now,
            "last_success_at": now if success else previous.get("last_success_at"),
            "last_article_at": now if article_count > 0 else previous.get("last_article_at"),
            "consecutive_failures": failures, "last_http_status": http_status,
            "last_error_code": None if success else (error_code or "SOURCE_ERROR"),
            "last_error_message": None if success else (error_message or "Unknown source error")[:1000],
            "etag": previous.get("etag"), "last_modified": previous.get("last_modified"),
            "health": health,
        }, merge=True)

    def existing_keys(self, limit: int = 10000) -> tuple[set[str], set[str]]:
        docs = (self.db.collection("mi_items")
                .select(["url_hash", "content_hash"]).limit(limit).stream())
        url_keys, content_hashes = set(), set()
        for doc in docs:
            value = doc.to_dict()
            if value.get("url_hash"):
                url_keys.add(value["url_hash"])
            if value.get("content_hash"):
                content_hashes.add(value["content_hash"])
        return url_keys, content_hashes

    def write_item(self, item: dict) -> str:
        """Create one verified item. Return ``new`` or ``duplicate``."""
        doc_id = item.get("url_hash")
        if not doc_id:
            raise ValueError("Item tanpa url_hash tidak boleh ditulis.")
        now = utcnow()
        payload = {
            "schema_version": 1, "source_id": item["source_id"],
            "source_class": item.get("source_class", "earned_media"),
            "discovered_url": item.get("url", ""),
            "normalized_url": item.get("normalized_url", ""),
            "canonical_url": item.get("canonical_url", ""),
            "url_hash": doc_id, "title": item.get("title", ""),
            "excerpt": item.get("excerpt", ""), "author": item.get("author") or None,
            "publisher": item.get("publisher") or item.get("source_name", ""),
            "published_at": item.get("published_at"),
            "published_at_source": item.get("published_at_source"),
            "discovered_at": item.get("discovered_at") or now,
            "fetched_at": item.get("fetched_at") or now, "verified_at": now,
            "verification_status": item.get("verification_status", "VERIFIED_DIRECT"),
            "verification_notes": item.get("verification_notes", []),
            "topic_ids": item.get("matchedClusters", []),
            "district_ids": item.get("matchedGeo", []),
            "relevance_score": int(item.get("relevanceScore", 0)),
            "story_cluster_id": item.get("story_cluster_id"), "issue_id": item.get("issue_id"),
            "duplicate_of": item.get("duplicate_of"), "content_hash": item.get("content_hash", ""),
            "title_hash": title_fingerprint(item.get("title", "")),
            "image_url": item.get("thumbnailUrl") or None, "tone": item.get("tone"),
            "tone_confidence": item.get("tone_confidence"),
            "discovery_provider": item.get("discovery_provider", "DIRECT"),
            "discovery_query": item.get("discovery_query"),
            "created_at": now, "updated_at": now,
        }
        try:
            self.db.collection("mi_items").document(doc_id).create(payload)
            return "new"
        except AlreadyExists:
            return "duplicate"

    def write_unknown_source_review(self, candidate: dict) -> str:
        """Create one idempotent onboarding review task; never an mi_item."""
        normalized = normalize_url(candidate.get("url", ""))
        if not normalized:
            raise ValueError("Candidate review tanpa URL valid.")
        digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        now = utcnow()
        payload = {
            "schema_version": 1, "task_type": "UNKNOWN_SOURCE_DOMAIN",
            "status": "OPEN", "candidate_url": candidate.get("url"),
            "normalized_url": normalized,
            "candidate_domain": candidate.get("discovery_domain"),
            "candidate_title": candidate.get("title", ""),
            "discovery_provider": "GDELT",
            "discovery_query": candidate.get("discovery_query"),
            "created_at": now, "updated_at": now,
        }
        try:
            self.db.collection("mi_review_tasks").document(f"unknown-domain-{digest}").create(payload)
            return "new"
        except AlreadyExists:
            return "duplicate"

    def assign_story_and_issue(self, item_id: str) -> tuple[str, str]:
        """Attach one new item to a recent story and its issue foundation."""
        item_ref = self.db.collection("mi_items").document(item_id)
        item = item_ref.get().to_dict()
        if not item:
            raise ValueError(f"mi_items/{item_id} tidak ditemukan")
        if item.get("story_cluster_id") and item.get("issue_id"):
            return item["story_cluster_id"], item["issue_id"]

        recent = []
        for doc in self.db.collection("mi_story_clusters").limit(200).stream():
            data = doc.to_dict()
            data.setdefault("cluster_id", doc.id)
            recent.append(data)
        cluster_id = find_matching_story(item, recent) or f"story-{item_id[:24]}"
        issue_id = f"issue-{cluster_id.removeprefix('story-')}"
        cluster_ref = self.db.collection("mi_story_clusters").document(cluster_id)
        cluster_snapshot = cluster_ref.get()
        now = utcnow()
        if cluster_snapshot.exists:
            cluster = cluster_snapshot.to_dict()
            item_ids = list(dict.fromkeys([*(cluster.get("item_ids") or []), item_id]))
            source_ids = list(dict.fromkeys([*(cluster.get("source_ids") or []), item["source_id"]]))
            cluster_ref.set({
                "item_ids": item_ids, "source_ids": source_ids,
                "item_count": len(item_ids), "source_count": len(source_ids),
                "max_relevance_score": max(int(cluster.get("max_relevance_score", 0)),
                                             int(item.get("relevance_score", 0))),
                "last_item_at": max(filter(None, [cluster.get("last_item_at"), item.get("published_at")])),
                "updated_at": now,
            }, merge=True)
        else:
            cluster_ref.create({
                "schema_version": 1, "cluster_id": cluster_id,
                "representative_title": item.get("title", ""),
                "topic_ids": item.get("topic_ids", []), "district_ids": item.get("district_ids", []),
                "first_item_at": item.get("published_at"), "last_item_at": item.get("published_at"),
                "item_ids": [item_id], "source_ids": [item["source_id"]],
                "item_count": 1, "source_count": 1, "status": "ACTIVE",
                "max_relevance_score": int(item.get("relevance_score", 0)),
                "created_at": now, "updated_at": now,
            })

        cluster = cluster_ref.get().to_dict()
        issue_ref = self.db.collection("mi_issues").document(issue_id)
        previous_issue = issue_ref.get().to_dict() or {}
        issue_ref.set({
            "schema_version": 1, "issue_id": issue_id, "story_cluster_id": cluster_id,
            "title": cluster.get("representative_title", item.get("title", "")),
            "topic_ids": cluster.get("topic_ids", []), "district_ids": cluster.get("district_ids", []),
            "status": previous_issue.get("status", "MONITORING"),
            "severity": severity_from_relevance(cluster.get("max_relevance_score", 0)),
            "verification_status": previous_issue.get("verification_status", "UNVERIFIED"),
            "item_count": cluster.get("item_count", 1),
            "source_count": cluster.get("source_count", 1),
            "opened_at": cluster.get("first_item_at"), "last_item_at": cluster.get("last_item_at"),
            "created_at": previous_issue.get("created_at") or now, "updated_at": now,
        }, merge=True)
        item_ref.set({"story_cluster_id": cluster_id, "issue_id": issue_id, "updated_at": now}, merge=True)
        return cluster_id, issue_id

    def backfill_intelligence(self, limit: int = 200) -> int:
        """Attach verified pre-Stage-6 items that do not yet have a story."""
        processed = 0
        for doc in self.db.collection("mi_items").limit(limit).stream():
            item = doc.to_dict()
            if (item.get("verification_status") == "VERIFIED_DIRECT"
                    and not item.get("story_cluster_id")
                    and item.get("source_id") and item.get("title")
                    and item.get("published_at")):
                self.assign_story_and_issue(doc.id)
                processed += 1
        return processed

    def update_metrics(self, *, now: datetime | None = None) -> dict:
        reference = now or utcnow()
        cutoff = reference.timestamp() - 24 * 3600
        items = []
        for doc in self.db.collection("mi_items").limit(2000).stream():
            item = doc.to_dict()
            published = item.get("published_at")
            if (item.get("verification_status") == "VERIFIED_DIRECT"
                    and published and published.timestamp() >= cutoff):
                items.append(item)
        story_ids = {item.get("story_cluster_id") for item in items if item.get("story_cluster_id")}
        source_ids = {item.get("source_id") for item in items if item.get("source_id")}
        critical = 0
        for doc in self.db.collection("mi_issues").limit(500).stream():
            issue = doc.to_dict()
            if (issue.get("verification_status") == "VERIFIED"
                    and issue.get("status") in {"OPEN", "MONITORING"}
                    and issue.get("severity") in {"HIGH", "CRITICAL"}):
                critical += 1
        metrics = {
            "schema_version": 1, "period_hours": 24, "generated_at": reference,
            "earned_mentions_24h": sum(1 for item in items if item.get("source_class") == "earned_media"),
            "unique_stories_24h": len(story_ids), "active_sources_24h": len(source_ids),
            "active_critical_issues": critical,
        }
        date_id = reference.astimezone(timezone.utc).strftime("%Y-%m-%d")
        self.db.collection("mi_daily_metrics").document(date_id).set(metrics)
        self.db.collection("mi_daily_metrics").document("current").set(metrics)
        return metrics

    def generate_public_snapshot(self, *, sync_run_id: str, now: datetime | None = None) -> dict:
        """Publish the bounded, privacy-safe dashboard contract in one document."""
        reference = now or utcnow()
        source_states = [doc.to_dict() for doc in self.db.collection("mi_source_state").limit(200).stream()]
        health = {
            "total": len(source_states),
            "ok": sum(1 for state in source_states if state.get("health") == "OK"),
            "degraded": sum(1 for state in source_states if state.get("health") == "DEGRADED"),
            "failed": sum(1 for state in source_states if state.get("health") in {"FAILED", "ROBOTS_BLOCKED"}),
        }
        metrics = self.db.collection("mi_daily_metrics").document("current").get().to_dict() or {}
        kpis = {key: int(metrics.get(key, 0)) for key in (
            "earned_mentions_24h", "unique_stories_24h", "active_sources_24h",
            "active_critical_issues")}

        items = [doc.to_dict() for doc in self.db.collection("mi_items").limit(2000).stream()]
        verified = [item for item in items if item.get("verification_status") in {
            "VERIFIED_DIRECT", "VERIFIED_FEED", "MANUAL_VERIFIED"}]
        current_earned = 0
        previous_earned = 0
        for item in verified:
            published = item.get("published_at")
            if item.get("source_class") != "earned_media" or not published:
                continue
            age_hours = (reference - published).total_seconds() / 3600
            if 0 <= age_hours < 24:
                current_earned += 1
            elif 24 <= age_hours < 48:
                previous_earned += 1
        kpis["mentions_trend_pct"] = ("BARU" if previous_earned == 0 else
                                      round((current_earned - previous_earned) /
                                            previous_earned * 100, 1))
        verified.sort(key=lambda item: item.get("published_at") or datetime.min.replace(tzinfo=timezone.utc),
                      reverse=True)
        latest_items = [{key: item.get(key) for key in (
            "title", "excerpt", "publisher", "published_at", "canonical_url", "image_url",
            "topic_ids", "district_ids", "verification_status")}
            for item in verified[:30]]

        clusters = [doc.to_dict() for doc in self.db.collection("mi_story_clusters").limit(500).stream()]
        clusters = [cluster for cluster in clusters if cluster.get("status") == "ACTIVE"]
        clusters.sort(key=lambda cluster: cluster.get("last_item_at") or datetime.min.replace(tzinfo=timezone.utc),
                      reverse=True)
        top_stories = [{
            "title": cluster.get("representative_title", ""),
            "topic_ids": cluster.get("topic_ids", []), "district_ids": cluster.get("district_ids", []),
            "source_count": int(cluster.get("source_count", 0)),
            "article_count": int(cluster.get("item_count", 0)),
            "last_item_at": cluster.get("last_item_at"),
        } for cluster in clusters[:10]]

        issues = [doc.to_dict() for doc in self.db.collection("mi_issues").limit(500).stream()]
        public_issues = [issue for issue in issues
                         if issue.get("verification_status") == "VERIFIED"
                         and issue.get("status") in {"OPEN", "MONITORING"}]
        rank = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        public_issues.sort(key=lambda issue: (rank.get(issue.get("severity"), 0),
                                              issue.get("updated_at") or datetime.min.replace(tzinfo=timezone.utc)),
                           reverse=True)
        top_issues = [{
            "title": issue.get("title", ""),
            "topic_id": (issue.get("topic_ids") or [""])[0],
            "district_ids": issue.get("district_ids", []), "severity": issue.get("severity", "LOW"),
            "status": issue.get("status", "MONITORING"),
            "media_item_count": int(issue.get("item_count", 0)),
        } for issue in public_issues[:10]]

        runs = [doc.to_dict() for doc in self.db.collection("mi_sync_runs").limit(100).stream()]
        completed = [run for run in runs if run.get("finished_at")]
        completed.sort(key=lambda run: run.get("finished_at"), reverse=True)
        successful = [run for run in completed if run.get("status") == "SUCCESS"]
        last_run_at = completed[0].get("finished_at") if completed else None
        last_success_at = successful[0].get("finished_at") if successful else None
        last_data_at = verified[0].get("published_at") if verified else None
        age_hours = ((reference - last_run_at).total_seconds() / 3600
                     if last_run_at else None)
        system_status = ("OFFLINE" if age_hours is None or age_hours > 24 else
                         "STALE" if age_hours > 8 else
                         "DEGRADED" if health["degraded"] or health["failed"] else "FRESH")

        daily = []
        for doc in self.db.collection("mi_daily_metrics").limit(30).stream():
            if doc.id == "current":
                continue
            value = doc.to_dict()
            daily.append({"date": doc.id, **{key: int(value.get(key, 0)) for key in kpis}})
        daily.sort(key=lambda value: value["date"])

        snapshot = {
            "schema_version": 1, "generated_at": reference, "sync_run_id": sync_run_id,
            "system_status": system_status, "last_run_at": last_run_at,
            "last_data_update_at": last_data_at, "last_full_success_at": last_success_at,
            "source_health": health, "kpis": kpis, "top_stories": top_stories,
            "top_issues": top_issues, "latest_items": latest_items, "trend_7d": daily[-7:],
            "schedule_label": "PEMANTAUAN OTOMATIS • 6X SEHARI",
        }
        self.db.collection("mi_public").document("current").set(snapshot)
        return snapshot
