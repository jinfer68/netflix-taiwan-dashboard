# 台劇分析頁片名正規化與走勢圖重構 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把台劇分析頁的片名重複與走勢圖失真修掉 —— 在 Python 轉換層正規化片名、依查證過的上架日歸季、重錨 `dayIndex`，前端則改為預設 Top 20 並修正走勢圖的軸型與插值。

**Architecture:** 所有資料修正集中在轉換層。新增 `scripts/title_rules.py` 存放純函式（片名正規化、季別對照、檔期段切分、dayIndex 重錨、綜藝判定），由 `convert_excel.py` 呼叫。處理順序固定為「片名正規化 → 季別歸屬 → 檔期段切分與重錨」，順序不可調換。前端只消費已經乾淨的 `rankings.json`。

**Tech Stack:** Python 3 + openpyxl + pytest 9.0.3（轉換層）；React 18 + TypeScript 5 strict + Recharts 2（前端，全 inline style）

**規格文件：** [`docs/superpowers/specs/2026-08-12-taiwan-drama-analysis-design.md`](../specs/2026-08-12-taiwan-drama-analysis-design.md)

---

## File Structure

| 檔案 | 動作 | 職責 |
|---|---|---|
| `scripts/title_rules.py` | 建立 | 純函式：片名正規化、季別對照表、檔期段切分、dayIndex 重錨、綜藝判定。無 I/O、無 openpyxl 相依 |
| `scripts/test_title_rules.py` | 建立 | 上述純函式的 pytest 測試 |
| `scripts/convert_excel.py` | 修改 | `clean_title` 委派給 `title_rules`；`parse_daily_clean` 保留日期欄；`main()` 串接歸季／切段／重錨；新增兩項對帳檢查 |
| `src/types/index.ts` | 修改 | `DailyRankingEntry.runIndex`、`ShowAttributes.isVariety`／`runs`、新增 `ShowRun` |
| `src/utils/dataTransforms.ts` | 修改 | `getDailyTrendSeries` 只取主檔期並回傳回鍋段資訊 |
| `src/components/charts/TaiwanDramaChart.tsx` | 修改 | Top 20 預設＋展開、綜藝標記、修 `SPECIAL_NOTES` key、覆蓋率缺值、回鍋標記 |
| `src/components/charts/RankTrendChart.tsx` | 修改 | `XAxis type="number"`、`linear` 插值、缺口虛線橋接、回鍋註記、EP 線改 1 起算 |

`title_rules.py` 與 `convert_excel.py` 分離的理由：正規化規則是這次改動的核心、需要密集測試，而 `convert_excel.py` 已有 860 行且充滿 openpyxl I/O，難以單元測試。專案已有 `genre_rules.py` 這個「規則層為純函式」的先例，沿用同一模式。

---

## Task 1: 建立 `title_rules.py` 與空白正規化

**Files:**
- Create: `scripts/title_rules.py`
- Test: `scripts/test_title_rules.py`

- [ ] **Step 1: 寫失敗的測試**

建立 `scripts/test_title_rules.py`：

```python
# -*- coding: utf-8 -*-
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from title_rules import normalize_title


class TestWhitespace:
    def test_strips_book_title_marks(self):
        assert normalize_title("《影后》") == "影后"

    def test_fullwidth_space_between_punctuation_and_text(self):
        assert normalize_title("嗨！　營業中") == "嗨！營業中"

    def test_halfwidth_space_after_punctuation(self):
        assert normalize_title("來吧！營業中2： 星之沙龍") == "來吧！營業中2：星之沙龍"

    def test_space_between_han_and_digit(self):
        assert normalize_title("來吧！營業中 2：星之沙龍") == "來吧！營業中2：星之沙龍"

    def test_three_variants_converge(self):
        variants = [
            "來吧！營業中2：星之沙龍",
            "來吧！營業中2： 星之沙龍",
            "來吧！營業中 2：星之沙龍",
        ]
        assert len({normalize_title(v) for v in variants}) == 1

    def test_empty_input(self):
        assert normalize_title(None) == ""
        assert normalize_title("") == ""

    def test_leaves_clean_title_untouched(self):
        assert normalize_title("八尺門的辯護人") == "八尺門的辯護人"
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'title_rules'`

- [ ] **Step 3: 寫最小實作**

建立 `scripts/title_rules.py`：

```python
# -*- coding: utf-8 -*-
"""台劇資料的片名正規化與檔期段規則（純函式，無 I/O）"""

import re

_PUNCT = "：，、！？"


def normalize_title(raw):
    """把來源表的各種片名寫法收斂成單一寫法"""
    if not raw:
        return ""
    s = str(raw).strip()
    s = s.replace("《", "").replace("》", "")
    s = s.replace("　", " ")
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s*([%s])\s*" % _PUNCT, r"\1", s)
    s = re.sub(r"(?<=[一-鿿])\s+(?=\d)", "", s)
    return s.strip()
```

- [ ] **Step 4: 執行測試確認通過**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: PASS — 7 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/title_rules.py scripts/test_title_rules.py && git commit -m "feat(scripts): 新增 title_rules 片名空白正規化"
```

---

## Task 2: 季別寫法統一為 `SN`

**Files:**
- Modify: `scripts/title_rules.py`
- Test: `scripts/test_title_rules.py`

- [ ] **Step 1: 寫失敗的測試**

在 `scripts/test_title_rules.py` 的 import 行改為：

```python
from title_rules import normalize_title, normalize_season
```

並在檔案末尾追加：

```python
class TestSeason:
    def test_arabic_chinese_season_suffix(self):
        assert normalize_season("華燈初上 第3季") == "華燈初上 S3"

    def test_chinese_numeral_season_suffix(self):
        assert normalize_season("華燈初上 第三季") == "華燈初上 S3"

    def test_existing_sn_is_normalised(self):
        assert normalize_season("華燈初上S3") == "華燈初上 S3"
        assert normalize_season("華燈初上 S3") == "華燈初上 S3"

    def test_bare_trailing_digit(self):
        assert normalize_season("我的婆婆怎麼那麼可愛2") == "我的婆婆怎麼那麼可愛 S2"
        assert normalize_season("我們這一攤2") == "我們這一攤 S2"

    def test_mid_string_digit_is_not_a_season(self):
        assert normalize_season("來吧！營業中2：星之沙龍") == "來吧！營業中2：星之沙龍"
        assert normalize_season("成名在望 S1：重逢之後") == "成名在望 S1：重逢之後"

    def test_trailing_digit_that_is_part_of_the_name(self):
        assert normalize_season("第9節課") == "第9節課"

    def test_no_season_marker(self):
        assert normalize_season("影后") == "影后"

    def test_normalize_title_applies_season_rule(self):
        assert normalize_title("嗨！　營業中 2") == "嗨！營業中 S2"
        assert normalize_title("嗨！ 營業中 S7") == "嗨！營業中 S7"
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: FAIL — `ImportError: cannot import name 'normalize_season'`

