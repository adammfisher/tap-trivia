"""
Cross-source derived data — runs after all four external syncs.

Defensive: any source's cache may be missing or stale; use safe defaults
(zeros, nulls) rather than raising.

Outputs:
  computed:overview               (matches OverviewTab schema, Section 5.3)
  computed:bar_attribution        (Map<bar_code, attributed_mrr>)
  computed:question_round_progress
"""
import logging
from boto3.dynamodb.conditions import Attr

import cache as _cache
from shared import dynamo
from shared.dynamo import TABLE

log = logging.getLogger("analytics-sync.computed")

# First-bar attribution — pre-revenue this is $0 since no paid subs exist.
# Once subs exist, intersect attributed_bar_code (Players) with paid customer ids
# from RevenueCat. Documented here so future-me remembers the rule.
PER_SUB_MRR = 2.99


def _scan_count(table_name: str, filter_expr=None) -> int:
    table = dynamo._ddb().Table(table_name)
    kwargs = {"Select": "COUNT"}
    if filter_expr is not None:
        kwargs["FilterExpression"] = filter_expr
    total = 0
    last_key = None
    while True:
        if last_key:
            kwargs["ExclusiveStartKey"] = last_key
        res = table.scan(**kwargs)
        total += res.get("Count", 0)
        last_key = res.get("LastEvaluatedKey")
        if not last_key:
            break
    return total


def _scan_all(table_name: str, projection: str | None = None, expr_names: dict | None = None):
    table = dynamo._ddb().Table(table_name)
    kwargs = {}
    if projection:
        kwargs["ProjectionExpression"] = projection
    if expr_names:
        kwargs["ExpressionAttributeNames"] = expr_names
    last_key = None
    while True:
        if last_key:
            kwargs["ExclusiveStartKey"] = last_key
        res = table.scan(**kwargs)
        for item in res.get("Items", []):
            yield item
        last_key = res.get("LastEvaluatedKey")
        if not last_key:
            break


def _bar_status_split() -> dict:
    active = 0
    pending = 0
    bars: list[dict] = []
    for b in _scan_all(
        TABLE.BARS,
        projection="barCode, barName, #s, total_tvs, last_session_at_utc, city, #st",
        expr_names={"#s": "status", "#st": "state"},
    ):
        status = (b.get("status") or "").lower()
        if status == "active":
            active += 1
        else:
            pending += 1
        bars.append(b)
    return {"active": active, "pending": pending, "bars": bars}


def _player_count() -> int:
    return _scan_count(TABLE.PLAYERS)


def compute_bar_attribution() -> dict[str, float]:
    """
    Walk Players for attributed_bar_code. Pre-revenue, no subs are paid,
    so the attributed MRR per bar is 0. Once subs exist, this should be
    cross-referenced with RevenueCat's paid customer ids.
    """
    by_bar: dict[str, int] = {}
    for p in _scan_all(
        TABLE.PLAYERS,
        projection="attributed_bar_code",
        expr_names=None,
    ):
        bar = p.get("attributed_bar_code")
        if bar:
            by_bar[bar] = by_bar.get(bar, 0) + 1
    # Returning {bar_code: 0} for now (player count, not subs); the analytics-api
    # will compute actual $ once subscription tracking is wired.
    return {b: 0.0 for b in by_bar}


def compute_question_progress() -> dict:
    total = _scan_count("TapTrivia-Questions")
    used = 0
    current_round = 1
    for q in _scan_all(
        TABLE.QUESTION_USAGE_BY_QUESTION,
        projection="times_used, current_round",
    ):
        if int(q.get("times_used") or 0) > 0:
            used += 1
        cr = int(q.get("current_round") or 1)
        if cr > current_round:
            current_round = cr
    return {
        "total": total,
        "used": used,
        "currentRound": current_round,
        "gamesUntilNextRound": max(0, total - used),
    }


def compute_overview(question_progress: dict, bar_split: dict) -> dict:
    rc = _cache.read_payload("revenuecat:overview", default={}) or {}
    rc_platform = _cache.read_payload("revenuecat:by_platform", default={}) or {}
    aws_now = _cache.read_payload("aws:costs:current_month", default={}) or {}

    paid = int(rc.get("totalActive") or 0)
    trial = int(rc.get("totalTrial") or 0)
    mrr_gross = float(rc.get("mrrGross") or 0)
    total_users = _player_count()
    free = max(0, total_users - paid - trial)

    return {
        "totalUsers": total_users,
        "paidSubs": paid,
        "trialUsers": trial,
        "free": free,
        # Pre-revenue defaults — analytics-sync can later derive these from
        # day-over-day diffs once daily charts are populated.
        "newSubsToday": 0,
        "newSubsTrend": 0.0,
        "churnRate": float(rc.get("churn30d") or 0),
        "trialConversion": float(rc.get("conversionRate") or 0),
        "activeBars": bar_split["active"],
        "pendingBars": bar_split["pending"],
        "mrrGross": round(mrr_gross, 2),
        "netMrr": round(mrr_gross * 0.85, 2),
        "awsThisMonth": round(float(aws_now.get("total") or 0), 4),
        "questionsTotal": question_progress["total"],
        "questionsUsed": question_progress["used"],
        "currentRound": question_progress["currentRound"],
        "nextRoundStartsAt": question_progress["gamesUntilNextRound"],
        "subscriberDailyTrend": [],          # populated when RC daily chart fills in
        "topBars": [],                       # populated by analytics-api at request time
        "awsCosts": aws_now.get("byService") or [],
        "byPlatform": rc_platform,
    }


def run_all() -> dict:
    bar_split = _bar_status_split()
    qprog = compute_question_progress()
    overview = compute_overview(qprog, bar_split)
    attribution = compute_bar_attribution()

    _cache.write("computed:overview", overview, "computed")
    _cache.write("computed:question_round_progress", qprog, "computed")
    _cache.write("computed:bar_attribution", attribution, "computed")
    return {
        "overview": {
            "totalUsers": overview["totalUsers"],
            "activeBars": overview["activeBars"],
            "questionsTotal": overview["questionsTotal"],
            "awsThisMonth": overview["awsThisMonth"],
        },
        "attribution_bars": len(attribution),
    }
