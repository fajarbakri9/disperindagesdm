"""
main.py — Pinrang Issue Discovery Engine
Entry point utama yang dijalankan oleh GitHub Actions.

Usage:
  python main.py              # Jalankan semua tier
  python main.py --tier A     # Hanya Tier A+ dan A
  python main.py --tier B     # Hanya Tier B (nasional)
  python main.py --dry-run    # Tanpa tulis ke Firestore
"""
from __future__ import annotations
import argparse
import sys
import time
from datetime import datetime, timezone

from config_loader import (
    get_sources, get_keywords, get_locations, get_scoring,
    get_all_geo_terms, get_all_keyword_terms
)
from discovery import discover_from_source, detect_new_domain
from extractor import extract_metadata
from relevance import calculate_relevance, passes_tier_filter, critical_status
from intelligence import analyze_batch
from clusterer import find_matching_issue, create_new_issue, update_issue
from firestore_writer import (
    get_existing_mention_hashes, save_mention, get_recent_issues,
    save_issue, update_source_health, register_new_source,
    update_dashboard_snapshot, update_daily_stats, url_to_doc_id
)


def main(tier_filter: str | None = None, dry_run: bool = False):
    start_time = time.time()
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")

    print(f"=== PINRANG ISSUE DISCOVERY ENGINE ===")
    print(f"Waktu: {now.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"Tier: {tier_filter or 'semua'} | dry_run: {dry_run}")

    # ── 1. Load config ────────────────────────────────────────
    sources      = get_sources(tier=tier_filter)
    keywords_raw = get_keywords()
    locations    = get_locations()
    geo          = get_all_geo_terms(locations)
    kw           = get_all_keyword_terms(keywords_raw)
    known_domains = set(s["domain"] for s in get_sources(enabled_only=False))

    print(f"Sumber aktif: {len(sources)} | Keywords: {len(kw['terms'])} terms")

    # ── 2. Ambil URL yang sudah ada ───────────────────────────
    existing_hashes: set[str] = set()
    if not dry_run:
        existing_hashes = get_existing_mention_hashes(limit=2000)
        print(f"Existing mentions: {len(existing_hashes)}")

    # ── 3. Discovery dari semua sumber ───────────────────────
    all_candidates: list[dict] = []
    stats_by_source = {}

    for source in sources:
        print(f"\n[{source['tier']}] {source['name']} ...")
        try:
            candidates = discover_from_source(source, existing_hashes)
            print(f"  → {len(candidates)} URL baru ditemukan")

            filtered = []
            for art in candidates:
                text = (art.get("title", "") + " " + art.get("excerpt", "")).strip()
                if not text:
                    continue

                # Tier filter
                if not passes_tier_filter(text, source, geo, kw, keywords_raw):
                    continue

                # Tambah metadata sumber
                art["source_id"]     = source["id"]
                art["source_name"]   = source["name"]
                art["source_domain"] = source["domain"]
                art["source_tier"]   = source.get("tier", "A")
                art["source_weight"] = source.get("sourceWeight", 0.75)
                filtered.append(art)

                # Detect new source domain
                new_domain = detect_new_domain(art.get("url", ""), known_domains)
                if new_domain and not dry_run:
                    print(f"  [NEW] Domain baru terdeteksi: {new_domain}")
                    register_new_source(new_domain, art["url"], art.get("title", ""), 0)

            stats_by_source[source["id"]] = {
                "found": len(candidates), "relevant": len(filtered)
            }
            all_candidates.extend(filtered[:5])  # Max 5 per sumber per run
            update_source_health(source["id"], True, len(candidates)) if not dry_run else None

        except Exception as e:
            print(f"  ERR: {e}")
            update_source_health(source["id"], False, 0, str(e)) if not dry_run else None
            stats_by_source[source["id"]] = {"found": 0, "relevant": 0, "error": str(e)}

        time.sleep(0.3)

    print(f"\nTotal kandidat relevan: {len(all_candidates)}")
    if not all_candidates:
        print("Tidak ada artikel baru. Selesai.")
        failed_sources = sum(1 for item in stats_by_source.values() if item.get("error"))
        return 1 if sources and failed_sources == len(sources) else 0

    # ── 4. Fetch metadata lengkap ─────────────────────────────
    print("\nMengambil metadata artikel...")
    enriched = []
    for art in all_candidates[:20]:  # Max 20 per run agar tidak timeout
        meta = extract_metadata(art["url"], rss_entry=art)
        art.update({k: v for k, v in meta.items() if v})  # Merge, prioritas meta
        enriched.append(art)
        time.sleep(0.5)

    # ── 5. Hitung relevance score ─────────────────────────────
    print("Menghitung relevance score...")
    for art in enriched:
        rel = calculate_relevance(
            art.get("title", ""),
            art.get("excerpt", ""),
            {"sourceWeight": art.get("source_weight", 0.75)},
            geo, kw, keywords_raw
        )
        art["relevanceScore"]  = rel["score"]
        art["matchedGeo"]      = rel["matched_geo"]
        art["matchedKeywords"] = rel["matched_keywords"]
        art["matchedClusters"] = rel["matched_clusters"]
        art["matchedRisk"]     = rel["matched_risk"]
        art["relevanceStatus"] = rel["status"]
        art["scope"]           = rel["scope"]

    # Filter: hanya yang lolos threshold
    enriched = [a for a in enriched if a.get("relevanceScore", 0) >= 30]
    print(f"Lolos filter relevance (>=30): {len(enriched)} artikel")

    # ── 6. Intelligence analysis (Gemini) ──────────────────────
    print("Analisis sentimen & topik via Gemini...")
    enriched = analyze_batch(enriched, delay=1.5)

    # ── 7. Deduplication & Issue Clustering ────────────────────
    print("Clustering & deduplication...")
    recent_issues = get_recent_issues(limit=100) if not dry_run else []

    for art in enriched:
        art_id  = url_to_doc_id(art.get("url", ""))
        art["id"] = art_id

        # Cari issue yang cocok
        issue_id = find_matching_issue(art, recent_issues)

        if issue_id:
            # Tambahkan ke issue yang ada
            existing = next((i for i in recent_issues if i["id"] == issue_id), None)
            if existing:
                updated = update_issue(existing, art)
                if not dry_run:
                    save_issue(updated)
                # Update di cache lokal
                idx = next((i for i,x in enumerate(recent_issues) if x["id"] == issue_id), None)
                if idx is not None:
                    recent_issues[idx] = updated
            art["issueId"] = issue_id
        else:
            # Buat issue baru
            new_issue = create_new_issue(art, keywords_raw)
            art["issueId"] = new_issue["id"]
            recent_issues.append(new_issue)
            if not dry_run:
                save_issue(new_issue)

        # ── 8. Simpan mention ─────────────────────────────────
        if not dry_run:
            save_mention(art)

        _print_article(art)

    # ── 9. Update dashboard snapshot ──────────────────────────
    if not dry_run:
        snapshot = _build_snapshot(enriched, recent_issues)
        update_dashboard_snapshot(snapshot)
        update_daily_stats(date_str, {
            "totalMentions":  len(enriched),
            "criticalIssues": len([i for i in recent_issues if i.get("criticalScore", 0) >= 60]),
            "updatedAt":      datetime.now(timezone.utc).isoformat(),
        })

    elapsed = time.time() - start_time
    print(f"\n=== SELESAI dalam {elapsed:.1f} detik ===")
    print(f"Artikel tersimpan: {len(enriched)}")
    print(f"Total isu aktif:   {len(recent_issues)}")
    return 0


def _build_snapshot(mentions: list, issues: list) -> dict:
    """Build snapshot untuk TV Wallboard."""
    sorted_issues   = sorted(issues, key=lambda x: x.get("criticalScore", 0), reverse=True)
    critical_issues = [i for i in sorted_issues if i.get("criticalScore", 0) >= 60][:5]

    sorted_mentions = sorted(mentions, key=lambda x: x.get("relevanceScore", 0), reverse=True)
    latest_mentions = sorted_mentions[:10]

    neg_count = sum(1 for m in mentions if m.get("sentiment", {}).get("label") == "negative")
    neg_pct   = int(neg_count / len(mentions) * 100) if mentions else 0

    return {
        "stats": {
            "totalMentions":  len(mentions),
            "criticalIssues": len(critical_issues),
            "negativePct":    neg_pct,
            "totalAspirations": sum(1 for m in mentions if m.get("aspiration", {}).get("detected")),
        },
        "criticalIssues": critical_issues,
        "latestMentions": [_mention_card(m) for m in latest_mentions],
        "updatedAt":      datetime.now(timezone.utc).isoformat(),
    }


def _mention_card(art: dict) -> dict:
    return {
        "id":           art.get("id", ""),
        "title":        art.get("title", ""),
        "excerpt":      art.get("excerpt", "")[:200],
        "thumbnailUrl": art.get("thumbnailUrl", ""),
        "sourceUrl":    art.get("canonical", art.get("url", "")),
        "sourceName":   art.get("source_name", ""),
        "sourceDomain": art.get("source_domain", ""),
        "sourceTier":   art.get("source_tier", "A"),
        "publishedAt":  art.get("publishedAt", ""),
        "topics":       art.get("topics", []),
        "geo": {
            "district": art.get("geo_district", ""),
            "village":  art.get("geo_village", ""),
        },
        "sentiment":      art.get("sentiment", {}),
        "relevanceScore": art.get("relevanceScore", 0),
        "issueId":        art.get("issueId", ""),
    }


def _print_article(art: dict):
    tier  = art.get("source_tier", "?")
    name  = art.get("source_name", "?")
    title = art.get("title", "")[:60]
    score = art.get("relevanceScore", 0)
    sent  = art.get("sentiment", {}).get("label", "?")
    issue = art.get("issueId", "new")
    print(f"  [{tier}] {name}: {title}... | R:{score} | {sent} | issue:{issue}")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Pinrang Issue Discovery Engine")
    parser.add_argument("--tier", default=None, help="Filter tier: A, B, A+, atau kombinasi 'A+,A'")
    parser.add_argument("--dry-run", action="store_true", help="Jalankan tanpa tulis ke Firestore")
    args = parser.parse_args()
    raise SystemExit(main(tier_filter=args.tier, dry_run=args.dry_run))
