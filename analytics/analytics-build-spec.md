# TapTrivia Analytics Subsystem — Claude Code Build Spec

**Version:** 1.0
**Owner:** Adam Fisher / Visudo Labs LLC
**Target:** Single-operator analytics dashboard for the entire TapTrivia platform.

---

## 0. How to use this spec

This document is the complete blueprint. Read it end-to-end before writing any code. Every panel in the dashboard maps to a specific data source and a specific cache key — you should never need to invent that mapping yourself.

**Build order is mandatory.** Phases 1 → 8. Do not start Phase 3 until Phase 2 is fully working with real data. Adam's pattern is "complete and correct" — finish each phase, verify it, commit, move on.

**Before each phase begins, post a short plan:** "Phase N: I will create files X, Y, Z, and modify A, B. Tests will verify foo and bar." Wait for confirmation if anything is unclear. Otherwise proceed.

**Deploy target:** Existing AWS account `Adam-Visudo` (3385-4023-6993), `us-east-1` region. Existing serverless stack (Lambda + DynamoDB + API Gateway). Add to it; do not rebuild.

---

## 1. What this subsystem does

Operator-only analytics dashboard at `https://analytics.taptrivia.tv` that lets Adam manage the entire TapTrivia platform as a one-person business. Pulls from five sources, presents seven dashboard tabs.

**The five data sources:**
1. **DynamoDB** (existing tables) — bars, players, sessions, games, questions, signage impressions
2. **RevenueCat REST API v2** — subscription state, trials, churn, MRR
3. **App Store Connect API** — Apple's net proceeds, refunds, payouts, country breakdown
4. **Google Play Developer API** — Google's net earnings, refunds, payouts
5. **AWS Cost Explorer API** — daily AWS spend by service

**The seven dashboard tabs:** Overview · Subscribers · Bars · Signage · Finance · Questions · AWS

Mock UI already exists in `/analytics/mockup/taptrivia-analytics-dashboard.jsx`. The mock is the visual contract. Match it.

---

## 2. Architecture

### 2.1 High-level flow

```
                   ┌─────────────────────┐
External APIs ───►│ Hourly EventBridge  │
(RevenueCat,       │ → analytics-sync   │──► dynamo: analytics_cache
 AppStore,         │   Lambda            │
 GooglePlay,       └─────────────────────┘
 AWS Cost Exp)

DynamoDB tables ───► Direct queries from analytics-api Lambda
(bars, players,
 sessions, etc.)

                   ┌─────────────────────┐    ┌──────────────────┐
React dashboard ──►│ analytics-api       │──►│ Reads cache +    │
(analytics.taptrivia.tv) │ Lambda (REST)     │    │ live DynamoDB    │
                   └─────────────────────┘    └──────────────────┘
```

### 2.2 Why two Lambdas

- **`analytics-sync`** (scheduled, hourly): expensive — calls external APIs, aggregates, writes to cache. Idempotent. Can be re-run safely.
- **`analytics-api`** (HTTP, on demand): cheap — reads from cache + simple DynamoDB queries. Returns in <500ms. Must be fast because the dashboard hits it on every page load.

This separation means the dashboard is fast even when external APIs are slow or down. The cache is always served; the cache might just be slightly stale.

### 2.3 Cache TTL strategy

All four external sources run on a single **daily** EventBridge schedule
(`cron(5 6 * * ? *)`, 06:05 UTC). Pre-revenue this is more than enough
freshness, and it keeps Cost Explorer charges in the pennies-per-month
range (~$0.60/mo at daily vs ~$14/mo at hourly). Re-running with
`{"force": true}` bypasses the per-source 24-h guards.

| Source | Refresh frequency | Why |
|---|---|---|
| RevenueCat | Daily | Subscriber state changes are batched well enough at daily resolution; revisit if/when we need real-time (webhooks). |
| App Store Connect | Daily | Apple updates finance reports daily; rate-limited API. |
| Google Play | Daily | Same as Apple. |
| AWS Cost Explorer | Daily | Each `GetCostAndUsage` call costs $0.01; daily keeps total spend on the analytics subsystem itself <$1/mo. |
| DynamoDB live data | No cache | Direct queries on every request; existing tables, fast. |

Bumping any one source to hourly is a one-line `cron(...)` change in
`terraform/analytics-sync.tf` plus dropping the per-source 24-h guard.

### 2.4 Authentication

This is an **operator-only** dashboard. Do NOT expose to bars or patrons.

