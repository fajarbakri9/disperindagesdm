"""Create a bounded Media Intelligence JSON.GZ backup payload.

The workflow is responsible for encrypting the resulting backup and manifest
before they are uploaded as an Actions artifact.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from datetime import date, datetime, timezone
from pathlib import Path

from collector.mi_firestore_writer import create_client

BACKUP_COLLECTIONS = ("mi_sources", "mi_items", "mi_story_clusters", "mi_issues",
                      "mi_daily_metrics")


def json_value(value):
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_value(item) for item in value]
    return value


def create_backup(db, destination: Path, *, max_docs_per_collection: int = 10000) -> dict:
    if max_docs_per_collection < 1 or max_docs_per_collection > 20000:
        raise ValueError("Batas dokumen backup harus 1..20000.")

    payload = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "collections": {},
    }

    for collection_name in BACKUP_COLLECTIONS:
        # Read one extra snapshot so the backup fails closed instead of silently
        # presenting a truncated collection as a complete backup.
        snapshots = list(
            db.collection(collection_name)
            .limit(max_docs_per_collection + 1)
            .stream()
        )
        if len(snapshots) > max_docs_per_collection:
            raise RuntimeError(
                f"Backup dibatalkan: collection {collection_name} melebihi batas "
                f"{max_docs_per_collection} dokumen. Naikkan batas hanya setelah audit quota "
                "atau implementasikan backup terpaginasikan."
            )

        payload["collections"][collection_name] = [
            {"id": doc.id, "data": json_value(doc.to_dict())}
            for doc in snapshots
        ]

    destination.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with gzip.open(destination, "wb", compresslevel=9) as handle:
        handle.write(encoded)

    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    manifest = {
        "file": destination.name,
        "sha256": digest,
        "bytes": destination.stat().st_size,
        "complete": True,
        "counts": {key: len(value) for key, value in payload["collections"].items()},
    }
    destination.with_suffix(destination.suffix + ".manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Backup metadata Media Intelligence")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--max-docs", type=int, default=10000)
    args = parser.parse_args()
    print(create_backup(create_client(), args.output, max_docs_per_collection=args.max_docs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
