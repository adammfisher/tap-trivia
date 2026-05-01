"""
Build the {data, generated_at, sources} response wrapper per Section 5.2.

A source is "fresh" if its meta:last_synced timestamp is within
FRESH_HOURS hours of now. Adjusted to 30h to accommodate the
daily 06:05 UTC sync (24h cadence + ~6h slack).
"""
import json
import time
from datetime import datetime, timezone
from typing import Optional

import cache as _cache

FRESH_HOURS = 30


def _hours_since(iso_ts: Optional[str]) -> Optional[float]:
    if not iso_ts:
        return None
    try:
        s = iso_ts[:-1] + "+00:00" if iso_ts.endswith("Z") else iso_ts
        dt = datetime.fromisoformat(s).astimezone(timezone.utc)
        return (datetime.now(timezone.utc) - dt).total_seconds() / 3600.0
    except (ValueError, AttributeError):
        return None


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _sources_block() -> dict:
    meta = _cache.read_payload("meta:last_synced", default={}) or {}
    out = {}
    for src in ("revenuecat", "appstore", "googleplay", "aws"):
        last = meta.get(src)
        h = _hours_since(last)
        fresh = h is not None and h < FRESH_HOURS
        entry: dict = {"last_synced": last, "fresh": fresh}
        if not fresh:
            if h is None:
                entry["reason"] = "never synced"
            else:
                entry["reason"] = f"stale > {FRESH_HOURS}h ({h:.1f}h)"
        out[src] = entry
    return out


def ok(data: dict, status: int = 200) -> dict:
    body = {
        "data": data,
        "generated_at": _now_iso(),
        "sources": _sources_block(),
    }
    return _http(status, body)


def error(status: int, code: str, message: str) -> dict:
    return _http(status, {"error": code, "message": message})


def _http(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }


# 503 sentinel for "cache key not yet populated"
def data_not_ready(missing_key: str) -> dict:
    return error(
        503,
        "data_not_ready",
        f"Sync has not yet run for this metric (missing cache key: {missing_key})",
    )
