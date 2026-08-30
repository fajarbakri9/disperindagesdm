from datetime import datetime, timedelta, timezone

from story_intelligence import find_matching_story, severity_from_relevance, title_similarity


def test_similar_reports_match_one_story():
    now = datetime.now(timezone.utc)
    cluster = {"cluster_id": "story-lpg", "representative_title":
               "Kelangkaan LPG 3 Kg di Bungi Picu Antrean Warga",
               "topic_ids": ["lpg"], "district_ids": ["duampanua"], "first_item_at": now}
    item = {"title": "Warga Bungi Antre akibat LPG 3 Kg Langka",
            "topic_ids": ["lpg"], "district_ids": ["duampanua"], "published_at": now}
    assert title_similarity(item["title"], cluster["representative_title"]) >= 0.32
    assert find_matching_story(item, [cluster]) == "story-lpg"


def test_story_window_and_topic_are_fail_closed():
    now = datetime.now(timezone.utc)
    cluster = {"cluster_id": "old", "representative_title": "Harga LPG naik di Bungi",
               "topic_ids": ["lpg"], "district_ids": ["duampanua"],
               "first_item_at": now - timedelta(hours=80)}
    item = {"title": "Harga LPG naik di Bungi", "topic_ids": ["pangan"],
            "district_ids": ["duampanua"], "published_at": now}
    assert find_matching_story(item, [cluster]) is None


def test_severity_mapping_is_deterministic():
    assert severity_from_relevance(59) == "LOW"
    assert severity_from_relevance(60) == "MEDIUM"
    assert severity_from_relevance(75) == "HIGH"
    assert severity_from_relevance(90) == "CRITICAL"