- [ ] **Step 3: 寫最小實作**

在 `scripts/title_rules.py` 的 `_PUNCT` 之後加入：

```python
_CN_NUM = {
    "一": "1", "二": "2", "三": "3", "四": "4", "五": "5",
    "六": "6", "七": "7", "八": "8", "九": "9", "十": "10",
}

_SEASON_CN = re.compile(r"\s*第([一二三四五六七八九十]|\d+)季\s*$")
_SEASON_SN = re.compile(r"\s*S(\d+)\s*$")
_SEASON_BARE = re.compile(r"(?<=[一-鿿])(\d+)\s*$")


def normalize_season(s):
    """把結尾的季別標示統一成「 SN」；非結尾的數字不視為季別"""
    for pattern in (_SEASON_CN, _SEASON_SN, _SEASON_BARE):
        m = pattern.search(s)
        if m:
            n = _CN_NUM.get(m.group(1), m.group(1))
            return f"{s[:m.start()].rstrip()} S{n}"
    return s
```

並把 `normalize_title` 的 `return s.strip()` 改成：

```python
    return normalize_season(s.strip())
```

- [ ] **Step 4: 執行測試確認通過**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: PASS — 15 passed

`test_trailing_digit_that_is_part_of_the_name` 之所以會過，是因為 `第9節課` 結尾是「課」不是數字，三個 pattern 都不match。

- [ ] **Step 5: Commit**

```bash
git add scripts/title_rules.py scripts/test_title_rules.py && git commit -m "feat(scripts): 季別寫法統一為 SN"
```

---

## Task 3: 別名表與「獨」前綴移除

**Files:**
- Modify: `scripts/title_rules.py`
- Test: `scripts/test_title_rules.py`

`TITLE_MAP` 目前在 `convert_excel.py:39`，本任務把它搬到 `title_rules.py` 並新增一筆。

- [ ] **Step 1: 寫失敗的測試**

import 行改為：

```python
from title_rules import (
    normalize_title, normalize_season, strip_exclusive_prefix, TITLE_MAP,
)
```

檔案末尾追加：

```python
class TestAlias:
    def test_existing_aliases_preserved(self):
        assert normalize_title("何戀") == "何百芮的地獄戀曲"
        assert normalize_title("何毒") == "何百芮的地獄毒白"
        assert normalize_title("死了娛樂女記者") == "死了一個娛樂女記者之後"
        assert normalize_title("太陽Part1") == "如果我不曾見過太陽"
        assert normalize_title("太陽Part2") == "如果我不曾見過太陽"

    def test_new_alias_for_missing_trailing_char(self):
        assert normalize_title("光露營就很忙") == "光露營就很忙了"

    def test_alias_applies_after_whitespace_normalisation(self):
        assert normalize_title(" 光露營就很忙 ") == "光露營就很忙了"


class TestExclusivePrefix:
    def test_strips_prefix_when_base_title_is_known(self):
        known = {"痞子英雄", "來吧！營業中"}
        assert strip_exclusive_prefix("獨痞子英雄", known) == "痞子英雄"
        assert strip_exclusive_prefix("獨來吧！營業中", known) == "來吧！營業中"

    def test_keeps_prefix_when_base_title_is_unknown(self):
        assert strip_exclusive_prefix("獨立時代", {"痞子英雄"}) == "獨立時代"

    def test_leaves_non_prefixed_titles_alone(self):
        assert strip_exclusive_prefix("痞子英雄", {"痞子英雄"}) == "痞子英雄"
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: FAIL — `ImportError: cannot import name 'strip_exclusive_prefix'`

- [ ] **Step 3: 寫最小實作**

在 `scripts/title_rules.py` 的 `import re` 之後加入：

```python
TITLE_MAP = {
    "何戀":          "何百芮的地獄戀曲",
    "何毒":          "何百芮的地獄毒白",
    "死了娛樂女記者": "死了一個娛樂女記者之後",
    "太陽Part1":     "如果我不曾見過太陽",
    "太陽Part2":     "如果我不曾見過太陽",
    "光露營就很忙":   "光露營就很忙了",
}
```

把 `normalize_title` 的 return 改成：

```python
    s = normalize_season(s.strip())
    return TITLE_MAP.get(s, s)
```

並在檔案末尾加入：

```python
def strip_exclusive_prefix(title, known_titles):
    """移除黏在片名前的「獨」字。僅在去除後的片名確實存在時才動作，
    避免誤傷本來就以「獨」開頭的片名。"""
    if title.startswith("獨") and title[1:] in known_titles:
        return title[1:]
    return title
```

- [ ] **Step 4: 執行測試確認通過**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: PASS — 23 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/title_rules.py scripts/test_title_rules.py && git commit -m "feat(scripts): 別名表搬遷與獨字前綴移除"
```

---

## Task 4: 季別歸屬對照表 `SEASON_OVERRIDES`

**Files:**
- Modify: `scripts/title_rules.py`
- Test: `scripts/test_title_rules.py`

規格第 2 節的六段對照。以日期區間為鍵，不用序數 —— `最佳利益` 兩季只隔 25 天，低於 30 天的檔期門檻，序數規則會把兩季黏成一段。

- [ ] **Step 1: 寫失敗的測試**

import 區塊追加：

```python
from datetime import date
from title_rules import resolve_season_title
```

檔案末尾追加：

