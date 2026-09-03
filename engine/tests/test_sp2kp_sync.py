from datetime import datetime
from unittest.mock import Mock

import pytest

from scripts import sync_sp2kp


def test_current_dataset_never_falls_back_to_an_older_date(monkeypatch):
    calls = []

    def fake_fetch(target, comparison):
        calls.append((target, comparison))
        return {"data": []}

    monkeypatch.setattr(sync_sp2kp, "fetch_sp2kp_raw", fake_fetch)
    with pytest.raises(RuntimeError, match="tanpa fallback"):
        sync_sp2kp.fetch_current_sp2kp_dataset(datetime(2026, 9, 3))
    assert calls == [("2026-09-03", "2026-09-02")]


def test_dry_run_does_not_initialize_firestore(monkeypatch):
    payload = {
        "data": [{
            "variant_id": 1, "variant_nama": "Beras Medium", "satuan_display": "Kg",
            "harga": 15000, "harga_pembanding": 15000, "delta_harga": 0,
            "persen_perubahan": 0, "status_perubahan": "Tidak Berubah",
        }]
    }
    monkeypatch.setattr(
        sync_sp2kp, "fetch_current_sp2kp_dataset",
        lambda _date: (payload, "2026-09-03", "2026-09-02"),
    )
    forbidden_client = Mock(side_effect=AssertionError("dry-run must not create a Firestore client"))
    monkeypatch.setattr(sync_sp2kp, "create_firestore_client", forbidden_client)
    assert sync_sp2kp.run_sync("dry-run", "2026-09-03") == 0
    forbidden_client.assert_not_called()


def test_commit_documents_uses_one_batch_for_all_writes():
    db = Mock()
    batch = db.batch.return_value
    sync_sp2kp.commit_documents(db, [
        ("market_prices_latest", "1", {"displayPrice": 15000}),
        ("market_prices_history", "1_2026-09-03", {"displayPrice": 15000}),
    ])
    assert batch.set.call_count == 2
    batch.commit.assert_called_once_with()

