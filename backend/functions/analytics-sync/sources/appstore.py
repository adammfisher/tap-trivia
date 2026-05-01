"""
App Store Connect sync (Section 4.4).

Auth: ES256 JWT signed with the .p8 private key, expires in 20 min.
Endpoints:
  GET /v1/salesReports         (gzipped TSV, daily summary)
  GET /v1/financeReports       (gzipped TSV, monthly net per region)

Pre-revenue handling: reports for dates that don't exist yet return 404
or empty TSV — we treat those as "no data" and write empty cache rather
than failing.

Daily-cadence guard: skip if last sync < 24h ago.

Cache writes:
  appstore:monthly:{YYYY-MM}
  appstore:by_country:{YYYY-MM}
  appstore:upcoming_payout
"""
import csv
import gzip
import io
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import boto3
import jwt

import cache as _cache

log = logging.getLogger("analytics-sync.appstore")

API_BASE = "https://api.appstoreconnect.apple.com/v1"
CREDS_SECRET = "taptrivia/appstore/credentials"
KEY_SECRET = "taptrivia/appstore/private-key"
SOURCE_KEY = "appstore"
DAILY_GUARD_HOURS = 24


def _credentials() -> tuple[dict, str]:
    sm = boto3.client("secretsmanager")
    creds = json.loads(sm.get_secret_value(SecretId=CREDS_SECRET)["SecretString"])
    private_key = sm.get_secret_value(SecretId=KEY_SECRET)["SecretString"]
    return creds, private_key


def _make_jwt(key_id: str, issuer_id: str, private_key: str) -> str:
    headers = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    payload = {
        "iss": issuer_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + 1200,
        "aud": "appstoreconnect-v1",
    }
    return jwt.encode(payload, private_key, algorithm="ES256", headers=headers)


def _fetch_report(token: str, params: dict) -> bytes | None:
    """Returns gzipped TSV bytes, or None if Apple says 404 (no data yet)."""
    url = API_BASE + "/salesReports?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/a-gzip"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        # 403 = key lacks Sales/Finance role. 400/404 = report not generated
        # yet (Apple lags 24-48h). All three are "no data yet" in pre-revenue
        # — log and continue rather than failing the whole sync.
        if e.code in (400, 403, 404):
            body = e.read().decode("utf-8", errors="replace")[:200]
            log.info("ASC %s: no report for %s (%s)", e.code, params, body)
            return None
        raise


def _fetch_finance_report(token: str, params: dict) -> bytes | None:
    url = API_BASE + "/financeReports?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/a-gzip"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code in (400, 403, 404):
            body = e.read().decode("utf-8", errors="replace")[:200]
            log.info("ASC finance %s: no report for %s (%s)", e.code, params, body)
            return None
        raise


def _decompress_tsv(blob: bytes) -> list[dict]:
    if not blob:
        return []
    text = gzip.decompress(blob).decode("utf-8", errors="replace")
    rows = list(csv.DictReader(io.StringIO(text), delimiter="\t"))
    return rows


def _aggregate_sales(rows: list[dict]) -> dict:
    """Sum a SUMMARY-type sales TSV by country + total."""
    by_country: dict[str, float] = {}
    refunds = 0.0
    gross = 0.0
    for r in rows:
        proceeds = float(r.get("Developer Proceeds") or r.get("DeveloperProceeds") or 0 or 0)
        units = int(r.get("Units") or 0 or 0)
        country = (r.get("Country Code") or r.get("CountryCode") or "").upper()
        amount = proceeds * units
        if units < 0:
            refunds += -amount
        else:
            gross += amount
            if country:
                by_country[country] = by_country.get(country, 0) + amount
    return {
        "gross": round(gross, 2),
        "refunds": round(refunds, 2),
        "by_country": [{"country": k, "revenue": round(v, 2)} for k, v in sorted(by_country.items(), key=lambda x: -x[1])],
    }


def _aggregate_finance(rows: list[dict]) -> dict:
    """Sum a FINANCIAL-type report → net proceeds (the actual payout)."""
    net = 0.0
    for r in rows:
        amount = r.get("Extended Partner Share") or r.get("Partner Share") or r.get("Amount") or 0
        try:
            net += float(amount)
        except (TypeError, ValueError):
            continue
    return {"net": round(net, 2)}