```python
class TestSeasonOverrides:
    def test_light_the_night_part_two(self):
        assert resolve_season_title("華燈初上", date(2022, 1, 7)) == "華燈初上 S2"
        assert resolve_season_title("華燈初上", date(2022, 2, 13)) == "華燈初上 S2"

    def test_light_the_night_part_three(self):
        assert resolve_season_title("華燈初上", date(2022, 3, 18)) == "華燈初上 S3"
        assert resolve_season_title("華燈初上", date(2022, 4, 9)) == "華燈初上 S3"

    def test_best_interest_split_below_run_threshold(self):
        # 兩季只隔 25 天，必須靠日期區間才分得開
        assert resolve_season_title("最佳利益", date(2023, 5, 23)) == "最佳利益 S2"
        assert resolve_season_title("最佳利益", date(2023, 5, 30)) == "最佳利益 S2"
        assert resolve_season_title("最佳利益", date(2023, 6, 25)) == "最佳利益 S3"
        assert resolve_season_title("最佳利益", date(2023, 7, 11)) == "最佳利益 S3"

    def test_hi_bistro_season_one_spans_the_fullwidth_variant(self):
        assert resolve_season_title("嗨！營業中", date(2022, 10, 2)) == "嗨！營業中 S1"
        assert resolve_season_title("嗨！營業中", date(2022, 12, 20)) == "嗨！營業中 S1"
        assert resolve_season_title("嗨！營業中", date(2023, 2, 5)) == "嗨！營業中 S1"

    def test_hi_bistro_season_two(self):
        assert resolve_season_title("嗨！營業中", date(2023, 6, 25)) == "嗨！營業中 S2"
        assert resolve_season_title("嗨！營業中", date(2023, 7, 23)) == "嗨！營業中 S2"

    def test_title_outside_any_range_is_unchanged(self):
        assert resolve_season_title("華燈初上", date(2021, 12, 1)) == "華燈初上"
        assert resolve_season_title("影后", date(2024, 3, 1)) == "影后"

    def test_titles_needing_override(self):
        from title_rules import SEASON_OVERRIDE_TITLES
        assert SEASON_OVERRIDE_TITLES == {"華燈初上", "最佳利益", "嗨！營業中"}
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: FAIL — `ImportError: cannot import name 'resolve_season_title'`

- [ ] **Step 3: 寫最小實作**

`scripts/title_rules.py` 頂端 `import re` 改為：

```python
import re
from datetime import date
```

檔案末尾加入：

```python
# 無季數的日榜資料，依查證過的實際上架日歸季。
# 查證來源見規格文件「查證來源」章節。
# (正規化後片名, 起始日, 結束日, 目標片名)
SEASON_OVERRIDES = [
    ("華燈初上",   date(2022, 1, 7),  date(2022, 2, 13), "華燈初上 S2"),
    ("華燈初上",   date(2022, 3, 18), date(2022, 4, 9),  "華燈初上 S3"),
    ("最佳利益",   date(2023, 5, 23), date(2023, 5, 30), "最佳利益 S2"),
    ("最佳利益",   date(2023, 6, 25), date(2023, 7, 11), "最佳利益 S3"),
    ("嗨！營業中", date(2022, 10, 2), date(2023, 2, 5),  "嗨！營業中 S1"),
    ("嗨！營業中", date(2023, 6, 25), date(2023, 7, 23), "嗨！營業中 S2"),
]

SEASON_OVERRIDE_TITLES = {row[0] for row in SEASON_OVERRIDES}


def resolve_season_title(title, day):
    """把無季數的片名依日期歸到正確的季；表外的片名原樣回傳"""
    for src, start, end, target in SEASON_OVERRIDES:
        if title == src and start <= day <= end:
            return target
    return title
```

- [ ] **Step 4: 執行測試確認通過**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: PASS — 30 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/title_rules.py scripts/test_title_rules.py && git commit -m "feat(scripts): 依查證上架日建立季別歸屬對照表"
```

---

## Task 5: 檔期段切分與 `dayIndex` 重錨

**Files:**
- Modify: `scripts/title_rules.py`
- Test: `scripts/test_title_rules.py`

門檻 30 天的依據：實測上榜間隔分布在 28 天與 33 天之間完全沒有資料。

- [ ] **Step 1: 寫失敗的測試**

import 追加：

```python
from title_rules import split_runs, assign_day_index, RUN_GAP_DAYS
```

檔案末尾追加：

```python
class TestRunSplitting:
    def test_threshold_is_thirty_days(self):
        assert RUN_GAP_DAYS == 30

    def test_continuous_dates_form_one_run(self):
        days = [date(2024, 1, 1), date(2024, 1, 2), date(2024, 1, 3)]
        assert split_runs(days) == [days]

    def test_gap_below_threshold_stays_in_same_run(self):
        days = [date(2024, 1, 1), date(2024, 1, 29)]  # 相隔 28 天
        assert split_runs(days) == [days]

    def test_gap_at_threshold_splits(self):
        days = [date(2024, 1, 1), date(2024, 1, 31)]  # 相隔 30 天
        assert split_runs(days) == [[days[0]], [days[1]]]

    def test_real_comeback_case(self):
        days = [date(2023, 9, 17), date(2023, 11, 3), date(2024, 10, 21)]
        runs = split_runs(days)
        assert len(runs) == 2
        assert runs[0] == [date(2023, 9, 17), date(2023, 11, 3)]
        assert runs[1] == [date(2024, 10, 21)]

    def test_unsorted_input_is_sorted(self):
        days = [date(2024, 1, 3), date(2024, 1, 1), date(2024, 1, 2)]
        assert split_runs(days) == [[date(2024, 1, 1), date(2024, 1, 2), date(2024, 1, 3)]]

    def test_empty_input(self):
        assert split_runs([]) == []


class TestDayIndex:
    def test_first_day_of_each_run_is_one(self):
        days = [date(2024, 1, 1), date(2024, 1, 2), date(2024, 3, 1)]
        assert assign_day_index(days) == {
            date(2024, 1, 1): (1, 0),
            date(2024, 1, 2): (2, 0),
            date(2024, 3, 1): (1, 1),
        }

    def test_gap_inside_a_run_leaves_a_hole(self):
        days = [date(2024, 1, 1), date(2024, 1, 5)]
        assert assign_day_index(days) == {
            date(2024, 1, 1): (1, 0),
            date(2024, 1, 5): (5, 0),
        }

    def test_never_produces_a_non_positive_index(self):
        days = [date(2022, 5, 9), date(2023, 10, 27)]
        for idx, _run in assign_day_index(days).values():
            assert idx >= 1
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: FAIL — `ImportError: cannot import name 'split_runs'`

- [ ] **Step 3: 寫最小實作**

`scripts/title_rules.py` 末尾加入：

```python
# 上榜間隔的實測分布在 28 天與 33 天之間完全沒有資料，門檻取空帶中央。
RUN_GAP_DAYS = 30


