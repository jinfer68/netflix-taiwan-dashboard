# 電影頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 Netflix 台灣儀表板加入電影模式，第一階段做出「總排行榜」一頁：Top 20 積分榜、快速查詢、當日榜單走勢表、近 14 天名次競逐圖。

**Architecture:** 資料層新增獨立的 Python 管線 `convert_movies.py`（規則模組 `language_rules.py` 以 pytest 做 TDD），輸出只含原始事實的 `public/data/movies.json`；前端把時間下鑽狀態抽成共用 hook，資料集型別泛型化為 `BoardDataset<TAttrs>`，所有排行由 `boardTransforms.ts` 的純函式衍生。劇集的資料與圖表元件完全不動。

**Tech Stack:** Python 3 + openpyxl + pytest（資料層）、React 18 + TypeScript strict + Vite 6、純 SVG 手繪圖表（不新增套件）、inline `CSSProperties`（無 CSS class）

**設計規格：** [docs/superpowers/specs/2026-08-14-movie-page-design.md](../specs/2026-08-14-movie-page-design.md)

---

## 與規格的兩處偏離（實作時的決定，已在計畫中定案）

1. **不擴充 `convert_excel.py`，改寫獨立的 `convert_movies.py`。** 規格寫「擴充 `convert_excel.py`」，本意是「管線歸屬 Python 而非 cjs」。但該檔已 850 行且職責是劇集；加入電影會讓它同時負責兩種資料集，也違反規格自己「劇集資料與管線不動」的邊界。改為兄弟檔 + 共用模組 `board_common.py`，日後劇集收斂時把 `convert_excel.py` 的輸出改成 `BoardDataset` 形狀即可，共用模組已備妥。
2. **前端不做單元測試。** `package.json` 無測試框架，規格驗收條件第 9 條要求不新增 npm 套件。前端的把關是 `npm run build`（TypeScript strict + `noUnusedLocals`/`noUnusedParameters`）加上瀏覽器實測，每個 UI 任務都列出具體的檢查點。資料層則有完整 pytest 覆蓋 —— 風險本來就集中在那裡。若日後要補前端測試，那是規格變更。

3. **不產生 `movieSchemaValidator.generated.ts`。** 規格第 6 節要求比照劇集產生型別驗證檔。劇集需要它是因為沒有任何測試；電影有 Task 6 的 pytest 直接對真實輸出斷言，涵蓋範圍更廣。但生成式驗證器能抓到「TS 型別改了、json 沒跟上」這類漂移，pytest 抓不到 —— 因此 Task 6 補上一條「欄位名稱集合完全相符」的測試作為替代，任何一邊改欄位都會讓它失敗。

## 已驗證的資料事實（實作時可直接依賴，不需重新確認）

- 日榜電影表 16,991 筆／1,702 天／2021-04-05 ～ 2026-08-05；週榜 1,699 筆／170 週／2024-01 起
- 日榜缺 247 天：2021 缺 102、2022 缺 34、2023 缺 110、2024 缺 0、2025 缺 0、2026 缺 1
- 25 天的榜單不足 10 筆（4 天 8 筆、21 天 9 筆）
- 積分欄有 169 筆為 0（17 天），全部是 Excel 公式快取被清掉所致，與劇集同一缺陷；套用既有的 `resolve_score()` 後，**積分恆等於 `11 - 排名`**，因此 `dailyBoard` 不存積分欄，前端直接推算
- 77 個片名的類型欄前後不一致，需多數決

---

## File Structure

**新增（資料層）**
| 檔案 | 責任 |
|---|---|
| `scripts/language_rules.py` | 純函式：原始類型字串 → `(語言, 形式, 原始國別, 判定依據)`。無 I/O、無狀態 |
| `scripts/board_common.py` | 共用：`find_sheet`、日期正規化、`build_coverage`。劇集收斂時共用 |
| `scripts/convert_movies.py` | 電影管線 main：讀兩張表 → 多數決屬性 → 組 `dailyBoard`/`weeklyRankings` → 輸出 json 與 schema validator |
| `scripts/tests/test_language_rules.py` | `language_rules` 的 pytest |
| `scripts/tests/test_board_common.py` | `board_common` 的 pytest |

**新增（前端）**
| 檔案 | 責任 |
|---|---|
| `src/constants/languages.ts` | `LANGUAGE_COLORS`、`LANGUAGE_LABELS`、`FORMAT_LABELS` |
| `src/utils/boardTransforms.ts` | 榜單衍生純函式，**不認識電影**（無 language/format 概念），劇集日後共用 |
| `src/hooks/useTimeFilters.ts` | 年／季／月／週下鑽 + 榜單類型 + 年份收斂規則，兩模式共用 |
| `src/hooks/useMovieFilters.ts` | `useTimeFilters` + 語言、形式、片源 |
| `src/hooks/useShowFilters.ts` | `useTimeFilters` + 劇集既有篩選狀態（純搬移，行為不變） |
| `src/components/charts/MovieTop20Chart.tsx` | 電影積分榜長條圖 |
| `src/components/charts/MovieQuickLookup.tsx` | 電影快速查詢面板 |
| `src/components/charts/MovieBoardTable.tsx` | 當日榜單表 + 迷你走勢 sparkline |
| `src/components/charts/MovieRaceChart.tsx` | 近 14 天名次競逐圖 |

**修改**：`src/types/index.ts`、`src/App.tsx`、`src/components/layout/Sidebar.tsx`
**刪除**：`scripts/excel-to-rankings.cjs`、`package.json` 的 `xlsx` 依賴、`.claude/settings.local.json` 兩條對應權限

---

## Task 1: pytest 骨架與 `clean()`

**Files:**
- Create: `scripts/tests/__init__.py`（空檔）
- Create: `scripts/tests/test_language_rules.py`
- Create: `scripts/language_rules.py`

- [ ] **Step 1: 建立空的 `scripts/tests/__init__.py`**

```bash
mkdir -p scripts/tests && touch scripts/tests/__init__.py
```

- [ ] **Step 2: 寫失敗的測試**

建立 `scripts/tests/test_language_rules.py`：

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from language_rules import clean


def test_clean_converts_fullwidth_parens():
    assert clean("動畫（美）") == "動畫 (美)"


def test_clean_strips_trailing_punctuation():
    assert clean("美。") == "美"


def test_clean_balances_unclosed_paren():
    assert clean("電影 (俄/美") == "電影 (俄/美"


def test_clean_drops_unmatched_closing_paren():
    assert clean("美)") == "美"


def test_clean_normalises_space_before_paren():
    assert clean("動畫(日)") == "動畫 (日)"


def test_clean_strips_leading_junk_character():
    assert clean("》動畫 (日)") == "動畫 (日)"


def test_clean_handles_non_string():
    assert clean(None) == ""
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `python -m pytest scripts/tests/test_language_rules.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'language_rules'`

- [ ] **Step 4: 寫最小實作**

建立 `scripts/language_rules.py`：

```python
"""
language_rules.py
電影類型正規化：把爬蟲抓到的自由文字類型拆成「語言」與「形式」兩個維度。

設計規格：docs/superpowers/specs/2026-08-14-movie-page-design.md

與 genre_rules.py 平行的獨立模組，沿用其核心原則：
規則沒命中就進「其他語言」並列入待審清單，不維護手工隱藏對照表。
"""

import re

_LEADING_JUNK = re.compile(r"^[》〉>「【\[\s]+")
_TRAILING_PUNCT = re.compile(r"[。、,，.\\]+$")
_PAREN_SPACING = re.compile(r"\s*\(")


def clean(raw) -> str:
    """格式清理：全形括號、尾標點、不對稱括號、前綴雜訊、括號前空白"""
    if raw is None:
        return ""
    g = str(raw).strip().replace("（", "(").replace("）", ")")
    g = _LEADING_JUNK.sub("", g)
    g = _TRAILING_PUNCT.sub("", g)
    while g.count(")") > g.count("("):
        g = g[:-1].rstrip()
    return _PAREN_SPACING.sub(" (", g).strip()
```

- [ ] **Step 5: 執行測試確認通過**

Run: `python -m pytest scripts/tests/test_language_rules.py -v`
Expected: PASS，7 passed

- [ ] **Step 6: Commit**

```bash
git add scripts/tests/__init__.py scripts/tests/test_language_rules.py scripts/language_rules.py
git commit -m "feat: 電影類型字串清理規則"
```

---

## Task 2: 形式判定（劇情片／動畫／紀錄片）

**Files:**
- Modify: `scripts/tests/test_language_rules.py`
- Modify: `scripts/language_rules.py`

- [ ] **Step 1: 寫失敗的測試**

在 `scripts/tests/test_language_rules.py` 的 import 行改為：

```python
from language_rules import clean, split_raw
```

並在檔案末端追加：

```python
def test_split_plain_country_is_drama():
    assert split_raw("美") == ("劇情片", "美")


def test_split_animation_with_location():
    assert split_raw("動畫 (日)") == ("動畫", "日")


def test_split_documentary_with_location():
    assert split_raw("紀錄片 (英)") == ("紀錄片", "英")


def test_split_documentary_alternate_wording():
    assert split_raw("紀實 (美)") == ("紀錄片", "美")


def test_split_animation_movie_wording():
    assert split_raw("動畫電影 (美)") == ("動畫", "美")


def test_split_movie_prefix_is_drama():
    assert split_raw("電影 (台)") == ("劇情片", "台")


def test_split_coproduction_takes_first_country():
    assert split_raw("美/南非/冰島") == ("劇情片", "美")


def test_split_coproduction_inside_parens():
    assert split_raw("動畫 (美/中/港)") == ("動畫", "美")


def test_split_comma_separated_coproduction():
    assert split_raw("美,英,冰島") == ("劇情片", "美")


def test_split_ampersand_coproduction():
    assert split_raw("馬來西亞&新加坡") == ("劇情片", "馬來西亞")


def test_split_empty_input():
    assert split_raw("") == ("劇情片", "")
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `python -m pytest scripts/tests/test_language_rules.py -v`
Expected: FAIL — `ImportError: cannot import name 'split_raw'`

- [ ] **Step 3: 寫實作**

在 `scripts/language_rules.py` 末端追加：

```python
_LOC_SUFFIX = re.compile(r"^(.*?)\s*\(([^)]*)\)?\s*$")
_SEPARATORS = re.compile(r"[/,、&＆\\]")


def _to_format(base: str) -> str:
    if "動畫" in base:
        return "動畫"
    if "紀錄" in base or "紀實" in base:
        return "紀錄片"
    return "劇情片"


def split_raw(raw) -> tuple[str, str]:
    """回傳 (形式, 主產地)

    形式為「劇情片」「動畫」「紀錄片」之一。
    主產地是清理後的原始國別字串，合製取第一個。
    """
    g = clean(raw)
    if not g:
        return "劇情片", ""

    m = _LOC_SUFFIX.match(g)
    if m and m.group(2) is not None and "(" in g:
        base, loc = m.group(1).strip(), m.group(2).strip()
    else:
        base, loc = "", g

    fmt = _to_format(base)
    origin = _SEPARATORS.split(loc)[0].strip()
    return fmt, origin