- Cognito User Pool: `taptrivia-admin-pool`
- Single user provisioned manually: `adam@visudolabs.com`
- API Gateway custom authorizer validates Cognito JWT on every `/analytics/*` request
- React app uses `aws-amplify` for login, stores token in memory (never localStorage)
- Session timeout: 12 hours

---

## 3. DynamoDB schema additions

### 3.1 New table: `analytics_cache`

```
PK: cache_key (String)              // e.g. "revenuecat:overview", "aws:costs:2026-04"
attrs:
  payload: JSON-serialized data
  generated_at: ISO 8601 UTC timestamp
  ttl: Number (Unix timestamp, DynamoDB TTL enabled)
  source: "revenuecat" | "appstore" | "googleplay" | "aws" | "computed"

Billing: On-demand
TTL attribute: ttl
```

### 3.2 New table: `signage_impressions`

```
PK: bar_code (String)
SK: impression_id (String, ULID — sortable by time)
attrs:
  tv_id: String
  signage_id: String
  content_type: "house_ad" | "bar_promo" | "system" | "leaderboard" | "scoreboard"
  displayed_at_utc: ISO 8601
  duration_ms: Number
  context: "game_lobby" | "between_rounds" | "results" | "off_hours_idle"
  concurrent_players: Number  (0 if off-hours)
  game_id: String | null
  position_in_rotation: Number
  tv_platform: "firetv" | "firetv_vega" | "vizio" | "roku" | "appletv" | "tizen" | "webos" | "web"

GSI-1: gsi1pk = "GLOBAL", gsi1sk = displayed_at_utc  (for cross-bar time queries)
GSI-2: gsi2pk = tv_id, gsi2sk = displayed_at_utc      (for per-TV queries)

Billing: On-demand
TTL: 90 days (raw events purged; aggregates retained in cache table forever)
```

### 3.3 New table: `tv_pairings`

```
PK: tv_id (String, UUID generated at first pairing)
attrs:
  bar_code: String
  paired_at_utc: ISO 8601
  last_heartbeat_utc: ISO 8601  (updated every 5 min while TV is on)
  ip_address: String
  geo: {city, state, zip, lat, lng, timezone, dma}  (resolved once at pairing)
  tv_platform: String
  status: "active" | "dark" | "retired"

GSI: gsi1pk = bar_code, gsi1sk = paired_at_utc  (list TVs for a bar)

Billing: On-demand
```

### 3.4 New table: `question_usage`

```
PK: question_id (String)
attrs:
  times_used: Number
  last_used_at_utc: ISO 8601
  current_round: Number  (which round of the bank this question is in)
  served_in_games: List<String>  (last 100 game_ids; truncate beyond)

GSI: gsi1pk = "ROUND#" + current_round, gsi1sk = times_used
  (enables "how many questions are in round N" queries)

Billing: On-demand
```

### 3.5 Modifications to existing `bars` table

Add these attributes (backfill required for existing bars):
```
geo: {city, state, zip, lat, lng, timezone, dma}  // resolved from first TV's IP
total_tvs: Number  (denormalized count of TVs in tv_pairings table)
first_session_at_utc: ISO 8601  (for activation tracking)
last_session_at_utc: ISO 8601  (for dormancy detection)
```

Backfill script: `scripts/backfill_bar_geo.py` — runs once, geocodes existing bars from any historical session IP we have, or marks them `geo: null` for manual review.

### 3.6 Modifications to existing `subscriptions` (or wherever per-user subscription state lives)

Add:
```
attributed_bar_code: String  // First bar where this player ever played (set once)
```

This is the "first-bar attribution" rule for per-bar MRR. **Decision: first-bar attribution** because it rewards bars for acquisition, and acquisition is the constraint right now. Document this rule prominently in the code; revisiting it later is a known follow-up.

---

## 4. The `analytics-sync` Lambda

### 4.1 Trigger

EventBridge rule `analytics-sync-hourly`: every hour at :05 (5 minutes past, to avoid the top-of-hour traffic spike from cron-based jobs).

```yaml
Schedule: cron(5 * * * ? *)
Timeout: 5 minutes
Memory: 1024 MB
```

### 4.2 What it does, in order

1. **Read last sync timestamps** from `analytics_cache` table (key = `meta:last_synced`).
2. **Fan out to four parallel async tasks** (one per external source). Use `asyncio.gather` if Python; `Promise.all` if Node.
3. **Each task writes its own cache keys** when complete. Failures in one source do NOT block others.
4. **At end, write fresh `meta:last_synced`** with timestamps per source.
5. **Compute derived/cross-source aggregates** AFTER all syncs complete (e.g. "MRR per active bar" combines RevenueCat MRR with DynamoDB bar count).

