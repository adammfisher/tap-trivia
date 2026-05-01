"""
POST /signage-impression

Records one signage card display event in TapTrivia-SignageImpressions.
Fast path: validate → PutItem → 200. No reads, no joins. <100ms p95.

Body (all required unless noted):
  bar_code           string
  tv_id              string
  signage_id         string
  content_type       string    (canonical enum below — not enforced)
  displayed_at_utc   string    ISO 8601
  duration_ms        number
  context            enum {game_lobby, between_rounds, results, off_hours_idle}
  concurrent_players number    (must be 0 when context=off_hours_idle)
  game_id            string|null  (must be null only when context=off_hours_idle)
  position_in_rotation number
  tv_platform        string

Canonical content_type values (documentation, not enforced — TVs may
send new types as the signage system evolves):
  house_ad, bar_promo, system, leaderboard, scoreboard

Item written:
  PK  bar_code
  SK  impression_id (ULID — sortable by time)
  + all body fields, plus:
  gsi1pk = "GLOBAL", gsi1sk = displayed_at_utc
  gsi2pk = tv_id,    gsi2sk = displayed_at_utc
  ttl    = now + 90 days (Unix; raw events purged, aggregates retained
                          forever in TapTrivia-AnalyticsCache)
"""
import json
import logging
import os
import secrets
import time
from decimal import Decimal

from shared import dynamo
from shared.dynamo import TABLE

log = logging.getLogger()
log.setLevel(logging.WARNING)  # only warnings/errors

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}

VALID_CONTEXTS = frozenset({"game_lobby", "between_rounds", "results", "off_hours_idle"})

# Documentation only; not enforced server-side.
CANONICAL_CONTENT_TYPES = ("house_ad", "bar_promo", "system", "leaderboard", "scoreboard")

TTL_SECONDS = 90 * 24 * 3600

# Crockford base32 (excludes I, L, O, U).
_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _ulid(now_ms: int | None = None) -> str:
    """26-char ULID. 48-bit ms timestamp + 80-bit randomness, monotonic across one call."""
    ts = now_ms if now_ms is not None else int(time.time() * 1000)
    rand = int.from_bytes(secrets.token_bytes(10), "big")
    n = (ts << 80) | rand
    out = []
    for _ in range(26):
        out.append(_CROCKFORD[n & 0b11111])
        n >>= 5
    return "".join(reversed(out))


def _resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(body)}


def _parse_body(event: dict) -> dict:
    raw = event.get("body")
    if not raw:
        return {}
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    if event.get("isBase64Encoded"):
        import base64
        raw = base64.b64decode(raw).decode("utf-8")
    try:
        return json.loads(raw) or {}
    except json.JSONDecodeError:
        return {}


def _to_dynamo(v):
    """boto3 rejects float; convert recursively."""
    if isinstance(v, float):
        return Decimal(str(v))
    if isinstance(v, dict):
        return {k: _to_dynamo(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_to_dynamo(x) for x in v]
    return v


def _validate(body: dict) -> tuple[int, str] | None:
    """Return (status, message) on failure, None on pass."""
    bar_code = body.get("bar_code")
    tv_id = body.get("tv_id")
    if not bar_code or not isinstance(bar_code, str):
        return 400, "bar_code is required"
    if not tv_id or not isinstance(tv_id, str):
        return 400, "tv_id is required"

    context = body.get("context")
    if context not in VALID_CONTEXTS:
        return 400, f"context must be one of {sorted(VALID_CONTEXTS)}"

    concurrent = body.get("concurrent_players")
    if not isinstance(concurrent, (int, float)):
        return 400, "concurrent_players must be a number"

    game_id = body.get("game_id", None)
    is_off_hours = context == "off_hours_idle"

    if is_off_hours and concurrent > 0:
        return 400, "context=off_hours_idle requires concurrent_players=0"
    if not is_off_hours and game_id is None:
        return 400, "game_id is required unless context=off_hours_idle"

    return None


def handler(event, context):
    try:
        body = _parse_body(event)
        err = _validate(body)
        if err is not None:
            status, msg = err
            return _resp(status, {"error": "VALIDATION", "message": msg})

        now_ms = int(time.time() * 1000)
        impression_id = _ulid(now_ms)
        displayed_at_utc = body["displayed_at_utc"]
        bar_code = body["bar_code"]
        tv_id = body["tv_id"]

        item = {
            "bar_code": bar_code,
            "impression_id": impression_id,
            "tv_id": tv_id,
            "signage_id": body.get("signage_id", ""),
            "content_type": body.get("content_type", ""),
            "displayed_at_utc": displayed_at_utc,
            "duration_ms": body.get("duration_ms", 0),
            "context": body["context"],
            "concurrent_players": body.get("concurrent_players", 0),
            "game_id": body.get("game_id"),
            "position_in_rotation": body.get("position_in_rotation", 0),
            "tv_platform": body.get("tv_platform", "unknown"),
            "gsi1pk": "GLOBAL",
            "gsi1sk": displayed_at_utc,
            "gsi2pk": tv_id,
            "gsi2sk": displayed_at_utc,
            "ttl": int(time.time()) + TTL_SECONDS,
        }

        dynamo._ddb().Table(TABLE.SIGNAGE_IMPRESSIONS).put_item(Item=_to_dynamo(item))

        return _resp(200, {"impression_id": impression_id})
    except Exception:
        log.exception("signage-impression error")
        return _resp(500, {"error": "INTERNAL_ERROR"})
