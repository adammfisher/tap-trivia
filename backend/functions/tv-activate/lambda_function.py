"""
POST /tv/activate

Pairs a TV with a bar:
  - Validates the bar code (TapTrivia-Bars must exist with status=active)
  - Captures source IP from X-Forwarded-For (first hop) or
    requestContext.http.sourceIp
  - Resolves IP to geo via geoip_resolver layer
  - Upserts a record in TapTrivia-TvPairings keyed by tv_id (preserves
    paired_at_utc on re-pair)
  - On a new pair, increments TapTrivia-Bars.total_tvs; if this is the
    bar's first TV, also copies geo onto the bar record

Request body:
  { barCode: string, tvId?: string, tvPlatform?: string }

Response 200:
  { barCode, barName, city, state, tvId }
"""
import json
import logging
import os
import time
import uuid
from decimal import Decimal

from boto3.dynamodb.conditions import Key

from geoip_resolver import resolve_ip

from shared import dynamo
from shared.dynamo import TABLE


def _to_dynamo(v):
    """boto3's Document Client rejects floats; convert to Decimal recursively."""
    if isinstance(v, float):
        return Decimal(str(v))
    if isinstance(v, dict):
        return {k: _to_dynamo(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_to_dynamo(x) for x in v]
    return v

log = logging.getLogger()
log.setLevel(logging.INFO)

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}

GEO_FIELDS = ("city", "state", "zip", "lat", "lng", "timezone", "dma_code", "dma_name")


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


def _source_ip(event: dict) -> str:
    """
    Prefer the first IP in X-Forwarded-For (the original client at the edge).
    Fall back to requestContext.http.sourceIp (HTTP API) or
    requestContext.identity.sourceIp (REST API).
    """
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    xff = headers.get("x-forwarded-for")
    if xff:
        first = xff.split(",")[0].strip()
        if first:
            return first
    rc = event.get("requestContext") or {}
    http = rc.get("http") or {}
    if http.get("sourceIp"):
        return http["sourceIp"]
    identity = rc.get("identity") or {}
    if identity.get("sourceIp"):
        return identity["sourceIp"]
    return ""


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _upsert_pairing(
    *,
    tv_id: str,
    bar_code: str,
    ip: str,
    geo: dict,
    tv_platform: str,
    now: str,
) -> tuple[bool, dict]:
    """
    Upsert a TvPairings record. Returns (was_new, item).

    paired_at_utc and gsi1sk are set only on first pair (if_not_exists);
    everything else is overwritten every time.
    """
    table = dynamo._ddb().Table(TABLE.TV_PAIRINGS)

    # ALL_OLD lets us detect first-time creation (returns None then).
    res = table.update_item(
        Key={"tv_id": tv_id},
        UpdateExpression=(
            "SET bar_code = :bar_code, "
            "ip_address = :ip, "
            "geo = :geo, "
            "tv_platform = :platform, "
            "last_heartbeat_utc = :now, "
            "#st = :active, "
            "gsi1pk = :bar_code, "
            "paired_at_utc = if_not_exists(paired_at_utc, :now), "
            "gsi1sk = if_not_exists(gsi1sk, :now)"
        ),
        ExpressionAttributeNames={"#st": "status"},
        ExpressionAttributeValues={
            ":bar_code": bar_code,
            ":ip": ip,
            ":geo": geo,
            ":platform": tv_platform,
            ":now": now,
            ":active": "active",
        },
        ReturnValues="ALL_OLD",
    )
    was_new = res.get("Attributes") is None

    new_item = table.get_item(Key={"tv_id": tv_id}).get("Item") or {}
    return was_new, new_item


def _bar_first_tv_update(bar_code: str, geo: dict, now: str) -> None:
    """First TV at this bar — copy geo + set total_tvs=1."""
    expr_values = {
        ":one": 1,
        ":now": now,
    }
    set_clauses = ["total_tvs = :one", "first_session_at_utc = if_not_exists(first_session_at_utc, :now)"]
    for f in GEO_FIELDS:
        v = geo.get(f)
        if v is None:
            continue
        set_clauses.append(f"#{f} = :{f}")
        expr_values[f":{f}"] = v
    expr_names = {f"#{f}": f for f in GEO_FIELDS if geo.get(f) is not None}

    dynamo._ddb().Table(TABLE.BARS).update_item(
        Key={"PK": f"BAR#{bar_code}"},
        UpdateExpression="SET " + ", ".join(set_clauses),
        ExpressionAttributeNames=expr_names or None,
        ExpressionAttributeValues=expr_values,
    )


def _bar_increment_total_tvs(bar_code: str) -> None:
    dynamo._ddb().Table(TABLE.BARS).update_item(
        Key={"PK": f"BAR#{bar_code}"},
        UpdateExpression="ADD total_tvs :one",
        ExpressionAttributeValues={":one": 1},
    )


def handler(event, context):
    try:
        body = _parse_body(event)
        bar_code = (body.get("barCode") or "").strip().upper()
        tv_id_in = (body.get("tvId") or "").strip()
        tv_platform = (body.get("tvPlatform") or "unknown").strip().lower()

        if not bar_code:
            return _resp(400, {"error": "MISSING_FIELDS", "message": "barCode is required"})

        bar = dynamo.get_item(TABLE.BARS, {"PK": f"BAR#{bar_code}"})
        if not bar or bar.get("status") != "active":
            return _resp(404, {"error": "NOT_FOUND", "message": "Location code not found or inactive"})

        ip = _source_ip(event)
        raw_geo = resolve_ip(ip) if ip else {f: None for f in GEO_FIELDS}
        geo = _to_dynamo(raw_geo)

        tv_id = tv_id_in or str(uuid.uuid4())
        now = _now_iso()

        was_new, _pairing = _upsert_pairing(
            tv_id=tv_id,
            bar_code=bar_code,
            ip=ip,
            geo=geo,
            tv_platform=tv_platform,
            now=now,
        )

        if was_new:
            existing_count = dynamo.query_count(
                TABLE.TV_PAIRINGS, "GSI1", "gsi1pk", bar_code
            )
            # The newly-created pairing is included in this count, so
            # "first TV ever at this bar" means count == 1.
            if existing_count <= 1:
                _bar_first_tv_update(bar_code, geo, now)
            else:
                _bar_increment_total_tvs(bar_code)

        log.info(
            "paired tv_id=%s bar=%s ip=%s platform=%s new=%s",
            tv_id, bar_code, ip, tv_platform, was_new,
        )

        return _resp(200, {
            "barCode": bar.get("barCode"),
            "barName": bar.get("barName"),
            "city": bar.get("city", ""),
            "state": bar.get("state", ""),
            "tvId": tv_id,
        })
    except Exception as e:
        log.exception("tv-activate error")
        return _resp(500, {"error": "INTERNAL_ERROR", "message": str(e)})
