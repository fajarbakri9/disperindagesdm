"""Fail-closed Media Intelligence collector entry point."""
from __future__ import annotations

import argparse
import os
import sys
import time
import uuid
from datetime import datetime, timezone

from config_loader import (get_all_geo_terms, get_all_keyword_terms, get_keywords,
                           get_locations, get_sources)
from discovery import discover_from_source
from extractor import extract_metadata
from mi_firestore_writer import MediaIntelligenceWriter
from relevance import calculate_relevance, passes_tier_filter
from validation import validate_item

ENGINE_VERSION = "5.0.0"


def _new_counters() -> dict:
    return {key: 0 for key in ("sources_ok", "sources_failed", "candidates_found",
                                "items_new", "items_updated", "duplicates", "rejected",
                                "needs_review")}


def main(tier_filter: str | None = None, dry_run: bool = False, trigger: str = "manual"):
    started = time.time()
    now = datetime.now(timezone.utc)
    run_id = f"{now.strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8]}"
    sources = get_sources(tier=tier_filter)
    keywords_raw = get_keywords()
    locations = get_locations()
    geo = get_all_geo_terms(locations)
    keywords = get_all_keyword_terms(keywords_raw)
    counters = _new_counters()
    writer = None if dry_run else MediaIntelligenceWriter()

    print("=== PINRANG MEDIA INTELLIGENCE COLLECTOR ===")
    print(f"Run: {run_id} | sumber: {len(sources)} | dry_run: {dry_run}")
    if writer:
        writer.start_run(run_id, trigger=trigger, sources_total=len(sources),
                         engine_version=ENGINE_VERSION)
        writer.sync_sources(sources)
        existing_urls, existing_content = writer.existing_keys()
    else:
        existing_urls, existing_content = set(), set()

    candidates: list[tuple[dict, dict]] = []
    try:
        for source in sources:
            print(f"[{source.get('priority', 'normal')}] {source['name']}")
            try:
                discovered = discover_from_source(source, set())
                counters["candidates_found"] += len(discovered)
                relevant = []
                for article in discovered:
                    text = f"{article.get('title', '')} {article.get('excerpt', '')}".strip()
                    if text and passes_tier_filter(text, source, geo, keywords, keywords_raw):
                        relevant.append(article)
                cap = int(source.get("max_candidates_per_run", 5))
                candidates.extend((source, item) for item in relevant[:cap])
                counters["sources_ok"] += 1
                if writer:
                    writer.update_source_state(source["id"], success=True,
                                               article_count=len(discovered))
            except Exception as exc:
                counters["sources_failed"] += 1
                print(f"  ERR: {exc}")
                if writer:
                    writer.update_source_state(source["id"], success=False,
                                               error_code=type(exc).__name__,
                                               error_message=str(exc))

        for source, article in candidates[:20]:
            metadata = extract_metadata(article["url"], rss_entry=article)
            merged = {**article, **{key: value for key, value in metadata.items() if value}}
            validation = validate_item(source, article["url"], merged,
                                       existing_url_keys=existing_urls,
                                       existing_content_hashes=existing_content)
            merged.update(validation)
            if validation["verification_status"] == "REJECTED":
                if validation.get("duplicate_of"):
                    counters["duplicates"] += 1
                else:
                    counters["rejected"] += 1
                continue
            if validation["verification_status"] == "NEEDS_REVIEW":
                counters["needs_review"] += 1
                continue

            relevance = calculate_relevance(merged.get("title", ""), merged.get("excerpt", ""),
                                            {"sourceWeight": source.get("source_weight", 0.75)},
                                            geo, keywords, keywords_raw)
            if relevance["score"] < 30:
                counters["rejected"] += 1
                continue
            merged.update({
                "source_id": source["id"], "source_name": source["name"],
                "source_class": source.get("source_class", "earned_media"),
                "matchedGeo": relevance["matched_geo"],
                "matchedClusters": relevance["matched_clusters"],
                "relevanceScore": relevance["score"], "tone": None,
                "tone_confidence": None,
            })
            if writer:
                outcome = writer.write_item(merged)
                counters["items_new" if outcome == "new" else "duplicates"] += 1
            else:
                counters["items_new"] += 1
            existing_urls.add(validation["url_hash"])
            existing_content.add(validation["content_hash"])
            print(f"  VERIFIED {merged['title'][:70]} | R:{relevance['score']}")

        status = "FAILED" if sources and counters["sources_failed"] == len(sources) else (
            "PARTIAL" if counters["sources_failed"] else "SUCCESS")
        return_code = 1 if status == "FAILED" else 0
    except Exception:
        status, return_code = "FAILED", 1
        raise
    finally:
        elapsed = time.time() - started
        if writer:
            writer.finish_run(run_id, status=locals().get("status", "FAILED"),
                              counters=counters, runtime_seconds=elapsed)
        print(f"Selesai {elapsed:.1f}s | status={locals().get('status', 'FAILED')} | {counters}")
    return return_code


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Pinrang Media Intelligence collector")
    parser.add_argument("--tier", default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--trigger", default=os.environ.get("MI_TRIGGER", "manual"))
    args = parser.parse_args()
    raise SystemExit(main(args.tier, args.dry_run, args.trigger))
