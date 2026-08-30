from pathlib import Path


ROOT = Path(__file__).parents[2]


def test_command_center_has_five_media_intelligence_summary_fields():
    html = (ROOT / "command-center.html").read_text(encoding="utf-8")
    for element_id in ("ccMiMentions24h", "ccMiUniqueStories", "ccMiCriticalIssues",
                       "ccMiLastSync", "ccMiStatus"):
        assert f'id="{element_id}"' in html


def test_command_center_reads_only_public_media_intelligence_snapshot():
    script = (ROOT / "js" / "command-center.js").read_text(encoding="utf-8")
    assert "db.collection('mi_public').doc('current').onSnapshot" in script
    for forbidden in ("db.collection('mi_items')", "db.collection('mi_issues')",
                      "db.collection('mi_story_clusters')", "db.collection('mi_sync_runs')",
                      "db.collection('mi_daily_metrics')", "db.collection('mi_review_tasks')"):
        assert forbidden not in script


def test_command_center_maps_same_snapshot_kpis_without_fallback_numbers():
    script = (ROOT / "js" / "command-center.js").read_text(encoding="utf-8")
    assert "kpis.earned_mentions_24h" in script
    assert "kpis.unique_stories_24h" in script
    assert "kpis.active_critical_issues" in script
    assert "snapshot?.last_run_at || snapshot?.last_full_success_at" in script
    assert "snapshot?.system_status" in script
    assert "safeKpi" in script and ": '—'" in script
