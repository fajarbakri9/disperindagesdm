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
            "engine_version": engine_version,
        })

    def finish_run(self, run_id: str, *, status: str, counters: dict,
                   runtime_seconds: float) -> None:
        allowed = {"sources_ok", "sources_failed", "candidates_found", "items_new",
                   "items_updated", "duplicates", "rejected", "needs_review"}
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
            "created_at": now, "updated_at": now,
        }
        try:
            self.db.collection("mi_items").document(doc_id).create(payload)
            return "new"
        except AlreadyExists:
            return "duplicate"
