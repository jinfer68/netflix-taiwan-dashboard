"""
genre_rules.py
節目類型正規化：把爬蟲抓到的自由文字類型折成合法的 Genre 值。

設計規格：docs/superpowers/specs/2026-08-08-genre-canonicalization-design.md

處理流程：
  clean(raw)  →  結構規則  →  未命中：'其他' + pending

只有「結構規則」能自動修正。規則涵蓋不到的一律歸「其他」並列入待審清單，
不存在手工維護的隱藏對照表 —— 這樣新出現的類型一定會浮上來讓人決定，
而不會被硬塞進既有九類，也不會悄悄消失。


升格新類型（例如泰劇累積到值得成為正式類別）需依序修改三處：

  1. src/types/index.ts        加入 Genre union
  2. src/constants/genres.ts   加入 GENRE_COLORS 與 GENRE_LABELS
  3. 本檔 CANONICAL_GENRES     加入該類型

配色限制：依 CLAUDE.md，GENRE_COLORS 前八色是 OKLab 驗證過的色盲可辨色階，
第九位「其他」為中性灰。新增第十個類型需重新驗證整組配色的相鄰可辨性與
對紙白底 >= 3:1 對比，不是加一個 hex 就好。升格是有成本的決定。
"""

import re

# 須與 src/types/index.ts 的 Genre union 一致
CANONICAL_GENRES = frozenset({
    "韓劇", "美劇", "陸劇", "動畫劇 (日)", "日劇",
    "台劇", "實境秀", "英劇", "其他",
})

# 已審核、確認維持「其他」的原始寫法。不影響分類結果，只控制要不要再提示。
REVIEWED: frozenset[str] = frozenset()

_COUNTRY = {
    "韓": "韓劇", "美": "美劇", "陸": "陸劇", "中": "陸劇",
    "日": "日劇", "台": "台劇", "英": "英劇",
}

_NON_DRAMA = frozenset({"紀實", "直播", "音樂體驗", "電影", "新聞"})
_ANIME = frozenset({"動畫", "動畫劇", "動漫", "動畫短劇"})

_BRACKET_SUFFIX = re.compile(r"\s*[\[【][^\]】]*[\]】].*$")   # 「韓劇 [在榜3周]」
_STAT_SUFFIX    = re.compile(r"\s*[／/]\s*\d.*$")            # 「韓劇 /706萬小時」
_TRAILING_PUNCT = re.compile(r"[。、,，.]+$")                 # 「英劇。」
_PAREN_SPACING  = re.compile(r"\s*\(")
_LOC_SUFFIX     = re.compile(r"^(.*?)\s*\(([^)]*)\)$")       # 「實境 (韓)」
_VARIETY        = re.compile(r"[韓台日美陸中英]綜")
_COUNTRY_SHORT  = re.compile(r"([韓美陸中日台英])\s*劇?")     # 「美」「陸」「中劇」
_CO_PRODUCTION  = re.compile(r"([韓美陸中日台英])\s*[&＆].*")  # 「美&波蘭」


def clean(raw) -> str:
    """格式清理：全形括號、尾注、尾標點、不對稱括號、括號前空白"""
    g = str(raw).strip().replace("（", "(").replace("）", ")")
    g = _BRACKET_SUFFIX.sub("", g)
    g = _STAT_SUFFIX.sub("", g)
    g = _TRAILING_PUNCT.sub("", g)
    while g.count(")") > g.count("("):
        g = g[:-1].rstrip()
    return _PAREN_SPACING.sub(" (", g).strip()


def canonicalize(raw) -> tuple[str, str]:
    """回傳 (合法類型, 判定依據)

    判定依據：'canon' | 規則名 | 'reviewed' | 'pending'
    分類結果一定是 CANONICAL_GENRES 的成員。
    """
    if raw is None or not str(raw).strip():
        return "其他", "canon"

    g = clean(raw)
    if g in CANONICAL_GENRES:
        return g, "canon"

    m = _LOC_SUFFIX.match(g)
    base, loc = (m.group(1).strip(), m.group(2).strip()) if m else (g, None)

    if base in _NON_DRAMA:
        return "其他", "非戲劇類"

    if base in _ANIME:
        # 既有九類的動畫類別明確限定日本，非日動畫只能進「其他」
        if loc is None or loc == "日":
            return "動畫劇 (日)", "動畫-日"
        return "其他", "動畫-非日"

    if base == "實境":
        return "實境秀", "實境"

    if _VARIETY.fullmatch(base):
        return "實境秀", "綜藝"

    if _COUNTRY_SHORT.fullmatch(base):
        return _COUNTRY[base[0]], "國別縮寫"

    m3 = _CO_PRODUCTION.fullmatch(base)
    if m3:
        return _COUNTRY[m3.group(1)], "合製-主國別"

    return "其他", "reviewed" if g in REVIEWED else "pending"
