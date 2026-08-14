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
