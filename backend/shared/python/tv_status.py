"""
TV-domain helpers used across Python Lambdas (analytics-sync, analytics-api).
"""
import time
from datetime import datetime, timezone
from typing import Optional

from . import dynamo

ACTIVE_WINDOW_SECONDS = 24 * 3600  # 24 hours


def _parse_iso8601(s: str) -> Optional[float]:
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s).astimezone(timezone.utc).timestamp()
    except (ValueError, AttributeError):
        return None


def is_tv_active(tv_id: str, now_epoch: Optional[float] = None) -> bool:
    """
    True iff TapTrivia-TvPairings has a record for tv_id whose
    last_heartbeat_utc is within the last 24h.

    Returns False for unknown tv_id, missing heartbeat, or unparseable
    timestamp — never raises on missing data.
    """
    if not tv_id:
        return False
    item = dynamo.get_item(dynamo.TABLE.TV_PAIRINGS, {"tv_id": tv_id})
    if not item:
        return False
    last = _parse_iso8601(item.get("last_heartbeat_utc", ""))
    if last is None:
        return False
    cutoff = (now_epoch if now_epoch is not None else time.time()) - ACTIVE_WINDOW_SECONDS
    return last >= cutoff
