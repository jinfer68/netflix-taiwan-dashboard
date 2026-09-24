"""
以真實資料驗證 convert_movies.py 的輸出。

設計原則：斷言的是「不會因爬蟲更新而改變的性質」。

爬蟲每跑一次，日榜就多幾十天、片單就多幾十部。若斷言寫死筆數與佔比，
每次更新都會整套變紅，而唯一能讓它變綠的動作就是把期望值改成新輸出 ——
那等於每次都把測試的驗證價值刪掉一次。實際上這件事已經發生過一次
（2026-09 的資料更新），所以改成下列三種寫法：

  1. 結構性：長度等於不重複日期數、日期遞增、欄位集合固定
  2. 關聯性：最後一天等於 meta.dataThrough、每個榜上片名都有屬性
  3. 已封閉期間：2021–2025 都已結束，那段的佔比與缺漏數永遠不會再變

只有第 3 種能鎖住「語言分類規則是否仍然正確」這件事，而且鎖得住。
"""

import json
from collections import Counter
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
MOVIES = ROOT / "public" / "data" / "movies.json"

# 資料首日是歷史事實，不會再變
FIRST_DATE = "2021-04-05"

# 已封閉期間：2021–2025 已經結束，新資料只會加在 2026 之後
CLOSED_END = "2026-01-01"


@pytest.fixture(scope="module")
def data():
    if not MOVIES.exists():
        pytest.skip("movies.json 尚未產生，先執行 python scripts/convert_movies.py")
    with open(MOVIES, encoding="utf-8") as f:
        return json.load(f)


# ── 結構性 ────────────────────────────────────────────────────────────

def test_daily_board_has_no_duplicate_dates(data):
    dates = [b["date"] for b in data["dailyBoard"]]
    assert len(dates) == len(set(dates))


def test_daily_board_is_sorted_by_date(data):
    dates = [b["date"] for b in data["dailyBoard"]]
    assert dates == sorted(dates)


def test_daily_board_starts_at_known_first_date(data):
    assert data["dailyBoard"][0]["date"] == FIRST_DATE


def test_ranks_within_range(data):
    for board in data["dailyBoard"]:
        for entry in board["entries"]:
            assert 1 <= entry["rank"] <= 10


def test_no_duplicate_rank_within_a_day(data):
    for board in data["dailyBoard"]:
        ranks = [e["rank"] for e in board["entries"]]
        assert len(ranks) == len(set(ranks)), board["date"]


def test_top_level_keys_match_board_dataset(data):
    assert set(data) == {"meta", "entities", "dailyBoard", "weeklyRankings"}
    assert set(data["meta"]) == {"generatedAt", "dataThrough", "coverage"}


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


def test_board_entry_keys(data):
    for board in data["dailyBoard"]:
        assert set(board) == {"date", "entries"}
        for entry in board["entries"]:
            assert set(entry) == {"rank", "title"}


# ── 關聯性 ────────────────────────────────────────────────────────────

def test_data_through_matches_last_board(data):
    assert data["meta"]["dataThrough"] == data["dailyBoard"][-1]["date"]


def test_every_board_title_has_attributes(data):
    missing = {
        entry["title"]
        for board in data["dailyBoard"]
        for entry in board["entries"]
        if entry["title"] not in data["entities"]
    }
    assert missing == set()


def test_entity_days_match_board_appearances(data):
    """daysOnChart 必須等於該片在 dailyBoard 實際出現的次數"""
    counted = Counter(
        entry["title"]
        for board in data["dailyBoard"]
        for entry in board["entries"]
    )
    for title, attrs in data["entities"].items():
        assert attrs["daysOnChart"] == counted[title], title


def test_entity_first_last_match_board(data):
    appearances = {}
    for board in data["dailyBoard"]:
        for entry in board["entries"]:
            appearances.setdefault(entry["title"], []).append(board["date"])
    for title, attrs in data["entities"].items():
        dates = appearances[title]
        assert attrs["firstDate"] == min(dates), title
        assert attrs["lastDate"] == max(dates), title


def test_language_values_are_canonical(data):
    allowed = {"英語", "其他語言", "台灣", "日語", "韓語", "華語"}
    assert {e["language"] for e in data["entities"].values()} <= allowed


def test_format_values_are_canonical(data):
    allowed = {"劇情片", "動畫", "紀錄片"}
    assert {e["format"] for e in data["entities"].values()} <= allowed


def test_coverage_years_match_board_years(data):
    board_years = {b["date"][:4] for b in data["dailyBoard"]}
    coverage_years = {row["year"] for row in data["meta"]["coverage"]}
    assert coverage_years == board_years


# ── 已封閉期間（2021–2025，永遠不會再變）────────────────────────────

def test_language_share_in_closed_period(data):
    """2021–2025 的語言佔比。

    這段期間已經結束，新資料只會加在 2026 之後，所以這些數字是固定的。
    若它們變動，代表 language_rules 的分類規則被改壞了 —— 這正是要鎖住的事。
    不要因為數字對不上就修期望值，先查規則。
    """
    counts = Counter()
    total = 0
    for board in data["dailyBoard"]:
        if board["date"] >= CLOSED_END:
            continue
        for entry in board["entries"]:
            counts[data["entities"][entry["title"]]["language"]] += 1
            total += 1

    expected = {
        "英語": 53.3, "其他語言": 14.5, "台灣": 10.4,
        "日語": 9.2, "華語": 6.7, "韓語": 6.0,
    }
    for language, pct in expected.items():
        actual = counts[language] / total * 100
        assert abs(actual - pct) < 0.3, f"{language} 實際 {actual:.1f}%，應為 {pct}%"


def test_coverage_matches_known_gaps(data):
    """2021–2025 的缺漏天數。已封閉，不隨新資料變動。"""
    by_year = {row["year"]: row for row in data["meta"]["coverage"]}
    assert by_year["2021"]["missingDays"] == 102
    assert by_year["2022"]["missingDays"] == 34
    assert by_year["2023"]["missingDays"] == 110
    assert by_year["2024"]["missingDays"] == 0
    assert by_year["2025"]["missingDays"] == 0


def test_known_long_runner(data):
    """KPop 獵魔女團是目前最長青的片。

    用 >= 而非 ==：它若回榜，天數還會增加，那不是錯誤。
    """
    assert data["entities"]["Kpop獵魔女團"]["daysOnChart"] >= 269


def test_taiwan_film_is_taiwan_language(data):
    """「關於我和鬼變成家人的那件事」曾被錯標成美，多數決應判回台灣"""
    assert data["entities"]["關於我和鬼變成家人的那件事"]["language"] == "台灣"