```

- [ ] **Step 4: 執行測試確認通過**

Run: `python -m pytest scripts/tests/test_language_rules.py -v`
Expected: PASS，18 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/tests/test_language_rules.py scripts/language_rules.py
git commit -m "feat: 電影形式與主產地拆解"
```

---

## Task 3: 別名正規化與語言分組

**Files:**
- Modify: `scripts/tests/test_language_rules.py`
- Modify: `scripts/language_rules.py`

- [ ] **Step 1: 寫失敗的測試**

import 行改為：

```python
from language_rules import clean, split_raw, categorize
```

檔案末端追加：

```python
def test_categorize_taiwan_is_its_own_bucket():
    assert categorize("台") == ("台灣", "劇情片", "台", "國別")


def test_categorize_hongkong_is_chinese():
    assert categorize("港") == ("華語", "劇情片", "港", "國別")


def test_categorize_china_is_chinese():
    assert categorize("中") == ("華語", "劇情片", "中", "國別")


def test_categorize_us_is_english():
    assert categorize("美") == ("英語", "劇情片", "美", "國別")


def test_categorize_uk_is_english():
    assert categorize("英") == ("英語", "劇情片", "英", "國別")


def test_categorize_alias_meiju_is_us_not_a_show():
    """電影表裡的「美劇」是爬蟲錯標，不是劇集"""
    assert categorize("美劇") == ("英語", "劇情片", "美", "別名")


def test_categorize_alias_taiju():
    assert categorize("台劇") == ("台灣", "劇情片", "台", "別名")


def test_categorize_alias_japan_fullname():
    assert categorize("日本") == ("日語", "劇情片", "日", "別名")


def test_categorize_alias_short_spain():
    """別名解析成功，但西班牙不在語言對照表 → 仍是 pending，等待人工決定"""
    assert categorize("西") == ("其他語言", "劇情片", "西班牙", "pending")


def test_categorize_animation_japan_keeps_format():
    assert categorize("動畫 (日)") == ("日語", "動畫", "日", "國別")


def test_categorize_documentary_uk():
    assert categorize("紀錄片 (英)") == ("英語", "紀錄片", "英", "國別")


def test_categorize_unmapped_country_is_pending():
    assert categorize("波蘭") == ("其他語言", "劇情片", "波蘭", "pending")


def test_categorize_garbage_is_pending():
    lang, fmt, origin, reason = categorize("(2020) 9900萬戶")
    assert lang == "其他語言"
    assert reason == "pending"


def test_categorize_empty_is_pending():
    lang, fmt, origin, reason = categorize("")
    assert lang == "其他語言"
    assert reason == "pending"


def test_categorize_coproduction_uses_first_country():
    assert categorize("美/南非/冰島") == ("英語", "劇情片", "美", "國別")
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `python -m pytest scripts/tests/test_language_rules.py -v`
Expected: FAIL — `ImportError: cannot import name 'categorize'`

- [ ] **Step 3: 寫實作**

在 `scripts/language_rules.py` 末端追加：

```python
# 須與 src/types/index.ts 的 MovieLanguage union 一致
CANONICAL_LANGUAGES = frozenset({
    "英語", "其他語言", "台灣", "日語", "韓語", "華語",
})

# 資料本身的髒寫法／同義寫法。左側是爬蟲產出的錯字或縮寫，不是分類決策。
_ALIAS = {
    "美劇": "美", "台劇": "台", "韓劇": "韓", "日劇": "日",
    "英劇": "英", "法劇": "法", "荷蘭劇": "荷蘭",
    "日本": "日", "西": "西班牙", "印": "印度",
    "義": "義大利", "俄": "俄羅斯", "澳洲": "澳大利亞",
}

# 產地 → 語言。未列出者一律「其他語言」並列入待審。
_LANGUAGE = {
    "台": "台灣",
    "中": "華語", "港": "華語", "新加坡": "華語", "馬來西亞": "華語",
    "韓": "韓語",
    "日": "日語",
    "美": "英語", "英": "英語", "澳大利亞": "英語",
    "加拿大": "英語", "紐西蘭": "英語", "愛爾蘭": "英語", "南非": "英語",
}


def categorize(raw) -> tuple[str, str, str, str]:
    """回傳 (語言, 形式, 正規化產地, 判定依據)

    判定依據：'國別' | '別名' | 'pending'
    語言一定是 CANONICAL_LANGUAGES 的成員。
    """
    fmt, origin = split_raw(raw)

    aliased = _ALIAS.get(origin)
    reason = "別名" if aliased else "國別"
    if aliased:
        origin = aliased

    language = _LANGUAGE.get(origin)
    if language is None:
        return "其他語言", fmt, origin, "pending"
    return language, fmt, origin, reason
```

- [ ] **Step 4: 執行測試確認通過**

Run: `python -m pytest scripts/tests/test_language_rules.py -v`
Expected: PASS，33 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/tests/test_language_rules.py scripts/language_rules.py
git commit -m "feat: 電影語言分組與別名正規化"
```

---

## Task 4: 共用模組 `board_common.py`

**Files:**
- Create: `scripts/tests/test_board_common.py`
- Create: `scripts/board_common.py`

- [ ] **Step 1: 寫失敗的測試**

建立 `scripts/tests/test_board_common.py`：

```python
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
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `python -m pytest scripts/tests/test_board_common.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'board_common'`

- [ ] **Step 3: 寫實作**

建立 `scripts/board_common.py`：

```python
"""
board_common.py
榜單資料集的共用工具。電影管線先使用；劇集管線收斂到 BoardDataset 形狀時共用同一批函式。
"""

from collections import Counter
from datetime import date, datetime, timedelta


def find_sheet(wb, name: str):
    """以名稱查找工作表，找不到回傳 None"""
    for sheet_name in wb.sheetnames:
        if sheet_name.strip() == name.strip():
            return wb[sheet_name]
    return None


def to_iso_date(value) -> str:
    """把 Excel 讀出的日期（date / datetime / 字串）統一成 YYYY-MM-DD"""
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    if not text:
        return ""
    return text[:10]


def build_coverage(iso_dates) -> list[dict]:
    """逐年統計實際有資料的天數與缺漏天數。

    缺漏定義為「資料首日到末日之間，該年應有而實際沒有的日子」，
    因此首年只從首日起算、末年只算到末日為止。
    """
    present = sorted(set(d for d in iso_dates if d))
    if not present:
        return []

    start = date.fromisoformat(present[0])
    end = date.fromisoformat(present[-1])
    have: Counter = Counter()
    missing: Counter = Counter()

    cursor = start
    while cursor <= end:
        key = str(cursor.year)
        if cursor.isoformat() in set(present):
            have[key] += 1
        else:
            missing[key] += 1
        cursor += timedelta(days=1)

    years = sorted(set(have) | set(missing))
    return [
        {"year": y, "haveDays": have[y], "missingDays": missing[y]}
        for y in years
    ]


def majority_vote(values) -> str:
    """取出現次數最多者；平手取最早出現的那個"""
    items = [v for v in values if v]
    if not items:
        return ""
    counts = Counter(items)
    top = max(counts.values())
    for v in items:
        if counts[v] == top:
            return v
    return items[0]
```

- [ ] **Step 4: 執行測試確認通過**

Run: `python -m pytest scripts/tests/test_board_common.py -v`
Expected: PASS，10 passed

**注意**：`build_coverage` 內的 `set(present)` 在迴圈中重建，資料量大時會很慢。下一步修掉。

- [ ] **Step 5: 把集合提到迴圈外**

把 `build_coverage` 中的：

```python
        if cursor.isoformat() in set(present):
```

改為在 `cursor = start` 之前先建立集合：

```python
    present_set = set(present)
    cursor = start
    while cursor <= end:
        key = str(cursor.year)
        if cursor.isoformat() in present_set:
```

- [ ] **Step 6: 重跑測試**

Run: `python -m pytest scripts/tests/test_board_common.py -v`
Expected: PASS，10 passed

- [ ] **Step 7: Commit**

```bash
git add scripts/tests/test_board_common.py scripts/board_common.py
git commit -m "feat: 榜單資料集共用工具"
```

---

## Task 5: 電影管線 `convert_movies.py`

**Files:**
- Create: `scripts/convert_movies.py`

本任務沒有單元測試 —— 它是 I/O 與組裝，正確性由 Task 6 的真實資料驗證把關（那是這個任務真正的測試）。

- [ ] **Step 1: 建立 `scripts/convert_movies.py`**

```python
"""
convert_movies.py
讀取 export.xlsx 的電影工作表，輸出 public/data/movies.json

用法：
  python scripts/convert_movies.py                     # 使用預設路徑
  python scripts/convert_movies.py path/to/excel.xlsx  # 指定 Excel 路徑

讀取的工作表：
  每天電影排名資料        — 日榜（2021-04 起）
  Netflix 每週電影排名    — 週榜（2024-01 起）

設計規格：docs/superpowers/specs/2026-08-14-movie-page-design.md
"""

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from board_common import build_coverage, find_sheet, majority_vote, to_iso_date
from language_rules import categorize

try:
    import openpyxl
except ImportError:
    print("ERROR: openpyxl not installed. Run: pip install openpyxl")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_EXCEL = ROOT / "爬蟲臉書" / "output" / "export.xlsx"
OUT_PATH = ROOT / "public" / "data" / "movies.json"

SHEET_DAILY = "每天電影排名資料"
SHEET_WEEKLY = "Netflix 每週電影排名"

PENDING: Counter = Counter()
CONFLICTS: dict[str, set] = defaultdict(set)


def resolve_score(score, rank):
    """積分 = 11 - 排名。

    Excel 的積分欄是表格公式，openpyxl 以 data_only=True 讀取時公式快取
    可能已被清掉而讀成 None 或 0。與 convert_excel.py 的處理一致。
    """
    if score:
        return float(score)
    if rank is not None and 1 <= rank <= 10:
        return float(11 - rank)
    return 0.0


def header_index(ws) -> dict:
    """回傳 欄名 → 欄索引（0 起算）"""
    for row in ws.iter_rows(min_row=1, max_row=1, values_only=True):
        return {str(v).strip(): i for i, v in enumerate(row) if v is not None}
    return {}


def parse_daily(ws):
    """回傳 (dailyBoard, raw_rows)

    dailyBoard: [{ date, entries: [{ rank, title }] }]，依日期升冪
    raw_rows:   [(title, raw_genre, is_original, iso_date, rank)]，供屬性彙整
    """
    cols = header_index(ws)
    by_date = defaultdict(list)
    raw_rows = []

    for row in ws.iter_rows(min_row=2, values_only=True):
        iso = to_iso_date(row[cols["日期"]])
        title = str(row[cols["節目名稱"]] or "").strip()
        rank = row[cols["排名"]]
        if not iso or not title or rank is None:
            continue
        rank = int(rank)
        if not 1 <= rank <= 10:
            continue

        by_date[iso].append({"rank": rank, "title": title})
        raw_rows.append((
            title,
            row[cols["類型"]],
            bool(row[cols["是否Netflix Original"]]),
            iso,
            rank,
        ))

    daily_board = [
        {"date": iso, "entries": sorted(entries, key=lambda e: e["rank"])}
        for iso, entries in sorted(by_date.items())
    ]
    return daily_board, raw_rows