### 4.3 Source 1: RevenueCat

**API:** `https://api.revenuecat.com/v2`
**Auth:** Bearer token from Secrets Manager: `taptrivia/revenuecat/api-key`
**Refresh:** Every run (hourly).

**Endpoints to call:**

```
GET /projects/{project_id}/customers
  ?limit=1000&starting_after={cursor}
  → Iterate all pages. Use to build subscriber list.

GET /projects/{project_id}/subscriptions
  ?status=active,in_grace_period,in_trial
  → Active subscriber count, trial count, MRR

GET /projects/{project_id}/charts/active-subscriptions
  ?period=day&start_date={90d ago}&end_date=today
  → Daily subscriber counts for trend charts

GET /projects/{project_id}/charts/mrr
  ?period=month&start_date=2023-05-01
  → Monthly MRR history (for the heatmap going back 36 months)
```

**Project ID:** Look up from Secrets Manager: `taptrivia/revenuecat/project-id`

**Cache writes:**

```
revenuecat:overview              → {totalActive, totalTrial, mrrGross, churn30d, conversionRate}
revenuecat:daily:{YYYY-MM-DD}    → {paid, trial, free} for each of last 1095 days
revenuecat:monthly:{YYYY-MM}     → {gross, paidSubs} for each month back to 2023-05
revenuecat:recent_events         → last 50 subscription events (new/trial/renew/churn)
revenuecat:by_platform           → {ios: {subs, mrr}, android: {subs, mrr}}
```

**Edge cases:**
- If RevenueCat returns 429 (rate limit), back off and retry with exponential delay; do NOT fail the whole sync.
- If RevenueCat returns 401 (bad key), write to CloudWatch as ERROR and SES-email Adam. Do not silently skip.
- Cache keys for failed sources retain their previous values (do not overwrite with empty data).

### 4.4 Source 2: App Store Connect API

**API:** `https://api.appstoreconnect.apple.com/v1`
**Auth:** JWT signed with private key from Secrets Manager: `taptrivia/appstore/private-key` (.p8 file)
**Refresh:** Once daily at 06:00 ET. Skip if `meta:last_synced.appstore` is < 24h ago.

**Required Secrets Manager entries:**
- `taptrivia/appstore/key-id` (10-char ID from App Store Connect)
- `taptrivia/appstore/issuer-id` (UUID from App Store Connect)
- `taptrivia/appstore/private-key` (the .p8 file contents)

**JWT generation** (every request, expires in 20 minutes):
```python
import jwt, time
def make_jwt(key_id, issuer_id, private_key):
    headers = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    payload = {
        "iss": issuer_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + 1200,
        "aud": "appstoreconnect-v1"
    }
    return jwt.encode(payload, private_key, algorithm="ES256", headers=headers)
```

**Endpoints:**

```
GET /salesReports
  Filters: frequency=DAILY, reportType=SALES, reportSubType=SUMMARY,
           vendorNumber={vendor#}, reportDate=YYYY-MM-DD
  Returns: gzipped TSV of all transactions
  → Parse for: net proceeds, refunds, country breakdown, product

GET /financeReports
  Filters: regionCode=US (and others), reportType=FINANCIAL,
           vendorNumber={vendor#}, reportDate=YYYY-MM
  → Monthly net proceeds (the actual payout amount)
```

**Vendor number:** Stored in Secrets Manager: `taptrivia/appstore/vendor-number`

**Cache writes:**

```
appstore:monthly:{YYYY-MM}       → {grossProceeds, appleFee, netProceeds, refunds, payoutDate}
appstore:by_country:{YYYY-MM}    → [{country: "US", revenue: 1782.44}, ...]
appstore:upcoming_payout         → {amount, expectedDate, status}
```

**Edge cases:**
- App Store Connect reports lag by 24-48 hours. The "current month" stays incomplete until ~3 days into the next month. Display this honestly with a "preliminary" pill in the UI.
- Reports come gzipped; decompress before parsing.
- If a date's report doesn't exist yet (404), that's normal — don't error.

### 4.5 Source 3: Google Play Developer API

**API:** `https://androidpublisher.googleapis.com/androidpublisher/v3`
**Auth:** OAuth2 service account. Use existing service account: `revenue-cat@taptrivia.iam.gserviceaccount.com` (already configured in user memories).
**Refresh:** Once daily at 06:00 ET.

**Service account key:** Stored in Secrets Manager: `taptrivia/googleplay/service-account-key` (the JSON file from GCP console).

