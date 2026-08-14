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
