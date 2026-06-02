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
ANSWERS_TABLE = os.environ.get("TABLE_ANSWERS", "TapTrivia-Answers")
# Players last active before this date are pre-launch test users — excluded from
# "total players" counts. Override via env without a redeploy.
PLAYER_TEST_CUTOFF = os.environ.get("PLAYER_TEST_CUTOFF", "2026-05-28")


def _is_real_player(p) -> bool:
    seen = (p.get("createdAt") or p.get("updatedAt") or "")[:10]
    return seen >= PLAYER_TEST_CUTOFF


def _ddec(v: Any) -> Any:
    if isinstance(v, Decimal):
        return int(v) if v == v.to_integral_value() else float(v)
    if isinstance(v, dict):
        return {k: _ddec(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_ddec(x) for x in v]
    return v


ACTIVE_WINDOW_DAYS = 7
SLOW_WINDOW_DAYS = 21


def _days_since_iso(s: str | None, now: datetime) -> int | None:
    if not s:
        return None
    try:
        t = s[:-1] + "+00:00" if s.endswith("Z") else s
        return (now - datetime.fromisoformat(t).astimezone(timezone.utc)).days
    except (ValueError, AttributeError):
        return None


def _epoch_to_iso(ms) -> str | None:
    if not ms:
        return None
    try:
        return datetime.fromtimestamp(int(ms) / 1000, timezone.utc).isoformat()
    except (ValueError, OverflowError, OSError):
        return None


def _activity_status(act: dict) -> str:
    """Active = real gameplay this week; slow = within 21d; else dormant.
    (TV polling alone no longer counts — empty test bars with a dev TV were
    showing as active.)"""
    if int(act.get("players7d") or 0) > 0 or int(act.get("games7d") or 0) > 0:
        return "active"
    if int(act.get("players21d") or 0) > 0 or int(act.get("games21d") or 0) > 0:
        return "slow"
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

    # Top bars by recent gameplay (skip empty/test bars with no plays).
    top_bars = sorted(
        (b for b in _bars_with_status() if b["hasGameplay"]),
        key=lambda b: (b["activePlayers7d"], b["gamesWeek"]),
        reverse=True,
    )[:6]
    overview["topBars"] = top_bars
    return _resp.ok(overview)


# ─── /analytics/subscribers ─────────────────────────────────────────

def handle_subscribers(event):
    qs = event.get("queryStringParameters") or {}
    range_ = qs.get("range", "mtd")
    compare = qs.get("compare", "none")
    try:
        cur, _comp = _ranges.resolve(range_, compare, qs.get("start"), qs.get("end"))
    except ValueError:
        cur, _comp = _ranges.resolve("mtd", "none")
    start_date, end_date = cur

    rc = _cache.read_payload("revenuecat:overview")
    if rc is None:
        return _resp.data_not_ready("revenuecat:overview")
    by_platform = _cache.read_payload("revenuecat:by_platform", default={}) or {}
    all_events = _cache.read_payload("revenuecat:recent_events", default=[]) or []

    # Filter events to the selected date range.
    def _event_date(e) -> str:
        return (e.get("purchasedAt") or e.get("occurred_at") or e.get("at") or e.get("created_at") or "")[:10]

    start_str = start_date.isoformat()
    end_str = end_date.isoformat()
    events_in_range = [
        e for e in all_events
        if start_str <= _event_date(e) <= end_str
    ] if all_events else []

    # Count new paid/trial subs that started within the range from daily cache.
    new_paid_in_range = 0
    new_trial_in_range = 0
    cur_d = start_date
    while cur_d <= end_date:
        day_data = _cache.read_payload(f"revenuecat:daily:{cur_d.isoformat()}", default={}) or {}
        new_paid_in_range += int(day_data.get("paid", 0) or 0)
        new_trial_in_range += int(day_data.get("trial", 0) or 0)
        cur_d += timedelta(days=1)

    # Funnel: total players → played 1+ games → started trial → paid.
    # Exclude pre-launch test users (last active before the cutoff). "Played 1+"
    # comes from distinct players who have answers (games_played isn't maintained).
    real_ids = set()
    for p in _scan_all(TABLE.PLAYERS, ProjectionExpression="PK, createdAt, updatedAt"):
        if _is_real_player(p):
            real_ids.add((p.get("PK") or "").replace("PLAYER#", ""))
    total_users = len(real_ids)
    played_ids = set()
    for a in _scan_all(ANSWERS_TABLE, ProjectionExpression="playerId"):
        pid = a.get("playerId")
        if pid and pid in real_ids:
            played_ids.add(pid)
    played_one_plus = len(played_ids)

    trial = int(rc.get("totalTrial") or 0)
    paid = int(rc.get("totalActive") or 0)

    return _resp.ok({
        "active": paid,
        "trial": trial,
        "free": max(0, total_users - paid - trial),
        "trialConversion": float(rc.get("conversionRate") or 0),
        "mrr": float(rc.get("mrrGross") or 0),
        "revenue28d": float(rc.get("revenue28d") or 0),
        "newCustomers28d": int(rc.get("newCustomers28d") or 0),
        "activeUsers28d": int(rc.get("activeUsers28d") or 0),
        "newPaidInRange": new_paid_in_range,
        "newTrialInRange": new_trial_in_range,
        "rangeLabel": range_,
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
        "recentEvents": events_in_range[:50] if events_in_range else all_events[:50],
    })


# ─── /analytics/bars ────────────────────────────────────────────────

def _bars_with_status() -> list[dict]:
    attribution = _cache.read_payload("computed:bar_attribution", default={}) or {}
    activity = _cache.read_payload("computed:bar_activity", default={}) or {}
    now = datetime.now(timezone.utc)
    out: list[dict] = []
    for b in _scan_all(TABLE.BARS, ProjectionExpression="barCode, barName, city, #st, #zp, dma_code, dma_name, total_tvs, lastPollAt, #ty",
                       ExpressionAttributeNames={"#st": "state", "#zp": "zip", "#ty": "type"}):
        if (b.get("type") or "").lower() == "group":
            continue  # social groups are not bars
        code = b.get("barCode")
        if not code: continue
        act = activity.get(code, {})
        bar = {
            "code":            code,
            "name":            b.get("barName") or "",
            "city":            b.get("city") or "",
            "state":           b.get("state") or "",
            "zip":             b.get("zip") or "",
            "dma":             b.get("dma_name") or "",
            "tvs":             int(b.get("total_tvs") or 0),
            "players":         0,    # total players, populated below from live count
            "activePlayers7d": int(act.get("players7d") or 0),
            "gamesWeek":       int(act.get("games7d") or 0),
            "gamesMonth":      0,
            "attrMrr":         float(attribution.get(code, 0)),
            "lastGame":        _epoch_to_iso(act.get("lastPlayEpoch")),
            "lastPollAt":      b.get("lastPollAt"),
            "hasGameplay":     bool(act.get("lastPlayEpoch")),
            "status":          _activity_status(act),
        }
        out.append(bar)
    return out


def handle_bars(event):
    bars = _bars_with_status()
    bar_info = {b["code"]: b for b in bars}  # code → {name, city, state, ...} (pre-cull)

    # players-per-bar from a single Players scan (excluding pre-launch test users).
    bar_players: dict[str, int] = {}
    for p in _scan_all(TABLE.PLAYERS, ProjectionExpression="currentBarCode, createdAt, updatedAt"):
        c = p.get("currentBarCode")
        if c and _is_real_player(p):
            bar_players[c] = bar_players.get(c, 0) + 1
    for b in bars:
        b["players"] = bar_players.get(b["code"], 0)

    active_tvs = _active_tvs(bar_info)

    # Active-screen count per bar.
    tv_counts: dict[str, int] = {}
    for t in active_tvs:
        tv_counts[t["barCode"]] = tv_counts.get(t["barCode"], 0) + 1
    for b in bars:
        b["activeTvs"] = tv_counts.get(b["code"], 0)

    # Cull pure-empty test bars: no players AND no recent gameplay.
    bars = [b for b in bars if b["players"] > 0 or b["hasGameplay"]]

    active = sum(1 for b in bars if b["status"] == "active")
    pending = len(bars) - active
    total_attr_mrr = sum(b["attrMrr"] for b in bars)

    total_players = sum(b["players"] for b in bars)
    total_active_players_7d = sum(b["activePlayers7d"] for b in bars)
    total_games_week = sum(b["gamesWeek"] for b in bars)

    return _resp.ok({
        "totals": {
            "active": active,
            "pending": pending,
            "totalPlayers": total_players,
            "activePlayers7d": total_active_players_7d,
            "totalGamesWeek": total_games_week,
            "totalGamesMonth": 0,
            "totalAttrMrr": round(total_attr_mrr, 2),
            "activeTvs": len(active_tvs),
        },
        "bars": bars,
        "activeTvs": active_tvs,
    })


def _active_tvs(bar_info: dict) -> list[dict]:
    """Live TVs (heartbeat in the last 24h) with their bar + location."""
    now = datetime.now(timezone.utc)
    tvs: list[dict] = []
    for tv in _scan_all(
        TABLE.TV_PAIRINGS,
        ProjectionExpression="tv_id, gsi1pk, bar_code, tv_platform, last_heartbeat_utc",
    ):
        code = tv.get("gsi1pk") or tv.get("bar_code")
        hb = tv.get("last_heartbeat_utc")
        mins = None
        if hb:
            try:
                s = hb[:-1] + "+00:00" if hb.endswith("Z") else hb
                mins = (now - datetime.fromisoformat(s).astimezone(timezone.utc)).total_seconds() / 60
            except (ValueError, AttributeError):
                mins = None
        if mins is None or mins >= 24 * 60:
            continue
        info = bar_info.get(code, {})
        tvs.append({
            "tvId":          tv.get("tv_id"),
            "barCode":       code,
            "barName":       info.get("name") or code or "—",
            "city":          info.get("city") or "",
            "state":         info.get("state") or "",
            "platform":      tv.get("tv_platform") or "unknown",
            "lastHeartbeat": hb,
            "minutesAgo":    int(mins),
        })
    tvs.sort(key=lambda t: t["minutesAgo"])
    return tvs


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

    # Gameplay per player at this bar, from the Answers table (the player's own
    # games_played/last_played_at fields aren't maintained — Answers is truth).
    games_by_player: dict[str, set] = {}
    last_by_player: dict[str, int] = {}
    first_by_player: dict[str, int] = {}
    for a in _scan_all(
        ANSWERS_TABLE,
        FilterExpression=Attr("barCode").eq(code),
        ProjectionExpression="playerId, gameId, serverTimestamp",
    ):
        a = _ddec(a)
        pid = a.get("playerId")
        if not pid:
            continue
        games_by_player.setdefault(pid, set()).add(a.get("gameId"))
        ts = int(a.get("serverTimestamp") or 0)
        if ts > last_by_player.get(pid, 0):
            last_by_player[pid] = ts
        if ts and (pid not in first_by_player or ts < first_by_player[pid]):
            first_by_player[pid] = ts

    # Players whose currentBarCode == this bar (displayName is the real name field).
    players: list[dict] = []
    for p in _scan_all(
        TABLE.PLAYERS,
        FilterExpression=Attr("currentBarCode").eq(code),
        ProjectionExpression="PK, displayName, currentBarCode, createdAt, updatedAt, subscription_status",
    ):
        p = _ddec(p)
        pid = (p.get("PK") or "").replace("PLAYER#", "")
        # "First joined" = first game played here, else when the record was last
        # touched (these player records carry no createdAt).
        joined = _epoch_to_iso(first_by_player.get(pid)) or p.get("createdAt") or p.get("updatedAt")
        players.append({
            "name":        p.get("displayName") or "Anonymous",
            "subscription": p.get("subscription_status") or "free",
            "joined":      joined,
            "games":       len(games_by_player.get(pid, ())),
            "lastGame":    _epoch_to_iso(last_by_player.get(pid)),
        })
    players.sort(key=lambda x: x["games"], reverse=True)

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
