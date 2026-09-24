import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from board_common import to_iso_date, build_coverage, majority_vote


def test_to_iso_from_date():
    assert to_iso_date(date(2026, 8, 5)) == "2026-08-05"


def test_to_iso_from_datetime():
    assert to_iso_date(datetime(2026, 8, 5, 13, 30)) == "2026-08-05"


def test_to_iso_from_iso_string():
    assert to_iso_date("2026-08-05") == "2026-08-05"


def test_to_iso_from_none():
    assert to_iso_date(None) == ""


def test_build_coverage_counts_present_and_missing():
    dates = ["2026-01-01", "2026-01-02", "2026-01-04"]
    result = build_coverage(dates)
    assert result == [{"year": "2026", "haveDays": 3, "missingDays": 1}]


def test_build_coverage_spans_years():
    dates = ["2025-12-30", "2025-12-31", "2026-01-01"]
    result = build_coverage(dates)
    assert result == [
        {"year": "2025", "haveDays": 2, "missingDays": 0},
        {"year": "2026", "haveDays": 1, "missingDays": 0},
    ]


def test_build_coverage_empty():
    assert build_coverage([]) == []


def test_majority_vote_picks_most_common():
    assert majority_vote(["美", "美", "台"]) == "美"


def test_majority_vote_tie_picks_first_seen():
    assert majority_vote(["台", "美"]) == "台"


def test_majority_vote_single():
    assert majority_vote(["韓"]) == "韓"
