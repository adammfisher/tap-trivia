"""
Endpoint handlers for analytics-api.

Each handler returns a Lambda Proxy v2 response dict (statusCode/body).
Aggregating endpoints are cache-only (return 503 if cache missing).
Live DynamoDB queries are restricted to /bars and /bars/{barCode}.
"""
import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr, Key

import cache as _cache
import ranges as _ranges
import response as _resp

from shared import dynamo
from shared.dynamo import TABLE

log = logging.getLogger("analytics-api")

ANALYTICS_SYNC_FN = os.environ.get(
    "ANALYTICS_SYNC_FUNCTION", "TapTrivia-analytics-sync"
)


def _ddec(v: Any) -> Any:
    if isinstance(v, Decimal):
        return int(v) if v == v.to_integral_value() else float(v)
    if isinstance(v, dict):
        return {k: _ddec(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_ddec(x) for x in v]
    return v


def _bar_status(last_session_at_utc: str | None) -> str:
    if not last_session_at_utc:
        return "dormant"
    try:
        s = last_session_at_utc[:-1] + "+00:00" if last_session_at_utc.endswith("Z") else last_session_at_utc
        last = datetime.fromisoformat(s).astimezone(timezone.utc)
        days = (datetime.now(timezone.utc) - last).days
        if days < 7: return "active"
        if days < 21: return "slow"
        return "dormant"
    except (ValueError, AttributeError):
        return "dormant"


def _scan_all(table_name: str, **kwargs):
    table = dynamo._ddb().Table(table_name)
    last = None
    while True:
        if last: kwargs["ExclusiveStartKey"] = last
        r = table.scan(**kwargs)
        for it in r.get("Items", []):
            yield it
        last = r.get("LastEvaluatedKey")
        if not last: break


# ─── /analytics/overview ─────────────────────────────────────────────

def handle_overview(event):
    overview = _cache.read_payload("computed:overview")
    if overview is None:
        return _resp.data_not_ready("computed:overview")

    # Top bars (live, small, fast — currently 1 bar in fleet).
    top_bars = list(_bars_with_status())[:6]
    overview["topBars"] = top_bars
    return _resp.ok(overview)


# ─── /analytics/subscribers ─────────────────────────────────────────

def handle_subscribers(event):
    rc = _cache.read_payload("revenuecat:overview")
    if rc is None:
        return _resp.data_not_ready("revenuecat:overview")
    by_platform = _cache.read_payload("revenuecat:by_platform", default={}) or {}
    events = _cache.read_payload("revenuecat:recent_events", default=[]) or []

    # Funnel: total players → played 1+ games → started trial → paid.
    # Pre-revenue these are mostly zeros.
    total_users = 0
    played_one_plus = 0
    for p in _scan_all(
        TABLE.PLAYERS,
        ProjectionExpression="games_played",
    ):
        total_users += 1
        if int(p.get("games_played") or 0) >= 1:
            played_one_plus += 1

    trial = int(rc.get("totalTrial") or 0)
    paid = int(rc.get("totalActive") or 0)

    return _resp.ok({
        "active": paid,
        "trial": trial,
        "free": max(0, total_users - paid - trial),
        "trialConversion": float(rc.get("conversionRate") or 0),
        "platformSplit": {
            "ios":     by_platform.get("ios",     {"subs": 0, "mrr": 0}),
            "android": by_platform.get("android", {"subs": 0, "mrr": 0}),
        },
        "funnel": [
            {"stage": "Total Users",      "value": total_users,
             "pct": 1.0 if total_users else 0},
            {"stage": "Played 1+ Games",  "value": played_one_plus,
             "pct": (played_one_plus / total_users) if total_users else 0},
            {"stage": "Started Trial",    "value": trial,
             "pct": (trial / total_users) if total_users else 0},
            {"stage": "Active Paid",      "value": paid,
             "pct": (paid / total_users) if total_users else 0},
        ],
        "recentEvents": events[:50],
    })


# ─── /analytics/bars ────────────────────────────────────────────────

def _bars_with_status() -> list[dict]:
    attribution = _cache.read_payload("computed:bar_attribution", default={}) or {}
    out: list[dict] = []
    for b in _scan_all(TABLE.BARS, ProjectionExpression="barCode, barName, city, #st, #zp, dma_code, dma_name, total_tvs, last_session_at_utc",
                       ExpressionAttributeNames={"#st": "state", "#zp": "zip"}):
        code = b.get("barCode")
        if not code: continue
        bar = {
            "code":       code,
            "name":       b.get("barName") or "",
            "city":       b.get("city") or "",
            "state":      b.get("state") or "",
            "zip":        b.get("zip") or "",
            "dma":        b.get("dma_name") or "",
            "tvs":        int(b.get("total_tvs") or 0),
            "players":    0,    # populated below from live count
            "gamesMonth": 0,
            "attrMrr":    float(attribution.get(code, 0)),
            "lastGame":   b.get("last_session_at_utc"),
            "status":     _bar_status(b.get("last_session_at_utc")),
        }
        out.append(bar)
    return out


def handle_bars(event):
    bars = _bars_with_status()
    active = sum(1 for b in bars if b["status"] == "active")
    pending = len(bars) - active
    total_attr_mrr = sum(b["attrMrr"] for b in bars)

    # players-per-bar from a single Players scan (pre-revenue: 0 rows).
    bar_players: dict[str, int] = {}
    for p in _scan_all(TABLE.PLAYERS, ProjectionExpression="currentBarCode"):
        c = p.get("currentBarCode")
        if c:
            bar_players[c] = bar_players.get(c, 0) + 1
    for b in bars:
        b["players"] = bar_players.get(b["code"], 0)

    total_players = sum(b["players"] for b in bars)

    return _resp.ok({
        "totals": {
            "active": active,
            "pending": pending,
            "totalPlayers": total_players,
            "totalGamesMonth": 0,
            "totalAttrMrr": round(total_attr_mrr, 2),
        },
        "bars": bars,
    })


# ─── /analytics/bars/{barCode} ──────────────────────────────────────

def handle_bar_drill(event, bar_code: str):
    code = (bar_code or "").upper()
    bar = dynamo.get_item(TABLE.BARS, {"PK": f"BAR#{code}"})
    if not bar:
        return _resp.error(404, "not_found", f"Bar {code} not found")
    bar = _ddec(bar)

    # TVs paired to this bar
    table = dynamo._ddb().Table(TABLE.TV_PAIRINGS)
    tvs_res = table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("gsi1pk").eq(code),
    )
    tvs = []
    for tv in tvs_res.get("Items", []):
        tv = _ddec(tv)
        last = tv.get("last_heartbeat_utc")
        try:
            s = last[:-1] + "+00:00" if isinstance(last, str) and last.endswith("Z") else last
            ts = datetime.fromisoformat(s).astimezone(timezone.utc).timestamp() if s else 0
            active = (time.time() - ts) < 24 * 3600 if ts else False
        except (ValueError, AttributeError, TypeError):
            active = False
        tvs.append({
            "tv_id":         tv["tv_id"],
            "platform":      tv.get("tv_platform", "unknown"),
            "paired_at":     tv.get("paired_at_utc"),
            "last_heartbeat": last,
            "status":        "active" if active else "dark",
        })

    # Players whose currentBarCode == this bar.
    players: list[dict] = []
    for p in _scan_all(
        TABLE.PLAYERS,
        FilterExpression=Attr("currentBarCode").eq(code),
        ProjectionExpression="PK, #n, currentBarCode, games_played, last_played_at, subscription_status",
        ExpressionAttributeNames={"#n": "name"},
    ):
        p = _ddec(p)
        players.append({
            "name":        p.get("name") or "",
            "subscription": p.get("subscription_status") or "free",
            "joined":      p.get("created_at"),
            "games":       int(p.get("games_played") or 0),
            "lastGame":    p.get("last_played_at"),
        })

    paid = sum(1 for x in players if x["subscription"] == "paid")
    trial = sum(1 for x in players if x["subscription"] == "trial")
    free = max(0, len(players) - paid - trial)
    avg = (sum(x["games"] for x in players) / len(players)) if players else 0

    return _resp.ok({
        "bar": {
            "code": bar.get("barCode"),
            "name": bar.get("barName"),
            "status": bar.get("status"),
        },
        "geo": {
            "city":     bar.get("city"),
            "state":    bar.get("state"),
            "zip":      bar.get("zip"),
            "lat":      bar.get("lat"),
            "lng":      bar.get("lng"),
            "timezone": bar.get("timezone"),
            "dma":      bar.get("dma_name"),
        },
        "tvs": tvs,
        "playerSummary": {
            "paid":         paid,
            "trial":        trial,
            "free":         free,
            "total":        len(players),
            "avgGameSize":  round(avg, 2),
        },
        "players": players,
        "signageInventory": {
            "totalImpressions": 0,
            "audienceSeconds":  0,
            "avgConcurrent":    0,
        },
    })