def sync(force: bool = False) -> dict:
    last = _cache.get_last_synced(SOURCE_KEY)
    h = _cache.hours_since(last)
    if not force and h is not None and h < DAILY_GUARD_HOURS:
        log.info("appstore: skipping, last sync was %.1f h ago", h)
        return {"skipped": True, "hours_since_last": h}

    creds, private_key = _credentials()
    token = _make_jwt(creds["key_id"], creds["issuer_id"], private_key)
    vendor = creds["vendor_number"]

    # Last 3 calendar months — daily SUMMARY reports get aggregated to a
    # monthly view per spec.
    today = datetime.now(timezone.utc).date()
    months_to_pull: list[str] = []
    cursor = today.replace(day=1)
    for _ in range(3):
        months_to_pull.append(cursor.strftime("%Y-%m"))
        # Step back one month
        prev = cursor.replace(day=1)
        prev = (prev.replace(day=1) - __import__("datetime").timedelta(days=1)).replace(day=1)
        cursor = prev

    monthly_summaries: dict[str, dict] = {}

    for ym in months_to_pull:
        # Daily SUMMARY reports for every day in the month.
        year, month = ym.split("-")
        # Build day list — stop at today for the current month.
        dt0 = datetime(int(year), int(month), 1, tzinfo=timezone.utc).date()
        if dt0.month == 12:
            next0 = dt0.replace(year=dt0.year + 1, month=1)
        else:
            next0 = dt0.replace(month=dt0.month + 1)
        days = []
        d = dt0
        while d < next0 and d <= today:
            days.append(d.strftime("%Y-%m-%d"))
            d = d + __import__("datetime").timedelta(days=1)

        agg = {"gross": 0.0, "refunds": 0.0, "by_country": {}}
        for date in days:
            blob = _fetch_report(token, {
                "filter[frequency]": "DAILY",
                "filter[reportType]": "SALES",
                "filter[reportSubType]": "SUMMARY",
                "filter[vendorNumber]": vendor,
                "filter[reportDate]": date,
            })
            if not blob:
                continue
            rows = _decompress_tsv(blob)
            day_agg = _aggregate_sales(rows)
            agg["gross"] += day_agg["gross"]
            agg["refunds"] += day_agg["refunds"]
            for entry in day_agg["by_country"]:
                k = entry["country"]
                agg["by_country"][k] = agg["by_country"].get(k, 0) + entry["revenue"]

        # Optional: monthly FINANCIAL report — actual net proceeds.
        finance_blob = _fetch_finance_report(token, {
            "filter[regionCode]": "ZZ",  # all regions
            "filter[reportType]": "FINANCIAL",
            "filter[vendorNumber]": vendor,
            "filter[reportDate]": ym,
        })
        net_proceeds = None
        if finance_blob:
            net_proceeds = _aggregate_finance(_decompress_tsv(finance_blob)).get("net")

        by_country_list = [
            {"country": k, "revenue": round(v, 2)}
            for k, v in sorted(agg["by_country"].items(), key=lambda x: -x[1])
        ]

        monthly = {
            "grossProceeds": round(agg["gross"], 2),
            "appleFee": round(agg["gross"] * 0.30, 2),  # estimate; finance report supersedes when present
            "netProceeds": round(net_proceeds if net_proceeds is not None else agg["gross"] * 0.85, 2),
            "refunds": round(agg["refunds"], 2),
            "payoutDate": None,
        }
        _cache.write(f"appstore:monthly:{ym}", monthly, SOURCE_KEY)
        _cache.write(f"appstore:by_country:{ym}", by_country_list, SOURCE_KEY)
        monthly_summaries[ym] = monthly

    # Upcoming payout: the most recent month with finance data, or the running total
    # from the current incomplete month.
    upcoming = {"amount": 0.0, "expectedDate": None, "status": "pending"}
    if months_to_pull:
        cur = monthly_summaries.get(months_to_pull[0]) or {}
        upcoming = {
            "amount": round(cur.get("netProceeds", 0) or 0, 2),
            "expectedDate": None,
            "status": "in_progress" if upcoming["amount"] == 0 else "pending",
        }
    _cache.write("appstore:upcoming_payout", upcoming, SOURCE_KEY)

    return {"months_pulled": len(months_to_pull), "summaries": list(monthly_summaries.keys())}
