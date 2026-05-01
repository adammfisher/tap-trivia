"""Cache reader — converts Decimal → int/float, never writes."""
from decimal import Decimal
from typing import Any, Optional

from shared import dynamo
from shared.dynamo import TABLE


def _from_dynamo(v: Any) -> Any:
    if isinstance(v, Decimal):
        return int(v) if v == v.to_integral_value() else float(v)
    if isinstance(v, dict):
        return {k: _from_dynamo(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_from_dynamo(x) for x in v]
    return v


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


def read_many(cache_keys: list[str]) -> dict[str, Any]:
    """
    Single-round-trip BatchGetItem. Returns {cache_key: payload | None}.
    Missing keys map to None. Uses chunks of 100 (DynamoDB max).
    """
    out: dict[str, Any] = {k: None for k in cache_keys}
    if not cache_keys:
        return out

    client = dynamo._ddb().meta.client
    table_name = TABLE.ANALYTICS_CACHE
    keys = list(dict.fromkeys(cache_keys))  # de-dupe, preserve order

    for i in range(0, len(keys), 100):
        chunk = keys[i:i + 100]
        request = {table_name: {"Keys": [{"cache_key": k} for k in chunk]}}
        # Loop on UnprocessedKeys (DynamoDB may throttle).
        while request:
            res = client.batch_get_item(RequestItems=request)
            for item in res.get("Responses", {}).get(table_name, []):
                out[item["cache_key"]] = _from_dynamo(item.get("payload"))
            unprocessed = res.get("UnprocessedKeys") or {}
            request = unprocessed if unprocessed else None
    return out