def parse_weekly(ws):
    """回傳 [{ weekNumber, dateRange, rankings: [{ rank, title, score }] }]"""
    cols = header_index(ws)
    by_week = defaultdict(list)

    for row in ws.iter_rows(min_row=2, values_only=True):
        start = to_iso_date(row[cols["日期起"]])
        end = to_iso_date(row[cols["日期迄"]])
        title = str(row[cols["節目名稱"]] or "").strip()
        rank = row[cols["排名"]]
        if not start or not title or rank is None:
            continue
        rank = int(rank)
        by_week[(start, end)].append({
            "rank": rank,
            "title": title,
            "score": resolve_score(row[cols["積分"]], rank),
        })

    weeks = []
    for i, ((start, end), items) in enumerate(sorted(by_week.items()), start=1):
        weeks.append({
            "weekNumber": i,
            "dateRange": f"{start} ~ {end}",
            "rankings": sorted(items, key=lambda e: e["rank"]),
        })
    return weeks


def build_entities(raw_rows) -> dict:
    """以多數決決定每部片的語言與形式，並彙整全期統計"""
    per_title = defaultdict(lambda: {
        "raw": [], "original": [], "dates": [], "ranks": [],
    })

    for title, raw_genre, is_original, iso, rank in raw_rows:
        bucket = per_title[title]
        bucket["raw"].append("" if raw_genre is None else str(raw_genre).strip())
        bucket["original"].append(is_original)
        bucket["dates"].append(iso)
        bucket["ranks"].append(rank)

    entities = {}
    for title, bucket in per_title.items():
        distinct = {r for r in bucket["raw"] if r}
        if len(distinct) > 1:
            CONFLICTS[title] = distinct

        winner = majority_vote(bucket["raw"])
        language, fmt, origin, reason = categorize(winner)
        if reason == "pending":
            PENDING[winner or "(空白)"] += len(bucket["raw"])

        ranks = bucket["ranks"]
        dates = sorted(bucket["dates"])
        entities[title] = {
            "language": language,
            "format": fmt,
            "origin": origin,
            "isNetflixOriginal": any(bucket["original"]),
            "firstDate": dates[0],
            "lastDate": dates[-1],
            "daysOnChart": len(dates),
            "bestRank": min(ranks),
            "avgRank": round(sum(ranks) / len(ranks), 2),
            "totalScore": sum(11 - r for r in ranks),
        }
    return entities


def print_report(entities, daily_board):
    total_slots = sum(len(b["entries"]) for b in daily_board)
    per_language = Counter()
    for board in daily_board:
        for entry in board["entries"]:
            attrs = entities.get(entry["title"])
            if attrs:
                per_language[attrs["language"]] += 1

    print("\n語言分佈（榜位天數）")
    for language, count in per_language.most_common():
        print(f"  {language:<6} {count:>6}  {count / total_slots * 100:5.1f}%")

    if PENDING:
        print(f"\n待審類型寫法（{len(PENDING)} 種，全部歸入「其他語言」）")
        for raw, count in PENDING.most_common(30):
            print(f"  {raw!r:<30} {count} 列")
        if len(PENDING) > 30:
            print(f"  …另有 {len(PENDING) - 30} 種")

    if CONFLICTS:
        print(f"\n類型前後不一致的片名（{len(CONFLICTS)} 部，已以多數決處理）")
        for title, variants in list(CONFLICTS.items())[:20]:
            print(f"  {title}: {sorted(variants)}")
        if len(CONFLICTS) > 20:
            print(f"  …另有 {len(CONFLICTS) - 20} 部")


