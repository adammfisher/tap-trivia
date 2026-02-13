# Tap Trivia — 06: Admin Dashboard (Phase 1.5)

> **Build this AFTER Phase 1 core is working.** This adds observability — it does not change any player-facing or TV behavior.

---

## OVERVIEW

The admin dashboard is a standalone web app that gives you real-time and historical visibility into the Tap Trivia platform. It answers three core questions:

1. **Right now:** Which bars are active, and how many players are at each one?
2. **Over time:** How many total users, broken down by bar?
3. **By geography:** How are users distributed across states?

---

## ARCHITECTURE

```
admin-app (S3 + CloudFront)
    │
    │  Basic Auth header on every API call
    │
    ▼
API Gateway (/admin/* routes)
    │
    ├── admin-get-active-bars     → Scans Bars table (real-time)
    ├── admin-get-historical-stats → Queries GameStats table (historical)
    └── finalize-game-stats       → EventBridge writes GameStats after each game
```

**No new DynamoDB tables for Phase 1 core.** Phase 1.5 adds ONE new table (`TapTrivia-GameStats`) and THREE new Lambda functions. The `register-bar` geo fields (city, state, lat/lon) are part of the Phase 1 Bars table schema.

---

## AUTHENTICATION

**Phase 1.5: Basic Auth (hardcoded)**

Credentials: `admin` / `admin`

The admin app stores credentials in memory (entered via login form). Every API request includes:
```
Authorization: Basic YWRtaW46YWRtaW4=
```

Each admin Lambda validates this header before processing. If invalid → return `401 Unauthorized`.

**This is intentionally simple.** The admin URL is a random CloudFront distribution domain (e.g., `d3xyz789.cloudfront.net`) that nobody will discover. Phase 2 can upgrade to Cognito or API keys.

**Implementation:**
```javascript
// admin-app/js/api.js
const ADMIN_CREDENTIALS = btoa(`${username}:${password}`);

async function adminFetch(path) {
  const res = await fetch(`${CONFIG.API_BASE}${path}`, {
    headers: { 'Authorization': `Basic ${ADMIN_CREDENTIALS}` }
  });
  if (res.status === 401) { showLoginScreen(); return null; }
  return res.json();
}
```

```javascript
// Lambda auth check (shared utility)
function validateAdmin(event) {
  const auth = event.headers?.authorization || '';
  const expected = 'Basic ' + Buffer.from('admin:admin').toString('base64');
  if (auth !== expected) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  return null; // auth passed
}
```

---

## SCREENS

The admin dashboard is a single-page app with three tabs/views.

### Screen 1: Live View (default)

**Purpose:** Real-time snapshot of all active bars.

**Auto-refresh:** Polls `admin-get-active-bars` every 10 seconds.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  TAP TRIVIA ADMIN                    [Live] [History]│
├──────────────────────────────────────────────────────┤
│                                                      │
│  🟢 LIVE NOW                        Updated 10s ago  │
│                                                      │
│  Active Bars: 47    Total Players: 412               │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ BAR NAME          CITY        ST  PLAYERS  LAST │ │
│  │ Murphy's Pub      Nashville   TN    23     3s   │ │
│  │ O'Malley's        Austin      TX    18     5s   │ │
│  │ The Brass Tap     Atlanta     GA    15     2s   │ │
│  │ Corner Pocket     Denver      CO    12     8s   │ │
│  │ ...                                             │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  BY STATE (active)                                   │
│  TN ████████████████ 68                              │
│  TX ████████████ 52                                  │
│  GA ████████ 38                                      │
│  CO ██████ 28                                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Data source:** `GET /admin/bars/active`

**Details:**
- Table sorted by `activePlayers` descending (busiest bars first)
- "LAST" column = seconds since `lastPollAt` (shows freshness)
- Bars with `lastPollAt` > 60s ago are considered offline and excluded
- State bar chart aggregates players across all active bars per state
- Top-level stats (`Active Bars`, `Total Players`) are prominent KPI cards

---

### Screen 2: Historical Stats

**Purpose:** Trends over time with breakdowns by bar and state.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  TAP TRIVIA ADMIN                    [Live] [History]│
├──────────────────────────────────────────────────────┤
│                                                      │
│  📊 HISTORICAL STATS                                 │
│                                                      │
│  Date Range: [2026-02-01] to [2026-02-10]  [Apply]   │
│                                                      │
│  SUMMARY                                             │
│  Total Games: 400   Total Players: 3,842             │
│  Unique Players: 1,247   Active Bars: 52             │
│  Avg Players/Game: 9.6                               │
│                                                      │
│  PLAYERS PER DAY (line chart)                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │    ╱\    ╱\                                     │ │
│  │   ╱  \  ╱  \    ╱\                              │ │
│  │  ╱    \╱    \  ╱  \                             │ │
│  │ ╱           \╱    \                             │ │
│  └─────────────────────────────────────────────────┘ │
│   Feb 1  Feb 2  Feb 3  Feb 4  Feb 5 ...             │
│                                                      │
│  [By Bar ▼]                    [By State ▼]          │
│                                                      │
│  TOP BARS (table)              TOP STATES (bar chart)│
│  Murphy's Pub (TN)  245       TN ████████ 520       │
│  O'Malley's (TX)    198       TX ██████ 380         │
│  The Brass Tap (GA) 167       CA █████ 290          │
│  Corner Pocket (CO) 142       GA ████ 210           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Data source:** `GET /admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Details:**
- Date picker defaults to "last 7 days"
- Line chart: players per day (from `byDay` array)
- "By Bar" table: sorted by `totalPlayers` descending, shows bar name, city, state, total players, games participated
- "By State" horizontal bar chart: sorted by `totalPlayers` descending
- Quick-filter buttons: "Last 7 days", "Last 30 days", "All time"

---

## API ENDPOINTS

All admin endpoints are defined in doc 02 under "Phase 1.5 — Admin Dashboard Lambda Functions." Summary:

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/admin/bars/active` | Real-time active bars + player counts |
| `GET` | `/admin/stats?from=&to=` | Historical stats with bar/state/day breakdowns |
| — | EventBridge (every 15 min) | `finalize-game-stats` writes to GameStats table |

