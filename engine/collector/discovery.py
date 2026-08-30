"""
discovery.py — Discovery Engine
Menemukan URL artikel baru dari berbagai metode:
  1. RSS feed (feedparser)
  2. Tag/category page scraping
  3. Google News Search (discovery query)

Output: list URL baru yang belum ada di Firestore
"""
from __future__ import annotations
import hashlib
import re
import time
from urllib.parse import urlparse

import feedparser
import requests
from bs4 import BeautifulSoup

from normalizers import normalize_url

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; PinrangIntelBot/1.0)",
    "Accept-Language": "id-ID,id;q=0.9",
}
TIMEOUT = 15


class DiscoveryError(RuntimeError):
    """Failure that must be reflected in source health, not converted to zero items."""


# ────────────────────────────────────────────────────────────
#  ENTRY POINT: Discover artikel dari satu sumber
# ────────────────────────────────────────────────────────────

def discover_from_source(source: dict, existing_urls: set[str]) -> list[dict]:
    """
    Return list dict artikel baru dari satu sumber.
    Setiap dict: { url, title, excerpt, published_at, enclosure_url, source_id }
    """
    found = []
    mode  = source.get("monitorMode", "rss")
    discovery = source.get("discovery") or {}
    discovery_type = discovery.get("type", mode)
    discovery_urls = discovery.get("urls") or []

    if discovery_type == "sitemap":
        for sitemap_url in discovery_urls:
            found.extend(_parse_sitemap(sitemap_url, source))

    # 1. RSS feed
    if "rss" in mode or "direct" in mode or "category" in mode or "tag" in mode:
        rss_url = source.get("rssUrl") or source.get("tagUrl")
        if rss_url:
            found.extend(_parse_rss(rss_url, source))

    # 2. Tag/category page (scrape link artikel)
    if "tag" in mode or "category" in mode:
        tag_url = source.get("tagUrl")
        if tag_url and tag_url != source.get("rssUrl"):
            found.extend(_scrape_links(tag_url, source))

    # 3. Discovery search (Google News)
    if "discovery" in mode or "search" in mode:
        query = source.get("discoveryQuery")
        if query:
            found.extend(_google_news_search(query, source))

    # Deduplikasi internal (URL unik dari sumber ini)
    seen   = set()
    unique = []
    for a in found:
        url = _normalize_url(a.get("url", ""))
        if url and url not in seen:
            seen.add(url)
            a["url"] = url
            unique.append(a)

    # Filter URL yang sudah ada di Firestore
    new = [a for a in unique if _url_hash(a["url"]) not in existing_urls]

    return new


def _parse_sitemap(sitemap_url: str, source: dict) -> list[dict]:
    """Discover article URLs from a first-party sitemap or sitemap index."""
    articles = []
    try:
        response = requests.get(sitemap_url, headers=HEADERS, timeout=TIMEOUT)
        if response.status_code != 200:
            raise DiscoveryError(f"Sitemap HTTP {response.status_code}: {sitemap_url}")
        soup = BeautifulSoup(response.content, "xml")
        nested = [loc.get_text(strip=True) for loc in soup.select("sitemap > loc")]
        if nested:
            for child in nested[:5]:
                articles.extend(_parse_sitemap(child, source))
            return articles[:source.get("max_candidates_per_run", 30)]

        allowed = set(source.get("allowed_domains") or [source["domain"]])
        for node in soup.select("url"):
            loc = node.find("loc")
            if not loc:
                continue
            url = normalize_url(loc.get_text(strip=True))
            if not url or urlparse(url).hostname not in allowed:
                continue
            path = urlparse(url).path
            if "/berita/" not in path:
                continue
            slug = path.rstrip("/").split("/")[-1]
            title_hint = re.sub(r"[-_]", " ", slug).strip()
            lastmod = node.find("lastmod")
            articles.append({
                "url": url,
                "title": title_hint,
                "excerpt": "",
                "published_at": lastmod.get_text(strip=True) if lastmod else "",
                "source_id": source["id"],
            })
        return articles[:source.get("max_candidates_per_run", 30)]
    except DiscoveryError:
        raise
    except Exception as exc:
        raise DiscoveryError(f"Sitemap gagal: {type(exc).__name__}") from exc


# ────────────────────────────────────────────────────────────
#  RSS PARSER
# ────────────────────────────────────────────────────────────

