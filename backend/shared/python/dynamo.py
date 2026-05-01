"""
Minimal DynamoDB helper used by Python Lambdas.

Mirrors the Node.js helper at backend/shared/dynamo.js so the two stay
conceptually aligned. Tables come from env vars when set (preferred —
keeps prod/dev Terraform variants honest) and fall back to the prod
TapTrivia-* names for ad-hoc invocation.
"""
import os
import time
from typing import Any, Optional

import boto3
from boto3.dynamodb.conditions import Key

_resource = None


def _ddb():
    global _resource
    if _resource is None:
        _resource = boto3.resource(
            "dynamodb",
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
        )
    return _resource


class TABLE:
    BARS = os.environ.get("TABLE_BARS", "TapTrivia-Bars")
    PLAYERS = os.environ.get("TABLE_PLAYERS", "TapTrivia-Players")
    TV_PAIRINGS = os.environ.get("TABLE_TV_PAIRINGS", "TapTrivia-TvPairings")
    SIGNAGE_IMPRESSIONS = os.environ.get(
        "TABLE_SIGNAGE_IMPRESSIONS", "TapTrivia-SignageImpressions"
    )
    ANALYTICS_CACHE = os.environ.get(
        "TABLE_ANALYTICS_CACHE", "TapTrivia-AnalyticsCache"
    )
    QUESTION_USAGE_BY_QUESTION = os.environ.get(
        "TABLE_QUESTION_USAGE_BY_QUESTION", "TapTrivia-QuestionUsageByQuestion"
    )


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def get_item(table_name: str, key: dict) -> Optional[dict]:
    res = _ddb().Table(table_name).get_item(Key=key)
    return res.get("Item")


def put_item(table_name: str, item: dict, condition: Optional[str] = None) -> None:
    kwargs: dict[str, Any] = {"Item": item}
    if condition:
        kwargs["ConditionExpression"] = condition
    _ddb().Table(table_name).put_item(**kwargs)


def update_item(table_name: str, key: dict, **kwargs) -> dict:
    res = _ddb().Table(table_name).update_item(Key=key, **kwargs)
    return res.get("Attributes", {})


def query_count(table_name: str, index_name: str, pk_attr: str, pk_value: str) -> int:
    """Cheap count via Select=COUNT — no items returned."""
    table = _ddb().Table(table_name)
    total = 0
    last_key = None
    while True:
        params: dict[str, Any] = {
            "IndexName": index_name,
            "KeyConditionExpression": Key(pk_attr).eq(pk_value),
            "Select": "COUNT",
        }
        if last_key:
            params["ExclusiveStartKey"] = last_key
        res = table.query(**params)
        total += res.get("Count", 0)
        last_key = res.get("LastEvaluatedKey")
        if not last_key:
            break
    return total
