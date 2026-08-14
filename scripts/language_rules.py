"""
language_rules.py
電影類型正規化：把爬蟲抓到的自由文字類型拆成「語言」與「形式」兩個維度。

設計規格：docs/superpowers/specs/2026-08-14-movie-page-design.md

與 genre_rules.py 平行的獨立模組，沿用其核心原則：
規則沒命中就進「其他語言」並列入待審清單，不維護手工隱藏對照表。
這樣新出現的產地一定會浮上來讓人決定，不會被硬塞進既有分類，也不會悄悄消失。


升格新語言分組（例如西班牙語累積到值得成為正式類別）需依序修改四處：

  1. src/types/index.ts            加入 MovieLanguage union
  2. src/constants/languages.ts    加入 LANGUAGE_COLORS 與 LANGUAGE_LABELS
  3. 本檔 CANONICAL_LANGUAGES      加入該語言
  4. 本檔 _LANGUAGE                補上產地 → 語言的對映

配色限制：類別色可靠可辨識的上限約 7–8 種（見設計規格），目前語言分組
上限抓六格。新增第七個語言分組前要重新驗證整組配色的相鄰可辨性，不是
加一個 key 就好，升格是有成本的決定。
"""

import re

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

_LEADING_JUNK = re.compile(r"^[》〉>「【\[\s]+")
_TRAILING_PUNCT = re.compile(r"[。、,，.\\]+$")
_PAREN_SPACING = re.compile(r"\s*\(")
_LOC_SUFFIX = re.compile(r"^(.*?)\s*\(([^)]*)\)?\s*$")
_SEPARATORS = re.compile(r"[/,、&＆\\]")


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
    if m:
        base, loc = m.group(1).strip(), m.group(2).strip()
    else:
        base, loc = "", g

    fmt = _to_format(base)
    origin = _SEPARATORS.split(loc)[0].strip()
    return fmt, origin


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
