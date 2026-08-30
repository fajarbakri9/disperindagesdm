from config_loader import get_sources


def test_only_three_verified_pilot_sources_are_enabled():
    sources = get_sources()
    assert len(sources) == 3
    assert {source["source_class"] for source in sources} == {
        "owned_official", "earned_media"
    }
    assert sum(source["source_class"] == "owned_official" for source in sources) == 1


def test_pilot_sources_have_onboarding_metadata():
    for source in get_sources():
        assert source["allowed_domains"]
        assert source["robots_checked_at"]
        assert source["robots_status"] == "ALLOWED"
        assert source["discovery"]["type"] in {"rss", "sitemap"}
        assert source["discovery"]["urls"]
        assert source["max_candidates_per_run"] <= 30