def split_runs(days):
    """把上榜日切成檔期段；相鄰間隔 >= RUN_GAP_DAYS 即切開"""
    if not days:
        return []
    ordered = sorted(set(days))
    runs = [[ordered[0]]]
    for prev, cur in zip(ordered, ordered[1:]):
        if (cur - prev).days >= RUN_GAP_DAYS:
            runs.append([cur])
        else:
            runs[-1].append(cur)
    return runs


def assign_day_index(days):
    """回傳 {日期: (dayIndex, runIndex)}；每段的第一天為第 1 天"""
    result = {}
    for run_index, run in enumerate(split_runs(days)):
        anchor = run[0]
        for day in run:
            result[day] = ((day - anchor).days + 1, run_index)
    return result
```

- [ ] **Step 4: 執行測試確認通過**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: PASS — 40 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/title_rules.py scripts/test_title_rules.py && git commit -m "feat(scripts): 檔期段切分與 dayIndex 重錨"
```

---

## Task 6: 綜藝判定

**Files:**
- Modify: `scripts/title_rules.py`
- Test: `scripts/test_title_rules.py`

- [ ] **Step 1: 寫失敗的測試**

import 追加：

```python
from title_rules import is_variety
```

檔案末尾追加：

```python
class TestVariety:
    def test_known_variety_shows(self):
        for title in [
            "嗨！營業中 S1", "來吧！營業中", "來吧！營業中2：星之沙龍",
            "光開門就很忙了", "光露營就很忙了", "星廚之戰",
            "全明星出發吧！", "交換情侶", "來吧！哪裡怕", "我們這一攤 S2",
        ]:
            assert is_variety(title) is True, title

    def test_dramas_are_not_variety(self):
        for title in ["影后", "華燈初上 S2", "八尺門的辯護人", "有生之年", "最佳利益 S3"]:
            assert is_variety(title) is False, title
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: FAIL — `ImportError: cannot import name 'is_variety'`

- [ ] **Step 3: 寫最小實作**

`scripts/title_rules.py` 末尾加入：

```python
# 屬性資料庫不涵蓋綜藝，只能以片名判定。僅供顯示標記，不影響排序或篩選。
_VARIETY_PATTERNS = (
    "營業中", "光開門就很忙", "光露營就很忙", "星廚之戰",
    "全明星出發吧", "交換情侶", "哪裡怕", "我們這一攤",
)


def is_variety(title):
    return any(p in title for p in _VARIETY_PATTERNS)
```

- [ ] **Step 4: 執行測試確認通過**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: PASS — 42 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/title_rules.py scripts/test_title_rules.py && git commit -m "feat(scripts): 綜藝節目片名判定"
```

---

## Task 7: `convert_excel.py` 改用 `title_rules`

**Files:**
- Modify: `scripts/convert_excel.py:39-45`（移除 `TITLE_MAP`）
- Modify: `scripts/convert_excel.py:131-145`（`clean_title` 改為委派）

- [ ] **Step 1: 移除舊的 `TITLE_MAP`**

刪除 `scripts/convert_excel.py` 第 39–45 行的整個 `TITLE_MAP = {...}` 區塊（含結尾空行）。

- [ ] **Step 2: `clean_title` 改為委派**

把第 131–145 行的 `clean_title` 整個函式替換成：

```python
def clean_title(v):
    return normalize_title(v)
```

- [ ] **Step 3: 加入 import**

在 `scripts/convert_excel.py:25` 的 `from genre_rules import canonicalize` 下方加入：

```python
from title_rules import (
    normalize_title, strip_exclusive_prefix, resolve_season_title,
    assign_day_index, split_runs, is_variety,
    SEASON_OVERRIDE_TITLES,
)
```

- [ ] **Step 4: 執行轉換確認沒有 import 錯誤**

Run: `python scripts/convert_excel.py`
Expected: 執行到底並印出「完成！」。此時 `dayIndex` 仍是舊的負值，屬預期。

- [ ] **Step 5: Commit**

```bash
git add scripts/convert_excel.py && git commit -m "refactor(scripts): clean_title 委派給 title_rules"
```

---

## Task 8: 日榜保留日期並套用歸季與重錨

**Files:**
- Modify: `scripts/convert_excel.py:527-554`（`parse_daily_clean`）

目前 `parse_daily_clean` 直接讀「上線天數」欄並丟棄日期。改為保留日期、忽略上線天數，之後由 `title_rules` 重算。

- [ ] **Step 1: 改寫 `parse_daily_clean`**

把 `scripts/convert_excel.py` 第 527–554 行的 `parse_daily_clean` 整個函式替換成：

