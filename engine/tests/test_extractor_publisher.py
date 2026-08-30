from bs4 import BeautifulSoup

import extractor


class Response:
    status_code = 200
    text = """<html><head>
      <meta property="og:site_name" content="Info Rakyat">
      <meta property="og:title" content="Berita Pinrang">
      <meta property="og:url" content="https://info-rakyat.com/berita.html">
      <script type="application/ld+json">{
        "@type":"NewsArticle", "headline":"Berita Pinrang",
        "datePublished":"2026-08-30T12:00:00+08:00",
        "mainEntityOfPage":{"@id":"https://info-rakyat.com/berita.html"}
      }</script>
    </head></html>"""


def test_jsonld_uses_direct_og_site_name_when_publisher_is_absent(monkeypatch):
    monkeypatch.setattr(extractor.requests, "get", lambda *args, **kwargs: Response())
    result = extractor.extract_metadata("https://info-rakyat.com/berita.html")
    assert result["publisher"] == "Info Rakyat"
    assert result["extractedBy"] == "jsonld"
