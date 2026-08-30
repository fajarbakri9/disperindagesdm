"""Fail-closed GO/NO-GO check for Media Intelligence production cutover."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_URL = (
    "https://firestore.googleapis.com/v1/projects/disperindagesdm-pinrang/"
    "databases/(default)/documents/mi_public/current"
)


def check(name: str, passed: bool, detail: str) -> dict:
    return {"name": name, "passed": bool(passed), "detail": detail}


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def static_checks() -> list[dict]:
    admin = read("js/admin.js")
    data = read("js/data.js")
    public = read("media-intelligence.html")
    command_center = read("command-center.html") + read("js/command-center.js")
    workflows = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (ROOT / ".github" / "workflows").glob("*.yml")
    )
    crawl = read(".github/workflows/crawl.yml")
    rules = read("firestore.rules")
    sources = read("engine/config/sources.yml")
    requirements = read("engine/collector/requirements.txt")
    env_example = read("engine/.env.example")
    forbidden_paid_paths = [
        ROOT / "MediaIntelCrawler.gs",
        ROOT / "engine" / "collector" / "intelligence.py",
    ]
    enabled_sources = len(re.findall(r"(?m)^  enabled: true\s*$", sources))
    audit_path = ROOT / "engine" / "reports" / "production_article_audit.json"
    audit = json.loads(audit_path.read_text(encoding="utf-8")) if audit_path.is_file() else {}
    legacy_access = re.search(
        r"(?:setStorage|localStorage\.setItem|getStorage)\([^\n]*disperindag_media_intelligence",
        admin + data,
    )
    return [
        check("no_dummy_dataset", "DEFAULT_MEDIA_INTELLIGENCE" not in admin + data,
              "Dataset contoh legacy tidak boleh berada di bundle."),
        check("no_localstorage_source", legacy_access is None,
              "Key legacy hanya boleh dihapus, tidak boleh dibaca/ditulis."),
        check("wif_only_workflows", "credentials_json" not in workflows and
              "SERVICE_ACCOUNT_JSON" not in workflows,
              "Seluruh workflow cloud harus memakai WIF."),
        check("spark_only_dependencies",
              "google-generativeai" not in requirements and
              "GEMINI_API_KEY" not in env_example and
              "google-cloud-sdk" not in requirements and
              not any(path.exists() for path in forbidden_paid_paths),
              "Runtime tidak boleh memasang AI berbayar atau Cloud SDK."),
        check("crawler_scheduled", 'cron: "17 2,6,10,14,18,22 * * *"' in crawl and
              "MI_WIF_ENABLED == 'true'" in crawl,
              "Enam jadwal WITA tersedia dan fail-closed sampai WIF aktif."),
        check("source_registry_present", 0 < enabled_sources <= 20,
              f"Sumber aktif terkonfigurasi: {enabled_sources}."),
        check("public_snapshot_reader", "mi_public" in public,
              "Dashboard publik harus membaca snapshot yang disanitasi."),
        check("command_center_synced", "mi_public" in command_center,
              "Command Center harus membaca snapshot publik yang sama."),
        check("admin_review_present", (ROOT / "media-intelligence-admin.html").is_file(),
              "Antrean review admin tersedia."),
        check("rules_fail_closed", "match /mi_public/{docId}" in rules and
              "match /mi_items/{itemId}" in rules,
              "Rules publik dan internal Media Intelligence terdefinisi."),
        check("manual_article_acceptance",
              audit.get("decision") == "PASS" and
              int(audit.get("sampled_articles", 0)) >= 30 and
              audit.get("passed_articles") == audit.get("sampled_articles"),
              f"Audit ketat: {audit.get('passed_articles', 0)}/"
              f"{audit.get('sampled_articles', 0)} artikel lulus; minimum 30."),
    ]


def production_snapshot_check(url: str) -> dict:
    try:
        request = Request(url, headers={"User-Agent": "mi-readiness-check/1.0"})
        with urlopen(request, timeout=12) as response:
            payload = json.load(response)
        fields = payload.get("fields", {})
        audit_path = ROOT / "engine" / "reports" / "production_article_audit.json"
        audit = json.loads(audit_path.read_text(encoding="utf-8")) if audit_path.is_file() else {}
        snapshot_run = fields.get("sync_run_id", {}).get("stringValue")
        audit_current = bool(snapshot_run and audit.get("snapshot_sync_run_id") == snapshot_run)
        return check("public_snapshot_active", bool(fields) and audit_current,
                     f"Snapshot production terbaca ({len(fields)} field); "
                     f"audit {'sesuai' if audit_current else 'sudah kedaluwarsa'}." )
    except HTTPError as exc:
        return check("public_snapshot_active", False,
                     f"Firestore REST mengembalikan HTTP {exc.code}.")
    except (URLError, TimeoutError, ValueError) as exc:
        return check("public_snapshot_active", False,
                     f"Snapshot tidak dapat diverifikasi: {type(exc).__name__}.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot-url", default=SNAPSHOT_URL)
    parser.add_argument("--skip-production", action="store_true")
    args = parser.parse_args()
    results = static_checks()
    if not args.skip_production:
        results.append(production_snapshot_check(args.snapshot_url))
    blockers = [item for item in results if not item["passed"]]
    report = {
        "decision": "GO" if not blockers else "NO-GO",
        "checks": results,
        "blockers": [item["name"] for item in blockers],
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not blockers else 1


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    raise SystemExit(main())