def main():
    excel_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_EXCEL
    print(f"讀取 Excel：{excel_path}")
    if not excel_path.exists():
        print(f"ERROR: 找不到 {excel_path}")
        sys.exit(1)

    wb = openpyxl.load_workbook(excel_path, data_only=True)

    ws_daily = find_sheet(wb, SHEET_DAILY)
    if not ws_daily:
        print(f"ERROR: 找不到 sheet「{SHEET_DAILY}」")
        sys.exit(1)
    print(f"\n解析日榜：{SHEET_DAILY}")
    daily_board, raw_rows = parse_daily(ws_daily)
    print(f"  → {len(daily_board)} 天，{len(raw_rows)} 筆")

    ws_weekly = find_sheet(wb, SHEET_WEEKLY)
    weekly = []
    if ws_weekly:
        print(f"\n解析週榜：{SHEET_WEEKLY}")
        weekly = parse_weekly(ws_weekly)
        print(f"  → {len(weekly)} 週")
    else:
        print(f"  ⚠ 找不到 sheet「{SHEET_WEEKLY}」，週榜留空")

    print("\n彙整片名屬性")
    entities = build_entities(raw_rows)
    print(f"  → {len(entities)} 部電影")

    coverage = build_coverage([b["date"] for b in daily_board])
    print_report(entities, daily_board)

    output = {
        "meta": {
            "generatedAt": datetime.now().isoformat(),
            "dataThrough": daily_board[-1]["date"] if daily_board else "",
            "coverage": coverage,
        },
        "entities": entities,
        "dailyBoard": daily_board,
        "weeklyRankings": weekly,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = OUT_PATH.stat().st_size // 1024
    print(f"\n輸出：{OUT_PATH} ({size_kb} KB)")

    print("\n逐年覆蓋率")
    for row in coverage:
        total = row["haveDays"] + row["missingDays"]
        print(f"  {row['year']}  {row['haveDays']:>3}/{total:<3} 缺 {row['missingDays']}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 執行管線**

Run: `python scripts/convert_movies.py`
Expected: 印出日榜 1702 天 / 16991 筆、1410 部電影、語言分佈、待審清單、77 部衝突片名、逐年覆蓋率，並輸出 `public/data/movies.json`

- [ ] **Step 3: Commit**

```bash
git add scripts/convert_movies.py public/data/movies.json
git commit -m "feat: 電影資料管線，輸出 movies.json"
```

---

## Task 6: 以真實資料驗證管線輸出

**Files:**
- Create: `scripts/tests/test_movies_output.py`

這是 Task 5 真正的測試：拿產出的 json 對照規格中已驗證的數字。

- [ ] **Step 1: 寫測試**

建立 `scripts/tests/test_movies_output.py`：

```python
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
```

- [ ] **Step 2: 執行測試**

Run: `python -m pytest scripts/tests/test_movies_output.py -v`
Expected: PASS，16 passed

若 `test_language_share_matches_spec` 失敗，代表 `language_rules` 的分組與規格不一致 —— 修規則，不要改測試裡的期望值。

- [ ] **Step 3: 全部測試一起跑**

Run: `python -m pytest scripts/tests/ -v`
Expected: PASS，59 passed

- [ ] **Step 4: Commit**

```bash
git add scripts/tests/test_movies_output.py
git commit -m "test: 以真實資料驗證電影管線輸出"
```

---

## Task 7: 型別與常數

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/constants/languages.ts`

- [ ] **Step 1: 在 `src/types/index.ts` 末端追加電影型別**

```typescript
// ── 電影 ────────────────────────────────────────────────────────────

export type MovieLanguage = '英語' | '其他語言' | '台灣' | '日語' | '韓語' | '華語'
export type MovieFormat = '劇情片' | '動畫' | '紀錄片'

export interface MovieAttributes {
  language: MovieLanguage
  format: MovieFormat
  origin: string            // 清理後的原始國別，如「波蘭」「泰」
  isNetflixOriginal: boolean
  firstDate: string         // "YYYY-MM-DD"
  lastDate: string
  daysOnChart: number
  bestRank: number
  avgRank: number
  totalScore: number
}

export interface DailyBoard {
  date: string
  entries: { rank: number; title: string }[]
}

export interface WeeklyBoardItem {
  rank: number
  title: string
  score: number
}

export interface WeeklyBoard {
  weekNumber: number
  dateRange: string         // "YYYY-MM-DD ~ YYYY-MM-DD"
  rankings: WeeklyBoardItem[]
}

export interface YearCoverage {
  year: string
  haveDays: number
  missingDays: number
}

/** 榜單資料集的通用形狀。劇集之後收斂到同一個型別，屆時 TAttrs = ShowAttributes */
export interface BoardDataset<TAttrs> {
  meta: { generatedAt: string; dataThrough: string; coverage: YearCoverage[] }
  entities: Record<string, TAttrs>
  dailyBoard: DailyBoard[]
  weeklyRankings: WeeklyBoard[]
}

export type MoviesData = BoardDataset<MovieAttributes>

/** boardTransforms 衍生的排行項目，不出現在 json */
export interface MovieOverallEntry {
  rank: number
  title: string
  totalScore: number
  language: MovieLanguage
  format: MovieFormat
  isNetflixOriginal: boolean
  onChartCount: number      // 日榜為天數，週榜為週數
  avgRank: number
  bestRank: number
}

export interface DateRange {
  from: string              // "YYYY-MM-DD"，含
  to: string                // "YYYY-MM-DD"，含
}
```

- [ ] **Step 2: 建立 `src/constants/languages.ts`**

```typescript
import type { MovieFormat, MovieLanguage } from '../types'

/**
 * 六色取自 GENRE_COLORS 已驗證的色階（美劇藍、其他灰、台劇綠、日劇粉、韓劇紅、陸劇琥珀），
 * 因此不需重新驗證色盲可辨性與對紙白底對比。
 */
export const LANGUAGE_COLORS: Record<MovieLanguage, string> = {
  英語: '#3568b0',
  其他語言: '#9a9a94',
  台灣: '#1f6f3f',
  日語: '#c4527e',
  韓語: '#b3302b',
  華語: '#b07d10',
}

/** 固定的圖例與堆疊順序，永不依數值重排 */
export const LANGUAGE_LABELS: MovieLanguage[] = [
  '英語', '其他語言', '台灣', '日語', '韓語', '華語',
]

export const FORMAT_LABELS: MovieFormat[] = ['劇情片', '動畫', '紀錄片']
```

- [ ] **Step 3: 確認編譯通過**

Run: `npm run build`
Expected: build 成功，無 TypeScript 錯誤

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/constants/languages.ts
git commit -m "feat: 電影型別與語言色票常數"
```

---

## Task 8: `boardTransforms.ts` 衍生函式

**Files:**
- Create: `src/utils/boardTransforms.ts`

這個模組**刻意不認識電影** —— 沒有 language/format 的概念，只處理「日期、名次、片名」。劇集收斂後可原封不動共用。

- [ ] **Step 1: 建立 `src/utils/boardTransforms.ts`**

```typescript
import type { DailyBoard, DateRange, WeeklyBoard } from '../types'

/** 積分 = 11 - 名次。資料層已確認此關係恆成立 */
export function scoreOf(rank: number): number {
  return 11 - rank
}

export function filterDailyByRange(boards: DailyBoard[], range: DateRange | null): DailyBoard[] {
  if (!range) return boards
  return boards.filter(b => b.date >= range.from && b.date <= range.to)
}

export function filterWeeklyByRange(weeks: WeeklyBoard[], range: DateRange | null): WeeklyBoard[] {
  if (!range) return weeks
  return weeks.filter(w => {
    const start = w.dateRange.split(' ~ ')[0]
    return start >= range.from && start <= range.to
  })
}

export interface TitleAggregate {
  title: string
  totalScore: number
  onChartCount: number
  bestRank: number
  avgRank: number
}

/** 把一段期間的日榜彙總成每個片名一筆 */
export function aggregateDaily(boards: DailyBoard[]): TitleAggregate[] {
  const acc = new Map<string, { score: number; count: number; best: number; sum: number }>()

  for (const board of boards) {
    for (const entry of board.entries) {
      const prev = acc.get(entry.title) ?? { score: 0, count: 0, best: 99, sum: 0 }
      prev.score += scoreOf(entry.rank)
      prev.count += 1
      prev.best = Math.min(prev.best, entry.rank)
      prev.sum += entry.rank
      acc.set(entry.title, prev)
    }
  }

  return [...acc].map(([title, v]) => ({
    title,
    totalScore: v.score,
    onChartCount: v.count,
    bestRank: v.best,
    avgRank: v.sum / v.count,
  }))
}

/** 把一段期間的週榜彙總成每個片名一筆 */
export function aggregateWeekly(weeks: WeeklyBoard[]): TitleAggregate[] {
  const acc = new Map<string, { score: number; count: number; best: number; sum: number }>()

  for (const week of weeks) {
    for (const item of week.rankings) {
      const prev = acc.get(item.title) ?? { score: 0, count: 0, best: 99, sum: 0 }
      prev.score += item.score
      prev.count += 1
      prev.best = Math.min(prev.best, item.rank)
      prev.sum += item.rank
      acc.set(item.title, prev)
    }
  }

  return [...acc].map(([title, v]) => ({
    title,
    totalScore: v.score,
    onChartCount: v.count,
    bestRank: v.best,
    avgRank: v.sum / v.count,
  }))
}

/**
 * 取某片在指定日期序列上的名次，未上榜為 null。
 * 回傳長度與 dates 相同，供折線圖直接對位。
 */
export function rankSeries(boards: DailyBoard[], title: string, dates: string[]): (number | null)[] {
  const byDate = new Map<string, number>()
  for (const board of boards) {
    const hit = board.entries.find(e => e.title === title)
    if (hit) byDate.set(board.date, hit.rank)
  }
  return dates.map(d => byDate.get(d) ?? null)
}

/** 取最後 n 天的日榜（不足則全取） */
export function lastDays(boards: DailyBoard[], n: number): DailyBoard[] {
  return boards.slice(Math.max(0, boards.length - n))
}

/** 一段期間內曾經上榜過的所有片名 */
export function titlesIn(boards: DailyBoard[]): string[] {
  const seen = new Set<string>()
  for (const board of boards) for (const e of board.entries) seen.add(e.title)
  return [...seen]
}

/** 該期間的實際天數與應有天數，供覆蓋率提示使用 */
export function coverageOf(boards: DailyBoard[]): { have: number; expected: number } {
  if (boards.length === 0) return { have: 0, expected: 0 }
  const from = new Date(boards[0].date).getTime()
  const to = new Date(boards[boards.length - 1].date).getTime()
  const expected = Math.round((to - from) / 86400000) + 1
  return { have: boards.length, expected }
}
```

- [ ] **Step 2: 確認編譯通過**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 3: Commit**

```bash
git add src/utils/boardTransforms.ts
git commit -m "feat: 榜單衍生純函式，不綁定電影或劇集"
```

---

## Task 9: `useTimeFilters` 共用時間下鑽

**Files:**
- Create: `src/hooks/useTimeFilters.ts`

- [ ] **Step 1: 建立 `src/hooks/useTimeFilters.ts`**

```typescript
import { useCallback, useMemo, useState } from 'react'
import type { DateRange } from '../types'

export type BoardMode = 'weekly' | 'daily'

/** 該模式下可選的年份。日榜可回溯到 2021，週榜只有 2024 起 */
export interface TimeFilterOptions {
  dailyYears: string[]
  weeklyYears: string[]
}

export interface TimeFilters {
  boardMode: BoardMode
  setBoardMode: (v: BoardMode) => void
  year: string                 // 'all' 或 'YYYY'
  setYear: (v: string) => void
  quarter: number | null       // 1–4
  setQuarter: (v: number | null) => void
  month: number | null         // 1–12
  setMonth: (v: number | null) => void
  years: string[]
  range: DateRange | null      // null 代表全期
}

const pad = (n: number) => String(n).padStart(2, '0')
const lastDayOf = (year: number, month: number) => new Date(year, month, 0).getDate()

export function useTimeFilters(options: TimeFilterOptions): TimeFilters {
  const [boardMode, setBoardModeRaw] = useState<BoardMode>('daily')
  const [year, setYearRaw] = useState<string>('2026')
  const [quarter, setQuarter] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)

  const years = boardMode === 'daily' ? options.dailyYears : options.weeklyYears

  const setYear = useCallback((v: string) => {
    setYearRaw(v)
    setQuarter(null)
    setMonth(null)
  }, [])

  /**
   * 切換榜單類型時，若目前年份在新模式不存在，收斂到「大於目前年份的最小者」；
   * 若無更大的年份則取最大者。下鑽選擇一併清空。
   */
  const setBoardMode = useCallback((next: BoardMode) => {
    setBoardModeRaw(next)
    const available = next === 'daily' ? options.dailyYears : options.weeklyYears
    setYearRaw(prev => {
      if (prev === 'all' || available.includes(prev)) return prev
      const larger = available.filter(y => y !== 'all' && y > prev).sort()
      if (larger.length > 0) return larger[0]
      const numeric = available.filter(y => y !== 'all').sort()
      return numeric[numeric.length - 1] ?? 'all'
    })
    setQuarter(null)
    setMonth(null)
  }, [options.dailyYears, options.weeklyYears])

  const range = useMemo((): DateRange | null => {
    if (year === 'all') return null
    const y = Number(year)

    if (month !== null) {
      return { from: `${y}-${pad(month)}-01`, to: `${y}-${pad(month)}-${pad(lastDayOf(y, month))}` }
    }
    if (quarter !== null) {
      const startMonth = (quarter - 1) * 3 + 1
      const endMonth = startMonth + 2
      return {
        from: `${y}-${pad(startMonth)}-01`,
        to: `${y}-${pad(endMonth)}-${pad(lastDayOf(y, endMonth))}`,
      }
    }
    return { from: `${y}-01-01`, to: `${y}-12-31` }
  }, [year, quarter, month])

  return {
    boardMode, setBoardMode,
    year, setYear,
    quarter, setQuarter,
    month, setMonth,
    years, range,
  }
}
```

- [ ] **Step 2: 確認編譯通過**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTimeFilters.ts
git commit -m "feat: 共用時間下鑽 hook，含年份收斂規則"
```

---

## Task 10: `useMovieFilters`

**Files:**
- Create: `src/hooks/useMovieFilters.ts`

- [ ] **Step 1: 建立 `src/hooks/useMovieFilters.ts`**

```typescript
import { useState } from 'react'
import type { MovieFormat, MovieLanguage } from '../types'
import { useTimeFilters } from './useTimeFilters'
import type { TimeFilterOptions, TimeFilters } from './useTimeFilters'

export interface MovieFilters {
  time: TimeFilters
  languages: Set<MovieLanguage>
  toggleLanguage: (v: MovieLanguage) => void
  clearLanguages: () => void
  format: MovieFormat | 'all'
  setFormat: (v: MovieFormat | 'all') => void
  originalOnly: boolean
  setOriginalOnly: (v: boolean) => void
}

export function useMovieFilters(options: TimeFilterOptions): MovieFilters {
  const time = useTimeFilters(options)
  const [languages, setLanguages] = useState<Set<MovieLanguage>>(new Set())
  const [format, setFormat] = useState<MovieFormat | 'all'>('all')
  const [originalOnly, setOriginalOnly] = useState(false)

  function toggleLanguage(v: MovieLanguage) {
    setLanguages(prev => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  return {
    time,
    languages,
    toggleLanguage,
    clearLanguages: () => setLanguages(new Set()),
    format, setFormat,
    originalOnly, setOriginalOnly,
  }
}
```

- [ ] **Step 2: 確認編譯通過**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMovieFilters.ts
git commit -m "feat: 電影篩選狀態 hook"
```

---

## Task 11: 模式切換與 movies.json 載入

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

本任務只做「切到電影模式會顯示一個載入成功的佔位畫面」，圖表在後續任務接上。這樣切換與載入的問題能單獨被看見。

- [ ] **Step 1: 在 `src/App.tsx` 加入模式狀態與電影資料載入**

在既有的 `const [selectedShow, setSelectedShow] = useState<string | null>(null)` 之後插入：

```typescript
  // ── 電影模式 ─────────────────────────────────────────────────
  const [appMode, setAppMode] = useState<AppMode>('shows')
  const [moviesData, setMoviesData] = useState<MoviesData | null>(null)
  const [moviesLoading, setMoviesLoading] = useState(false)

  useEffect(() => {
    if (appMode !== 'movies' || moviesData || moviesLoading) return
    setMoviesLoading(true)
    fetch(`${import.meta.env.BASE_URL}data/movies.json`)
      .then(res => res.json())
      .then((json: MoviesData) => setMoviesData(json?.dailyBoard ? json : null))
      .catch(() => setMoviesData(null))
      .finally(() => setMoviesLoading(false))
  }, [appMode, moviesData, moviesLoading])

  const movieYears = useMemo(() => {
    if (!moviesData) return { dailyYears: [], weeklyYears: [] }
    const daily = new Set(moviesData.dailyBoard.map(b => b.date.slice(0, 4)))
    const weekly = new Set(moviesData.weeklyRankings.map(w => w.dateRange.slice(0, 4)))
    return {
      dailyYears: [...daily].sort(),
      weeklyYears: [...weekly].sort(),
    }
  }, [moviesData])

  const movieFilters = useMovieFilters(movieYears)
```

在 import 區塊加入：

```typescript
import type { MoviesData } from './types'
import type { AppMode } from './components/layout/Sidebar'
import { useMovieFilters } from './hooks/useMovieFilters'
```

- [ ] **Step 2: 在 `App.tsx` 的 `<main>` 內加入電影模式的分支**

把 `<main style={{ flex: 1, height: CHART_H, overflow: 'hidden', minWidth: 0 }}>` 之後的第一行改成：

```typescript
          {appMode === 'movies' && (
            <div style={{ padding: '16px 20px', fontSize: 13, color: INK_SECONDARY }}>
              {moviesLoading && '載入電影資料中…'}
              {!moviesLoading && moviesData && (
                <>
                  電影資料已載入：{moviesData.dailyBoard.length} 天、
                  {Object.keys(moviesData.entities).length} 部電影、
                  資料截至 {moviesData.meta.dataThrough}
                </>
              )}
              {!moviesLoading && !moviesData && '電影資料載入失敗'}
            </div>
          )}

          {appMode === 'shows' && (
            <>
```

並在 `</main>` 之前、既有三個分頁區塊的結尾處補上對應的 `</>` 與 `)}`：

```typescript
            </>
          )}
        </main>
```

- [ ] **Step 3: 在 `Sidebar.tsx` 加入模式切換**

在 `export type TabType` 之前加入：

```typescript
export type AppMode = 'shows' | 'movies'
```

在 `interface Props` 最前面加入兩個欄位：

```typescript
  appMode: AppMode
  onModeChange: (m: AppMode) => void
```

在 `<aside>` 內、`<nav>` 之前插入模式切換列：

```typescript
      <div style={{ display: 'flex', borderBottom: `1px solid ${RULE_STRONG}` }}>
        {([['shows', '影集'], ['movies', '電影']] as const).map(([m, label]) => {
          const active = appMode === m
          return (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`,
                background: active ? PAPER : 'transparent',
                color: active ? INK : INK_SECONDARY,
                fontWeight: active ? 700 : 400,
                fontSize: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
              {...hoverProps(active ? PAPER : 'transparent')}
            >
              {label}
            </button>
          )
        })}
      </div>