**Better approach: BigQuery export.** Google Play has a built-in BigQuery export of monthly financial reports. Set this up once via the Play Console:
1. Play Console → Reports → Financial → Set up BigQuery export
2. Creates dataset in your linked GCP project
3. Lambda queries BigQuery directly: `bq query --use_legacy_sql=false ...`

If BigQuery export isn't available in your tier, fall back to the GCS bucket method:
- Reports are deposited monthly in `gs://pubsite_prod_{your-publisher-id}/sales/`
- Download CSV, parse, aggregate

**Cache writes:**

```
googleplay:monthly:{YYYY-MM}     → {grossProceeds, googleFee, netProceeds, refunds}
googleplay:upcoming_payout       → {amount, expectedDate}
```

### 4.6 Source 4: AWS Cost Explorer

**API:** AWS SDK, `ce.get_cost_and_usage`
**Auth:** IAM role attached to the Lambda. Required permission:
```json
{"Effect": "Allow", "Action": ["ce:GetCostAndUsage", "ce:GetCostForecast"], "Resource": "*"}
```
**Refresh:** Hourly (every sync run).

**Cost note:** Each `GetCostAndUsage` call costs $0.01. This Lambda makes 2 calls per run × 24 runs/day × 30 days = $14.40/mo. Acceptable.

**Calls:**

```python
# Daily breakdown for current month
ce.get_cost_and_usage(
    TimePeriod={"Start": "2026-04-01", "End": "2026-05-01"},
    Granularity="DAILY",
    Metrics=["UnblendedCost"],
    GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}]
)

# Forecast for end of month
ce.get_cost_forecast(
    TimePeriod={"Start": "today", "End": "first of next month"},
    Granularity="MONTHLY",
    Metric="UNBLENDED_COST"
)
```

**Cache writes:**

```
aws:costs:current_month          → {byService: [...], byDay: [...], total, forecast}
aws:costs:monthly:{YYYY-MM}      → {total, byService: [...]} for trailing 36 months
```

### 4.7 Cross-source derived data

Computed **after** all four external syncs complete:

```
computed:overview                → {
  totalUsers, paidSubs, trialUsers, freeUsers,
  activeBars, pendingBars,
  netMrr (gross - estimated 15% store fees),
  awsThisMonth,
  questionsTotal, questionsUsed, currentRound,
  // ... matches the OverviewTab Stat cards exactly
}

computed:bar_attribution         → Map<bar_code, attributed_mrr>
  // For each subscription, find its attributed_bar_code,
  // sum the $2.99/mo across all subs per bar.

computed:question_round_progress → {
  total: N, used: M, currentRound: R,
  nextRoundAt: K  // games until round increments
}
```

---

## 5. The `analytics-api` Lambda

### 5.1 Routing

API Gateway → single Lambda function with routing inside. Use AWS Lambda Function URL OR API Gateway HTTP API (cheaper than REST API). Pick HTTP API.

```
GET /analytics/overview
GET /analytics/subscribers
GET /analytics/bars
GET /analytics/bars/{barCode}
GET /analytics/signage
GET /analytics/finance?range={range}&compare={mode}
GET /analytics/questions
GET /analytics/aws

POST /analytics/refresh   → manually trigger analytics-sync (auth required)
```

All routes require valid Cognito JWT. Reject with 401 otherwise.

### 5.2 Response shape

Every endpoint returns:
```json
{
  "data": { ... },
  "generated_at": "2026-04-30T22:14:00Z",
  "sources": {
    "revenuecat": {"last_synced": "...", "fresh": true},
    "appstore":   {"last_synced": "...", "fresh": true},
    "googleplay": {"last_synced": "...", "fresh": false, "reason": "stale > 30h"},
    "aws":        {"last_synced": "...", "fresh": true}
  }
}
```

The `sources` block lets the UI show "Synced 2 min ago" in the topbar with honest per-source freshness.

### 5.3 Endpoint specs

#### `GET /analytics/overview`

Returns everything the OverviewTab needs:

```json
{
  "totalUsers": 4287,
  "paidSubs": 1843,
  "trialUsers": 312,
  "free": 2132,
  "newSubsToday": 28,
  "newSubsTrend": 0.12,
  "churnRate": 0.038,
  "trialConversion": 0.61,
  "activeBars": 47,
  "pendingBars": 6,
  "mrrGross": 5510.57,
  "netMrr": 4683.99,
  "awsThisMonth": 38.42,
  "questionsTotal": 70312,
  "questionsUsed": 18904,
  "currentRound": 1,
  "nextRoundStartsAt": 51408,
  "subscriberDailyTrend": [...30 to 1095 points based on range...],
  "topBars": [first 6 from /bars],
  "awsCosts": [...by service...]
}
```

