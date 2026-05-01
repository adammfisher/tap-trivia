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


def _store_reconciled_net(mrr_gross: float) -> tuple[float, bool]:
    """
    Sum the most-recent month from appstore:monthly:* and googleplay:monthly:*
    (their `netProceeds` fields) and use that to override the RevenueCat-based
    estimate. Returns (net_mrr, reconciled?). Falls back to the 0.85 estimate
    when neither store has non-zero monthly data yet.
    """
    import datetime as _dt
    today = _dt.datetime.now(_dt.timezone.utc).date()
    apple_net = 0.0
    google_net = 0.0
    # Walk back up to 3 months — Apple finalizes ~3 days into the next month.
    cur = today.replace(day=1)
    for _ in range(3):
        ym = cur.strftime("%Y-%m")
        ap = _cache.read_payload(f"appstore:monthly:{ym}", default=None)
        gp = _cache.read_payload(f"googleplay:monthly:{ym}", default=None)
        if ap and float(ap.get("netProceeds") or 0) > 0:
            apple_net = max(apple_net, float(ap["netProceeds"]))
        if gp and float(gp.get("netProceeds") or 0) > 0:
            google_net = max(google_net, float(gp["netProceeds"]))
        # Step back one month
        cur = (cur - _dt.timedelta(days=1)).replace(day=1)

    store_total = apple_net + google_net
    if store_total > 0:
        return round(store_total, 2), True
    return round(mrr_gross * 0.85, 2), False


def compute_overview(question_progress: dict, bar_split: dict) -> dict:
    # Per Cleanup task 3: RevenueCat is the primary source of truth for
    # MRR. Apple/Google direct data is supplemental — used to refine
    # `netMrr` only when their per-month cache rows have non-zero
    # netProceeds. Otherwise we apply the 0.85 estimate to RC's gross.
    rc = _cache.read_payload("revenuecat:overview", default={}) or {}
    rc_platform = _cache.read_payload("revenuecat:by_platform", default={}) or {}
    aws_now = _cache.read_payload("aws:costs:current_month", default={}) or {}

    paid = int(rc.get("totalActive") or 0)
    trial = int(rc.get("totalTrial") or 0)
    mrr_gross = float(rc.get("mrrGross") or 0)
    total_users = _player_count()
    free = max(0, total_users - paid - trial)

    net_mrr, reconciled = _store_reconciled_net(mrr_gross)

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
        "netMrr": net_mrr,
        "revenue_source": "store_reconciled" if reconciled else "revenuecat_estimated",
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