```

在 `App.tsx` 的 `<Sidebar ... />` 加上兩個 prop：

```typescript
          appMode={appMode}
          onModeChange={setAppMode}
```

- [ ] **Step 4: 確認編譯通過**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 5: 瀏覽器實測**

啟動預覽（preview_start，設定名稱依 `.claude/launch.json`），然後檢查：

1. Sidebar 最上方出現「影集／電影」兩個按鈕，預設在「影集」
2. 點「電影」後，主區域顯示「電影資料已載入：1702 天、1410 部電影、資料截至 2026-08-05」
3. 切回「影集」，三個分頁與所有篩選器行為與改動前一致
4. 開發者主控台無錯誤

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: 影集／電影模式切換與電影資料載入"
```

---

## Task 12: `MovieBoardTable` 當日榜單表

**Files:**
- Create: `src/components/charts/MovieBoardTable.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 建立 `src/components/charts/MovieBoardTable.tsx`**

```typescript
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { DailyBoard, MovieAttributes } from '../../types'
import { LANGUAGE_COLORS } from '../../constants/languages'
import { rankSeries } from '../../utils/boardTransforms'
import {
  SECTION_STYLE, SECTION_TITLE, DOT, NUM, hoverProps,
  ACCENT, ACCENT_WASH, INK, INK_MUTED, INK_SECONDARY, PAPER_RAISED, RULE, RULE_STRONG,
} from '../../constants/styles'

interface Props {
  boards: DailyBoard[]
  entities: Record<string, MovieAttributes>
  selectedTitle: string | null
  onSelectTitle: (title: string | null) => void
}

const SPARK_W = 78
const SPARK_H = 20
const WINDOW = 14

const TH: CSSProperties = {
  fontSize: 11, fontWeight: 700, color: INK_SECONDARY, textAlign: 'left',
  background: PAPER_RAISED, padding: '6px 8px', letterSpacing: 0.5, whiteSpace: 'nowrap',
}
const TD: CSSProperties = {
  padding: '5px 8px', borderBottom: `1px solid ${RULE}`, verticalAlign: 'middle',
}

/** 名次 1 在頂端；固定 1–10 不隨資料縮放，各列形狀才能互相比較 */
function sparkY(rank: number): number {
  return 2 + ((rank - 1) / 9) * (SPARK_H - 4)
}

function Sparkline({ series }: { series: (number | null)[] }) {
  const step = SPARK_W / Math.max(1, series.length - 1)
  const segments: string[] = []
  const isolated: { x: number; y: number }[] = []
  let current = ''

  series.forEach((rank, i) => {
    if (rank === null) {
      if (current) segments.push(current)
      current = ''
      return
    }
    const x = i * step
    const y = sparkY(rank)
    current += `${current ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `
    // 前後都不在榜的孤立單日：單點 path 不會渲染，必須補圓點
    const before = i > 0 && series[i - 1] !== null
    const after = i < series.length - 1 && series[i + 1] !== null
    if (!before && !after) isolated.push({ x, y })
  })
  if (current) segments.push(current)

  const entryIndex = series.findIndex(r => r !== null)
  const lastRank = series[series.length - 1]

  return (
    <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} width={SPARK_W} height={SPARK_H} style={{ display: 'block' }}>
      {entryIndex > 0 && (
        <line
          x1={(entryIndex * step).toFixed(1)} y1={1}
          x2={(entryIndex * step).toFixed(1)} y2={SPARK_H - 1}
          stroke={RULE_STRONG} strokeWidth={1}
        />
      )}
      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={INK_SECONDARY} strokeWidth={1.6} strokeLinejoin="round" />
      ))}
      {isolated.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={1.6} fill={INK_SECONDARY} />
      ))}
      {lastRank !== null && (
        <circle cx={SPARK_W} cy={sparkY(lastRank).toFixed(1)} r={2.2} fill={INK} />
      )}
    </svg>
  )
}

