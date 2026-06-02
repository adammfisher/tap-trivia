"""
AWS cost sync via CloudWatch billing metrics (FREE — no Cost Explorer charges).

Reads the AWS/Billing `EstimatedCharges` metric (us-east-1 only):
  - total estimated month-to-date charge (Currency=USD)
  - per-service month-to-date charge (ServiceName dimension)
  - a daily series (diff of the daily cumulative maximum)
End-of-month is a simple linear projection (MTD / days_elapsed * days_in_month);
CloudWatch has no forecast, but this is free and good enough.

Requires the account to have "Receive CloudWatch billing alerts" enabled
(Billing console → Preferences). Until then the metric is empty and everything
reports 0 / "—".

Cache writes:
  aws:costs:current_month
  aws:costs:monthly:{YYYY-MM}   (current month only; no backfill)
"""
import calendar
import logging
from datetime import date, datetime, timedelta, timezone

import boto3

import cache as _cache

log = logging.getLogger("analytics-sync.aws")
SOURCE_KEY = "aws"

# Billing metrics are published only in us-east-1.
_CW_REGION = "us-east-1"


def _cw():
    return boto3.client("cloudwatch", region_name=_CW_REGION)


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def _month_start(d: date) -> datetime:
    return datetime(d.year, d.month, 1, tzinfo=timezone.utc)


def _latest_max(cw, dimensions, start, end) -> float | None:
    """Latest value of the cumulative EstimatedCharges metric, or None."""
    r = cw.get_metric_statistics(
        Namespace="AWS/Billing",
        MetricName="EstimatedCharges",
        Dimensions=dimensions,
        StartTime=start,
        EndTime=end,
        Period=21600,  # 6h
        Statistics=["Maximum"],
    )
    pts = r.get("Datapoints") or []
    if not pts:
        return None
    pts.sort(key=lambda p: p["Timestamp"])
    return float(pts[-1]["Maximum"])


def _daily_series(cw, start, end) -> list[dict]:
    """Per-day spend = diff of the daily cumulative maximum."""
    r = cw.get_metric_statistics(
        Namespace="AWS/Billing",
        MetricName="EstimatedCharges",
        Dimensions=[{"Name": "Currency", "Value": "USD"}],
        StartTime=start,
        EndTime=end,
        Period=86400,
        Statistics=["Maximum"],
    )
    pts = sorted(r.get("Datapoints") or [], key=lambda p: p["Timestamp"])
    out: list[dict] = []
    prev = 0.0
    for p in pts:
        cum = float(p["Maximum"])
        day_total = max(0.0, cum - prev)
        prev = cum
        out.append({"date": p["Timestamp"].strftime("%Y-%m-%d"), "total": round(day_total, 4)})
    return out


def _service_breakdown(cw, start, end) -> list[dict]:
    """Per-service month-to-date charges from the ServiceName dimension."""
    metrics = cw.list_metrics(Namespace="AWS/Billing", MetricName="EstimatedCharges")
    services = set()
    for m in metrics.get("Metrics", []):
        for d in m.get("Dimensions", []):
            if d["Name"] == "ServiceName":
                services.add(d["Value"])

    rows: list[dict] = []
    for svc in services:
        val = _latest_max(
            cw,
            [{"Name": "ServiceName", "Value": svc}, {"Name": "Currency", "Value": "USD"}],
            start, end,
        )
        if val and val > 0:
            rows.append({"service": svc, "amount": round(val, 4)})
    rows.sort(key=lambda r: -r["amount"])
    return rows


def sync(force: bool = False) -> dict:
    cw = _cw()
    today = _today_utc()
    month_start = _month_start(today)
    now = datetime.now(timezone.utc)
    # Look back a couple days before the month for a baseline; CW samples slowly.
    lookback = month_start - timedelta(days=2)

    total = _latest_max(cw, [{"Name": "Currency", "Value": "USD"}], lookback, now)
    enabled = total is not None
    total = float(total or 0.0)

    by_service = _service_breakdown(cw, lookback, now) if enabled else []
    by_day = _daily_series(cw, month_start, now) if enabled else []

    # End-of-month forecast. A naive MTD/day*days projection explodes early in
    # the month because upfront monthly charges (e.g. Route53 hosted zones) get
    # multiplied across the whole month. Instead:
    #   - early in the month, use LAST month's actual total (best estimate);
    #   - later, MTD + (recent daily run-rate × remaining days), where the
    #     run-rate excludes the first-of-month lump.
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    day_of_month = today.day
    remaining_days = days_in_month - day_of_month

    # Last month's actual total — CloudWatch retains the cumulative metric.
    prev_month_end = month_start
    pm = (today.replace(day=1) - timedelta(days=1))
    prev_month_start = datetime(pm.year, pm.month, 1, tzinfo=timezone.utc)
    prev_total = _latest_max(cw, [{"Name": "Currency", "Value": "USD"}],
                             prev_month_start, prev_month_end) if enabled else None
    # CloudWatch only has history from when billing alerts were enabled, so fall
    # back to last month's cached total (e.g. from the prior Cost Explorer sync).
    if not prev_total:
        cached_prev = _cache.read_payload(f"aws:costs:monthly:{pm.strftime('%Y-%m')}", default={}) or {}
        prev_total = cached_prev.get("total")

    # Recent daily run-rate, excluding the first day of the month (the lump).
    month_first = month_start.strftime("%Y-%m-%d")
    recent = [d["total"] for d in by_day if d["date"] >= month_first and d["date"] != month_first]
    daily_rate = (sum(recent) / len(recent)) if recent else 0.0

    if not enabled:
        forecast = 0.0
    elif day_of_month <= 4 or daily_rate <= 0:
        # Too early to trust a run-rate — last month is the better guess.
        forecast = float(prev_total) if prev_total else total
    else:
        forecast = total + daily_rate * remaining_days
    forecast = round(forecast, 4)

    ym = today.strftime("%Y-%m")
    payload = {
        "month": ym,
        "total": round(total, 4),
        "byService": by_service,
        "byDay": by_day,
        "forecast": forecast,
        "forecastBasis": ("last_month" if (enabled and (day_of_month <= 4 or daily_rate <= 0)) else "run_rate"),
        "prevMonthTotal": round(float(prev_total), 4) if prev_total else None,
        "asOf": _cache.now_iso(),
        "source": "cloudwatch_billing",
        "billingMetricsEnabled": enabled,
    }
    _cache.write("aws:costs:current_month", payload, SOURCE_KEY)
    _cache.write(
        f"aws:costs:monthly:{ym}",
        {"total": round(total, 4), "byService": by_service},
        SOURCE_KEY,
    )

    if not enabled:
        log.warning("AWS/Billing EstimatedCharges metric is empty — enable "
                    "'Receive CloudWatch billing alerts' in the Billing console.")

    return {
        "billing_metrics_enabled": enabled,
        "total": round(total, 4),
        "forecast": forecast,
        "services": len(by_service),
    }
