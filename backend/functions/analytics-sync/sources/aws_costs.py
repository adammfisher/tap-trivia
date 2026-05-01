"""
AWS Cost Explorer sync (Section 4.6).

  ce.get_cost_and_usage   — daily breakdown of current month, grouped by SERVICE
  ce.get_cost_forecast    — end-of-month projection
  ce.get_cost_and_usage   — monthly totals over trailing 36 months on first run

Each call costs $0.01. Daily cadence (one run per day at 06:05 UTC) keeps
this in pennies/month.

Cache writes:
  aws:costs:current_month
  aws:costs:monthly:{YYYY-MM}    (trailing 36 months on first run, then incremental)
"""
import calendar
import logging
from datetime import date, datetime, timedelta, timezone

import boto3

import cache as _cache

log = logging.getLogger("analytics-sync.aws")
SOURCE_KEY = "aws"


def _ce():
    # Cost Explorer is a us-east-1 service.
    return boto3.client("ce", region_name="us-east-1")


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def _first_of_next_month(d: date) -> date:
    if d.month == 12:
        return date(d.year + 1, 1, 1)
    return date(d.year, d.month + 1, 1)


def _month_start(d: date) -> date:
    return date(d.year, d.month, 1)


def sync(force: bool = False) -> dict:
    ce = _ce()
    today = _today_utc()
    month_start = _month_start(today)
    month_end_exclusive = _first_of_next_month(today)

    # 1. Current month — daily breakdown by service.
    current = ce.get_cost_and_usage(
        TimePeriod={
            "Start": month_start.strftime("%Y-%m-%d"),
            # End is exclusive in CE — pass tomorrow so today is included.
            "End": (today + timedelta(days=1)).strftime("%Y-%m-%d"),
        },
        Granularity="DAILY",
        Metrics=["UnblendedCost"],
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
    )

    by_service_total: dict[str, float] = {}
    by_day: list[dict] = []
    total = 0.0
    for day in current.get("ResultsByTime", []):
        day_total = 0.0
        for g in day.get("Groups", []):
            svc = g["Keys"][0] if g.get("Keys") else "Other"
            amount = float(g["Metrics"]["UnblendedCost"]["Amount"])
            by_service_total[svc] = by_service_total.get(svc, 0) + amount
            day_total += amount
        by_day.append({"date": day["TimePeriod"]["Start"], "total": round(day_total, 4)})
        total += day_total

    by_service = [
        {"service": k, "amount": round(v, 4)}
        for k, v in sorted(by_service_total.items(), key=lambda x: -x[1])
    ]

    # 2. Forecast for the rest of the month.
    forecast = 0.0
    if today < month_end_exclusive - timedelta(days=1):
        try:
            f = ce.get_cost_forecast(
                TimePeriod={
                    "Start": (today + timedelta(days=1)).strftime("%Y-%m-%d"),
                    "End": month_end_exclusive.strftime("%Y-%m-%d"),
                },
                Granularity="MONTHLY",
                Metric="UNBLENDED_COST",
            )
            forecast = float(f["Total"]["Amount"])
        except Exception as e:
            log.warning("CE forecast failed: %s", e)

    _cache.write(
        "aws:costs:current_month",
        {
            "month": month_start.strftime("%Y-%m"),
            "total": round(total, 4),
            "byService": by_service,
            "byDay": by_day,
            "forecast": round(total + forecast, 4),
        },
        SOURCE_KEY,
    )

    # 3. Trailing months — only fetch any month we don't already have cached.
    months_pulled = []
    cur = _month_start(today - timedelta(days=1))  # start with last completed month if today is the 1st
    if cur == month_start:
        # If today is the 1st of the month, the "last month" is one further back.
        cur = _month_start((cur - timedelta(days=1)))
    fetched_back = 0
    while fetched_back < 36:
        ym = cur.strftime("%Y-%m")
        existing = _cache.read(f"aws:costs:monthly:{ym}")
        # On a re-run, only refetch the last month (it could have late charges).
        if existing and fetched_back > 1 and not force:
            break
        next_month_start = _first_of_next_month(cur)
        try:
            r = ce.get_cost_and_usage(
                TimePeriod={
                    "Start": cur.strftime("%Y-%m-%d"),
                    "End": next_month_start.strftime("%Y-%m-%d"),
                },
                Granularity="MONTHLY",
                Metrics=["UnblendedCost"],
                GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
            )
        except Exception as e:
            log.warning("CE monthly %s failed: %s", ym, e)
            break

        m_by_service: dict[str, float] = {}
        m_total = 0.0
        for row in r.get("ResultsByTime", []):
            for g in row.get("Groups", []):
                svc = g["Keys"][0] if g.get("Keys") else "Other"
                amt = float(g["Metrics"]["UnblendedCost"]["Amount"])
                m_by_service[svc] = m_by_service.get(svc, 0) + amt
                m_total += amt

        _cache.write(
            f"aws:costs:monthly:{ym}",
            {
                "month": ym,
                "total": round(m_total, 4),
                "byService": [
                    {"service": k, "amount": round(v, 4)}
                    for k, v in sorted(m_by_service.items(), key=lambda x: -x[1])
                ],
            },
            SOURCE_KEY,
        )
        months_pulled.append(ym)
        # Step back a month
        cur = _month_start(cur - timedelta(days=1))
        fetched_back += 1

    return {
        "current_month_total": round(total, 4),
        "current_month_forecast": round(total + forecast, 4),
        "months_pulled_this_run": months_pulled,
        "by_service_count": len(by_service),
    }
