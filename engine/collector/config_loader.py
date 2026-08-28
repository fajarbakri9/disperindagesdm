"""
config_loader.py — Baca konfigurasi dari Firestore atau file JSON lokal.
Saat development: baca dari /config/*.json
Saat production: baca dari Firestore /config/
"""
import json
import os
from pathlib import Path

CONFIG_DIR = Path(__file__).parent.parent / "config"

_cache = {}


def _load_json(filename: str) -> dict | list:
    key = filename
    if key not in _cache:
        with open(CONFIG_DIR / filename, encoding="utf-8") as f:
            _cache[key] = json.load(f)
    return _cache[key]


def get_sources(tier: str | None = None, enabled_only: bool = True) -> list[dict]:
    """Kembalikan daftar sumber, opsional filter berdasarkan tier."""
    sources = _load_json("source_registry.json")
    if enabled_only:
        sources = [s for s in sources if s.get("enabled", True)]
    if tier:
        tiers = [t.strip() for t in tier.split(",")]
        sources = [s for s in sources if s.get("tier") in tiers]
    return sources


def get_keywords() -> list[dict]:
    """Kembalikan semua cluster keyword."""
    return _load_json("keyword_dictionary.json")


def get_locations() -> dict:
    """Kembalikan location dictionary."""
    return _load_json("location_dictionary.json")


def get_scoring() -> dict:
    """Kembalikan scoring weights."""
    return _load_json("scoring_weights.json")


def get_all_geo_terms(locations: dict) -> dict:
    """Build flat geo term sets dari location dictionary."""
    kabupaten_terms = set(t.lower() for t in locations["regency"]["aliases"])
    kecamatan_terms = set()
    village_terms   = set()
    strategic_terms = set()

    for kec in locations["kecamatan"]:
        for alias in kec.get("aliases", [kec["name"]]):
            kecamatan_terms.add(alias.lower())
        for village in kec.get("villages", []):
            village_terms.add(village.lower())
        for loc in kec.get("strategicLocations", []):
            strategic_terms.add(loc["name"].lower())

    for category, locs in locations.get("strategicLocations", {}).items():
        for loc in locs:
            strategic_terms.add(loc.lower())

    for loc in locations.get("geoBoostLocations", []):
        village_terms.add(loc.lower())

    return {
        "kabupaten": kabupaten_terms,
        "kecamatan": kecamatan_terms,
        "village":   village_terms,
        "strategic": strategic_terms,
        "all":       kabupaten_terms | kecamatan_terms | village_terms | strategic_terms
    }


def get_all_keyword_terms(keywords: list[dict]) -> dict:
    """Build flat term sets dari semua cluster keyword."""
    all_terms  = set()
    risk_terms = set()
    asp_terms  = set()

    for cluster in keywords:
        if not cluster.get("enabled", True):
            continue
        for t in cluster.get("terms", []):
            all_terms.add(t.lower())
        for t in cluster.get("riskTerms", []):
            risk_terms.add(t.lower())
        for t in cluster.get("aspirationTerms", []):
            asp_terms.add(t.lower())

    return {
        "terms":       all_terms,
        "risk":        risk_terms,
        "aspiration":  asp_terms,
        "all":         all_terms | risk_terms
    }
