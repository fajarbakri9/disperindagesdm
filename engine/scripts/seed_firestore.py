"""
scripts/seed_firestore.py — Seed konfigurasi awal ke Firestore
Jalankan SEKALI saat setup project.

Usage:
  cd pinrang-intel
  python scripts/seed_firestore.py

Kebutuhan:
  - firebase-sa.json di root project (service account)
  - atau FIREBASE_SERVICE_ACCOUNT env variable
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "collector"))

import firebase_admin
from firebase_admin import credentials, firestore

# ── Init Firebase ─────────────────────────────────────────────────────
def init_firebase():
    sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if sa_json:
        cred = credentials.Certificate(json.loads(sa_json))
    else:
        sa_path = ROOT / "firebase-sa.json"
        if not sa_path.exists():
            print("ERROR: firebase-sa.json tidak ditemukan di root project.")
            print("Buat file service account dari Firebase Console:")
            print("  Project Settings → Service Accounts → Generate new private key")
            sys.exit(1)
        cred = credentials.Certificate(str(sa_path))

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    return firestore.client()


def seed_sources(db, sources: list):
    print(f"\nSeeding {len(sources)} sumber...")
    batch = db.batch()
    for src in sources:
        ref = db.collection("config").document("sources").collection("items").document(src["id"])
        batch.set(ref, src)
    batch.commit()
    print(f"  ✓ {len(sources)} sumber tersimpan ke /config/sources/items/")


def seed_keywords(db, keywords: list):
    print(f"\nSeeding {len(keywords)} keyword cluster...")
    batch = db.batch()
    for kw in keywords:
        ref = db.collection("config").document("keywords").collection("items").document(kw["id"])
        batch.set(ref, kw)
    batch.commit()
    print(f"  ✓ {len(keywords)} cluster tersimpan ke /config/keywords/items/")


def seed_locations(db, locations: dict):
    print(f"\nSeeding location dictionary...")
    db.collection("config").document("locations").set(locations)
    print(f"  ✓ Locations tersimpan ke /config/locations")


def seed_scoring(db, scoring: dict):
    print(f"\nSeeding scoring weights...")
    db.collection("config").document("scoring").set(scoring)
    print(f"  ✓ Scoring tersimpan ke /config/scoring")


def seed_system_config(db):
    print(f"\nSeeding system config...")
    db.collection("config").document("system").set({
        "version":    "1.0.0",
        "env":        "production",
        "seededAt":   firestore.SERVER_TIMESTAMP,
        "watchlist":  {
            "items": [],
            "note":  "priorityMultiplier HANYA memengaruhi tampilan wallboard, bukan kebenaran berita"
        },
        "dynamicEntities": {
            "kadis":   "",
            "bupati":  "",
            "wabup":   "",
            "note":    "Isi nama pejabat aktif — digunakan untuk entity matching"
        }
    })
    print(f"  ✓ System config tersimpan ke /config/system")


def seed_initial_dashboard(db):
    print(f"\nSeeding initial dashboard snapshot...")
    db.collection("dashboard").document("current").set({
        "data": json.dumps({
            "stats": {
                "totalMentions":    0,
                "criticalIssues":   0,
                "negativePct":      0,
                "totalAspirations": 0,
                "activeSources":    0,
            },
            "criticalIssues": [],
            "latestMentions": [],
            "trendingTopics": [],
            "sourceHealth":   [],
            "updatedAt":      "—"
        }),
        "updatedAt": firestore.SERVER_TIMESTAMP,
    })
    print(f"  ✓ Dashboard snapshot awal tersimpan ke /dashboard/current")


def main():
    print("=" * 60)
    print("PINRANG INTEL — Firestore Seeder")
    print("=" * 60)

    db = init_firebase()
    config_dir = ROOT / "config"

    with open(config_dir / "source_registry.json", encoding="utf-8")   as f: sources   = json.load(f)
    with open(config_dir / "keyword_dictionary.json", encoding="utf-8") as f: keywords  = json.load(f)
    with open(config_dir / "location_dictionary.json", encoding="utf-8")as f: locations = json.load(f)
    with open(config_dir / "scoring_weights.json", encoding="utf-8")    as f: scoring   = json.load(f)

    seed_sources(db, sources)
    seed_keywords(db, keywords)
    seed_locations(db, locations)
    seed_scoring(db, scoring)
    seed_system_config(db)
    seed_initial_dashboard(db)

    print("\n" + "=" * 60)
    print("✅ Seed selesai! Struktur Firestore:")
    print("   /config/sources/items/{id}  ← 30 sumber")
    print("   /config/keywords/items/{id} ← 13 cluster")
    print("   /config/locations           ← 12 kecamatan + lokasi strategis")
    print("   /config/scoring             ← Formula relevance & critical")
    print("   /config/system              ← Dynamic entities & watchlist")
    print("   /dashboard/current          ← Snapshot awal (kosong)")
    print("=" * 60)
    print("\nLangkah berikutnya:")
    print("  1. Isi nama Kadis/Bupati aktif di /config/system → dynamicEntities")
    print("  2. Jalankan collector pertama kali:")
    print("     cd collector && python main.py --dry-run")
    print("  3. Jika hasilnya oke, jalankan tanpa --dry-run")


if __name__ == "__main__":
    main()
