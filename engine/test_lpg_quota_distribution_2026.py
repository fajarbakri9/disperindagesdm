import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets/data/lpg-quota-distribution-2026.json"


def load_data():
    return json.loads(DATA.read_text(encoding="utf-8"))


def test_quota_conversion_is_dimensionally_correct():
    data = load_data()
    quota = data["annualQuota"]
    assert quota["value"] == 11692
    assert quota["unit"] == "MT"
    assert quota["kilograms"] == 11692000
    assert quota["equivalentCylinderCountApprox"] == round(11692000 / 3, 6)
    assert quota["wholeCylinderEquivalent"] == 3897333
    assert quota["conversionRemainderKg"] == 1


def test_january_to_july_totals_are_reconciled():
    data = load_data()
    distribution = data["distribution"]
    agent_total = sum(item["total"] for item in distribution["agents"])
    monthly_total = sum(distribution["correctedMonthlyTotals"].values())
    assert len(distribution["agents"]) == 9
    assert agent_total == monthly_total == distribution["correctedGrandTotal"] == 2487670


def test_printed_monthly_errors_are_preserved_and_corrected():
    data = load_data()
    distribution = data["distribution"]
    assert distribution["correctedMonthlyTotals"]["2026-06"] == 363480
    assert distribution["correctedMonthlyTotals"]["2026-07"] == 369350
    assert [(x["period"], x["difference"]) for x in distribution["corrections"]] == [
        ("2026-06", 3960),
        ("2026-07", 9720),
    ]


def test_unverified_or_partial_numbers_are_excluded():
    data = load_data()
    text = " ".join(data["excludedData"])
    assert "13.683" in text
    assert "18.480" in text
    assert "5.040" in text
    assert data["distribution"]["coveredPeriodEnd"] == "2026-07-31"
