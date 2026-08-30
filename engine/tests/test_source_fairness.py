from main import round_robin_candidates


def test_round_robin_gives_every_source_a_slot_before_second_items():
    groups = [[(f"source-{i}", f"item-{i}-{j}") for j in range(5)] for i in range(8)]
    selected = round_robin_candidates(groups, limit=20)
    assert [pair[0] for pair in selected[:8]] == [f"source-{i}" for i in range(8)]
    assert len(selected) == 20


def test_round_robin_handles_empty_sources():
    assert round_robin_candidates([[], [("active", "one")], []], limit=20) == [("active", "one")]