```python
def parse_daily_clean(ws):
    """解析台劇每日排名。忽略來源的「上線天數」欄（錨點錯誤，43% 為負值），
    改為保留日期，交由 title_rules 依檔期段重錨。"""
    col_map = build_col_map(ws, 0)
    use_named = "節目名稱" in col_map and "排名" in col_map

    rows = []
    for j, row in enumerate(ws.iter_rows(values_only=True)):
        if j == 0:
            continue
        if use_named:
            raw_date = get_col(row, col_map, "上架日期")
            title = clean_title(get_col(row, col_map, "節目名稱"))
            rank = safe_int(get_col(row, col_map, "排名"))
            score = resolve_score(safe_float(get_col(row, col_map, "積分"), 0), rank)
            is_all = safe_bool(get_col(row, col_map, "是否單次上架"))
        else:
            raw_date = row[0]
            title = clean_title(row[1]) if row[1] else ""
            rank = safe_int(row[4])
            score = resolve_score(safe_float(row[5], 0), rank)
            is_all = safe_bool(row[6]) if len(row) > 6 else False

        if not title or rank is None or not isinstance(raw_date, datetime):
            continue

        day = raw_date.date()
        rows.append({
            "date": day,
            "title": resolve_season_title(title, day),
            "rank": rank,
            "score": score,
            "isAllAtOnce": is_all,
        })

    return reanchor_daily(rows)


def reanchor_daily(rows):
    """依檔期段重算 dayIndex 與 runIndex。
    回傳 (每日排名列表, {片名: {段序: 起始日}}, {片名: {段序: 結束日}})"""
    days_by_title = defaultdict(list)
    for r in rows:
        days_by_title[r["title"]].append(r["date"])

    index_by_title = {t: assign_day_index(ds) for t, ds in days_by_title.items()}

    results = []
    for r in rows:
        day_index, run_index = index_by_title[r["title"]][r["date"]]
        results.append({
            "dayIndex": day_index,
            "runIndex": run_index,
            "title": r["title"],
            "rank": r["rank"],
            "score": r["score"],
            "isAllAtOnce": r["isAllAtOnce"],
        })
    results.sort(key=lambda x: (x["title"], x["runIndex"], x["dayIndex"]))

    starts, ends = defaultdict(dict), defaultdict(dict)
    for title, ds in days_by_title.items():
        for run_index, run in enumerate(split_runs(ds)):
            starts[title][run_index] = run[0].isoformat()
            ends[title][run_index] = run[-1].isoformat()

    return results, starts, ends
```

- [ ] **Step 2: 更新 `main()` 的呼叫端**

`parse_daily_clean` 現在回傳三元組。把 `scripts/convert_excel.py:799` 的 `daily = []` 改為：

```python
    daily, run_start_dates, run_end_dates = [], {}, {}
```

把 `scripts/convert_excel.py:803` 的 `daily = parse_daily_clean(ws_daily)` 改為：

```python
        daily, run_start_dates, run_end_dates = parse_daily_clean(ws_daily)
```

- [ ] **Step 3: 執行轉換**

`scripts/convert_excel.py:20-21` 已有 `from collections import Counter, defaultdict` 與 `from datetime import datetime, timedelta`，無需新增 import。

Run: `python scripts/convert_excel.py`
Expected: 印出「每日排名：2145 筆」量級的數字並完成

- [ ] **Step 4: 驗證沒有負的 dayIndex**

Run:
```bash
node -e "const d=require('./public/data/rankings.json');const neg=d.dailyRankings.filter(r=>r.dayIndex<1);console.log('非正 dayIndex 筆數:',neg.length)"
```
Expected: `非正 dayIndex 筆數: 0`（修正前為 915）

- [ ] **Step 5: 驗證季別歸屬**

Run:
```bash
node -e "
const d=require('./public/data/rankings.json');
const c={};for(const r of d.dailyRankings) c[r.title]=(c[r.title]||0)+1;
for(const t of ['華燈初上','華燈初上 S2','華燈初上 S3','最佳利益','最佳利益 S2','最佳利益 S3','嗨！營業中','嗨！營業中 S1','嗨！營業中 S2'])
  console.log(t.padEnd(14), c[t]||0);
"
```
Expected：`華燈初上`、`最佳利益`、`嗨！營業中` 三個無季數片名皆為 `0`；`華燈初上 S2` 為 37、`華燈初上 S3` 為 23、`最佳利益 S2` 為 6、`最佳利益 S3` 為 17。

- [ ] **Step 6: Commit**

```bash
git add scripts/convert_excel.py public/data/rankings.json && git commit -m "fix(scripts): 日榜改依檔期段重錨 dayIndex 並套用季別歸屬"
```

---

## Task 9: 週榜移除「獨」前綴

**Files:**
- Modify: `scripts/convert_excel.py`（`parse_weekly_clean`，約 268–324 行）

`獨痞子英雄`、`獨來吧！營業中` 只出現在週榜表。需要兩趟：先蒐集所有不以「獨」開頭的片名做白名單，再回頭替換。

- [ ] **Step 1: 在 `parse_weekly_clean` 回傳前加入後處理**

在 `scripts/convert_excel.py` 的 `parse_weekly_clean` 函式中，把最後的 `return weeks`（或等效的回傳語句）改為：

```python
    return _strip_weekly_exclusive_prefixes(weeks)
```

並在 `parse_weekly_clean` 之後新增：

```python
def _strip_weekly_exclusive_prefixes(weeks):
    """週榜表獨有的「獨」字髒前綴。以既有片名為白名單，避免誤傷。"""
    known = {
        item["title"]
        for week in weeks for item in week["rankings"]
        if not item["title"].startswith("獨")
    }
    for week in weeks:
        for item in week["rankings"]:
            item["title"] = strip_exclusive_prefix(item["title"], known)
    return weeks
```

- [ ] **Step 2: 執行轉換**

Run: `python scripts/convert_excel.py`
Expected: 完成

- [ ] **Step 3: 驗證前綴已移除**

Run:
```bash
node -e "
const d=require('./public/data/rankings.json');
const bad=d.taiwanDramaRankings.filter(r=>r.title.startsWith('獨'));
console.log('殘留獨字前綴:',bad.map(r=>r.title).join(', ')||'(無)');
"
```
Expected: `殘留獨字前綴: (無)`

- [ ] **Step 4: Commit**

```bash
git add scripts/convert_excel.py public/data/rankings.json && git commit -m "fix(scripts): 移除週榜片名的獨字髒前綴"
```

---

## Task 10: 屬性表加入 `isVariety` 與 `runs`，並加對帳檢查

**Files:**
- Modify: `scripts/convert_excel.py`（`main()`，約 798–812 行）

- [ ] **Step 1: 在 `main()` 中補齊屬性欄位**

在 `main()` 的 `taiwan = compute_taiwan_drama_rankings(daily, weekly, show_attrs)` 這一行**之前**插入：

