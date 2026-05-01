"""
Helpers for reading + writing TapTrivia-AnalyticsCache entries.

All values pass through _to_dynamo() so floats become Decimal — Dynamo
can't accept Python float. Reads come back through _from_dynamo() so the
caller sees plain Python types.
"""
import json
import time
from decimal import Decimal
from typing import Any, Optional

from shared import dynamo
from shared.dynamo import TABLE


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _to_dynamo(v: Any) -> Any:
    if isinstance(v, float):
        return Decimal(str(v))
    if isinstance(v, dict):
        return {k: _to_dynamo(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_to_dynamo(x) for x in v]
    return v


def _from_dynamo(v: Any) -> Any:
    if isinstance(v, Decimal):
        # Whole numbers come back as int, fractional as float.
        return int(v) if v == v.to_integral_value() else float(v)
    if isinstance(v, dict):
        return {k: _from_dynamo(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_from_dynamo(x) for x in v]
    return v


def write(cache_key: str, payload: Any, source: str) -> None:
    item = {
        "cache_key": cache_key,
        "payload": _to_dynamo(payload),
        "generated_at": now_iso(),
        "source": source,
    }
    dynamo._ddb().Table(TABLE.ANALYTICS_CACHE).put_item(Item=item)


def read(cache_key: str) -> Optional[dict]:
    res = dynamo._ddb().Table(TABLE.ANALYTICS_CACHE).get_item(Key={"cache_key": cache_key})
    item = res.get("Item")
    if not item:
        return None
    return {
        "cache_key": item["cache_key"],
        "payload": _from_dynamo(item.get("payload")),
        "generated_at": item.get("generated_at"),
        "source": item.get("source"),
    }


def read_payload(cache_key: str, default=None):
    item = read(cache_key)
    return item["payload"] if item else default


def get_last_synced(source: str) -> Optional[str]:
    """ISO timestamp of last successful sync for a given source, or None."""
    meta = read_payload("meta:last_synced", default={}) or {}
    return meta.get(source)


def set_last_synced(source: str) -> None:
    meta = read_payload("meta:last_synced", default={}) or {}
    meta[source] = now_iso()
    write("meta:last_synced", meta, "computed")


def record_error(source: str, err: BaseException, tb: str) -> None:
    write(
        f"meta:errors:{source}",
        {
            "at": now_iso(),
            "error": f"{type(err).__name__}: {err}",
            "traceback": tb[-4000:],  # cap, alarm + log have full detail
        },
        "computed",
    )


def clear_error(source: str) -> None:
    """Best-effort delete of meta:errors:{source} after a successful run."""
    try:
        dynamo._ddb().Table(TABLE.ANALYTICS_CACHE).delete_item(
            Key={"cache_key": f"meta:errors:{source}"}
        )
    except Exception:
        pass


def hours_since(iso_ts: Optional[str]) -> Optional[float]:
    if not iso_ts:
        return None
    try:
        # ISO without TZ designator other than 'Z'
        from datetime import datetime, timezone
        ts = iso_ts[:-1] + "+00:00" if iso_ts.endswith("Z") else iso_ts
        dt = datetime.fromisoformat(ts).astimezone(timezone.utc)
        return (datetime.now(timezone.utc) - dt).total_seconds() / 3600.0
    except Exception:
        return None
