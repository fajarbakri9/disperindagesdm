"""Publikasikan pembaruan terarah Agen 3444 dari laporan 1–8 Oktober 2026."""
from __future__ import annotations

import json
import sys
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "disperindagesdm-pinrang"
CONFIG = Path.home() / ".config/configstore/firebase-tools.json"
REPORT = ROOT / "assets/data/lpg-distribution-2026-10.json"
MASTER = ROOT / "assets/data/lpg-pangkalan.json"
AGENTS = ROOT / "assets/data/lpg-agents.json"
PANGKALAN_FIELDS = [
    "name", "normalizedName", "previousName", "pertaminaStationId", "registrationId",
    "registrationVerificationStatus", "registrationVerificationSource",
    "latestDistributionPeriod", "latestDistributionNormal", "latestDistributionFacultative",
    "latestDistributionTotal", "latestDistributionUnit", "latestDistributionSource", "dataVersion",
    "latestIdentityEvidence", "operationalDataStatus", "identityReviewNote", "identityReviewDate",
]
AGENT_FIELDS = [
    "soldTo", "agentReportCode", "linkedPangkalanCount", "reportedPangkalanCount",
    "matchedReportedPangkalanCount", "latestDistributionPeriod", "latestDistributionTotal",
    "distributionDataUnit", "distributionDataSource", "relationshipStatus",
]


def fv(value):
    if value is None: return {"nullValue": None}
    if isinstance(value, bool): return {"booleanValue": value}
    if isinstance(value, int): return {"integerValue": str(value)}
    if isinstance(value, float): return {"doubleValue": value}
    if isinstance(value, str): return {"stringValue": value}
    if isinstance(value, list): return {"arrayValue": {"values": [fv(x) for x in value]}}
    if isinstance(value, dict): return {"mapValue": {"fields": {k: fv(v) for k, v in value.items()}}}
    raise TypeError(type(value))


def main():
    apply = "--apply" in sys.argv
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    master = {row["id"]: row for row in json.loads(MASTER.read_text(encoding="utf-8"))}
    agent = next(row for row in json.loads(AGENTS.read_text(encoding="utf-8")) if row["id"] == "AG-007")
    matched = [row for row in report["records"] if row.get("pangkalanId")]
    if len(matched) != 96 or report["totals"]["grandTotal"] != 10640:
        raise SystemExit("Dataset Oktober tidak lolos prasyarat publikasi.")
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    token = config.get("access_token") or config.get("tokens", {}).get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    base = f"projects/{PROJECT}/databases/(default)/documents"
    writes = []
    for report_row in matched:
        record_id = report_row["pangkalanId"]
        row = master[record_id]
        writes.append({
            "update": {"name": f"{base}/lpg_pangkalan/{record_id}", "fields": {key: fv(row.get(key)) for key in PANGKALAN_FIELDS}},
            "updateMask": {"fieldPaths": PANGKALAN_FIELDS}, "currentDocument": {"exists": True},
        })
    writes.append({
        "update": {"name": f"{base}/lpg_agents/AG-007", "fields": {key: fv(agent.get(key)) for key in AGENT_FIELDS}},
        "updateMask": {"fieldPaths": AGENT_FIELDS}, "currentDocument": {"exists": True},
    })
    print(json.dumps({"mode": "APPLY" if apply else "DRY_RUN", "pangkalanMaskedUpdates": 96,
                      "agentMaskedUpdates": 1, "unmatchedExcluded": [row["registrationId"] for row in report["unmatchedRecords"]]}, indent=2))
    if not apply: return
    response = requests.post(f"https://firestore.googleapis.com/v1/{base}:commit", headers=headers, json={"writes": writes}, timeout=120)
    if not response.ok: raise SystemExit(f"Commit gagal HTTP {response.status_code}: {response.text[:1000]}")
    if len(response.json().get("writeResults", [])) != len(writes): raise SystemExit("Jumlah hasil commit tidak cocok")
    print(f"Committed {len(writes)} masked writes.")


if __name__ == "__main__": main()