```python
    # ── 補齊屬性：綜藝標記與檔期段 ──
    daily_dates = defaultdict(list)
    for entry in daily:
        daily_dates[entry["title"]].append(entry)

    all_titles = set(show_attrs) | set(daily_dates)
    for title in all_titles:
        attr = show_attrs.setdefault(title, {
            "isNetflixOriginal": False,
            "releaseType": "weekly",
            "releaseWeeks": 0,
            "totalEpisodes": "",
        })
        if is_variety(title):
            attr["isVariety"] = True

        entries = daily_dates.get(title, [])
        if not entries:
            continue
        by_run = defaultdict(list)
        for e in entries:
            by_run[e["runIndex"]].append(e)
        if len(by_run) <= 1:
            continue
        attr["runs"] = []
        for run_index in sorted(by_run):
            group = by_run[run_index]
            attr["runs"].append({
                "startDate": run_start_dates[title][run_index],
                "endDate": run_end_dates[title][run_index],
                "days": len(group),
                "peakRank": min(e["rank"] for e in group),
            })
```

`run_start_dates` / `run_end_dates` 由 Task 8 的 `parse_daily_clean` 回傳，此處直接使用。

`setdefault` 的用意是讓只出現在日榜、屬性表沒收錄的節目（如多數綜藝）也有一筆屬性可掛 `isVariety`。`releaseWeeks` 給 0 而非 1，讓前端的覆蓋率能正確顯示為「—」。

- [ ] **Step 2: 加入對帳檢查**

在 `main()` 的 `taiwan = compute_taiwan_drama_rankings(...)` 之後、`# ── dataThrough ──` 之前插入：

```python
    # ── 對帳檢查 ──
    missing_attrs = [r["title"] for r in taiwan if r["title"] not in show_attrs]
    if missing_attrs:
        print(f"\n  ⚠ 有 {len(missing_attrs)} 筆台劇排名在屬性表中查無資料：")
        for t in missing_attrs[:20]:
            print(f"     {t}")
    else:
        print("\n  ✓ 屬性表對帳通過")

    unmapped = sorted({
        e["title"] for e in daily if e["title"] in SEASON_OVERRIDE_TITLES
    })
    if unmapped:
        print(f"  ⚠ 有無季數日榜資料未被 SEASON_OVERRIDES 涵蓋：{', '.join(unmapped)}")
    else:
        print("  ✓ 季別歸屬對帳通過")
```

- [ ] **Step 3: 執行轉換**

Run: `python scripts/convert_excel.py`
Expected: 輸出中出現 `✓ 屬性表對帳通過` 與 `✓ 季別歸屬對帳通過`

- [ ] **Step 4: 驗證 `isVariety` 與 `runs`**

Run:
```bash
node -e "
const d=require('./public/data/rankings.json');
const a=d.showAttributes;
console.log('綜藝標記筆數:', Object.values(a).filter(x=>x.isVariety).length);
console.log('有生之年 runs:', JSON.stringify(a['有生之年']?.runs));
console.log('影后 isVariety:', a['影后']?.isVariety);
"
```
Expected: 綜藝標記筆數 > 0；`有生之年 runs` 為兩段的陣列；`影后 isVariety` 為 `undefined`

- [ ] **Step 5: Commit**

```bash
git add scripts/convert_excel.py public/data/rankings.json src/utils/schemaValidator.generated.ts && git commit -m "feat(scripts): 屬性表補上綜藝標記與檔期段，新增對帳檢查"
```

---

## Task 11: 更新 TypeScript 型別

**Files:**
- Modify: `src/types/index.ts:44-49`、`src/types/index.ts:87-92`

- [ ] **Step 1: 更新 `DailyRankingEntry`**

把 `src/types/index.ts` 第 44–49 行替換成：

```typescript
export interface DailyRankingEntry {
  dayIndex: number   // 該檔期段的第 N 天（1 起算）
  runIndex: number   // 檔期段序號，0 = 主檔期
  title: string
  rank: number
  score: number
}
```

- [ ] **Step 2: 新增 `ShowRun` 並擴充 `ShowAttributes`**

把第 87–92 行替換成：

```typescript
export interface ShowRun {
  startDate: string       // "YYYY-MM-DD"
  endDate: string         // "YYYY-MM-DD"
  days: number
  peakRank: number
}

export interface ShowAttributes {
  isNetflixOriginal: boolean
  releaseType: 'weekly' | 'allAtOnce' | 'split'
  releaseWeeks: number
  totalEpisodes: string
  isVariety?: boolean
  runs?: ShowRun[]
}
```

- [ ] **Step 3: 型別檢查**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS，無錯誤

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts && git commit -m "feat(types): DailyRankingEntry 加入 runIndex，ShowAttributes 加入綜藝與檔期段"
```

---

## Task 12: 走勢圖資料只取主檔期

**Files:**
- Modify: `src/utils/dataTransforms.ts:302-333`（`getDailyTrendSeries`）

- [ ] **Step 1: 改寫 `getDailyTrendSeries`**

把 `src/utils/dataTransforms.ts` 第 302–333 行替換成：

```typescript
export function getDailyTrendSeries(
  data: RankingsData,
  selectedTitles: string[]
): {
  indices: number[]
  series: DailyTrendSeries[]
  releaseTypes: Record<string, 'weekly' | 'allAtOnce' | 'split'>
  comebacks: { title: string; run: ShowRun }[]
} {
  const relevant = data.dailyRankings.filter(
    r => selectedTitles.includes(r.title) && r.runIndex === 0
  )

  const allIndices = [...new Set(relevant.map(r => r.dayIndex))].sort((a, b) => a - b)

  const series: DailyTrendSeries[] = selectedTitles
    .filter(t => relevant.some(r => r.title === t))
    .map(title => {
      const byDay = new Map(
        relevant.filter(r => r.title === title).map(r => [r.dayIndex, r.rank])
      )
      return {
        name: title,
        data: allIndices.map(i => ({ dayIndex: i, rank: byDay.get(i) ?? null })),
      }
    })

  const releaseTypes: Record<string, 'weekly' | 'allAtOnce' | 'split'> = {}
  const comebacks: { title: string; run: ShowRun }[] = []
  for (const title of selectedTitles) {
    const attr = data.showAttributes[title]
    if (attr?.releaseType) releaseTypes[title] = attr.releaseType
    for (const run of attr?.runs?.slice(1) ?? []) {
      comebacks.push({ title, run })
    }
  }

  return { indices: allIndices, series, releaseTypes, comebacks }
}
```

- [ ] **Step 2: 補上 `ShowRun` 的 import**

`src/utils/dataTransforms.ts` 頂端既有的型別 import 加入 `ShowRun`，例如：

```typescript
import type { RankingsData, ShowRun } from '../types'
```

只需把 `ShowRun` 加進既有的型別 import 清單。

- [ ] **Step 3: 型別檢查**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS。`RankTrendChart` 目前的解構沒有取 `comebacks`，多回傳一個欄位不會造成型別錯誤。

- [ ] **Step 4: Commit**

```bash
git add src/utils/dataTransforms.ts && git commit -m "feat(utils): 走勢圖資料只取主檔期並回傳回鍋段"
```

---

## Task 13: 走勢圖渲染修正

**Files:**
- Modify: `src/components/charts/RankTrendChart.tsx`

- [ ] **Step 1: 取用 `comebacks` 並修正 EP 參考線起點**

把第 67–80 行（`const { indices, series, releaseTypes } = useMemo(...)` 到 `: []`）替換成：

```typescript
  const { indices, series, releaseTypes, comebacks } = useMemo(
    () => getDailyTrendSeries(data, selectedTitles),
    [data, selectedTitles]
  )

  const hasWeeklyShow = Object.values(releaseTypes).some(
    t => t === 'weekly' || t === 'split'
  )

  const maxDayIndex = indices.length > 0 ? indices[indices.length - 1] : 0

  // dayIndex 從 1 起算，EP1 上線日即第 1 天
  const epDays = hasWeeklyShow
    ? Array.from({ length: Math.floor((maxDayIndex - 1) / 7) + 1 }, (_, i) => 1 + i * 7)
    : []