def compute_signage_overview() -> dict:
    """
    Aggregate TapTrivia-SignageImpressions into the shape /analytics/signage
    needs. Pre-revenue with 0 impressions this is mostly zeros; the heatmap
    bucketing logic still runs so the schema is consistent.
    """
    from collections import defaultdict
    contexts = ("between_rounds", "game_lobby", "results", "off_hours_idle")
    by_context = {c: {"impressions": 0, "audienceSeconds": 0} for c in contexts}

    total_impressions = 0
    total_audience_seconds = 0
    total_concurrent = 0
    peak_concurrent = 0
    impressions_with_concurrent = 0
    distinct_tvs: set[str] = set()

    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    hours = [17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4]
    heatmap = [[0 for _ in hours] for _ in days]

    # Walk all impressions. Pre-revenue this is a small/empty scan.
    for it in _scan_all(
        TABLE.SIGNAGE_IMPRESSIONS,
        projection="bar_code, tv_id, #ctx, duration_ms, concurrent_players",
        expr_names={"#ctx": "context"},
    ):
        ctx = it.get("context")
        dur = float(it.get("duration_ms") or 0)
        players = float(it.get("concurrent_players") or 0)
        total_impressions += 1
        seconds = (dur / 1000.0) * max(players, 1)
        total_audience_seconds += seconds
        if players > 0:
            impressions_with_concurrent += 1
            total_concurrent += players
            if players > peak_concurrent:
                peak_concurrent = int(players)
        if it.get("tv_id"):
            distinct_tvs.add(it["tv_id"])
        if ctx in by_context:
            by_context[ctx]["impressions"] += 1
            by_context[ctx]["audienceSeconds"] += seconds

    avg_concurrent = (
        round(total_concurrent / impressions_with_concurrent, 2)
        if impressions_with_concurrent else 0
    )

    # TVs with a recent heartbeat (active TVs) — live count from TvPairings.
    active_tvs = 0
    total_tvs = 0
    for tv in _scan_all(TABLE.TV_PAIRINGS, projection="tv_id, last_heartbeat_utc"):
        total_tvs += 1
        # is_tv_active applies the 24h rule
        from datetime import datetime, timezone
        try:
            ts = (tv.get("last_heartbeat_utc") or "")
            if ts.endswith("Z"):
                ts = ts[:-1] + "+00:00"
            last = datetime.fromisoformat(ts).astimezone(timezone.utc).timestamp()
            from time import time as _now
            if _now() - last < 24 * 3600:
                active_tvs += 1
        except (ValueError, AttributeError):
            pass

    return {
        "totals": {
            "impressions":      total_impressions,
            "audienceSeconds":  int(total_audience_seconds),
            "activeTvs":        active_tvs,
            "totalTvs":         total_tvs,
            "avgConcurrent":    avg_concurrent,
            "peakConcurrent":   peak_concurrent,
        },
        "byContext": [
            {"context": c, "impressions": v["impressions"], "audienceSeconds": int(v["audienceSeconds"])}
            for c, v in by_context.items()
        ],
        "heatmap": {"hours": hours, "days": days, "values": heatmap},
        "byDayPart": [],
        "byAudienceBucket": [],
        "byDMA": [],
        "dataQuality": [],
    }


def compute_questions_overview() -> dict:
    """
    bySupercategory + byDifficulty rollups of TapTrivia-Questions.
    Cheap-ish: 100K rows, only one Scan per analytics-sync run (daily).
    """
    from collections import Counter
    by_super: Counter = Counter()
    by_diff: Counter = Counter()
    total = 0

    for q in _scan_all(
        "TapTrivia-Questions",
        projection="supercategory, difficulty",
    ):
        total += 1
        s = q.get("supercategory") or "Unknown"
        d = int(q.get("difficulty") or 0)
        by_super[s] += 1
        by_diff[d] += 1

    return {
        "total": total,
        "bySupercategory": [
            {"name": k, "count": v} for k, v in by_super.most_common()
        ],
        "byDifficulty": [
            {"level": k, "count": v} for k, v in sorted(by_diff.items())
        ],
        # Pipeline stats live in CloudWatch; analytics-api will fall back
        # to zeros until a CloudWatch reader is wired up.
        "pipeline": {
            "generatedThisWeek": 0,
            "faissDedupRejects": 0,
            "avgDifficulty": 0.0,
            "topicGaps": 0,
        },
    }


def run_all() -> dict:
    bar_split = _bar_status_split()
    qprog = compute_question_progress()
    overview = compute_overview(qprog, bar_split)
    attribution = compute_bar_attribution()
    signage = compute_signage_overview()
    questions = compute_questions_overview()

    _cache.write("computed:overview", overview, "computed")
    _cache.write("computed:question_round_progress", qprog, "computed")
    _cache.write("computed:bar_attribution", attribution, "computed")
    _cache.write("computed:signage:overview", signage, "computed")
    _cache.write("computed:questions:overview", questions, "computed")
    return {
        "overview": {
            "totalUsers": overview["totalUsers"],
            "activeBars": overview["activeBars"],
            "questionsTotal": overview["questionsTotal"],
            "awsThisMonth": overview["awsThisMonth"],
        },
        "attribution_bars": len(attribution),
        "signage_total_impressions": signage["totals"]["impressions"],
    }
