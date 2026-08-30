"""Read-only onboarding check for every enabled Media Intelligence source."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "collector"))

from config_loader import get_sources  # noqa: E402
from discovery import discover_from_source  # noqa: E402
from extractor import extract_metadata  # noqa: E402
from normalizers import normalize_published_at, normalize_url  # noqa: E402


def validate_source(source: dict, sample_size: int | None = None) -> dict:
    sample_size = sample_size or int(source.get("verification_sample_count", 5))
    if not 5 <= sample_size <= 10:
        raise ValueError(f"{source['id']}: sample onboarding harus 5–10 artikel")
    candidates = discover_from_source(source, set())
    rows = []
    allowed = set(source.get("allowed_domains") or [source["domain"]])
    for candidate in candidates[:sample_size]:
        meta = extract_metadata(candidate["url"], rss_entry=candidate)
        canonical = normalize_url(meta.get("canonical") or candidate["url"])
        published_raw = meta.get("publishedAt") or candidate.get("published_at", "")
        row = {
            "url": candidate["url"],
            "title": meta.get("title", "").strip(),
            "publisher": meta.get("publisher", "").strip() or source["name"],
            "published_at": published_raw,
            "canonical": canonical,
            "checks": {
                "article_url": urlparse(candidate["url"]).hostname in allowed,
                "title": bool(meta.get("title", "").strip()),
                "publisher": bool(meta.get("publisher", "").strip() or source["name"]),
                "published_date": normalize_published_at(published_raw) is not None,
                "canonical": bool(canonical) and urlparse(canonical).hostname in allowed,
            },
        }
        rows.append(row)

    passed_fields = sum(sum(1 for value in row["checks"].values() if value) for row in rows)
    total_fields = len(rows) * 5
    return {
        "source_id": source["id"],
        "sample_count": len(rows),
        "accuracy_percent": round(passed_fields / total_fields * 100, 1) if total_fields else 0,
        "passed": len(rows) >= sample_size and passed_fields / total_fields >= 0.95,
        "articles": rows,
    }


def main() -> int:
    reports = [validate_source(source) for source in get_sources()]
    print(json.dumps(reports, ensure_ascii=False, indent=2))
    return 0 if reports and all(report["passed"] for report in reports) else 1


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    raise SystemExit(main())