```

- [ ] **Step 2: 修正 EP 標籤的集數計算**

把第 151 行的 `value: \`EP${day / 7 + 1}\`` 改為：

```typescript
                  value: `EP${(day - 1) / 7 + 1}`,
```

同時把第 32–33 行 `RankTooltip` 內的：

```typescript
  const dayIndex = label as number
  const epNum = dayIndex % 7 === 0 ? dayIndex / 7 + 1 : null
```

改為：

```typescript
  const dayIndex = label as number
  const epNum = dayIndex % 7 === 1 ? (dayIndex - 1) / 7 + 1 : null
```

- [ ] **Step 3: `XAxis` 改為數值軸**

把第 158–164 行的 `<XAxis ... />` 替換成：

```typescript
            <XAxis
              dataKey="dayIndex"
              type="number"
              domain={[1, maxDayIndex]}
              allowDecimals={false}
              tick={{ fill: INK_SECONDARY, fontSize: 11 }}
              axisLine={{ stroke: RULE_STRONG }}
              tickLine={false}
              label={{ value: '上架天數', fill: INK_MUTED, fontSize: 11, position: 'insideBottomRight', offset: -4 }}
            />
```

- [ ] **Step 4: 插值改為 `linear`**

把第 181 行的 `type="monotone"` 改為：

```typescript
                  type="linear"
```

- [ ] **Step 5: 缺口以淡虛線橋接**

在第 176 行的 `{series.map((s, i) => {` 迴圈**之前**插入一組橋接線。在 `<Tooltip .../>` 之後、`{series.map(...)}` 之前加入：

```typescript
            {series.map((s, i) => (
              <Line
                key={`${s.name}-bridge`}
                type="linear"
                dataKey={s.name}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                strokeDasharray="3 3"
                strokeOpacity={0.35}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
                legendType="none"
              />
            ))}
```

橋接線先畫、實線後畫，實線會覆蓋在有資料的區段上，只有缺口露出虛線。

- [ ] **Step 6: 回鍋段註記**

把第 118–121 行的標題區塊：

```typescript
        <div style={{ fontSize: 12, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, whiteSpace: 'nowrap' }}>
          每日名次走勢
        </div>
```

替換成：

```typescript
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, whiteSpace: 'nowrap' }}>
            每日名次走勢
          </div>
          {comebacks.map(c => (
            <span key={`${c.title}-${c.run.startDate}`} style={{ fontSize: 11, color: INK_MUTED, whiteSpace: 'nowrap' }}>
              ※ {c.title} {c.run.startDate.slice(0, 7)} 回鍋 {c.run.days} 天，最佳第 {c.run.peakRank} 名
            </span>
          ))}
        </div>
```

- [ ] **Step 7: 型別檢查**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/charts/RankTrendChart.tsx && git commit -m "fix(charts): 走勢圖改用數值軸與線性插值，缺口虛線橋接，回鍋段改註記"
```

---

## Task 14: 台劇積分榜 Top 20 與標記修正

**Files:**
- Modify: `src/components/charts/TaiwanDramaChart.tsx`

- [ ] **Step 1: 修正 `SPECIAL_NOTES` 的 key**

把第 44–47 行替換成：

```typescript
const SPECIAL_NOTES: Record<string, string> = {
  '有生之年': '2023 年作品，金鐘獎得獎後回鍋上榜',
  '誰是被害者 S1': '第二季上架，第一季回鍋上榜',
}
```

- [ ] **Step 2: 加入展開狀態與 `isVariety` 欄位**

此檔目前沒有 react import（第 1 行是 `import { ... } from 'recharts'`）。在第 1 行**之前**新增一行：

```typescript
import { useState } from 'react'
```

`ChartItem` 介面（第 24–31 行）加入一欄：

```typescript
interface ChartItem extends TaiwanDramaRanking {
  displayTitle: string
  releaseWeeks?: number
  totalEpisodes?: string
  isVariety?: boolean
  scorePerWeek: number
  weeklyCoverage: number
  dailyCoverage: number
}
```

第 136–150 行的 `.map(d => {...})` 中，回傳物件加入：

```typescript
        isVariety: attr?.isVariety,