# ─── /analytics/signage ────────────────────────────────────────────

def handle_signage(event):
    payload = _cache.read_payload("computed:signage:overview")
    if payload is None:
        return _resp.data_not_ready("computed:signage:overview")
    return _resp.ok(payload)


# ─── /analytics/finance ────────────────────────────────────────────

def handle_finance(event):
    qs = event.get("queryStringParameters") or {}
    range_ = qs.get("range", "mtd")
    compare = qs.get("compare", "none")
    try:
        cur, comp = _ranges.resolve(
            range_, compare, qs.get("start"), qs.get("end")
        )
    except ValueError as e:
        return _resp.error(400, "bad_request", str(e))

    today = datetime.now(timezone.utc).date()
    matrix_years = list(range(today.year - 2, today.year + 1))
    matrix_yms = [f"{y:04d}-{m:02d}" for y in matrix_years for m in range(1, 13)]

    # Build the union of every cache key any code path will look at:
    # window slices + 36-month matrix + by_country + upcoming payouts.
    all_yms = set(matrix_yms)
    for ym in _ranges.months_in_range(cur[0], cur[1]):
        all_yms.add(ym)
    if comp:
        for ym in _ranges.months_in_range(comp[0], comp[1]):
            all_yms.add(ym)

    keys: list[str] = []
    for ym in all_yms:
        keys.append(f"appstore:monthly:{ym}")
        keys.append(f"googleplay:monthly:{ym}")
        keys.append(f"aws:costs:monthly:{ym}")
    keys.append(f"appstore:by_country:{today.strftime('%Y-%m')}")
    keys.append("appstore:upcoming_payout")
    keys.append("googleplay:upcoming_payout")

    cache_map = _cache.read_many(keys)

    def slice_window(start_d, end_d):
        out = {"gross": 0.0, "net": 0.0, "appleNet": 0.0, "googleNet": 0.0,
               "refunds": 0.0, "aws": 0.0}
        for ym in _ranges.months_in_range(start_d, end_d):
            ap = cache_map.get(f"appstore:monthly:{ym}") or {}
            gp = cache_map.get(f"googleplay:monthly:{ym}") or {}
            aw = cache_map.get(f"aws:costs:monthly:{ym}") or {}
            ap_net = float(ap.get("netProceeds") or 0)
            gp_net = float(gp.get("netProceeds") or 0)
            out["gross"]    += float(ap.get("grossProceeds") or 0) + float(gp.get("grossProceeds") or 0)
            out["net"]      += ap_net + gp_net
            out["appleNet"] += ap_net
            out["googleNet"] += gp_net
            out["refunds"]  += -float(ap.get("refunds") or 0) + -float(gp.get("refunds") or 0)
            out["aws"]      += float(aw.get("total") or 0)
        return {k: round(v, 2) for k, v in out.items()}

    cur_data = slice_window(cur[0], cur[1])

    matrix = []
    for year in matrix_years:
        row = []
        for m in range(1, 13):
            ym = f"{year:04d}-{m:02d}"
            ap = cache_map.get(f"appstore:monthly:{ym}")
            gp = cache_map.get(f"googleplay:monthly:{ym}")
            if ap is None and gp is None:
                row.append(None)
            else:
                row.append(round(
                    float((ap or {}).get("netProceeds") or 0)
                    + float((gp or {}).get("netProceeds") or 0),
                    2,
                ))
        matrix.append({"year": year, "row": row})

    apple_by_country = cache_map.get(f"appstore:by_country:{today.strftime('%Y-%m')}") or []
    upcoming_apple   = cache_map.get("appstore:upcoming_payout") or {}
    upcoming_google  = cache_map.get("googleplay:upcoming_payout") or {}

    out: dict = {
        "range":   {"start": cur[0].isoformat(),  "end": cur[1].isoformat()},
        "current": cur_data,
        "monthlyMatrix":   matrix,
        "appleByCountry":  apple_by_country,
        "upcomingPayouts": {
            "apple":  upcoming_apple,
            "google": upcoming_google,
        },
    }
    if comp:
        out["compare"]    = {"start": comp[0].isoformat(), "end": comp[1].isoformat()}
        out["comparison"] = slice_window(comp[0], comp[1])
    return _resp.ok(out)