export default function MovieBoardTable({ boards, entities, selectedTitle, onSelectTitle }: Props) {
  const view = useMemo(() => {
    if (boards.length === 0) return null
    const window = boards.slice(Math.max(0, boards.length - WINDOW))
    const dates = window.map(b => b.date)
    const today = boards[boards.length - 1]
    const prev = boards.length > 1 ? boards[boards.length - 2] : null

    const rows = today.entries.map(entry => {
      const attrs = entities[entry.title]
      const prevRank = prev?.entries.find(e => e.title === entry.title)?.rank ?? null
      return {
        rank: entry.rank,
        title: entry.title,
        attrs,
        series: rankSeries(window, entry.title, dates),
        prevRank,
      }
    })
    return { date: today.date, rows }
  }, [boards, entities])

  if (!view) {
    return (
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE}>當日榜單</div>
        <div style={{ fontSize: 12, color: INK_MUTED, marginTop: 8 }}>此期間無資料</div>
      </div>
    )
  }

  return (
    <div style={{ ...SECTION_STYLE, height: '100%', overflow: 'auto' }}>
      <div style={SECTION_TITLE}>
        當日榜單　
        <span style={{ ...NUM, fontSize: 11, fontWeight: 400, color: INK_MUTED }}>{view.date}</span>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, marginTop: 8 }}>
        <thead>
          <tr>
            <th style={TH}>#</th>
            <th style={TH}>近 14 天走勢</th>
            <th style={TH}>片名</th>
            <th style={TH}>語言</th>
            <th style={TH}>在榜</th>
            <th style={TH}>升降</th>
          </tr>
        </thead>
        <tbody>
          {view.rows.map(row => {
            const selected = selectedTitle === row.title
            const delta = row.prevRank === null
              ? '新'
              : row.prevRank === row.rank ? '—'
              : row.prevRank > row.rank ? `↑${row.prevRank - row.rank}`
              : `↓${row.rank - row.prevRank}`
            const deltaColor = row.prevRank === null
              ? ACCENT
              : row.prevRank > row.rank ? INK : INK_MUTED

            return (
              <tr
                key={row.title}
                onClick={() => onSelectTitle(selected ? null : row.title)}
                style={{
                  cursor: 'pointer',
                  background: selected ? ACCENT_WASH : 'transparent',
                  borderLeft: `2px solid ${selected ? ACCENT : 'transparent'}`,
                }}
                {...hoverProps(selected ? ACCENT_WASH : 'transparent')}
              >
                <td style={{ ...TD, ...NUM, fontSize: 15, fontWeight: 700, width: 24 }}>{row.rank}</td>
                <td style={{ ...TD, width: SPARK_W + 16 }}><Sparkline series={row.series} /></td>
                <td style={TD}>
                  <span style={DOT(LANGUAGE_COLORS[row.attrs?.language ?? '其他語言'], true)} />
                  {row.title}
                  {row.attrs?.isNetflixOriginal && (
                    <span style={{ fontSize: 10, color: ACCENT, marginLeft: 7 }}>獨家</span>
                  )}
                </td>
                <td style={{ ...TD, fontSize: 12, color: INK_SECONDARY }}>{row.attrs?.language ?? '—'}</td>
                <td style={{ ...TD, ...NUM }}>{row.attrs?.daysOnChart ?? '—'}</td>
                <td style={{ ...TD, ...NUM, fontWeight: 700, color: deltaColor, width: 34 }}>{delta}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: 確認 `ACCENT_WASH` 已從 styles 匯出**

Run: `grep -n "ACCENT_WASH" src/constants/styles.ts`
Expected: 有一行 `export const ACCENT_WASH`。若沒有，在 `src/constants/styles.ts` 加入：

```typescript
export const ACCENT_WASH = 'rgba(229,9,20,0.06)'
```

- [ ] **Step 3: 接到 `App.tsx` 的電影分支**

把 Task 11 建立的佔位 `<div>` 內容替換為：

```typescript
          {appMode === 'movies' && moviesData && (
            <div style={{ display: 'flex', flexDirection: 'column', height: CHART_H }}>
              <div style={{ flex: '0 0 55%', minHeight: 0, borderBottom: `1px solid ${RULE_STRONG}` }} />
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ flex: '0 0 44%', minHeight: 0, borderRight: `1px solid ${RULE_STRONG}` }}>
                  <MovieBoardTable
                    boards={movieDailyInRange}
                    entities={moviesData.entities}
                    selectedTitle={selectedMovie}
                    onSelectTitle={setSelectedMovie}
                  />
                </div>
                <div style={{ flex: 1, minHeight: 0 }} />
              </div>
            </div>
          )}
```

並在 `App.tsx` 加入對應的狀態與衍生值：

```typescript
  const [selectedMovie, setSelectedMovie] = useState<string | null>(null)

  const movieDailyInRange = useMemo(
    () => filterDailyByRange(moviesData?.dailyBoard ?? [], movieFilters.time.range),
    [moviesData, movieFilters.time.range],
  )
```

import 追加：

```typescript
import MovieBoardTable from './components/charts/MovieBoardTable'
import { filterDailyByRange } from './utils/boardTransforms'
```

- [ ] **Step 4: 確認編譯通過**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 5: 瀏覽器實測**

切到電影模式，檢查下列各點：

1. 表格出現 10 列，日期顯示 2026-08-05（若年份篩選為 2026）
2. 排名第 1 的「劇場版「鬼滅之刃」…」走勢線是貼齊頂端的水平線
3. 「驚天凍地」在榜 1 天，升降欄顯示紅色的「新」，**走勢欄可見一個圓點而非空白**（這是孤立單日的處理）
4. 「雙囍」在榜 56 天，語言色點為綠色（台灣）
5. 點擊任一列，該列出現紅色左框與淡紅背景；再點一次取消
6. 主控台無錯誤

- [ ] **Step 6: Commit**

```bash
git add src/components/charts/MovieBoardTable.tsx src/App.tsx src/constants/styles.ts
git commit -m "feat: 電影當日榜單表與迷你走勢"
```

---

## Task 13: `MovieRaceChart` 近 14 天名次競逐

**Files:**
- Create: `src/components/charts/MovieRaceChart.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 建立 `src/components/charts/MovieRaceChart.tsx`**

```typescript
import { useMemo } from 'react'
import type { DailyBoard, MovieAttributes } from '../../types'
import { LANGUAGE_COLORS } from '../../constants/languages'
import { lastDays, rankSeries, titlesIn } from '../../utils/boardTransforms'
import {
  SECTION_STYLE, SECTION_TITLE,
  INK, INK_MUTED, RULE, RULE_STRONG,
} from '../../constants/styles'

interface Props {
  boards: DailyBoard[]
  entities: Record<string, MovieAttributes>
  selectedTitle: string | null
}

const W = 820, H = 270
const L = 30, R = 190, T = 16, B = 30
const PX = W - L - R
const PY = H - T - B
const WINDOW = 14
const LABEL_GAP = 13

export default function MovieRaceChart({ boards, entities, selectedTitle }: Props) {
  const view = useMemo(() => {
    const window = lastDays(boards, WINDOW)
    if (window.length === 0) return null

    const dates = window.map(b => b.date)
    const today = window[window.length - 1]
    const onToday = new Set(today.entries.map(e => e.title))

    const series = titlesIn(window).map(title => ({
      title,
      attrs: entities[title],
      ranks: rankSeries(window, title, dates),
      active: onToday.has(title),
      todayRank: today.entries.find(e => e.title === title)?.rank ?? null,
    }))

    // 今天在榜者畫在上層，落榜的灰線先畫
    series.sort((a, b) => Number(a.active) - Number(b.active))
    return { dates, series }
  }, [boards, entities])

  if (!view) {
    return (
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE}>近 14 天名次競逐</div>
        <div style={{ fontSize: 12, color: INK_MUTED, marginTop: 8 }}>此期間無資料</div>
      </div>
    )
  }

  const x = (i: number) => L + (i / Math.max(1, view.dates.length - 1)) * PX
  const y = (rank: number) => T + ((rank - 1) / 9) * PY

  const placed: number[] = []
  const labels: { title: string; ly: number; color: string }[] = []
  for (const s of view.series) {
    if (!s.active || s.todayRank === null) continue
    let ly = y(s.todayRank) + 4
    while (placed.some(v => Math.abs(v - ly) < LABEL_GAP)) ly += LABEL_GAP
    placed.push(ly)
    labels.push({
      title: s.title.length > 13 ? `${s.title.slice(0, 12)}…` : s.title,
      ly,
      color: LANGUAGE_COLORS[s.attrs?.language ?? '其他語言'],
    })
  }

  function pathOf(ranks: (number | null)[]): string[] {
    const out: string[] = []
    let current = ''
    ranks.forEach((rank, i) => {
      if (rank === null) {
        if (current) out.push(current)
        current = ''
        return
      }
      current += `${current ? 'L' : 'M'}${x(i).toFixed(1)} ${y(rank).toFixed(1)} `
    })
    if (current) out.push(current)
    return out
  }

  return (
    <div style={{ ...SECTION_STYLE, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={SECTION_TITLE}>近 14 天名次競逐</div>
      <div style={{ fontSize: 11, color: INK_MUTED, margin: '4px 0 6px' }}>
        灰線為期間內上榜過、今天已掉出的片
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          {[1, 5, 10].map(rank => (
            <g key={rank}>
              <line x1={L} y1={y(rank)} x2={L + PX} y2={y(rank)} stroke={RULE} />
              <text
                x={L - 7} y={y(rank) + 4} textAnchor="end"
                fontSize={10} fill={INK_MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {rank}
              </text>
            </g>
          ))}

          {view.series.map(s => {
            const highlighted = selectedTitle === s.title
            const color = s.active ? LANGUAGE_COLORS[s.attrs?.language ?? '其他語言'] : RULE_STRONG
            return pathOf(s.ranks).map((d, i) => (
              <path
                key={`${s.title}-${i}`}
                d={d}
                fill="none"
                stroke={color}
                strokeOpacity={s.active ? 1 : 0.7}
                strokeWidth={highlighted ? 3 : s.active ? 2 : 1.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              >
                <title>{`${s.title}　在榜 ${s.attrs?.daysOnChart ?? '—'} 天`}</title>
              </path>
            ))
          })}

          {labels.map(l => (
            <text key={l.title} x={L + PX + 8} y={l.ly} fontSize={11} fill={INK}>
              {l.title}
            </text>
          ))}

          {view.dates.map((d, i) =>
            i % 3 === 0 || i === view.dates.length - 1 ? (
              <text
                key={d} x={x(i).toFixed(1)} y={T + PY + 17} textAnchor="middle"
                fontSize={10} fill={INK_MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {d.slice(5).replace('-', '/')}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 接到 `App.tsx`**

把 Task 12 留下的空 `<div style={{ flex: 1, minHeight: 0 }} />` 替換為：

```typescript
                <div style={{ flex: 1, minHeight: 0 }}>
                  <MovieRaceChart
                    boards={movieDailyInRange}
                    entities={moviesData.entities}
                    selectedTitle={selectedMovie}
                  />
                </div>
```

import 追加：

```typescript
import MovieRaceChart from './components/charts/MovieRaceChart'
```

- [ ] **Step 3: 確認編譯通過**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 4: 瀏覽器實測**

1. 競逐圖出現在右下，彩色線的右端有片名標籤，標籤彼此不重疊
2. 有數條灰色細線（今天已掉出榜的片）
3. 在左側表格點選「雙囍」，競逐圖中對應的線變粗
4. 把年份切到 2021（缺 102 天），確認線在缺漏處**確實斷開**，沒有橫跨缺口的直線
5. 主控台無錯誤

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/MovieRaceChart.tsx src/App.tsx
git commit -m "feat: 電影近 14 天名次競逐圖"
```

---

## Task 14: `MovieTop20Chart` 積分榜

**Files:**
- Create: `src/components/charts/MovieTop20Chart.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 建立 `src/components/charts/MovieTop20Chart.tsx`**

```typescript
import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { DailyBoard, MovieAttributes, MovieOverallEntry, WeeklyBoard } from '../../types'
import type { MovieFilters } from '../../hooks/useMovieFilters'
import { LANGUAGE_COLORS } from '../../constants/languages'
import { aggregateDaily, aggregateWeekly } from '../../utils/boardTransforms'
import {
  SECTION_STYLE, SECTION_TITLE, TOOLTIP_STYLE, NUM,
  INK, INK_MUTED, INK_SECONDARY, RULE, RULE_STRONG,
} from '../../constants/styles'

interface Props {
  boards: DailyBoard[]
  weeks: WeeklyBoard[]
  entities: Record<string, MovieAttributes>
  filters: MovieFilters
  selectedTitle: string | null
  onSelectTitle: (title: string | null) => void
}

const TOP_N = 20

export default function MovieTop20Chart({
  boards, weeks, entities, filters, selectedTitle, onSelectTitle,
}: Props) {
  const rows = useMemo((): MovieOverallEntry[] => {
    const aggregates = filters.time.boardMode === 'daily'
      ? aggregateDaily(boards)
      : aggregateWeekly(weeks)

    return aggregates
      .map(agg => {
        const attrs = entities[agg.title]
        if (!attrs) return null
        return {
          rank: 0,
          title: agg.title,
          totalScore: agg.totalScore,
          language: attrs.language,
          format: attrs.format,
          isNetflixOriginal: attrs.isNetflixOriginal,
          onChartCount: agg.onChartCount,
          avgRank: agg.avgRank,
          bestRank: agg.bestRank,
        } satisfies MovieOverallEntry
      })
      .filter((v): v is MovieOverallEntry => v !== null)
      .filter(v => filters.languages.size === 0 || filters.languages.has(v.language))
      .filter(v => filters.format === 'all' || v.format === filters.format)
      .filter(v => !filters.originalOnly || v.isNetflixOriginal)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, TOP_N)
      .map((v, i) => ({ ...v, rank: i + 1 }))
  }, [boards, weeks, entities, filters])

  const unit = filters.time.boardMode === 'daily' ? '天' : '週'

  return (
    <div style={{ ...SECTION_STYLE, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={SECTION_TITLE}>
        電影積分榜 TOP {TOP_N}　
        <span style={{ fontSize: 11, fontWeight: 400, color: INK_MUTED }}>
          {filters.time.boardMode === 'daily' ? '日榜' : '週榜'}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
            onClick={(e: { activeLabel?: string }) => {
              const title = e?.activeLabel
              if (title) onSelectTitle(title === selectedTitle ? null : title)
            }}
          >
            {/* 橫向長條只保留垂直格線（垂直於閱讀方向） */}
            <CartesianGrid horizontal={false} stroke={RULE} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: INK_SECONDARY }}
              tickLine={false}
              axisLine={{ stroke: RULE_STRONG }}
            />
            <YAxis
              type="category"
              dataKey="title"
              width={168}
              tick={{ fontSize: 12, fill: INK }}
              tickLine={false}
              axisLine={{ stroke: RULE_STRONG }}
            />
            <Tooltip
              cursor={false}
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as MovieOverallEntry
                return (
                  <div style={TOOLTIP_STYLE}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.title}</div>
                    <Row label="總積分" value={String(d.totalScore)} />
                    <Row label="在榜" value={`${d.onChartCount} ${unit}`} />
                    <Row label="最佳名次" value={`第 ${d.bestRank} 名`} />
                    <Row label="平均名次" value={d.avgRank.toFixed(1)} />
                    <Row label="語言" value={d.language} />
                    <Row label="形式" value={d.format} />
                    {d.isNetflixOriginal && <Row label="片源" value="Netflix 獨家" />}
                  </div>
                )
              }}
            />
            <Bar dataKey="totalScore" barSize={14} radius={2} isAnimationActive={false}>
              {rows.map(row => (
                <Cell
                  key={row.title}
                  fill={LANGUAGE_COLORS[row.language]}
                  fillOpacity={selectedTitle && selectedTitle !== row.title ? 0.35 : 1}
                />
              ))}
              <LabelList
                dataKey="totalScore"
                position="right"
                style={{ fontSize: 11, fill: INK_SECONDARY, fontVariantNumeric: 'tabular-nums' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12 }}>
      <span style={{ color: INK_SECONDARY }}>{label}</span>
      <span style={NUM}>{value}</span>
    </div>
  )
}
```

- [ ] **Step 2: 接到 `App.tsx`**

把 Task 12 留下的 `<div style={{ flex: '0 0 55%', ... }} />` 替換為：

```typescript
              <div style={{ flex: '0 0 55%', minHeight: 0, display: 'flex', borderBottom: `1px solid ${RULE_STRONG}` }}>
                <div style={{ flex: '0 0 60%', minHeight: 0, borderRight: `1px solid ${RULE_STRONG}` }}>
                  <MovieTop20Chart
                    boards={movieDailyInRange}
                    weeks={movieWeeksInRange}
                    entities={moviesData.entities}
                    filters={movieFilters}
                    selectedTitle={selectedMovie}
                    onSelectTitle={setSelectedMovie}
                  />
                </div>
                <div style={{ flex: 1, minHeight: 0 }} />
              </div>
```

新增衍生值與 import：

```typescript
  const movieWeeksInRange = useMemo(
    () => filterWeeklyByRange(moviesData?.weeklyRankings ?? [], movieFilters.time.range),
    [moviesData, movieFilters.time.range],
  )
```

```typescript
import MovieTop20Chart from './components/charts/MovieTop20Chart'
import { filterDailyByRange, filterWeeklyByRange } from './utils/boardTransforms'
```

- [ ] **Step 3: 確認編譯通過**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 4: 瀏覽器實測**

1. 左上出現 20 根橫向長條，依總積分由高到低
2. 長條末端有積分數字，長條顏色為語言色
3. 滑過長條出現 tooltip，含總積分、在榜天數、最佳名次、平均名次、語言、形式
4. 點擊長條後其餘長條淡化，且左下表格的同一部片被選取
5. 只保留垂直格線，無水平格線、無圖表外框
6. 主控台無錯誤

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/MovieTop20Chart.tsx src/App.tsx
git commit -m "feat: 電影積分榜 TOP 20"
```

---

## Task 15: `MovieQuickLookup` 快速查詢

**Files:**
- Create: `src/components/charts/MovieQuickLookup.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 建立 `src/components/charts/MovieQuickLookup.tsx`**

```typescript
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { MovieAttributes } from '../../types'
import { LANGUAGE_COLORS } from '../../constants/languages'
import {
  SECTION_STYLE, SECTION_TITLE, INPUT_STYLE, DOT, NUM, hoverProps,
  ACCENT, ACCENT_WASH, INK, INK_MUTED, INK_SECONDARY, RULE,
} from '../../constants/styles'

interface Props {
  entities: Record<string, MovieAttributes>
  selectedTitle: string | null
  onSelectTitle: (title: string | null) => void
}

const MAX_RESULTS = 60

const FIELD: CSSProperties = {
  display: 'flex', justifyContent: 'space-between',
  padding: '5px 0', borderBottom: `1px solid ${RULE}`, fontSize: 13,
}

export default function MovieQuickLookup({ entities, selectedTitle, onSelectTitle }: Props) {
  const [search, setSearch] = useState('')

  const results = useMemo(() => {
    const all = Object.entries(entities)
    const keyword = search.trim().toLowerCase()
    const matched = keyword
      ? all.filter(([title]) => title.toLowerCase().includes(keyword))
      : all
    return matched
      .sort((a, b) => b[1].totalScore - a[1].totalScore)
      .slice(0, MAX_RESULTS)
  }, [entities, search])

  const detail = selectedTitle ? entities[selectedTitle] : null

  return (
    <div style={{ ...SECTION_STYLE, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={SECTION_TITLE}>快速查詢</div>

      <input
        type="text"
        placeholder="搜尋電影名稱…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ ...INPUT_STYLE, marginTop: 8 }}
      />

      {detail && selectedTitle && (
        <div style={{ marginTop: 10, paddingBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            <span style={DOT(LANGUAGE_COLORS[detail.language], true)} />
            {selectedTitle}
          </div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>語言／形式</span><span>{detail.language}・{detail.format}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>產地</span><span>{detail.origin || '—'}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>總積分</span><span style={NUM}>{detail.totalScore}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>在榜天數</span><span style={NUM}>{detail.daysOnChart}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>最佳名次</span><span style={NUM}>第 {detail.bestRank} 名</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>平均名次</span><span style={NUM}>{detail.avgRank.toFixed(1)}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>首末上榜</span><span style={NUM}>{detail.firstDate} — {detail.lastDate}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>片源</span><span>{detail.isNetflixOriginal ? 'Netflix 獨家' : '非獨家'}</span></div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', marginTop: 8, minHeight: 0 }}>
        {results.map(([title, attrs]) => {
          const selected = selectedTitle === title
          return (
            <button
              key={title}
              onClick={() => onSelectTitle(selected ? null : title)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 6px', border: 'none', borderBottom: `1px solid ${RULE}`,
                borderLeft: `2px solid ${selected ? ACCENT : 'transparent'}`,
                background: selected ? ACCENT_WASH : 'transparent',
                cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
                color: selected ? INK : INK_SECONDARY, fontWeight: selected ? 700 : 400,
              }}
              {...hoverProps(selected ? ACCENT_WASH : 'transparent')}
            >
              <span style={DOT(LANGUAGE_COLORS[attrs.language], selected)} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </span>
              <span style={{ ...NUM, fontSize: 12, color: INK_MUTED }}>{attrs.totalScore}</span>
            </button>
          )
        })}
        {results.length === 0 && (
          <div style={{ fontSize: 12, color: INK_MUTED, padding: '8px 0' }}>找不到符合的電影</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 接到 `App.tsx`**

把 Task 14 留下的空 `<div style={{ flex: 1, minHeight: 0 }} />`（上列右側）替換為：

```typescript
                <div style={{ flex: 1, minHeight: 0 }}>
                  <MovieQuickLookup
                    entities={moviesData.entities}
                    selectedTitle={selectedMovie}
                    onSelectTitle={setSelectedMovie}
                  />
                </div>
```

import 追加：

```typescript
import MovieQuickLookup from './components/charts/MovieQuickLookup'
```

- [ ] **Step 3: 確認編譯通過**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 4: 瀏覽器實測**

1. 右上出現搜尋框與依總積分排序的清單
2. 輸入「角頭」只剩相關結果
3. 點選一部片後，上方出現詳細欄位；同時左側長條圖與左下表格的選取狀態同步
4. 主控台無錯誤

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/MovieQuickLookup.tsx src/App.tsx
git commit -m "feat: 電影快速查詢面板"
```

---

## Task 16: Sidebar 電影篩選群組與覆蓋率提示

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 在 `Sidebar.tsx` 的 Props 加入電影篩選**

```typescript
  movieFilters: MovieFilters
  movieCoverage: { have: number; expected: number }
```

import 追加：

```typescript
import type { MovieFilters } from '../../hooks/useMovieFilters'
import { LANGUAGE_COLORS, LANGUAGE_LABELS, FORMAT_LABELS } from '../../constants/languages'
```

- [ ] **Step 2: 在篩選區域加入電影模式的分支**

把既有的 `{activeTab === 'rankings' && (` 整個群組包在 `{appMode === 'shows' && (<>` … `</>)}` 之內（連同 `genre`、`taiwan` 兩個分頁區塊），並在其後加入：

```typescript
        {appMode === 'movies' && (
          <>
            <div style={GROUP_LABEL}>榜單類型</div>
            <div style={ROW}>
              {([['weekly', '週榜'], ['daily', '日榜']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => movieFilters.time.setBoardMode(mode)}
                  style={SEGMENT_BTN(movieFilters.time.boardMode === mode)}
                  {...hoverProps()}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={GROUP_LABEL}>時間範圍</div>
            <div style={ROW}>
              {[...movieFilters.time.years, 'all'].map(y => (
                <button
                  key={y}
                  onClick={() => movieFilters.time.setYear(y)}
                  style={SEGMENT_BTN(movieFilters.time.year === y)}
                  {...hoverProps()}
                >
                  {y === 'all' ? '全部' : y}
                </button>
              ))}
            </div>

            {movieFilters.time.year !== 'all' && (
              <div style={SUB_ROW(10)}>
                {[1, 2, 3, 4].map(q => {
                  const active = movieFilters.time.quarter === q
                  return (
                    <button
                      key={q}
                      onClick={() => {
                        movieFilters.time.setQuarter(active ? null : q)
                        movieFilters.time.setMonth(null)
                      }}
                      style={SEGMENT_BTN(active)}
                      {...hoverProps()}
                    >
                      Q{q}
                    </button>
                  )
                })}
              </div>
            )}

            {movieFilters.time.quarter !== null && (
              <div style={SUB_ROW(20)}>
                {[0, 1, 2].map(offset => {
                  const m = (movieFilters.time.quarter! - 1) * 3 + 1 + offset
                  const active = movieFilters.time.month === m
                  return (
                    <button
                      key={m}
                      onClick={() => movieFilters.time.setMonth(active ? null : m)}
                      style={SEGMENT_BTN(active)}
                      {...hoverProps()}
                    >
                      {m}月
                    </button>
                  )
                })}
              </div>
            )}

            {movieCoverage.expected > 0 &&
              movieCoverage.have / movieCoverage.expected < 0.9 && (
                <div style={{ ...NUM, fontSize: 11, color: INK_MUTED, marginTop: 8 }}>
                  ※ 資料涵蓋 {movieCoverage.have} / {movieCoverage.expected} 天
                </div>
              )}

            <div style={{ ...GROUP_LABEL, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>語言篩選</span>
              {movieFilters.languages.size > 0 && (
                <button
                  onClick={movieFilters.clearLanguages}
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    fontSize: 11, color: INK_MUTED, fontWeight: 400,
                    fontFamily: 'inherit', padding: 0,
                  }}
                >
                  清除
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0 }}>
              {LANGUAGE_LABELS.map(lang => {
                const active = movieFilters.languages.has(lang)
                return (
                  <button
                    key={lang}
                    onClick={() => movieFilters.toggleLanguage(lang)}
                    style={GENRE_TOGGLE(active)}
                    {...hoverProps()}
                  >
                    <span style={DOT(LANGUAGE_COLORS[lang], active)} />
                    {lang}
                  </button>
                )
              })}
            </div>

            <div style={GROUP_LABEL}>形式</div>
            <div style={ROW}>
              <button
                onClick={() => movieFilters.setFormat('all')}
                style={SEGMENT_BTN(movieFilters.format === 'all')}
                {...hoverProps()}
              >
                全部
              </button>
              {FORMAT_LABELS.map(f => (
                <button
                  key={f}
                  onClick={() => movieFilters.setFormat(f)}
                  style={SEGMENT_BTN(movieFilters.format === f)}
                  {...hoverProps()}
                >
                  {f}
                </button>
              ))}
            </div>

            <div style={GROUP_LABEL}>片源</div>
            <button
              onClick={() => movieFilters.setOriginalOnly(!movieFilters.originalOnly)}
              style={GENRE_TOGGLE(movieFilters.originalOnly)}
              {...hoverProps()}
            >
              <span style={DOT(ACCENT, movieFilters.originalOnly)} />
              僅 Netflix 獨家
            </button>
          </>
        )}
```

- [ ] **Step 3: 在 `App.tsx` 傳入新的 props**

```typescript
          movieFilters={movieFilters}
          movieCoverage={movieCoverage}
```

新增衍生值與 import：

```typescript
  const movieCoverage = useMemo(() => coverageOf(movieDailyInRange), [movieDailyInRange])
```

- [ ] **Step 3b: 篩選變動時清除失效的選取**

規格的邊界情況要求「選取的電影不在當前篩選結果中就清除選取」。在 `App.tsx` 加入：

```typescript
  // 篩選改變後，若選取的電影已不在期間內的榜單上，清除選取
  useEffect(() => {
    if (!selectedMovie) return
    const stillThere = movieDailyInRange.some(b =>
      b.entries.some(e => e.title === selectedMovie),
    )
    if (!stillThere) setSelectedMovie(null)
  }, [movieDailyInRange, selectedMovie])
```

```typescript
import { coverageOf, filterDailyByRange, filterWeeklyByRange } from './utils/boardTransforms'
```

- [ ] **Step 4: 確認編譯通過**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 5: 瀏覽器實測**

1. 電影模式的 Sidebar 顯示：榜單類型、時間範圍、語言篩選（六個色點）、形式、片源
2. **沒有**「上架方式」群組
3. 日榜模式下年份包含 2021–2026；切到週榜後 2021–2023 消失
4. 在日榜選 2022 再切到週榜，年份自動變成 2024，畫面不空白
5. 選 2021 年時，Sidebar 出現「※ 資料涵蓋 169 / 271 天」
6. 選「台灣」語言後，積分榜只剩台片；再按「清除」還原
7. 選「動畫」形式後，榜上只剩動畫片
8. 切回影集模式，三個分頁的篩選器完全正常
9. 主控台無錯誤

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "feat: 電影模式的 Sidebar 篩選與覆蓋率提示"
```

---

## Task 17: `useShowFilters` 收攏劇集狀態

**Files:**
- Create: `src/hooks/useShowFilters.ts`
- Modify: `src/App.tsx`

純搬移，**畫面與行為不得有任何改變**。這是為了讓劇集之後也能共用 `useTimeFilters`（見規格的收斂路徑），本任務先把狀態收進 hook。

- [ ] **Step 1: 建立 `src/hooks/useShowFilters.ts`**

```typescript
import { useState } from 'react'
import type { YearFilter } from '../components/layout/Sidebar'

export type ReleaseFilter = 'all' | 'weekly' | 'allAtOnce' | 'split'
export type NetflixFilter = 'all' | 'original' | 'nonOriginal'

export interface ShowFilters {
  yearFilter: YearFilter
  setYearFilter: (v: YearFilter) => void
  rankingMode: 'weekly' | 'daily'
  setRankingMode: (v: 'weekly' | 'daily') => void
  activeGenres: Set<string>
  setActiveGenres: (v: Set<string>) => void
  netflixOnly: boolean
  setNetflixOnly: (v: boolean) => void
  selectedQuarter: string
  setSelectedQuarter: (v: string) => void
  selectedMonth: string | null
  setSelectedMonth: (v: string | null) => void
  selectedDailyWeek: number | null
  setSelectedDailyWeek: (v: number | null) => void
  sortMode: 'weekly' | 'daily'
  setSortMode: (v: 'weekly' | 'daily') => void
  filterRelease: ReleaseFilter
  setFilterRelease: (v: ReleaseFilter) => void
  filterNetflix: NetflixFilter
  setFilterNetflix: (v: NetflixFilter) => void
  selectedTitles: string[]
  setSelectedTitles: (v: string[]) => void
  search: string
  setSearch: (v: string) => void
  flowNetflixFilter: NetflixFilter
  setFlowNetflixFilter: (v: NetflixFilter) => void
}

export function useShowFilters(): ShowFilters {
  const [yearFilter, setYearFilter] = useState<YearFilter>('2026')
  const [rankingMode, setRankingMode] = useState<'weekly' | 'daily'>('weekly')
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set())
  const [netflixOnly, setNetflixOnly] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedDailyWeek, setSelectedDailyWeek] = useState<number | null>(null)
  const [sortMode, setSortMode] = useState<'weekly' | 'daily'>('weekly')
  const [filterRelease, setFilterRelease] = useState<ReleaseFilter>('all')
  const [filterNetflix, setFilterNetflix] = useState<NetflixFilter>('all')
  const [selectedTitles, setSelectedTitles] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [flowNetflixFilter, setFlowNetflixFilter] = useState<NetflixFilter>('all')

  return {
    yearFilter, setYearFilter,
    rankingMode, setRankingMode,
    activeGenres, setActiveGenres,
    netflixOnly, setNetflixOnly,
    selectedQuarter, setSelectedQuarter,
    selectedMonth, setSelectedMonth,
    selectedDailyWeek, setSelectedDailyWeek,
    sortMode, setSortMode,
    filterRelease, setFilterRelease,
    filterNetflix, setFilterNetflix,
    selectedTitles, setSelectedTitles,
    search, setSearch,
    flowNetflixFilter, setFlowNetflixFilter,
  }
}
```

- [ ] **Step 2: 在 `App.tsx` 以 hook 取代 13 個 useState**

刪除「TOP 20 篩選狀態」「台劇分析篩選狀態」「日榜週次篩選狀態」「走勢分析篩選狀態」「流向圖篩選狀態」以及 `yearFilter` 的所有 `useState` 宣告，改為：

```typescript
  const show = useShowFilters()
```

其餘所有引用改為 `show.` 前綴（例如 `yearFilter` → `show.yearFilter`、`setActiveGenres` → `show.setActiveGenres`）。傳給 `<Sidebar>` 與各圖表元件的 prop 值同樣改為 `show.` 前綴，**prop 名稱一律不變**，這樣元件不需修改。

import 追加：

```typescript
import { useShowFilters } from './hooks/useShowFilters'
```

- [ ] **Step 3: 確認編譯通過**

Run: `npm run build`
Expected: build 成功，且 `noUnusedLocals` 會抓出任何漏改的舊變數

- [ ] **Step 4: 瀏覽器實測（回歸測試）**

逐一確認劇集模式行為與改動前完全一致：

1. 總排行榜：週榜／日榜切換、年份與季月週下鑽、類型篩選、僅獨家
2. 類型分析：兩個圓餅圖、河流圖、流向圖片源篩選
3. 台劇分析：榜單類型、上架方式、片源、走勢比較的搜尋與最多 8 部選取
4. 主控台無錯誤

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useShowFilters.ts src/App.tsx
git commit -m "refactor: 劇集篩選狀態收進 useShowFilters"
```

---

## Task 18: 刪除重複的舊管線

**Files:**
- Delete: `scripts/excel-to-rankings.cjs`
- Modify: `package.json`
- Modify: `.claude/settings.local.json`

- [ ] **Step 1: 再次確認無人引用**

Run:
```bash
grep -rn "excel-to-rankings" --include=*.json --include=*.yml --include=*.yaml --include=*.md --include=*.ts --include=*.tsx . --exclude-dir=node_modules --exclude-dir=dist
```
Expected: 只有 `.claude/settings.local.json` 的兩行

- [ ] **Step 2: 確認 `xlsx` 依賴只有它在用**

Run:
```bash
grep -rn "from 'xlsx'\|require('xlsx')\|from \"xlsx\"" --include=*.ts --include=*.tsx --include=*.cjs --include=*.js src scripts
```
Expected: 只有 `scripts/excel-to-rankings.cjs`

- [ ] **Step 3: 刪除檔案與依賴**

```bash
git rm scripts/excel-to-rankings.cjs
npm uninstall xlsx
```

- [ ] **Step 4: 移除 `.claude/settings.local.json` 的兩條權限**

刪除這兩行：

```json
      "Bash(node scripts/excel-to-rankings.js)",
      "Bash(node scripts/excel-to-rankings.cjs)",
```

- [ ] **Step 5: 確認建置與管線都還正常**

Run: `npm run build`
Expected: build 成功

Run: `python scripts/convert_excel.py`
Expected: 正常產出 `rankings.json`，劇集資料未受影響

Run: `python scripts/convert_movies.py`
Expected: 正常產出 `movies.json`

Run: `python -m pytest scripts/tests/ -v`
Expected: PASS，59 passed

- [ ] **Step 6: Commit**

```bash
git add -A package.json package-lock.json .claude/settings.local.json
git commit -m "chore: 刪除重複的 excel-to-rankings 管線與 xlsx 依賴"
```

---

## Task 19: 全案驗收

**Files:** 無

逐條核對規格的驗收條件。

- [ ] **Step 1: 資料層**

Run: `python scripts/convert_movies.py`
確認輸出中：
- 語言分佈為 英語 53.9%、其他語言 13.9%、台灣 11.2%、日語 8.8%、韓語 6.1%、華語 6.1%（誤差 0.5% 內）
- 印出待審類型清單
- 印出 77 部類型衝突片名

- [ ] **Step 1b: 檢查檔案體積**

Run: `ls -l public/data/movies.json`

規格的體積預算是 1MB。若超過，改用字串池壓縮：`movies.json` 加一個 `titles: string[]`，`dailyBoard.entries` 的 `title` 改存索引，前端載入後還原。**未超過就不要做這個優化。**

- [ ] **Step 2: 測試全綠**

Run: `python -m pytest scripts/tests/ -v`
Expected: PASS，59 passed

- [ ] **Step 3: 建置**

Run: `npm run build`
Expected: 成功，無 TypeScript 錯誤

- [ ] **Step 4: 檢查未新增禁止項目**

Run:
```bash
git diff main --stat -- package.json
grep -rn "className" src/components/charts/Movie*.tsx src/hooks src/utils/boardTransforms.ts
```
Expected: `package.json` 只有移除 `xlsx`；`className` 無任何命中

Run:
```bash
grep -rnoE "#[0-9a-fA-F]{6}" src/components/charts/Movie*.tsx
```
Expected: 無命中（顏色一律來自 `LANGUAGE_COLORS` 或 `styles.ts`）

- [ ] **Step 5: 瀏覽器全流程**

1. 切到電影模式，四個區塊都有內容
2. 2021 年的競逐圖在缺漏處斷線，Sidebar 顯示覆蓋率提示
3. 在榜 1 天的片在走勢欄可見圓點
4. 日榜 2022 切週榜後年份收斂到 2024
5. 切回影集模式，篩選狀態保留在切走前的狀態
6. 再切回電影模式，電影的篩選狀態同樣保留
7. 主控台全程無錯誤

- [ ] **Step 6: 最終 commit**

```bash
git add -A
git commit -m "feat: 電影頁第一階段完成"
```

---

## 後續階段（不在本計畫範圍）

依規格〈後續階段〉章節：續航力象限圖 + 獨家片單組成第二頁、電影版多片走勢比較（X 軸對齊上架天數）、劇集日榜開放至 2021、劇集資料收斂到 `BoardDataset` 形狀。
