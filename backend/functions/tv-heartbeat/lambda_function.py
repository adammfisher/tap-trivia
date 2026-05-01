"""
POST /tv-heartbeat

Body: { tvId, currentSignageId? }

Updates TapTrivia-TvPairings.last_heartbeat_utc to now() and re-marks
status="active". Idempotent. Returns 200 with empty body.

Targets <50ms. No geo lookups, no bar joins, no logging on success path.
Unknown tv_id is also a 200 — TVs sometimes call before they have an id;
we don't want them to retry-storm a write we can't service.
"""
import json
import logging
import time

from shared import dynamo
from shared.dynamo import TABLE

log = logging.getLogger()
log.setLevel(logging.WARNING)  # only warnings/errors

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}


def _resp(status: int, body: str = "") -> dict:
    return {"statusCode": status, "headers": CORS_HEADERS, "body": body}


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


def handler(event, context):
    try:
        body = _parse_body(event)
        tv_id = (body.get("tvId") or "").strip()
        if not tv_id:
            return _resp(400, json.dumps({"error": "MISSING_FIELDS"}))

        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # ConditionExpression keeps us from creating a phantom pairing
        # for an unknown tv_id. ConditionalCheckFailedException is a
        # benign "no such TV" — return 200, swallow.
        try:
            dynamo._ddb().Table(TABLE.TV_PAIRINGS).update_item(
                Key={"tv_id": tv_id},
                UpdateExpression="SET last_heartbeat_utc = :now, #st = :active",
                ConditionExpression="attribute_exists(tv_id)",
                ExpressionAttributeNames={"#st": "status"},
                ExpressionAttributeValues={":now": now, ":active": "active"},
            )
        except dynamo._ddb().meta.client.exceptions.ConditionalCheckFailedException:
            pass

        return _resp(200)
    except Exception:
        log.exception("tv-heartbeat error")
        return _resp(500, json.dumps({"error": "INTERNAL_ERROR"}))
