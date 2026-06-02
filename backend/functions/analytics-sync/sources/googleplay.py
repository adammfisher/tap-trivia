"""
Google Play sync (Section 4.5).

Auth: Google service account JWT (RS256) → OAuth2 access token.

This intentionally does NOT pull a full BigQuery export in v1 — pre-revenue
we have no data to pull. The implementation:
  1. Resolves the access token (proves the service account works).
  2. Tries to list financial reports in GCS at gs://pubsite_prod_*/sales/.
     If the SA doesn't have GCS access, that's fine — we cache empty
     and the user can wire BigQuery export later.

Daily-cadence guard.

Cache writes:
  googleplay:monthly:{YYYY-MM}    (only for months with data)
  googleplay:upcoming_payout
"""
import json
import os
import logging
import time
import urllib.error
import urllib.parse
import urllib.request

import boto3
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleAuthRequest

import cache as _cache

log = logging.getLogger("analytics-sync.googleplay")

SECRET_ID = "taptrivia/googleplay/service-account-key"
SOURCE_KEY = "googleplay"
DAILY_GUARD_HOURS = 24

SCOPES_GCS = ("https://www.googleapis.com/auth/devstorage.read_only",)


def _service_account_creds():
    sm = boto3.client("secretsmanager")
    raw = sm.get_secret_value(SecretId=SECRET_ID)["SecretString"]
    info = json.loads(raw)
    return info, service_account.Credentials.from_service_account_info(info, scopes=SCOPES_GCS)


def _list_gcs(bucket: str, prefix: str, token: str) -> list[dict]:
    url = f"https://storage.googleapis.com/storage/v1/b/{urllib.parse.quote(bucket, safe='')}/o?" + urllib.parse.urlencode({"prefix": prefix, "maxResults": 1000})
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode("utf-8"))
            return data.get("items", [])
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:300]
        log.warning("GCS list %s/%s returned %s: %s", bucket, prefix, e.code, body)
        return []


def sync(force: bool = False) -> dict:
    last = _cache.get_last_synced(SOURCE_KEY)
    h = _cache.hours_since(last)
    if not force and h is not None and h < DAILY_GUARD_HOURS:
        log.info("googleplay: skipping, last sync was %.1f h ago", h)
        return {"skipped": True, "hours_since_last": h}

    info, creds = _service_account_creds()
    creds.refresh(GoogleAuthRequest())
    token = creds.token

    # Try to find the publisher's reports bucket. The SA's project_id is
    # in the JSON; the report bucket is typically "pubsite_prod_<id>" but
    # the id isn't trivially derivable from the SA. We attempt both common
    # patterns; if neither is readable, write empty cache and move on.
    project_id = info.get("project_id", "")
    discovered: list[dict] = []
    candidate_buckets = []
    # Preferred: the exact reports bucket from config (Play Console → Download
    # reports → Financial → "Copy Cloud Storage URI" → gs://pubsite_prod_NNNN/).
    # Set GP_REPORTS_BUCKET, or add "reports_bucket" to the SA-key secret.
    configured = (os.environ.get("GP_REPORTS_BUCKET")
                  or info.get("reports_bucket") or "").replace("gs://", "").strip().strip("/")
    if configured:
        candidate_buckets.append(configured)
    # Fallback guesses (rarely correct — the real bucket is account-number based).
    if project_id:
        candidate_buckets.append(f"pubsite_prod_{project_id}")

    months_seen: dict[str, list[str]] = {}
    for bucket in candidate_buckets:
        items = _list_gcs(bucket, "sales/", token)
        for it in items:
            name = it.get("name", "")
            # Reports look like sales_YYYYMM.zip
            if "sales_" in name and name.endswith(".zip"):
                ym = name.split("sales_")[-1].split(".")[0]
                if len(ym) >= 6:
                    ymdash = f"{ym[:4]}-{ym[4:6]}"
                    months_seen.setdefault(ymdash, []).append(name)
                    discovered.append({"bucket": bucket, "name": name})

    # Pre-revenue path: no reports exist. Write empty cache + zero payout
    # and trust this to fill in once the publisher has a payout cycle.
    for ym in months_seen:
        _cache.write(
            f"googleplay:monthly:{ym}",
            {
                "grossProceeds": 0.0,
                "googleFee": 0.0,
                "netProceeds": 0.0,
                "refunds": 0.0,
                "_status": "report_present_but_not_parsed",
                "_files": months_seen[ym],
            },
            SOURCE_KEY,
        )

    _cache.write(
        "googleplay:upcoming_payout",
        {"amount": 0.0, "expectedDate": None, "status": "pre_revenue"},
        SOURCE_KEY,
    )

    return {
        "service_account_email": info.get("client_email", ""),
        "project_id": project_id,
        "months_with_reports": sorted(months_seen.keys()),
        "discovered": len(discovered),
    }