**Source:** Read `computed:overview` from cache. Top bars come from a live DynamoDB query (small, fast).

#### `GET /analytics/subscribers`

```json
{
  "active": 1843,
  "trial": 312,
  "free": 2132,
  "trialConversion": 0.61,
  "platformSplit": {
    "ios":     {"subs": 958, "mrr": 3085.92},
    "android": {"subs": 885, "mrr": 2424.65}
  },
  "funnel": [
    {"stage": "Total Users", "value": 4287, "pct": 1.0},
    {"stage": "Played 1+ Games", "value": 3842, "pct": 0.896},
    {"stage": "Started Trial", "value": 2188, "pct": 0.510},
    {"stage": "Active Paid", "value": 1843, "pct": 0.430}
  ],
  "recentEvents": [
    {"name": "Mike T.", "barCode": "BR7X9", "store": "App Store", "type": "new", "at": "..."},
    ...
  ]
}
```

**Source:** Mostly `revenuecat:*` cache + funnel computed live from DynamoDB session counts.

#### `GET /analytics/bars`

```json
{
  "totals": {"active": 47, "pending": 6, "totalPlayers": 397, "totalGamesMonth": 56, "totalAttrMrr": 943.39},
  "bars": [
    {
      "code": "BR7X9",
      "name": "The Rusty Rooster",
      "city": "Brevard, NC",
      "state": "NC",
      "zip": "28712",
      "dma": "Greenville-Spartanburg-Asheville-Anderson",
      "tvs": 2,
      "players": 87,
      "gamesMonth": 12,
      "attrMrr": 198.34,
      "lastGame": "2026-04-30T19:14:00Z",
      "status": "active"
    },
    ...
  ]
}
```

**Source:** Live DynamoDB query. Bar status (`active` / `slow` / `dormant`) computed from `last_session_at_utc`:
- `active`: last session within 7 days
- `slow`: last session 7-21 days ago
- `dormant`: last session > 21 days ago OR never

#### `GET /analytics/bars/{barCode}`

```json
{
  "bar": { ...full bar record... },
  "geo": {city, state, zip, lat, lng, timezone, dma},
  "tvs": [
    {"tv_id": "...", "platform": "firetv", "paired_at": "...", "last_heartbeat": "...", "status": "active"}
  ],
  "playerSummary": {"paid": 23, "trial": 4, "free": 8, "total": 35, "avgGameSize": 14.2},
  "players": [
    {"name": "Mike T.", "subscription": "paid", "joined": "...", "games": 18, "lastGame": "..."},
    ...
  ],
  "signageInventory": {
    "totalImpressions": 8421,
    "audienceSeconds": 98244,
    "avgConcurrent": 11.7
  }
}
```

**Source:** Live DynamoDB queries (multiple). Player roster joins `sessions` table with `subscriptions` table.

#### `GET /analytics/signage`

Everything the SignageTab needs:

```json
{
  "totals": {
    "impressions": 184722,
    "audienceSeconds": 2184310,
    "activeTvs": 17,
    "totalTvs": 21,
    "avgConcurrent": 11.8,
    "peakConcurrent": 38
  },
  "byContext": [...4 entries: between_rounds, game_lobby, results, off_hours_idle...],
  "heatmap": {
    "hours": [17,18,19,20,21,22,23,0,1,2,3,4],
    "days": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    "values": [[...12 hours...], ...7 days...]  // audience-seconds, in BAR-LOCAL time
  },
  "byDayPart": [...4 entries: Early evening, Prime, Late night, After hours...],
  "byAudienceBucket": [...5 entries: 5+, 10+, 15+, 20+, 30+...],
  "byDMA": [...all DMAs with bars...],
  "dataQuality": [...5 health checks...]
}
```

**Source:** All from `signage_impressions` table, aggregated. Heatmap bucketing requires converting each impression's UTC timestamp to bar-local time using `bar.geo.timezone`. Use `pytz` (Python) or `date-fns-tz` (Node).

This is the most expensive endpoint to compute. Cache aggressively:
- Cache key: `computed:signage:overview`, refreshed by `analytics-sync` hourly
- The endpoint just reads cache; never aggregates on demand.

#### `GET /analytics/finance?range=mtd&compare=yoy`

