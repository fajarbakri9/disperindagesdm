"""Build a privacy-safe monthly aggregate from the public SBL Ekraf portal."""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

SOURCE = "https://sbl.pinrangkab.go.id/ekraf/"
OUT = Path(__file__).parents[1] / "assets" / "data" / "sbl-ekraf-monthly.json"


def get(url: str) -> str:
    req = Request(url, headers={"User-Agent": "DisperindagESDM-Pinrang-MonthlySync/1.0"})
    with urlopen(req, timeout=45) as response:
        return response.read().decode("utf-8")


def main() -> None:
    html = get(SOURCE)
    match = re.search(r'<script[^>]+src=["\']([^"\']*index-[^"\']+\.js)["\']', html)
    if not match:
        raise RuntimeError("Bundle data Ekraf tidak ditemukan")
    bundle_url = urljoin(SOURCE, match.group(1))
    bundle = get(bundle_url)
    metadata_match = re.search(r'\{title:"Database Terpadu Kuliner.*?totalSubsectors:(\d+)\}', bundle)
    if not metadata_match:
        raise RuntimeError("Metadata Ekraf berubah; sinkronisasi dihentikan agar tidak menerbitkan angka salah")
    meta_text = metadata_match.group(0)
    fields = {key: int(value) for key, value in re.findall(r'(total\w+):(\d+)', meta_text)}
    last_updated = re.search(r'lastUpdated:"([^"]+)"', meta_text)

    datasets = []
    for raw in re.findall(r'JSON\.parse\(`([\s\S]*?)`\)', bundle):
        try:
            candidate = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if candidate:
            datasets.append(candidate)
    if not datasets:
        raise RuntimeError("Dataset master Ekraf tidak dapat dibaca")

    records = max(datasets, key=len)

    subsectors = Counter(str(row.get("Subsektor utama") or row.get("Subsektor") or row.get("Kategori") or "Belum diklasifikasi") for row in records)
    districts = Counter(str(row.get("Kecamatan sementara") or row.get("Kecamatan") or "Belum dipetakan") for row in records)
    payload = {
        "source": SOURCE,
        "sourceBundle": bundle_url,
        "sourceUpdatedAt": last_updated.group(1) if last_updated else None,
        "syncedAt": datetime.now(timezone.utc).isoformat(),
        "updateFrequency": "MONTHLY",
        "totalRecords": fields.get("totalMasterRecords", len(records)),
        **fields,
        "topSubsectors": [{"label": k, "count": v} for k, v in subsectors.most_common(8)],
        "districtCoverage": [{"label": k, "count": v} for k, v in districts.most_common()],
        "privacy": "AGGREGATE_ONLY",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
