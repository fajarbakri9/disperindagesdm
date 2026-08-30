"""Read-only, strict audit of articles exposed by the production snapshot."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "engine" / "collector"))

from extractor import extract_metadata  # noqa: E402
from normalizers import normalize_published_at, normalize_url  # noqa: E402

SNAPSHOT_URL = (
    "https://firestore.googleapis.com/v1/projects/disperindagesdm-pinrang/"
    "databases/(default)/documents/mi_public/current"
)
DEFAULT_OUTPUT = ROOT / "engine" / "reports" / "production_article_audit.json"


def decode_firestore(value):
    """Decode the Firestore REST value subset used by mi_public/current."""
    for key in ("stringValue", "timestampValue", "booleanValue", "doubleValue"):
        if key in value:
            return value[key]
    if "integerValue" in value:
        return int(value["integerValue"])
    if "nullValue" in value:
        return None
    if "arrayValue" in value:
        return [decode_firestore(item) for item in value["arrayValue"].get("values", [])]
    if "mapValue" in value:
        return {key: decode_firestore(item)
                for key, item in value["mapValue"].get("fields", {}).items()}
    raise ValueError(f"Tipe Firestore tidak didukung: {sorted(value)}")


def normalized_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip().casefold()


def same_timestamp(left: str | None, right: str | None) -> bool:
    left_dt = normalize_published_at(left or "")
    right_dt = normalize_published_at(right or "")
    return bool(left_dt and right_dt and abs((left_dt - right_dt).total_seconds()) <= 1)


def audit_item(expected: dict, metadata: dict) -> dict:
    expected_url = normalize_url(expected.get("canonical_url", ""))
    actual_url = normalize_url(metadata.get("canonical") or expected_url)
    checks = {
        "canonical_url": bool(expected_url and actual_url == expected_url),
        "title": bool(expected.get("title") and
                      normalized_text(metadata.get("title")) == normalized_text(expected.get("title"))),
        "publisher": bool(metadata.get("publisher") and
                          normalized_text(metadata.get("publisher")) ==
                          normalized_text(expected.get("publisher"))),
        "published_at": same_timestamp(metadata.get("publishedAt"), expected.get("published_at")),
        "direct_extraction": metadata.get("extractedBy") in {
            "jsonld", "opengraph", "twitter_card", "html_fallback"
        },
    }
    return {
        "url": expected_url,
        "expected": {key: expected.get(key) for key in
                     ("title", "publisher", "published_at", "verification_status")},
        "observed": {
            "title": metadata.get("title", ""),
            "publisher": metadata.get("publisher", ""),
            "published_at": metadata.get("publishedAt", ""),
            "canonical_url": actual_url,
            "extraction_method": metadata.get("extractedBy", "none"),
        },
        "checks": checks,
        "passed": all(checks.values()),
    }


def fetch_snapshot(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "mi-production-audit/1.0"})
    with urlopen(request, timeout=15) as response:
        document = json.load(response)
    return {key: decode_firestore(value) for key, value in document.get("fields", {}).items()}


def build_report(snapshot: dict, required: int = 30) -> dict:
    rows = []
    for expected in snapshot.get("latest_items", [])[:required]:
        metadata = extract_metadata(expected.get("canonical_url", ""), rss_entry=None)
        rows.append(audit_item(expected, metadata))
    passed_count = sum(row["passed"] for row in rows)
    complete = len(rows) >= required and passed_count == len(rows)
    return {
        "schema_version": 1,
        "audited_at": datetime.now(timezone.utc).isoformat(),
        "snapshot_sync_run_id": snapshot.get("sync_run_id"),
        "snapshot_last_run_at": snapshot.get("last_run_at"),
        "required_articles": required,
        "sampled_articles": len(rows),
        "passed_articles": passed_count,
        "decision": "PASS" if complete else "NO-GO",
        "articles": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot-url", default=SNAPSHOT_URL)
    parser.add_argument("--required", type=int, default=30)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--allow-incomplete", action="store_true")
    args = parser.parse_args()
    report = build_report(fetch_snapshot(args.snapshot_url), required=args.required)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in (
        "decision", "required_articles", "sampled_articles", "passed_articles",
        "snapshot_sync_run_id")}, ensure_ascii=False, indent=2))
    return 0 if report["decision"] == "PASS" or args.allow_incomplete else 1


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    raise SystemExit(main())
