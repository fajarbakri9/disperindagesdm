"""
extractor.py — Metadata Extractor
Prioritas:
  1. JSON-LD NewsArticle
  2. OpenGraph
  3. Twitter Card
  4. RSS entry (fallback)
  5. Generic HTML

Aturan penting:
  - Simpan canonical URL, BUKAN Google News redirect
  - thumbnailUrl = og:image / twitter:image (bukan disimpan ke storage)
  - Jika gagal hotlink: None (frontend pakai logo media sebagai fallback)
"""
from __future__ import annotations
import json
import re
from datetime import datetime
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; PinrangIntelBot/1.0; +https://pinrangkab.go.id)",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
}
TIMEOUT = 10


# ────────────────────────────────────────────────────────────
#  MAIN ENTRY POINT
# ────────────────────────────────────────────────────────────

def extract_metadata(url: str, rss_entry: dict | None = None) -> dict:
    """
    Ekstrak metadata artikel. Coba fetch HTML dulu; fallback ke RSS entry.
    Return dict siap dipakai oleh collector.
    """
    meta = {
        "title":        "",
        "thumbnailUrl": "",
        "excerpt":      "",
        "canonical":    url,
        "publishedAt":  "",
        "author":       "",
        "publisher":    "",
        "extractedBy":  "none",
    }

    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        if resp.status_code == 200:
            html = resp.text[:60_000]   # cukup head+awal body
            soup = BeautifulSoup(html, "lxml")

            # ── 1. JSON-LD NewsArticle ──────────────────────────
            jsonld = _extract_jsonld(soup)
            if jsonld:
                meta.update({
                    "title":        jsonld.get("headline", ""),
                    "thumbnailUrl": _get_jsonld_image(jsonld),
                    "excerpt":      jsonld.get("description", ""),
                    "canonical":    jsonld.get("mainEntityOfPage", {}).get("@id", url) or url,
                    "publishedAt":  jsonld.get("datePublished", ""),
                    "author":       _get_author(jsonld),
                    "publisher":    _get_publisher(jsonld),
                    "extractedBy":  "jsonld",
                })
                meta["canonical"] = _clean_url(meta["canonical"])
                if meta["title"]:
                    return meta

            # ── 2. OpenGraph ────────────────────────────────────
            og = _extract_og(soup)
            if og:
                meta.update({
                    "title":        og.get("og:title", ""),
                    "thumbnailUrl": og.get("og:image", ""),
                    "excerpt":      og.get("og:description", ""),
                    "canonical":    og.get("og:url", url),
                    "extractedBy":  "opengraph",
                })
                if not meta["publishedAt"]:
                    meta["publishedAt"] = og.get("article:published_time", "")
                if meta["title"]:
                    return meta

            # ── 3. Twitter Card ─────────────────────────────────
            tw = _extract_twitter(soup)
            if tw:
                if not meta["title"]:       meta["title"]       = tw.get("twitter:title", "")
                if not meta["thumbnailUrl"]:meta["thumbnailUrl"]= tw.get("twitter:image", "")
                if not meta["excerpt"]:     meta["excerpt"]     = tw.get("twitter:description", "")
                meta["extractedBy"] = "twitter_card"

            # ── 4. Canonical link tag ───────────────────────────
            canon = soup.find("link", rel="canonical")
            if canon and canon.get("href"):
                meta["canonical"] = _clean_url(canon["href"])

            # ── 5. Generic HTML fallback ────────────────────────
            if not meta["title"]:
                h1 = soup.find("h1")
                meta["title"] = h1.get_text(strip=True) if h1 else soup.title.string if soup.title else ""
                meta["extractedBy"] = "html_fallback"

            if not meta["excerpt"]:
                desc = soup.find("meta", attrs={"name": "description"})
                if desc:
                    meta["excerpt"] = desc.get("content", "")

    except Exception as e:
        pass  # Jika fetch gagal, gunakan data RSS

    # ── Fallback: RSS entry ─────────────────────────────────
    if rss_entry and not meta["title"]:
        meta["title"]        = rss_entry.get("title", "")
        meta["excerpt"]      = rss_entry.get("summary", "")
        meta["publishedAt"]  = rss_entry.get("published", "")
        meta["thumbnailUrl"] = rss_entry.get("enclosure_url", "")
        meta["extractedBy"]  = "rss_fallback"

    # ── Bersihkan excerpt ───────────────────────────────────
    if meta["excerpt"]:
        meta["excerpt"] = re.sub(r"<[^>]+>", " ", meta["excerpt"])
        meta["excerpt"] = re.sub(r"\s+", " ", meta["excerpt"]).strip()[:500]

    return meta


# ────────────────────────────────────────────────────────────
#  HELPERS — JSON-LD
# ────────────────────────────────────────────────────────────

def _extract_jsonld(soup: BeautifulSoup) -> dict | None:
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
            if isinstance(data, list):
                for item in data:
                    if item.get("@type") in ("NewsArticle", "Article", "WebPage"):
                        return item
            elif data.get("@type") in ("NewsArticle", "Article", "WebPage"):
                return data
        except Exception:
            pass
    return None


def _get_jsonld_image(data: dict) -> str:
    img = data.get("image")
    if isinstance(img, str):   return img
    if isinstance(img, dict):  return img.get("url", "")
    if isinstance(img, list) and img:
        first = img[0]
        if isinstance(first, str):  return first
        if isinstance(first, dict): return first.get("url", "")
    return ""


def _get_author(data: dict) -> str:
    author = data.get("author", {})
    if isinstance(author, dict):  return author.get("name", "")
    if isinstance(author, list) and author:
        return author[0].get("name", "") if isinstance(author[0], dict) else str(author[0])
    return ""


def _get_publisher(data: dict) -> str:
    pub = data.get("publisher", {})
    if isinstance(pub, dict): return pub.get("name", "")
    return ""


# ────────────────────────────────────────────────────────────
#  HELPERS — OpenGraph & Twitter
# ────────────────────────────────────────────────────────────

def _extract_og(soup: BeautifulSoup) -> dict:
    og = {}
    for tag in soup.find_all("meta"):
        prop = tag.get("property", "") or tag.get("name", "")
        cont = tag.get("content", "")
        if prop and cont:
            og[prop] = cont
    return {k: v for k, v in og.items() if k.startswith("og:") or k.startswith("article:")}


def _extract_twitter(soup: BeautifulSoup) -> dict:
    tw = {}
    for tag in soup.find_all("meta"):
        name = tag.get("name", "")
        cont = tag.get("content", "")
        if name.startswith("twitter:") and cont:
            tw[name] = cont
    return tw


def _clean_url(url: str) -> str:
    """Buang parameter tracking, hapus amp subdomain."""
    if not url:
        return url
    url = re.sub(r"[?&](utm_[a-z_]+|amp|noamp)[^&]*", "", url)
    url = url.rstrip("?&")
    url = re.sub(r"^https?://amp\.", "https://", url)
    return url