```json
{
  "range": {"start": "2026-04-01", "end": "2026-04-30"},
  "compare": {"start": "2025-04-01", "end": "2025-04-30"},
  "current": {"gross": 5511, "net": 4684, "appleNet": 2418, "googleNet": 2266, "refunds": -71, "aws": 38.42},
  "comparison": {"gross": 4012, "net": 3410, "appleNet": 1755, "googleNet": 1655, "refunds": -45, "aws": 28.10},
  "monthlyMatrix": [
    {"year": 2023, "row": [null, null, ..., 0, 0, ...]},
    {"year": 2024, "row": [34, 78, 142, ...]},
    ...
  ],
  "appleByCountry": [...],
  "upcomingPayouts": {
    "apple":  {"amount": 2376.15, "expectedDate": "2026-05-28"},
    "google": {"amount": 2237.10, "expectedDate": "2026-05-15"}
  }
}
```

**Source:** Combine `appstore:monthly:*`, `googleplay:monthly:*`, `aws:costs:monthly:*` cache entries for the range. Server resolves the range and comparison window.

#### `GET /analytics/questions`

```json
{
  "totals": {
    "total": 70312,
    "used": 18904,
    "neverServed": 51408,
    "currentRound": 1,
    "gamesUntilNextRound": 51408
  },
  "bySupercategory": [...6 entries...],
  "byDifficulty": [...5 entries...],
  "pipeline": {
    "generatedThisWeek": 2418,
    "faissDedupRejects": 312,
    "avgDifficulty": 2.84,
    "topicGaps": 6
  }
}
```

**Source:** `question_usage` table aggregated + `questions` table for totals. Pipeline stats from CloudWatch metrics emitted by your existing question generation pipeline.

#### `GET /analytics/aws`

```json
{
  "currentMonth": {"total": 38.42, "byService": [...9 entries...], "byDay": [...30 entries...]},
  "forecast": {"endOfMonth": 40.34},
  "perActiveBar": 0.82,
  "trailing30Days": [...30 daily totals...]
}
```

**Source:** `aws:costs:*` cache.

---

## 6. Geo-IP integration

Bars get geo from the IP of their first paired TV.

### 6.1 Service: MaxMind GeoLite2

**Why:** Free (with attribution), accurate to city level for fixed broadband, no per-call cost, runs locally inside Lambda.

**Setup:**
1. Create free MaxMind account at maxmind.com
2. Generate a license key
3. Download `GeoLite2-City.mmdb` (database file, ~80MB)
4. Store in S3: `s3://taptrivia-internal/geoip/GeoLite2-City.mmdb`
5. Schedule monthly refresh: EventBridge calls `geoip-update` Lambda on the 1st of each month, downloads fresh DB from MaxMind, uploads to S3
6. `analytics-api` and any other Lambda needing geo lookup downloads the .mmdb on cold start, caches in `/tmp`

```python
import maxminddb
reader = maxminddb.open_database('/tmp/GeoLite2-City.mmdb')
result = reader.get('203.0.113.42')
# → {city, subdivisions, postal, location, country, ...}
```

### 6.2 DMA derivation

MaxMind doesn't provide DMA directly. Use a static zip-to-DMA lookup table.

**Source:** Public dataset, e.g. https://github.com/dewane/Master-DMA-List — has CSV mapping zip → DMA name + DMA code (Nielsen rank).

**Implementation:** Bake the CSV into the Lambda deployment as `data/zip_to_dma.json`. Load on cold start, cache in memory. Look up by zip after MaxMind returns city/zip.

### 6.3 TV pairing flow

When a TV pairs (existing flow already exists for Fire Stick, Roku, Apple TV, web TV apps):

1. TV calls existing `POST /pair` endpoint with bar_code
2. Backend captures source IP from API Gateway request context
3. NEW: backend calls `geoip-resolve(ip)` → returns `{city, state, zip, lat, lng, timezone, dma}`
4. NEW: backend writes to `tv_pairings` table with the resolved geo
5. NEW: if this is the bar's first TV, copy geo onto the `bars` record

### 6.4 Heartbeat

TVs send a heartbeat every 5 minutes while running:
```
POST /tv-heartbeat
Body: {tv_id, current_signage_id (optional)}
→ Updates tv_pairings.last_heartbeat_utc
```

A TV is `active` if heartbeat < 24h ago, `dark` otherwise. The Signage tab's "active TVs / total TVs" stat comes directly from this.

---

## 7. Frontend (React dashboard)

### 7.1 Stack

- **React 18 + Vite** (matches your existing site stack)
- **Same fonts/colors as the mockup** (Outfit, Fredoka, DM Mono; the C color object is the source of truth)
- **No external chart library** — the mockup uses inline SVG and that approach should be preserved (smaller bundle, no version drift)
- **AWS Amplify** for Cognito auth only
- **No state management library** — `useState` and `useMemo` are sufficient. Don't add Redux.
- **Hosted on CloudFront** at `analytics.taptrivia.tv` with a separate S3 bucket from the marketing site

