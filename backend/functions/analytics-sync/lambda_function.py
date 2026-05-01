"""
TapTrivia analytics-sync Lambda.

Pulls from four external sources (RevenueCat, App Store Connect, Google
Play, AWS Cost Explorer), then computes cross-source aggregates. Writes
everything to TapTrivia-AnalyticsCache. Designed to be:
  - idempotent (re-runs produce the same cache values)
  - failure-isolated (one source down doesn't block the others)
  - cheap (free or near-free except Cost Explorer at $0.01/call)

Trigger:
  EventBridge daily 06:05 UTC, payload {"trigger": "scheduled"}
  Manual: aws lambda invoke --payload '{"force": true}'

Per-source CloudWatch metric:
  Namespace=TapTrivia/AnalyticsSync, MetricName=SourceFailure,
  Dimensions=[{Source: revenuecat|appstore|googleplay|aws}]

A 1.0 datapoint = failure, 0.0 = success. Alarms fire on three
consecutive failures.
"""
import json
import logging
import os
import time
import traceback

import boto3

import cache as _cache
import computed
from sources import revenuecat as src_revenuecat
from sources import appstore as src_appstore
from sources import googleplay as src_googleplay
from sources import aws_costs as src_aws

log = logging.getLogger()
log.setLevel(logging.INFO)

SOURCES = (
    ("revenuecat", src_revenuecat.sync),
    ("appstore", src_appstore.sync),
    ("googleplay", src_googleplay.sync),
    ("aws", src_aws.sync),
)


def _emit_metric(source: str, success: bool) -> None:
    try:
        cw = boto3.client("cloudwatch", region_name=os.environ.get("AWS_REGION", "us-east-1"))
        cw.put_metric_data(
            Namespace="TapTrivia/AnalyticsSync",
            MetricData=[{
                "MetricName": "SourceFailure",
                "Dimensions": [{"Name": "Source", "Value": source}],
                "Value": 0.0 if success else 1.0,
                "Unit": "Count",
            }],
        )
    except Exception as e:
        log.warning("metric emit failed for %s: %s", source, e)


def handler(event, context):
    started = time.time()
    force = bool((event or {}).get("force"))
    trigger = (event or {}).get("trigger", "manual")
    log.info("analytics-sync start trigger=%s force=%s", trigger, force)

    results: dict = {}
    successes: list[str] = []
    failures: list[str] = []

    for name, fn in SOURCES:
        t0 = time.time()
        try:
            r = fn(force=force) or {}
            elapsed = round(time.time() - t0, 2)
            results[name] = {"ok": True, "elapsed_s": elapsed, **r}
            if not r.get("skipped"):
                _cache.set_last_synced(name)
                _cache.clear_error(name)
            successes.append(name)
            _emit_metric(name, True)
            log.info("source %s: ok in %.2fs", name, elapsed)
        except Exception as e:
            elapsed = round(time.time() - t0, 2)
            tb = traceback.format_exc()
            log.exception("source %s failed in %.2fs", name, elapsed)
            _cache.record_error(name, e, tb)
            results[name] = {"ok": False, "elapsed_s": elapsed, "error": str(e)}
            failures.append(name)
            _emit_metric(name, False)

    # Cross-source derived data — runs whether or not external syncs succeeded;
    # uses safe defaults when a cache entry is missing.
    try:
        results["computed"] = computed.run_all()
    except Exception as e:
        tb = traceback.format_exc()
        log.exception("computed failed")
        _cache.record_error("computed", e, tb)
        results["computed"] = {"ok": False, "error": str(e)}

    total = round(time.time() - started, 2)
    log.info("analytics-sync done in %.2fs ok=%s fail=%s", total, successes, failures)
    return {
        "ok": True,
        "elapsed_s": total,
        "successes": successes,
        "failures": failures,
        "results": results,
    }
