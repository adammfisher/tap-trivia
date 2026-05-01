"""
Resolve /finance ?range= and ?compare= into concrete (start, end) date pairs.

range:    mtd | 30d | 90d | ytd | 12mo | 3y | custom
compare:  none | prev | yoy
custom:   start=YYYY-MM-DD&end=YYYY-MM-DD (both required when range=custom)

Windows are inclusive of both start and end at day resolution. End defaults
to today (UTC) for non-custom ranges.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Optional

VALID_RANGES = ("mtd", "30d", "90d", "ytd", "12mo", "3y", "custom")
VALID_COMPARES = ("none", "prev", "yoy")


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _parse(s: str) -> Optional[date]:
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _step_back_months(d: date, months: int) -> date:
    y = d.year
    m = d.month - months
    while m <= 0:
        y -= 1
        m += 12
    # Clamp day if the destination month is shorter (rare for month-1 inputs).
    last_of_target = (date(y if m < 12 else y + 1, m + 1 if m < 12 else 1, 1) - timedelta(days=1)).day
    return date(y, m, min(d.day, last_of_target))


def resolve(
    range_: str,
    compare: str,
    custom_start: Optional[str] = None,
    custom_end: Optional[str] = None,
) -> tuple[tuple[date, date], Optional[tuple[date, date]]]:
    """
    Returns ((current_start, current_end), comparison_or_None).

    Raises ValueError on invalid input — caller catches and returns 400.
    """
    if range_ not in VALID_RANGES:
        raise ValueError(f"range must be one of {VALID_RANGES}")
    if compare not in VALID_COMPARES:
        raise ValueError(f"compare must be one of {VALID_COMPARES}")

    today = _today()
    if range_ == "custom":
        s = _parse(custom_start or "")
        e = _parse(custom_end or "")
        if not s or not e or e < s:
            raise ValueError("custom range requires start, end (YYYY-MM-DD), end >= start")
        cur = (s, e)
    elif range_ == "mtd":
        cur = (today.replace(day=1), today)
    elif range_ == "30d":
        cur = (today - timedelta(days=29), today)
    elif range_ == "90d":
        cur = (today - timedelta(days=89), today)
    elif range_ == "ytd":
        cur = (today.replace(month=1, day=1), today)
    elif range_ == "12mo":
        cur = (_step_back_months(today, 12), today)
    elif range_ == "3y":
        cur = (date(today.year - 3, today.month, today.day), today)
    else:
        raise ValueError(f"unhandled range {range_}")

    if compare == "none":
        return cur, None

    cs, ce = cur
    span = (ce - cs).days
    if compare == "prev":
        comp_end = cs - timedelta(days=1)
        comp_start = comp_end - timedelta(days=span)
    elif compare == "yoy":
        comp_start = date(cs.year - 1, cs.month, min(cs.day, 28))
        comp_end = date(ce.year - 1, ce.month, min(ce.day, 28))
    else:
        comp_start = comp_end = cs

    return cur, (comp_start, comp_end)


def months_in_range(start: date, end: date) -> list[str]:
    """List YYYY-MM strings covering [start, end] inclusive."""
    out = []
    cur = start.replace(day=1)
    while cur <= end:
        out.append(cur.strftime("%Y-%m"))
        if cur.month == 12:
            cur = cur.replace(year=cur.year + 1, month=1)
        else:
            cur = cur.replace(month=cur.month + 1)
    return out