# ─── /analytics/questions ──────────────────────────────────────────

def handle_questions(event):
    progress = _cache.read_payload("computed:question_round_progress")
    overview = _cache.read_payload("computed:questions:overview")
    if progress is None or overview is None:
        missing = "computed:question_round_progress" if progress is None else "computed:questions:overview"
        return _resp.data_not_ready(missing)
    return _resp.ok({
        "totals": {
            "total":        progress["total"],
            "used":         progress["used"],
            "neverServed":  max(0, progress["total"] - progress["used"]),
            "currentRound": progress["currentRound"],
            "gamesUntilNextRound": progress["gamesUntilNextRound"],
        },
        "bySupercategory": overview["bySupercategory"],
        "byDifficulty":    overview["byDifficulty"],
        "pipeline":        overview["pipeline"],
    })


# ─── /analytics/aws ────────────────────────────────────────────────

def handle_aws(event):
    cur = _cache.read_payload("aws:costs:current_month")
    if cur is None:
        return _resp.data_not_ready("aws:costs:current_month")

    today = datetime.now(timezone.utc).date()
    trailing30 = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        ym = d.strftime("%Y-%m")
        if ym == cur.get("month"):
            # within current month — find from byDay
            day_total = next(
                (x["total"] for x in (cur.get("byDay") or []) if x["date"] == d.isoformat()),
                0,
            )
            trailing30.append({"date": d.isoformat(), "total": day_total})
        else:
            trailing30.append({"date": d.isoformat(), "total": None})

    bars_count = sum(1 for _ in _scan_all(TABLE.BARS, ProjectionExpression="barCode"))
    per_active_bar = round(float(cur["total"]) / bars_count, 4) if bars_count else 0

    return _resp.ok({
        "currentMonth": {
            "total":     cur["total"],
            "byService": cur.get("byService") or [],
            "byDay":     cur.get("byDay") or [],
        },
        "forecast": {"endOfMonth": cur.get("forecast", cur["total"])},
        "perActiveBar":  per_active_bar,
        "trailing30Days": trailing30,
    })


# ─── POST /analytics/refresh ───────────────────────────────────────

def handle_refresh(event):
    lam = boto3.client("lambda")
    lam.invoke(
        FunctionName=ANALYTICS_SYNC_FN,
        InvocationType="Event",  # async
        Payload=json.dumps({"trigger": "manual-refresh", "force": True}).encode(),
    )
    return _resp.ok({"status": "queued"}, status=202)