### 7.2 File structure

```
analytics/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main shell, tab routing, date state
│   │   ├── lib/
│   │   │   ├── api.js                 # Wrapped fetch with auth + error handling
│   │   │   ├── auth.js                # Cognito sign-in helpers
│   │   │   └── format.js              # Date, currency, number formatters
│   │   ├── components/
│   │   │   ├── Topbar.jsx
│   │   │   ├── DateControl.jsx
│   │   │   ├── Stat.jsx               # The KPI card
│   │   │   ├── Panel.jsx
│   │   │   ├── Pill.jsx
│   │   │   └── charts/
│   │   │       ├── SubChart.jsx       # Subscriber growth line
│   │   │       ├── Donut.jsx          # AWS cost mix
│   │   │       ├── RevenueHeatmap.jsx # MoM/YoY matrix
│   │   │       ├── SignageHeatmap.jsx # Day × hour audience-seconds
│   │   │       └── DailyCostChart.jsx
│   │   └── tabs/
│   │       ├── OverviewTab.jsx
│   │       ├── SubscribersTab.jsx
│   │       ├── BarsTab.jsx
│   │       ├── BarDrillIn.jsx
│   │       ├── SignageTab.jsx
│   │       ├── FinanceTab.jsx
│   │       ├── QuestionsTab.jsx
│   │       └── AwsTab.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── infra/
    ├── analytics-sync.py              # Sync Lambda
    ├── analytics-api.py               # API Lambda
    ├── geoip-update.py                # Monthly MaxMind refresh
    ├── data/zip_to_dma.json
    ├── cdk/                           # OR use SAM template; whichever the existing stack uses
    └── README.md
```

**Decompose the existing 2,000-line `taptrivia-analytics-dashboard.jsx` mockup into the per-component files above.** Each component file should match what's already in the mockup verbatim — only the file boundaries change. Do not rewrite the styling or behavior.

### 7.3 Build & deploy

```
cd analytics/frontend
npm install
npm run build          # vite build → dist/
aws s3 sync dist/ s3://taptrivia-analytics/ --profile Adam-Visudo
aws cloudfront create-invalidation --distribution-id {ID} --paths '/*' --profile Adam-Visudo
```

Add to package.json:
```json
"scripts": {
  "deploy": "vite build && aws s3 sync dist/ s3://taptrivia-analytics/ --profile Adam-Visudo --delete && aws cloudfront create-invalidation --distribution-id {ID} --paths '/*' --profile Adam-Visudo"
}
```

### 7.4 API integration

```javascript
// lib/api.js
import { Auth } from 'aws-amplify';

const API_BASE = import.meta.env.VITE_API_BASE; // https://api.taptrivia.tv

export async function api(path, opts = {}) {
  const session = await Auth.currentSession();
  const token = session.getIdToken().getJwtToken();
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(opts.headers || {})
    }
  });
  if (!r.ok) throw new Error(`API ${path} failed: ${r.status}`);
  return r.json();
}
```

Each tab component calls its endpoint on mount, sets state, renders. Loading state: show the existing layout with skeleton placeholders (just a CSS animation on Panel components — don't show a separate spinner).

### 7.5 Date range state lives at App level

Already in the mockup. Don't change the structure. The state is `range`, `compare`, `customRange`. Pass to OverviewTab and FinanceTab as props (they're the tabs that respect range). Other tabs ignore date range for v1.

---

## 8. Build phases

Mandatory order. Do not skip ahead. Each phase ends with a working, deployable thing.

### Phase 1: Schema + cache table (½ day)

- Create the four new DynamoDB tables (`analytics_cache`, `signage_impressions`, `tv_pairings`, `question_usage`)
- Add the new attributes to `bars` table
- Backfill geo for existing bars (best-effort; mark unresolved as `null`)
- Backfill `attributed_bar_code` for existing subscriptions

**Verify:** Tables exist, backfill ran cleanly, no exceptions.

### Phase 2: Geo-IP service (½ day)

- Set up MaxMind account, get license key, download .mmdb
- Upload to S3
- Build `geoip-update` Lambda with monthly EventBridge schedule
- Build geo resolution helper (used by all Lambdas)
- Bake `zip_to_dma.json` into deployment

**Verify:** Call resolver with a known IP (e.g. an AWS public IP), get back correct geo. DMA derives correctly from zip.

### Phase 3: TV pairing instrumentation (1 day)