All `GET` endpoints require `Authorization: Basic YWRtaW46YWRtaW4=` header.

---

## TECH STACK

Same as player and TV apps — vanilla HTML/CSS/JS, no framework.

| Dependency | Source | Purpose |
|------------|--------|---------|
| Chart.js | CDN (`cdnjs.cloudflare.com`) | Line charts, bar charts |
| — | Native `fetch` | API calls with Basic auth |

**No build step.** Static files deployed to S3 via `aws s3 sync`.

---

## CONFIG

```javascript
// admin-app/js/config.js
const CONFIG = {
  API_BASE: 'https://your-api-id.execute-api.us-east-1.amazonaws.com',
  POLL_INTERVAL: 10000,  // 10 seconds for live view
};
```

---

## DATA FLOW

### Real-Time (Live View)

```
Every 10 seconds:
  admin-app → GET /admin/bars/active
                 └─→ Scan TapTrivia-Bars table
                 └─→ Filter: lastPollAt < 60s ago AND status = active
                 └─→ Return sorted list + aggregated state counts
```

The `lastPollAt` field is already being written by `get-tv-state` on every TV poll (every 5 seconds). No additional writes needed.

### Historical (Stats View)

```
After each game completes (EventBridge, every 15 min):
  finalize-game-stats Lambda
    └─→ Query Answers table for gameId
    └─→ Batch-get bar geo data from Bars table
    └─→ Calculate breakdowns (by bar, by state)
    └─→ Write to TapTrivia-GameStats table

On admin dashboard request:
  admin-app → GET /admin/stats?from=2026-02-01&to=2026-02-10
                 └─→ Query GameStats date-index GSI
                 └─→ Aggregate across all games in range
                 └─→ Return summary + byDay + byBar + byState
```

---

## DEPLOYMENT

### Terraform Additions (Phase 1.5)

Add to existing Terraform:

1. **DynamoDB:** `TapTrivia-GameStats` table with `date-index` GSI and 365-day TTL
2. **Lambda:** 3 new functions (`admin-get-active-bars`, `admin-get-historical-stats`, `finalize-game-stats`)
3. **API Gateway:** 2 new routes (`GET /admin/bars/active`, `GET /admin/stats`)
4. **EventBridge:** `finalize-game-stats` on `rate(15 minutes)` schedule
5. **S3:** `tap-trivia-admin-app` bucket
6. **CloudFront:** Admin app distribution (same config as player/TV)
7. **IAM:** Admin Lambdas need read access to Bars, Answers, Games tables; read/write to GameStats table

### Deploy Steps

```bash
# 1. Terraform apply (adds new resources alongside existing)
cd terraform && terraform apply

# 2. Note the new admin CloudFront URL from outputs
# 3. Update admin-app/js/config.js with real API URL

# 4. Deploy admin app to S3
aws s3 sync admin-app/ s3://tap-trivia-admin-app --delete

# 5. Invalidate admin CloudFront
aws cloudfront create-invalidation \
  --distribution-id $ADMIN_CF_ID \
  --paths "/*"
```

### Terraform Outputs (add to existing)

```hcl
output "admin_cf_domain" {
  value = aws_cloudfront_distribution.admin_app.domain_name
}
```

---

## PHASE 2 UPGRADES (FUTURE)

When the platform grows, consider:
- **Cognito auth** replacing Basic auth
- **Real-time WebSocket** replacing 10-second polling
- **Map visualization** using lat/lon data (already stored in Bars table)
- **Revenue dashboard** when subscriptions launch in Phase 2
- **Player demographics** — retention rates, return players, average sessions
- **Alerting** — Slack/email notifications when active bars exceed thresholds

---

## BUILD ORDER (FOR CLAUDE CODE)

When building Phase 1.5, give Claude Code this prompt:

```
Read doc 06_ADMIN_DASHBOARD.md and the admin sections of 02_BACKEND_ARCHITECTURE.md.
Build the Phase 1.5 admin dashboard in this order:

1. Add TapTrivia-GameStats DynamoDB table to terraform/dynamodb.tf
2. Add finalize-game-stats Lambda + EventBridge schedule to terraform/
3. Add admin-get-active-bars and admin-get-historical-stats Lambdas
4. Add API Gateway routes for /admin/* with Lambda integrations
5. Add S3 bucket + CloudFront distribution for admin-app
6. Build admin-app — login screen, live view, historical view
7. Deploy and test

The admin app uses Basic auth (admin/admin), Chart.js from CDN,
and vanilla HTML/CSS/JS. No framework.
```