```

- [ ] **Step 3: 只畫 Top 20**

在 `export default function TaiwanDramaChart({...}: Props) {` 之後、`const filtered = ...` 之前插入：

```typescript
  const [expanded, setExpanded] = useState(false)
```

把第 164 行的 `const chartHeight = ...` 改為：

```typescript
  const TOP_N = 20
  const visible = expanded ? chartData : chartData.slice(0, TOP_N)
  const chartHeight = Math.max(360, visible.length * 44 + 40)
```

把 `<BarChart layout="vertical" data={chartData}` 改為 `data={visible}`，
把 Y 軸 `tick` 內的 `const item = chartData[payload.index]` 改為 `const item = visible[payload.index]`，
把 `{chartData.map(d => {` 的 `<Cell>` 迴圈改為 `{visible.map(d => {`。

- [ ] **Step 4: 加入展開按鈕**

在 `<div style={{ height: chartHeight }}>...</div>` 這個區塊**之後**、元件最外層 `</div>` 之前插入：

```typescript
      {chartData.length > TOP_N && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${RULE}` }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={SEGMENT_BTN(false)}
          >
            {expanded ? '只顯示前 20 部 ←' : `顯示全部 ${chartData.length} 部 →`}
          </button>
        </div>
      )}
```

並把第 6–9 行的 import 加入 `SEGMENT_BTN`。

- [ ] **Step 5: 綜藝標記與覆蓋率缺值**

把 Y 軸 tick 內第 215–219 行的 `infoText` 組法改為：

```typescript
                const infoText = [
                  item.isVariety ? '綜藝' : '',
                  RELEASE_SHORT[item.releaseType] ?? item.releaseType,
                  ep ? `${ep}集` : '',
                  rw ? `${rw}→${woc}週` : `${woc}週`,
                ].filter(Boolean).join(' · ')
```

把 tooltip 中第 106–111 行的覆蓋率區塊改為：

```typescript
      <div style={{ marginTop: 8, borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
        <div style={{ ...NUM, fontSize: 11, color: INK_SECONDARY }}>
          上榜覆蓋率 {item.releaseWeeks ? `${Math.round(coverage * 100)}%` : '—'}
        </div>
        {!!item.releaseWeeks && <CoverageBar ratio={coverage} color={releaseColor} />}
      </div>
```

用 falsy 判斷而非 `== null`，因為 Task 10 為屬性表未收錄的節目補的 `releaseWeeks` 是 `0`，兩種缺值都要顯示「—」。

- [ ] **Step 6: 回鍋段標記**

`ChartItem` 介面加入一欄：

```typescript
  runs?: ShowRun[]
```

第 5 行的型別 import 加入 `ShowRun`：

```typescript
import type { TaiwanDramaRanking, ShowAttributes, ShowRun } from '../../types'
```

`.map(d => {...})` 的回傳物件加入：

```typescript
        runs: attr?.runs,
```

Y 軸 tick 內的 `※` 判斷（原本只看 `SPECIAL_NOTES`）改為：

```typescript
                      {SPECIAL_NOTES[item.title] || (item.runs?.length ?? 0) > 1 ? ' ※' : ''}
```

`ShowTooltip` 的 `specialNote` 區塊之前插入回鍋段列表 —— 把：

```typescript
      {specialNote && (
```

改為：

```typescript
      {(item.runs?.length ?? 0) > 1 && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${RULE}`, paddingTop: 6 }}>
          {item.runs!.slice(1).map(run => (
            <div key={run.startDate} style={{ fontSize: 11, color: INK_MUTED }}>
              ※ {run.startDate.slice(0, 7)} 回鍋 {run.days} 天，最佳第 {run.peakRank} 名
            </div>
          ))}
        </div>
      )}

      {specialNote && (
```

- [ ] **Step 7: 型別檢查**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/charts/TaiwanDramaChart.tsx && git commit -m "feat(charts): 台劇榜預設 Top 20，加綜藝與回鍋標記、覆蓋率缺值處理"
```

---

## Task 15: 整體驗證

**Files:** 無修改，僅驗證

- [ ] **Step 1: 全部測試**

Run: `python -m pytest scripts/test_title_rules.py -v`
Expected: 42 passed

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: 無輸出（通過）

- [ ] **Step 3: 建置**

Run: `npm run build`
Expected: 建置成功

- [ ] **Step 4: 資料層總驗證**

Run:
```bash
node -e "
const d=require('./public/data/rankings.json');
const dr=d.dailyRankings;
console.log('非正 dayIndex:', dr.filter(r=>r.dayIndex<1).length, '(應為 0)');
console.log('台劇排名筆數:', d.taiwanDramaRankings.length, '(原 97)');
const c={};for(const r of dr) c[r.title]=(c[r.title]||0)+1;
for(const t of ['嗨！營業中 S1','來吧！營業中2：星之沙龍','光露營就很忙了','華燈初上 S2','華燈初上 S3','最佳利益 S2','最佳利益 S3'])
  console.log(' ', t.padEnd(22), c[t]||0);
console.log('殘留無季數:', ['華燈初上','最佳利益','嗨！營業中'].filter(t=>c[t]).join(',')||'(無)');
"
```
Expected: 非正 dayIndex 為 0；殘留無季數為「(無)」；`華燈初上 S2` 37、`華燈初上 S3` 23、`最佳利益 S2` 6、`最佳利益 S3` 17

- [ ] **Step 5: 瀏覽器驗證**

用 preview_start 啟動 dev server，切到「台劇分析」頁，確認：

1. 積分榜預設 20 列，底部有「顯示全部 N 部 →」，點擊後展開
2. 綜藝節目（如 `嗨！營業中 S1`）的片名第二行有「綜藝」字樣
3. 點選 `有生之年`，走勢圖 X 軸上限為 48 左右（不是 355），標題旁出現「※ 有生之年 2024-10 回鍋 5 天，最佳第 7 名」
4. 點選 `影后`，第 54 天與 60–65 天的缺口有淡虛線橋接
5. 主控台無錯誤（read_console_messages）

- [ ] **Step 6: 最終 commit**

```bash
git add -A && git commit -m "chore: 台劇分析頁重構驗證通過"
```

---

## 已知風險（實作時注意）

- **`rankings.json` 的 diff 會很大**。Task 8 之後請抽查幾筆未受本次規則影響的節目（如 `影后`、`八尺門的辯護人`），確認除 `dayIndex`／`runIndex` 外的欄位沒有非預期變動
- **裸數字季別規則可能誤傷**。Task 2 完成後，建議把正規化前後的完整片名清單 diff 一次，確認沒有非季別的結尾數字被改掉
- **`華燈初上` 2022-01-07~02-13 歸 S2 是判讀而非確證**（第一部在該期間仍在週榜上，但日榜每天只記一筆，無法分辨）。此點已寫入規格的風險章節