def _parse_rss(rss_url: str, source: dict) -> list[dict]:
    articles = []
    try:
        feed = feedparser.parse(rss_url, request_headers=HEADERS)
        if feed.bozo and not feed.entries:
            raise DiscoveryError(f"RSS tidak dapat dibaca: {rss_url}")

        for entry in feed.entries[:30]:
            url = _get_url_from_entry(entry)
            if not url:
                continue

            # Ambil enclosure image (Tribun Timur menyediakan ini)
            enclosure_url = ""
            for enc in getattr(entry, "enclosures", []):
                if enc.get("type", "").startswith("image/"):
                    enclosure_url = enc.get("href", "")
                    break

            title   = entry.get("title", "").strip()
            summary = entry.get("summary", "") or entry.get("description", "")
            summary = _strip_html(summary)[:500]
            pub     = entry.get("published", "") or entry.get("updated", "")

            articles.append({
                "url":           url,
                "title":         title,
                "excerpt":       summary,
                "published_at":  pub,
                "enclosure_url": enclosure_url,
                "source_id":     source["id"],
            })
    except DiscoveryError:
        raise
    except Exception as exc:
        raise DiscoveryError(f"RSS gagal: {type(exc).__name__}") from exc
    return articles


def _get_url_from_entry(entry) -> str:
    """Pilih URL terbaik dari RSS entry — prioritas link > id > guid."""
    for attr in ("link", "id", "guid"):
        val = getattr(entry, attr, None)
        if val and val.startswith("http"):
            return _normalize_url(val)
    return ""


# ────────────────────────────────────────────────────────────
#  TAG/CATEGORY PAGE SCRAPER
# ────────────────────────────────────────────────────────────

def _scrape_links(page_url: str, source: dict) -> list[dict]:
    articles = []
    try:
        resp = requests.get(page_url, headers=HEADERS, timeout=TIMEOUT)
        if resp.status_code != 200:
            raise DiscoveryError(f"Halaman discovery HTTP {resp.status_code}: {page_url}")
        soup = BeautifulSoup(resp.text, "lxml")
        domain = source["domain"]

        for a in soup.find_all("a", href=True):
            href = a["href"]
            if not href.startswith("http"):
                href = f"https://{domain}{href}"
            if domain not in href:
                continue
            # Filter: harus seperti URL artikel (bukan kategori/halaman biasa)
            path = urlparse(href).path
            if len(path.split("/")) < 3:
                continue
            title = a.get_text(strip=True)[:200]
            articles.append({
                "url":          _normalize_url(href),
                "title":        title,
                "excerpt":      "",
                "published_at": "",
                "source_id":    source["id"],
            })
        if not articles:
            raise DiscoveryError(f"Markup discovery tidak menghasilkan tautan artikel: {page_url}")
    except DiscoveryError:
        raise
    except Exception as exc:
        raise DiscoveryError(f"Scrape gagal: {type(exc).__name__}") from exc
    return articles[:20]


# ────────────────────────────────────────────────────────────
#  GOOGLE NEWS SEARCH
# ────────────────────────────────────────────────────────────

def _google_news_search(query: str, source: dict) -> list[dict]:
    """
    Gunakan Google News RSS untuk discovery.
    Tidak menerobos robots.txt — hanya menggunakan feed publik Google News.
    """
    articles = []
    try:
        encoded = query.replace(" ", "+")
        gnews_rss = f"https://news.google.com/rss/search?q={encoded}&hl=id&gl=ID&ceid=ID:id"
        feed = feedparser.parse(gnews_rss, request_headers=HEADERS)

        for entry in feed.entries[:15]:
            url = entry.get("link", "")
            # Google News redirect → ambil URL sumber asli dari summary
            if "news.google.com" in url:
                url = _extract_real_url_from_gnews(entry)
            if not url or source["domain"] not in url:
                continue  # Hanya ambil dari domain sumber ini

            title   = entry.get("title", "").strip()
            summary = entry.get("summary", "")
            summary = _strip_html(summary)[:500]
            pub     = entry.get("published", "")

            articles.append({
                "url":          _normalize_url(url),
                "title":        title,
                "excerpt":      summary,
                "published_at": pub,
                "source_id":    source["id"],
            })

        time.sleep(0.5)  # Rate limiting
    except Exception as e:
        print(f"[GNEWS ERROR] {source['name']}: {e}")
    return articles


def _extract_real_url_from_gnews(entry) -> str:
    """Coba ambil URL asli dari summary Google News."""
    summary = entry.get("summary", "")
    # Google News sering include link asli di <a href="...">
    match = re.search(r'href="(https?://[^"]+)"', summary)
    if match:
        return match.group(1)
    return entry.get("link", "")


# ────────────────────────────────────────────────────────────
#  NEW SOURCE DETECTION
# ────────────────────────────────────────────────────────────

def detect_new_domain(url: str, known_domains: set[str]) -> str | None:
    """Return domain jika URL berasal dari domain yang belum dikenal."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.replace("www.", "")
        if domain and domain not in known_domains:
            return domain
    except Exception:
        pass
    return None


# ────────────────────────────────────────────────────────────
#  UTILS
# ────────────────────────────────────────────────────────────

def _normalize_url(url: str) -> str:
    return normalize_url(url)


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text).strip()


def _url_hash(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:20]
