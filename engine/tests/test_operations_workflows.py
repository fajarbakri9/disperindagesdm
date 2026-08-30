from pathlib import Path


ROOT = Path(__file__).parents[2]


def test_operations_workflows_use_wif_without_private_key_json():
    for name in ("cleanup.yml", "backup.yml"):
        text = (ROOT / ".github" / "workflows" / name).read_text(encoding="utf-8")
        assert "google-github-actions/auth@v3" in text
        assert "workload_identity_provider" in text
        assert "service_account:" in text
        assert "id-token: write" in text
        assert "MI_WIF_ENABLED == 'true'" in text
        assert "credentials_json" not in text
        assert "SERVICE_ACCOUNT_JSON" not in text


def test_backup_is_private_short_retention_artifact():
    text = (ROOT / ".github" / "workflows" / "backup.yml").read_text(encoding="utf-8")
    assert "actions/upload-artifact@v4" in text
    assert "retention-days: 30" in text
    assert "*.json.gz" in text
    assert "*.manifest.json" in text


def test_cleanup_supports_manual_dry_run_and_bounded_apply():
    workflow = (ROOT / ".github" / "workflows" / "cleanup.yml").read_text(encoding="utf-8")
    script = (ROOT / "engine" / "operations" / "cleanup_firestore.py").read_text(encoding="utf-8")
    assert "workflow_dispatch:" in workflow and "dry_run:" in workflow
    assert "--apply" in workflow
    assert "max_deletes: int = 400" in script
    assert "default is dry-run" in script


def test_operations_runbook_covers_required_procedures():
    text = (ROOT / "docs" / "OPERATIONS.md").read_text(encoding="utf-8").lower()
    for phrase in ("menambah sumber", "menonaktifkan sumber", "menjalankan manual",
                   "workflow gagal", "memperbaiki parser", "memeriksa quota", "rollback"):
        assert phrase in text
