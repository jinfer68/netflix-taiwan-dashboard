import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from language_rules import clean, split_raw


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
