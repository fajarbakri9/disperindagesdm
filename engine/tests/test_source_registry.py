from config_loader import get_sources


def test_registry_has_eighteen_individually_verified_sources():
    sources = get_sources()
    assert len(sources) == 18
    assert {source["source_class"] for source in sources} == {
        "owned_official", "earned_media"
    }
    assert sum(source["source_class"] == "owned_official" for source in sources) == 2
    assert "info_rakyat_pinrang" in {source["id"] for source in sources}
    assert {"mata_lasinrang", "supala_media", "pijar_news_pinrang",
            "sahabat_news_pinrang", "berita_online_pinrang"}.issubset(
                {source["id"] for source in sources})
    assert "ajatappareng_online_pinrang" in {source["id"] for source in sources}
    assert {"onea_news_pinrang", "topnews1_pinrang", "kabar_makassar"}.issubset(
        {source["id"] for source in sources})


def test_pilot_sources_have_onboarding_metadata():
    for source in get_sources():
        assert source["allowed_domains"]
        assert source["robots_checked_at"]
        assert source["robots_status"] in {"ALLOWED", "NOT_PUBLISHED_ASSUME_ALLOWED"}
        assert source["discovery"]["type"] in {"rss", "sitemap"}
        assert source["discovery"]["urls"]
        assert source["max_candidates_per_run"] <= 30


def test_new_sources_have_five_to_ten_passing_article_samples():
    pilot_ids = {"disperindag_pinrang", "harian_fajar_pinrang", "pinrang_terkini"}
    for source in get_sources():
        if source["id"] in pilot_ids:
            continue
        assert source["onboarding_status"] == "VERIFIED"
        assert 5 <= source["verification_sample_count"] <= 10
        assert source["verification_pass_count"] == source["verification_sample_count"]
