import json
from collections import Counter
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
MOVIES = ROOT / "public" / "data" / "movies.json"


@pytest.fixture(scope="module")
def data():
    if not MOVIES.exists():
        pytest.skip("movies.json 尚未產生，先執行 python scripts/convert_movies.py")
    with open(MOVIES, encoding="utf-8") as f:
        return json.load(f)


def test_daily_board_day_count(data):
    assert len(data["dailyBoard"]) == 1702


def test_daily_board_date_range(data):
    assert data["dailyBoard"][0]["date"] == "2021-04-05"
    assert data["dailyBoard"][-1]["date"] == "2026-08-05"


def test_daily_board_is_sorted_by_date(data):
    dates = [b["date"] for b in data["dailyBoard"]]
    assert dates == sorted(dates)


def test_entity_count(data):
    assert len(data["entities"]) == 1410


def test_weekly_week_count(data):
    assert len(data["weeklyRankings"]) == 170


def test_every_board_title_has_attributes(data):
    missing = {
        entry["title"]
        for board in data["dailyBoard"]
        for entry in board["entries"]
        if entry["title"] not in data["entities"]
    }
    assert missing == set()


def test_language_values_are_canonical(data):
    allowed = {"英語", "其他語言", "台灣", "日語", "韓語", "華語"}
    assert {e["language"] for e in data["entities"].values()} <= allowed


def test_format_values_are_canonical(data):
    allowed = {"劇情片", "動畫", "紀錄片"}
    assert {e["format"] for e in data["entities"].values()} <= allowed


def test_language_share_matches_spec(data):
    """規格記載的榜位天數佔比，容許 0.5 個百分點誤差"""
    counts = Counter()
    total = 0
    for board in data["dailyBoard"]:
        for entry in board["entries"]:
            counts[data["entities"][entry["title"]]["language"]] += 1
            total += 1

    expected = {
        "英語": 53.9, "其他語言": 13.9, "台灣": 11.2,
        "日語": 8.8, "韓語": 6.1, "華語": 6.1,
    }
    for language, pct in expected.items():
        actual = counts[language] / total * 100
        assert abs(actual - pct) < 0.5, f"{language} 實際 {actual:.1f}%，規格 {pct}%"


def test_coverage_matches_known_gaps(data):
    by_year = {row["year"]: row for row in data["meta"]["coverage"]}
    assert by_year["2021"]["missingDays"] == 102
    assert by_year["2022"]["missingDays"] == 34
    assert by_year["2023"]["missingDays"] == 110
    assert by_year["2024"]["missingDays"] == 0
    assert by_year["2025"]["missingDays"] == 0


def test_ranks_within_range(data):
    for board in data["dailyBoard"]:
        for entry in board["entries"]:
            assert 1 <= entry["rank"] <= 10


def test_known_long_runner(data):
    """KPop 獵魔女團是全期最長青的片，269 天"""
    assert data["entities"]["Kpop獵魔女團"]["daysOnChart"] == 269


def test_taiwan_film_is_taiwan_language(data):
    """「關於我和鬼變成家人的那件事」曾被錯標成美，多數決應判回台灣"""
    assert data["entities"]["關於我和鬼變成家人的那件事"]["language"] == "台灣"


def test_entity_keys_match_typescript_interface(data):
    """欄位集合必須與 src/types/index.ts 的 MovieAttributes 完全一致。

    這條取代了劇集那份 generated schema validator：TS 型別或管線任何一邊
    增刪欄位，這裡就會失敗，避免兩邊悄悄漂移。
    """
    expected = {
        "language", "format", "origin", "isNetflixOriginal",
        "firstDate", "lastDate", "daysOnChart",
        "bestRank", "avgRank", "totalScore",
    }
    for title, attrs in data["entities"].items():
        assert set(attrs) == expected, f"{title} 欄位不符：{sorted(set(attrs) ^ expected)}"


def test_top_level_keys_match_board_dataset(data):
    assert set(data) == {"meta", "entities", "dailyBoard", "weeklyRankings"}
    assert set(data["meta"]) == {"generatedAt", "dataThrough", "coverage"}


def test_board_entry_keys(data):
    for board in data["dailyBoard"]:
        assert set(board) == {"date", "entries"}
        for entry in board["entries"]:
            assert set(entry) == {"rank", "title"}
