"""
RevenueCat v2 sync.

Working endpoints confirmed:
  /projects/{project_id}/metrics/overview   → active_trials, active_subscriptions,
                                               mrr, revenue, new_customers, active_users
  /projects/{project_id}/charts/actives     → monthly active-subscription trend
  /projects/{project_id}/customers          → customer list (no subscription details)

Cache writes:
  revenuecat:overview
  revenuecat:by_platform
  revenuecat:recent_events
  revenuecat:daily:{YYYY-MM-DD}
  revenuecat:monthly:{YYYY-MM}
"""
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request

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
            raise RuntimeError(f"RevenueCat {path} returned {e.code}: {body}") from e
        except urllib.error.URLError as e:
            wait = 2 ** attempt
            log.warning("RC URL error %s — retry in %ds", e, wait)
            time.sleep(wait)
            last_err = e
    raise RuntimeError(f"RevenueCat {path} failed after retries: {last_err}")


def _list_paginated(path: str, api_key: str, base_params: dict | None = None) -> list:
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
        if not items or not (page.get("next_page") or page.get("next")):
            break
        last = items[-1]
        cursor = last.get("id") or last.get("customer_id")
        if not cursor:
            break
    return out


def _platform_from_rc(platform_str: str) -> str | None:
    p = (platform_str or "").lower()
    if p in ("ios", "iphone", "ipad", "macos"):
        return "ios"
    if p in ("android", "amazon"):
        return "android"
    return None


def sync(force: bool = False) -> dict:
    creds = _credentials()
    api_key = creds["api_key"]
    project_id = creds["project_id"]

    # 1. /metrics/overview — the correct v2 endpoint for aggregate counts.
    # /subscriptions requires a store_subscription_identifier (lookup, not list).
    # /customers list does not include subscription status.
    metrics_raw = _get(f"/projects/{project_id}/metrics/overview", api_key)
    metrics = {m["id"]: m["value"] for m in (metrics_raw.get("metrics") or [])}

    total_active = int(metrics.get("active_subscriptions") or 0)
    total_trial  = int(metrics.get("active_trials") or 0)
    mrr_gross    = float(metrics.get("mrr") or 0)
    revenue_28d  = float(metrics.get("revenue") or 0)
    new_customers_28d = int(metrics.get("new_customers") or 0)
    active_users_28d  = int(metrics.get("active_users") or 0)

    # 2. Platform split — approximate from customers' last_seen_platform.
    # RC v2 doesn't support platform segmentation on the actives chart.
    by_platform: dict[str, dict] = {
        "ios":     {"subs": 0, "mrr": 0.0},
        "android": {"subs": 0, "mrr": 0.0},
    }
    try:
        ios_count = 0
        android_count = 0
        customers = _list_paginated(f"/projects/{project_id}/customers", api_key)
        for c in customers:
            p = _platform_from_rc(c.get("last_seen_platform") or "")
            if p == "ios":
                ios_count += 1
            elif p == "android":
                android_count += 1
        total_customers = ios_count + android_count or 1
        if total_active > 0:
            ios_subs = round(total_active * ios_count / total_customers)
            android_subs = total_active - ios_subs
            mrr_per_sub = mrr_gross / total_active if total_active else 0
            by_platform["ios"]     = {"subs": ios_subs,     "mrr": round(ios_subs * mrr_per_sub, 2)}
            by_platform["android"] = {"subs": android_subs, "mrr": round(android_subs * mrr_per_sub, 2)}
    except Exception as e:
        log.warning("RC platform split unavailable: %s", e)

    # 3. Monthly actives trend (best-effort, for history charts)
    monthly_points: list[dict] = []
    try:
        chart = _get(
            f"/projects/{project_id}/charts/actives",
            api_key,
            {"resolution": "month", "start_time": "2025-01-01"},
        )
        for pt in (chart.get("values") or []):
            epoch = pt.get("cohort")
            if not epoch:
                continue
            ym = time.strftime("%Y-%m", time.gmtime(epoch))
            monthly_points.append({"ym": ym, "active": int(pt.get("value") or 0)})
    except Exception as e:
        log.warning("RC monthly chart unavailable: %s", e)

    # ---- write cache ------------------------------------------------
    overview = {
        "totalActive":       total_active,
        "totalTrial":        total_trial,
        "mrrGross":          round(mrr_gross, 2),
        "revenue28d":        round(revenue_28d, 2),
        "newCustomers28d":   new_customers_28d,
        "activeUsers28d":    active_users_28d,
        "churn30d":          0.0,
        "conversionRate":    0.0,
    }
    _cache.write("revenuecat:overview",      overview,    SOURCE_KEY)
    _cache.write("revenuecat:by_platform",   by_platform, SOURCE_KEY)
    _cache.write("revenuecat:recent_events", [],          SOURCE_KEY)

    for pt in monthly_points:
        _cache.write(
            f"revenuecat:monthly:{pt['ym']}",
            {"paidSubs": pt["active"], "gross": 0.0},
            SOURCE_KEY,
        )

    return {
        "active":           total_active,
        "trial":            total_trial,
        "mrr_gross":        overview["mrrGross"],
        "revenue_28d":      revenue_28d,
        "new_customers_28d": new_customers_28d,
        "active_users_28d": active_users_28d,
        "monthly_points":   len(monthly_points),
    }
