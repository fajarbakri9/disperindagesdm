from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_admin_review_requires_firebase_auth_and_has_all_stage_nine_actions():
    html = (ROOT / "media-intelligence-admin.html").read_text(encoding="utf-8")
    script = (ROOT / "js/media-intelligence-admin.js").read_text(encoding="utf-8")
    assert "firebase-auth-compat.js" in html
    assert "auth.onAuthStateChanged" in script
    for action in ("ACCEPT", "REJECT", "EDIT", "MERGE_STORY", "ATTACH_ISSUE", "SET_SEVERITY"):
        assert f"'{action}'" in script


def test_admin_review_uses_atomic_audit_and_no_local_auth_fallback():
    script = (ROOT / "js/media-intelligence-admin.js").read_text(encoding="utf-8")
    assert "db.batch()" in script
    assert "mi_audit_logs" in script
    assert "batch.commit()" in script
    assert "localStorage" not in script
    assert "getCurrentSession" not in script


def test_public_dashboard_does_not_load_internal_review_script():
    public = (ROOT / "media-intelligence.html").read_text(encoding="utf-8")
    assert "media-intelligence-admin.js" not in public


def test_legacy_admin_manual_media_forms_are_disabled():
    admin = (ROOT / "admin.html").read_text(encoding="utf-8")
    assert 'id="formMediaSummary" hidden aria-hidden="true"' in admin
    assert "media-intelligence-admin.html" in admin