- Update existing TV pairing endpoint to capture IP, resolve geo, write `tv_pairings`
- Add `/tv-heartbeat` endpoint
- Update all TV apps (Fire Stick, Roku, Apple TV, web TV) to send heartbeats every 5 min
- Backfill: for currently-active bars, manually pair their TV(s) with placeholder data; geo will populate on next real connection

**Verify:** New TV pairings populate `tv_pairings` correctly. Heartbeats update `last_heartbeat_utc`. Active/dark status visible in the table.

### Phase 4: Signage impression logging (1 day)

- Update TV apps to emit an impression event for every signage rotation
- New `/signage-impression` endpoint that writes to `signage_impressions` table
- Include `concurrent_players` (already known from active game state) and `context` (lobby/between/results/off-hours)

**Verify:** Tail the table during a live game; impressions flow in with correct concurrent_players values.

### Phase 5: Sync Lambda (1.5 days)

- Build `analytics-sync` with all four source integrations
- Set up Secrets Manager entries
- EventBridge hourly schedule
- Daily-cadence guards on Apple/Google
- Compute cross-source aggregates after external syncs

**Verify:** Manually invoke sync. Cache populates correctly. Re-run is idempotent. Failures in one source don't block others (test by temporarily breaking a credential).

### Phase 6: API Lambda (1.5 days)

- Build `analytics-api` with all 8 endpoints
- Cognito custom authorizer on API Gateway
- Each endpoint returns the exact shape spec'd above

**Verify:** Each endpoint returns valid JSON matching its spec, with auth enforced. Response time < 500ms p95.

### Phase 7: Frontend (2 days)

- Decompose the mockup into the file structure above
- Replace mock data with API calls
- Wire up Cognito auth (login screen → main app)
- Deploy to analytics.taptrivia.tv (operator console — separate from the bar-owner dashboard at admin.taptrivia.tv)

**Verify:** Each tab renders correctly with real data. Date range and compare mode work. Bar drill-in shows real player roster. No console errors.

### Phase 8: Polish (1 day)

- Loading skeletons during fetch
- Error boundaries with friendly messages
- "Refresh" button in topbar that triggers `POST /analytics/refresh` with optimistic UI
- Per-source freshness indicators in the topbar

**Verify:** Dashboard works end-to-end. Adam can log in from a fresh browser, see live data, refresh on demand, and the experience is cohesive.

**Total estimated time:** 9 days of focused work.

---

## 9. Decisions captured (revisitable later)

These are choices made in this spec. Each is intentional, but each is also revisitable:

1. **First-bar attribution** for per-bar MRR. Could change to most-played-bar later; it's a query change, not a schema change.
2. **Hourly sync, not real-time.** Webhooks (RevenueCat, App Store Server Notifications) are better long-term but unnecessary now.
3. **No bar revenue share on signage ads** (per Adam's decision). Schema doesn't include this; adding later requires a `revenue_share_pct` field on `bars` and changes to ad serving (not yet built).
4. **5 PM – 5 AM ET fixed window** for the operating window. Bar timezones captured for reporting only.
5. **Signage "off-hours" tracked but not priced.** Captured in `signage_impressions` with `context = "off_hours_idle"`; never appears in priced inventory views.
6. **MaxMind GeoLite2** over paid alternatives. Switch later if accuracy needs require it.
7. **Cognito with single user.** Multi-user (e.g. accountant access to Finance only) would require a per-tab permission model; not built.

---

## 10. Things explicitly NOT in scope for v1

Don't build these. They're future work.

- Ad serving infrastructure (no ads yet)
- Advertiser dashboards or campaign management
- Bar-facing dashboards (this is operator-only)
- Patron-facing analytics
- Alerting / anomaly detection (CloudWatch alarms can come later)
- Export to CSV / Excel (the data is in DynamoDB; queries can be ad-hoc)
- Mobile responsive design (this is a desktop tool for Adam)
- Internationalization (English/USD only)
- Accessibility audit (single-user tool; revisit if dashboard ever expands)

---

## 11. References

- Mockup file: `/analytics/mockup/taptrivia-analytics-dashboard.jsx`
- RevenueCat API docs: https://www.revenuecat.com/docs/api-v2
- App Store Connect API: https://developer.apple.com/documentation/appstoreconnectapi
- Google Play Developer API: https://developers.google.com/android-publisher
- AWS Cost Explorer: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_Operations_AWS_Cost_Explorer_Service.html
- MaxMind GeoLite2: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
- Existing AWS account: `Adam-Visudo` (3385-4023-6993)

---

**End of spec. Build in order. Ship Phase 1.**
