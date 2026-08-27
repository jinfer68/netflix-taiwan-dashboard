"""
board_common.py
榜單資料集的共用工具。電影管線先使用；劇集管線收斂到 BoardDataset 形狀時共用同一批函式。

刻意不含任何電影或劇集專屬的概念 —— 只處理工作表查找、日期正規化、涵蓋率統計、多數決。
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
    present_set = set(present)
    have: Counter = Counter()
    missing: Counter = Counter()

    cursor = start
    while cursor <= end:
        key = str(cursor.year)
        if cursor.isoformat() in present_set:
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
    return next(v for v in items if counts[v] == top)
