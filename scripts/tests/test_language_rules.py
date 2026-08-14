import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from language_rules import clean, split_raw, categorize, CANONICAL_LANGUAGES, _LANGUAGE


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


def test_split_unclosed_paren_still_extracts_origin():
    assert split_raw("電影 (俄/美") == ("劇情片", "俄")


def test_categorize_unclosed_paren_normalises_origin():
    assert categorize("電影 (俄/美")[2] == "俄羅斯"


def test_language_table_only_produces_canonical_values():
    assert set(_LANGUAGE.values()) | {"其他語言"} == CANONICAL_LANGUAGES
