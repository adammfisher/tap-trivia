"""
RevenueCat v2 sync.

Endpoints (per spec Section 4.3):
  /projects/{project_id}/customers
  /projects/{project_id}/subscriptions
  /projects/{project_id}/charts/active-subscriptions
  /projects/{project_id}/charts/mrr

Pre-revenue handling: 401/403 (bad creds, no permissions) is a hard fail
that records an error. 200 with empty data is fine — we cache zeros and
move on. 429 → exponential backoff up to 3 retries.

Cache writes:
  revenuecat:overview
  revenuecat:daily:{YYYY-MM-DD}
  revenuecat:monthly:{YYYY-MM}
  revenuecat:recent_events
  revenuecat:by_platform
"""
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import boto3

import cache as _cache

log = logging.getLogger("analytics-sync.revenuecat")

API_BASE = "https://api.revenuecat.com/v2"
SECRET_ID = "taptrivia/revenuecat/credentials"
SOURCE_KEY = "revenuecat"


def _credentials() -> dict:
    sm = boto3.client("secretsmanager")
    return json.loads(sm.get_secret_value(SecretId=SECRET_ID)["SecretString"])


def _get(path: str, api_key: str, params: dict | None = None) -> dict:
    """RevenueCat v2 GET with retries on 429/5xx, raises on terminal failures."""
    url = API_BASE + path
    if params:
        url += "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "User-Agent": "taptrivia-analytics/1.0",
        },
    )
    last_err = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:500]
            if e.code == 429 or 500 <= e.code < 600:
                wait = 2 ** attempt
                log.warning("RC %s %s — retry in %ds", e.code, body, wait)
                time.sleep(wait)
                last_err = e
                continue
            # Terminal HTTP error
            raise RuntimeError(f"RevenueCat {path} returned {e.code}: {body}") from e
        except urllib.error.URLError as e:
            wait = 2 ** attempt
            log.warning("RC URL error %s — retry in %ds", e, wait)
            time.sleep(wait)
            last_err = e
    raise RuntimeError(f"RevenueCat {path} failed after retries: {last_err}")


def _list_paginated(path: str, api_key: str, base_params: dict | None = None) -> list:
    """Iterate the v2 cursor-style pagination."""
    out: list = []
    params = dict(base_params or {})
    params.setdefault("limit", 1000)
    cursor = None
    while True:
        if cursor:
            params["starting_after"] = cursor
        page = _get(path, api_key, params)
        items = page.get("items") or page.get("data") or []
        out.extend(items)
        next_url = page.get("next_page") or page.get("next")
        if not next_url or not items:
            break
        # Cursor-style: extract starting_after from the last item.
        last = items[-1]
        cursor = last.get("id") or last.get("customer_id")
        if not cursor:
            break
    return out


def _store_to_platform(store: str) -> str | None:
    s = store.lower()
    if s in ("app_store", "apple", "ios"):
        return "ios"
    if s in ("play_store", "google", "android"):
        return "android"
    return None


def _price_float(raw) -> float:
    if isinstance(raw, dict):
        raw = raw.get("amount") or raw.get("value") or 0
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def sync(force: bool = False) -> dict:
    """Run RevenueCat sync. Always runs (no daily guard). Returns metadata."""
    creds = _credentials()
    api_key = creds["api_key"]
    project_id = creds["project_id"]

    # 1. /subscriptions — direct endpoint for all subscription records.
    # The /customers list does NOT include nested subscription details;
    # only the dedicated /subscriptions endpoint returns status per record.
    total_active = 0
    total_trial = 0
    mrr_gross = 0.0
    customer_count = 0
    by_platform: dict[str, dict[str, float]] = {
        "ios": {"subs": 0, "mrr": 0.0},
        "android": {"subs": 0, "mrr": 0.0},
    }

    subscriptions = _list_paginated(f"/projects/{project_id}/subscriptions", api_key)
    seen_customers: set[str] = set()
    for s in subscriptions:
        cid = s.get("customer_id") or s.get("app_user_id") or ""
        if cid:
            seen_customers.add(cid)
        status = (s.get("status") or "").lower()
        store = (s.get("store") or "").lower()
        platform = _store_to_platform(store)
        price = _price_float(
            s.get("price_in_purchased_currency")
            or s.get("price")
            or s.get("monthly_price")
            or 0
        )

        if status in ("in_trial", "trial"):
            total_trial += 1
        elif status in ("active", "in_grace_period", "subscribed", "grace_period", "billing_retry"):
            total_active += 1
            mrr_gross += price
            if platform:
                by_platform[platform]["subs"] += 1
                by_platform[platform]["mrr"] += price

    customer_count = len(seen_customers)

    # 2. Daily trend (last 90 days). Endpoint may not exist — be defensive.
    daily_points: list[dict] = []
    try:
        end_date = time.strftime("%Y-%m-%d", time.gmtime())
        start_date = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 90 * 86400))
        chart = _get(
            f"/projects/{project_id}/metrics/active_subscriptions",
            api_key,
            {"period": "day", "start_date": start_date, "end_date": end_date},
        )
        daily_points = chart.get("data") or chart.get("series") or []
    except Exception as e:
        log.warning("RC daily chart unavailable: %s", e)

    # 3. Monthly MRR back to launch — best-effort
    monthly_points: list[dict] = []
    try:
        chart = _get(
            f"/projects/{project_id}/metrics/mrr",
            api_key,
            {"period": "month", "start_date": "2025-01-01"},
        )
        monthly_points = chart.get("data") or chart.get("series") or []
    except Exception as e:
        log.warning("RC monthly chart unavailable: %s", e)

    # 4. Recent events — best-effort
    recent_events: list[dict] = []
    try:
        evt = _get(f"/projects/{project_id}/events", api_key, {"limit": 50})
        recent_events = (evt.get("items") or evt.get("data") or [])[:50]
    except Exception as e:
        log.warning("RC recent events unavailable: %s", e)

    # ---- write cache keys --------------------------------------------
    overview = {
        "totalActive": total_active,
        "totalTrial": total_trial,
        "mrrGross": round(mrr_gross, 2),
        # Churn / conversion would come from RC charts; pre-revenue defaults.
        "churn30d": 0.0,
        "conversionRate": 0.0,
    }
    _cache.write("revenuecat:overview", overview, SOURCE_KEY)
    _cache.write("revenuecat:by_platform", by_platform, SOURCE_KEY)
    _cache.write("revenuecat:recent_events", recent_events, SOURCE_KEY)

    for p in daily_points:
        date = p.get("date") or p.get("ts") or ""
        if not date:
            continue
        _cache.write(
            f"revenuecat:daily:{date}",
            {
                "paid": int(p.get("paid", p.get("active", 0)) or 0),
                "trial": int(p.get("trial", p.get("in_trial", 0)) or 0),
                "free": int(p.get("free", 0) or 0),
            },
            SOURCE_KEY,
        )
    for p in monthly_points:
        ym = p.get("month") or p.get("date") or ""
        if not ym:
            continue
        _cache.write(
            f"revenuecat:monthly:{ym[:7]}",
            {
                "gross": float(p.get("gross") or p.get("mrr") or 0),
                "paidSubs": int(p.get("paidSubs") or p.get("active") or 0),
            },
            SOURCE_KEY,
        )

    return {
        "customers_seen": customer_count,
        "active": total_active,
        "trial": total_trial,
        "mrr_gross": overview["mrrGross"],
        "daily_points": len(daily_points),
        "monthly_points": len(monthly_points),
    }
