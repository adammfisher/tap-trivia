# Tap Trivia — 02: Backend Architecture

---

## DYNAMODB TABLES

All tables: on-demand billing (PAY_PER_REQUEST). TTL where noted.

---

### Table 1: `TapTrivia-Games`

Pre-generated game instances. One item per timeslot.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `PK` | S | Partition | `GAME#2026-02-10#2015` (date + 24hr time) |
| `gameId` | S | | UUID |
| `startTime` | S | | ISO 8601 with timezone |
| `startTimeEpoch` | N | | Unix epoch millis |
| `questions` | L | | Ordered list of 15 embedded question objects |
| `status` | S | | `scheduled` / `active` / `completed` |
| `createdAt` | S | | ISO 8601 |
| `ttl` | N | | Auto-delete after 7 days |

**Embedded question object:**
```json
{
  "num": 1,
  "questionId": 4821,
  "category": "NHL Hockey",
  "difficulty": 2,
  "question": "How many players from each team are on the ice during regular play?",
  "answer": "6",
  "wrongAnswers": ["5", "7", "8"],
  "eliminateOrder": [1, 0]
}
```

`eliminateOrder`: indices into `wrongAnswers` — first index eliminated at 15s, second at 30s. Third wrong answer stays visible until correct reveal at 45s.

**GSI: `gameId-index`** — PK: `gameId`, Projection: ALL

---

### Table 2: `TapTrivia-Questions`

Full question bank (~108,000 questions at production scale). **Phase 1 testing uses a 100-question seed file (`trivia_questions.json`) in the project root.**

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `PK` | S | Partition | `Q#4821` |
| `questionId` | N | | Unique ID |
| `question` | S | | Question text |
| `answer` | S | | Correct answer |
| `wrongAnswers` | L | | 3 wrong answers |
| `category` | S | | One of 60 categories |
| `subcategory` | S | | Subcategory path |
| `topicLeaf` | S | | Specific topic leaf |
| `difficulty` | N | | 1–5 |
| `sourceType` | S | | `static` / `generated` |
| `shelfLife` | S | | `permanent` / `annual` / `monthly` / `weekly` |
| `expired` | N | | 0 = active, 1 = expired |
| `createdAt` | S | | ISO 8601 |

**GSI: `category-difficulty-index`** — PK: `category`, SK: `difficulty#questionId`, Projection: ALL

**Target distribution:**

| Level | Target % | Target Count |
|-------|----------|-------------|
| L1    | 27%      | 28,800      |
| L2    | 33%      | 36,000      |
| L3    | 20%      | 21,600      |
| L4    | 13%      | 14,400      |
| L5    | 7%       | 7,200       |

---

### Table 3: `TapTrivia-QuestionUsage`

Tracks used questions per category to prevent repeats.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `PK` | S | Partition | `USAGE#NHL Hockey` |
| `usedQuestionIds` | NS | | Set of used question IDs |
| `totalInCategory` | N | | Total active in category |
| `cycleNumber` | N | | Full cycles completed |
| `lastUpdated` | S | | ISO 8601 |

---

### Table 4: `TapTrivia-Answers`

One item per player per question per game.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `PK` | S | Partition | `ANSWER#<gameId>#<questionNum>` |
| `SK` | S | Sort | `PLAYER#<playerId>` |
| `playerId` | S | | localStorage UUID |
| `playerName` | S | | Display name |
| `barCode` | S | | Bar code player joined (empty if solo) |
| `selectedAnswer` | S | | Answer chosen |
| `isCorrect` | BOOL | | |
| `serverTimestamp` | N | | Epoch millis server received |
| `elapsedMs` | N | | Millis since question start |
| `pointsAwarded` | N | | Points from scoring engine |
| `questionNumber` | N | | 1–15 |
| `gameId` | S | | For GSI |
| `ttl` | N | | Auto-delete after 30 days |

**GSI: `game-player-index`** — PK: `gameId`, SK: `playerId`, Projection: ALL
**GSI: `game-bar-index`** — PK: `gameId#barCode`, SK: `pointsAwarded`, Projection: `playerId, playerName, pointsAwarded`

---

### Table 5: `TapTrivia-Players`

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `PK` | S | Partition | `PLAYER#<playerId>` |
| `playerId` | S | | localStorage UUID |
| `displayName` | S | | Current name |
| `currentBarCode` | S | | Bar code currently joined (empty if none) |
| `gamesPlayed` | N | | Lifetime count |
| `totalPoints` | N | | Lifetime points |
| `createdAt` | S | | ISO 8601 |
| `lastPlayedAt` | S | | ISO 8601 |

**Phase 1 note:** No subscription fields. All players can play for free. Subscription fields (`subscriptionStatus`, `subscriptionPlatform`, `subscriptionExpiry`, `receiptData`) will be added in Phase 2 when the native app ships with App Store / Google Play in-app purchases.

---

### Table 6: `TapTrivia-Bars`

Persistent bar registrations. **No TTL — bars keep their codes permanently.**

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `PK` | S | Partition | `BAR#<barCode>` |
| `barCode` | S | | 5-character alphanumeric code (e.g., "K7M2X") |
| `barName` | S | | Bar name entered by owner |
| `tvDeviceId` | S | | Browser fingerprint or localStorage UUID of the TV that registered |
| `activePlayers` | N | | Count of players currently joined |
| `city` | S | | City name from IP geolocation at registration |
| `state` | S | | US state abbreviation (e.g., "TN", "TX") from IP geolocation |
| `country` | S | | Country code (e.g., "US") from IP geolocation |
| `latitude` | N | | Latitude from IP geolocation |
| `longitude` | N | | Longitude from IP geolocation |
| `createdAt` | S | | ISO 8601 — when first registered |
| `lastPollAt` | S | | ISO 8601 — last time TV polled (heartbeat) |
| `status` | S | | `active` / `inactive` |

**No TTL.** Bars keep their code forever. TV app stores the barCode in localStorage and reconnects on reopen.

**GSI: `tvDeviceId-index`** — PK: `tvDeviceId`, Projection: ALL (so a TV can find its existing bar on reopen)

**GSI: `state-index`** — PK: `state`, SK: `barCode`, Projection: ALL (for admin dashboard — bars by state)

Bar codes are 5 characters: uppercase letters + digits, excluding ambiguous characters (0/O, 1/I/L). That gives 30^5 = **24.3 million** possible codes.

**IP Geolocation:** At registration, the `register-bar` Lambda extracts the caller's IP from the API Gateway request context (`event.requestContext.http.sourceIp`) and calls a free geolocation API (e.g., `ip-api.com/json/{ip}`) to populate city, state, country, latitude, and longitude. This runs once at registration — not on every poll. If geolocation fails, fields are stored as empty strings and the bar still registers successfully.

---

### Table 7: `TapTrivia-GameStats` (Phase 1.5 — Admin Dashboard)

One row per completed game. Written by `get-tv-state` Lambda when it detects game completion, or by a post-game summary step in `generate-games`. Powers the admin dashboard's historical views.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `PK` | S | Partition | `STATS#2026-02-10#2015` (date + timeslot) |
| `gameId` | S | | UUID of the game |
| `date` | S | | `2026-02-10` (for date-range queries) |
| `startTime` | S | | ISO 8601 |
| `totalPlayers` | N | | Unique players who answered at least 1 question |
| `totalBars` | N | | Unique bars with at least 1 player |
| `barBreakdown` | L | | List of `{ barCode, barName, city, state, playerCount }` |
| `stateBreakdown` | M | | Map of `{ "TN": 45, "TX": 23, "CA": 12 }` — players per state |
| `ttl` | N | | Auto-delete after 1 year |

**GSI: `date-index`** — PK: `date`, SK: `PK`, Projection: ALL (for querying all games on a given date or date range)

This table is written ONLY after a game completes. No writes during active gameplay. The data is derived from the Answers table + Bars table at game completion.

---

## LAMBDA FUNCTIONS

All Node.js 20.x. Shared code via Lambda Layer or esbuild bundle. **Phase 1: 11 functions total** (no subscription validation). **Phase 1.5 adds 3 admin functions (14 total).**

---

### `register-bar`
**Route:** `POST /bar/register`
**Purpose:** TV app calls this to register a new bar and get a permanent code.
**Logic:**
1. Receive `barName` and `tvDeviceId`
2. Check if this `tvDeviceId` already has a registered bar (GSI lookup) — if yes, return existing bar
3. Extract caller IP from `event.requestContext.http.sourceIp`
4. Call `http://ip-api.com/json/{ip}?fields=status,city,regionName,region,country,countryCode,lat,lon` (free, no API key, 45 req/min limit — fine for registrations)
5. If geolocation succeeds: extract `city`, `state` (regionName), `stateCode` (region), `country` (countryCode), `latitude` (lat), `longitude` (lon)
6. If geolocation fails: set all geo fields to empty strings — do NOT block registration
7. Generate a unique 5-char alphanumeric code
8. Verify code doesn't exist in Bars table (conditional write `attribute_not_exists(PK)`)
9. If collision, regenerate and retry (max 5 attempts)
10. Write bar to Bars table with geo fields (no TTL)
11. Return the bar code + location

**Request:**
```json
{
  "barName": "Murphy's Pub",
  "tvDeviceId": "tv-uuid-abc123"
}
```
**Response (new):**
```json
{
  "barCode": "K7M2X",
  "barName": "Murphy's Pub",
  "city": "Nashville",
  "state": "TN",
  "isNew": true
}
```
**Response (existing TV):**
```json
{
  "barCode": "K7M2X",
  "barName": "Murphy's Pub",
  "city": "Nashville",
  "state": "TN",
  "isNew": false
}
```

---

### `get-bar`
**Route:** `GET /bar/{barCode}`
**Purpose:** TV app calls on reopen to verify its stored bar code is still valid. Also usable by player app to look up bar name.
**Response:**
```json
{
  "barCode": "K7M2X",
  "barName": "Murphy's Pub",
  "city": "Nashville",
  "state": "TN",
  "activePlayers": 12,
  "status": "active"
}
```

---

### `reset-bar-code`
**Route:** `POST /bar/{barCode}/reset`
**Purpose:** Bar owner requests a new code from TV app settings. Old code is retired.
**Logic:**
1. Validate `tvDeviceId` matches the bar's registered TV
2. Mark old bar record as `status: inactive`
3. Generate new 5-char code, create new bar record with same barName
4. Return new code

**Request:**
```json
{
  "tvDeviceId": "tv-uuid-abc123"
}
```
**Response:**
```json
{
  "oldBarCode": "K7M2X",
  "newBarCode": "T9P3N",
  "barName": "Murphy's Pub"
}
```

---

### `join-bar`
**Route:** `POST /bar/join`
**Purpose:** Player app calls when player enters a bar code.
**Logic:**
1. Validate bar code exists and is active
2. Update player's `currentBarCode` in Players table
3. Increment `activePlayers` on bar (atomic counter)
4. Return bar name for confirmation

**Request:**
```json
{
  "barCode": "K7M2X"
}
```
**Response:**
```json
{
  "barCode": "K7M2X",
  "barName": "Murphy's Pub",
  "activePlayers": 23
}
```
**Error (invalid):**
```json
{
  "error": "INVALID_BAR_CODE",
  "message": "That code doesn't match any active bar. Check the TV and try again.",
  "statusCode": 404
}
```

---

### `get-current-game`
**Route:** `GET /game/current`
**Purpose:** Returns current or next game.
**Response:**
```json
{
  "gameId": "uuid",
  "status": "active",
  "startTimeEpoch": 1739228100000,
  "currentQuestionNumber": 7,
  "totalQuestions": 15,
  "secondsUntilStart": null
}
```

---

### `get-question`
**Route:** `GET /game/{gameId}/question/{questionNumber}`
**Purpose:** Returns a single question when clock says available. **Includes eliminateOrder so the player app can drive hint animations locally.**
**Logic:**
1. Calculate `questionStartEpoch = gameStartEpoch + (questionNumber - 1) * 60000`
2. If `now < questionStartEpoch`: return **403**
3. Return question text, all 4 answers (deterministic shuffle seeded by gameId+questionNum), category, difficulty, eliminateOrder (mapped to shuffled indices)
4. Do NOT return correct answer

**Why include eliminateOrder?** The player app must show the same hint eliminations as the TV — it's a standalone experience. `eliminateOrder` only identifies which 2 of 3 wrong answers get eliminated first. After both eliminations, the player still faces a 50/50 between the correct answer and the third wrong answer. Knowing elimination order early provides no cheat advantage.

**Response:**
```json
{
  "questionNumber": 7,
  "question": "How many players from each team are on the ice during regular play?",
  "category": "NHL Hockey",
  "difficulty": 2,
  "answers": ["5", "6", "7", "8"],
  "eliminateOrder": [2, 3],
  "questionStartEpoch": 1739228460000,
  "questionEndEpoch": 1739228510000
}
```

`eliminateOrder` = indices into `answers` array: index 2 ("7") eliminated at 15s, index 3 ("8") at 30s.

---

### `submit-answer`
**Route:** `POST /game/{gameId}/answer`
**Purpose:** Player submits answer. Server scores it.
**Logic:**
1. ~~Validate subscription active~~ (Phase 1: skip — all players can play)
2. `serverTimestamp = Date.now()`
3. `elapsedMs = serverTimestamp - questionStartEpoch`
4. Reject if `elapsedMs > 50000` or `elapsedMs < 5000`
5. Check correctness, calculate points (includes 2s read time — see doc 03)
6. Write to Answers table (conditional: reject duplicate)
7. Return result + running total

**Request:**
```json
{
  "questionNumber": 7,
  "selectedAnswer": "6",
  "playerName": "BeerChamp"
}
```
**Response:**
```json
{
  "correct": true,
  "pointsAwarded": 1000,
  "correctAnswer": "6",
  "totalGameScore": 5230,
  "elapsedMs": 6200
}
```

Note: answer at 6.2s (within 2s read window) = full 1000 points.

---

### `get-leaderboard`
**Route:** `GET /game/{gameId}/leaderboard?type=bar&barCode=K7M2X`
**Purpose:** Returns leaderboard. Two modes with access rules.

- `type=bar&barCode=K7M2X` — Available DURING and after game. All players at that bar sorted by score.
- `type=global` — Available **ONLY after game ends** (all 15 questions completed). Returns `403` if game still active.

**Response (bar):**
```json
{
  "type": "bar",
  "barCode": "K7M2X",
  "barName": "Murphy's Pub",
  "leaders": [
    {"rank": 1, "playerName": "TriviaKing", "score": 8420},
    {"rank": 2, "playerName": "BeerChamp", "score": 7100}
  ],
  "you": {"rank": 2, "playerName": "BeerChamp", "score": 7100},
  "totalPlayers": 23,
  "questionsCompleted": 7
}
```
**Response (global, post-game only):**
```json
{
  "type": "global",
  "leaders": [
    {"rank": 1, "playerName": "TriviaKing", "score": 12450, "barName": "The Pub"},
    {"rank": 2, "playerName": "QuizMaster", "score": 11800, "barName": "O'Malley's"}
  ],
  "you": {"rank": 147, "playerName": "BeerChamp", "score": 5230, "barName": "Murphy's Pub"},
  "totalPlayers": 1842
}
```

---

### `get-tv-state`
**Route:** `GET /game/tv-state?barCode=K7M2X`
**Purpose:** TV polls every 2 seconds. Returns everything the TV needs. Updates `lastPollAt` as heartbeat.

**Phase responses:**

| Phase | TV Shows |
|-------|----------|
| `break` | Bar code, player app URL, player count, countdown to next game |
| `category_splash` (0–5s) | Category + question number + "Get Ready!" |
| `read_time` (5–7s) | Question + 4 answers + "1000 POINTS" frozen |
| `all_answers` (7–15s) | Question + 4 answers + points ticking down |
| `hint_1` (15–30s) | 1st wrong answer: "NOT {answer}" struck through |
| `hint_2` (30–45s) | 2nd wrong answer: "NOT {answer}" struck through |
| `reveal` (45–50s) | Correct answer highlighted green |
| `scores` (50–60s) | Bar leaderboard |
| `game_over` (after Q15) | Bar final → global top 20 |

**Response (hint_1 phase):**
```json
{
  "state": "active_game",
  "barCode": "K7M2X",
  "barName": "Murphy's Pub",
  "activePlayers": 23,
  "gameId": "uuid",
  "questionNumber": 7,
  "totalQuestions": 15,
  "phase": "hint_1",
  "question": "How many players from each team are on the ice during regular play?",
  "category": "NHL Hockey",
  "difficulty": 2,
  "answers": ["5", "6", "7", "8"],
  "eliminated": [
    {"index": 2, "answer": "7", "display": "NOT 7"}
  ],
  "correctAnswer": null,
  "currentPointsAvailable": 385,
  "elapsedSeconds": 22,
  "barLeaderboard": [
    {"rank": 1, "name": "TriviaKing", "score": 5200},
    {"rank": 2, "name": "BeerChamp", "score": 4100}
  ]
}
```

**Response (break):**
```json
{
  "state": "break",
  "barCode": "K7M2X",
  "barName": "Murphy's Pub",
  "activePlayers": 23,
  "nextGameStartEpoch": 1739229000000,
  "secondsUntilNextGame": 127,
  "showBarCode": true,
  "playerAppUrl": "https://d1abc2def.cloudfront.net",
  "lastGameBarLeaderboard": [],
  "lastGameGlobalLeaderboard": []
}
```

`playerAppUrl` comes from a Lambda environment variable (`PLAYER_APP_URL`) set in Terraform. The TV app uses this to generate the QR code.

---

### `generate-games`
**Route:** None — EventBridge scheduled daily at 4:00 PM ET
**Purpose:** Pre-generate all 40 games for tonight using the difficulty ramp and selection algorithm (doc 03).

---

### `get-player`
**Route:** `GET /player/{playerId}` and `PUT /player/{playerId}`
**Purpose:** Get/update player profile (name, current bar, stats).

---

### Phase 1.5 — Admin Dashboard Lambda Functions

These 3 functions power the admin dashboard. They are protected by a simple auth check (see admin dashboard spec in doc 06). Add to Terraform in Phase 1.5.

---

### `admin-get-active-bars`
**Route:** `GET /admin/bars/active`
**Auth:** `Authorization: Basic <base64(admin:admin)>` header — Lambda validates.
**Purpose:** Real-time view of all bars currently online.
**Logic:**
1. Scan Bars table
2. Filter: `lastPollAt` within last 60 seconds AND `status = active`
3. Return list sorted by `activePlayers` descending

**Response:**
```json
{
  "timestamp": "2026-02-10T22:15:00Z",
  "activeBars": 47,
  "totalActivePlayers": 412,
  "bars": [
    {
      "barCode": "K7M2X",
      "barName": "Murphy's Pub",
      "city": "Nashville",
      "state": "TN",
      "activePlayers": 23,
      "lastPollAt": "2026-02-10T22:14:58Z"
    }
  ]
}
```

---

### `admin-get-historical-stats`
**Route:** `GET /admin/stats?from=2026-02-01&to=2026-02-10`
**Auth:** `Authorization: Basic <base64(admin:admin)>` header.
**Purpose:** Historical stats for a date range — totals, by bar, by state.
**Logic:**
1. Query GameStats table `date-index` GSI for date range
2. Aggregate across all games in range
3. Return summary + breakdowns

**Request params:**
- `from` (required): Start date `YYYY-MM-DD`
- `to` (required): End date `YYYY-MM-DD`
- `groupBy` (optional): `bar` | `state` | `day` — default returns all three

**Response:**
```json
{
  "dateRange": { "from": "2026-02-01", "to": "2026-02-10" },
  "summary": {
    "totalGames": 400,
    "totalPlayers": 3842,
    "uniquePlayers": 1247,
    "totalBars": 52,
    "avgPlayersPerGame": 9.6
  },
  "byDay": [
    { "date": "2026-02-01", "games": 40, "players": 380, "bars": 42 },
    { "date": "2026-02-02", "games": 40, "players": 410, "bars": 45 }
  ],
  "byBar": [
    { "barCode": "K7M2X", "barName": "Murphy's Pub", "city": "Nashville", "state": "TN", "totalPlayers": 245, "gamesParticipated": 38 },
    { "barCode": "T9P3N", "barName": "O'Malley's", "city": "Austin", "state": "TX", "totalPlayers": 198, "gamesParticipated": 35 }
  ],
  "byState": [
    { "state": "TN", "totalPlayers": 520, "barCount": 12 },
    { "state": "TX", "totalPlayers": 380, "barCount": 8 },
    { "state": "CA", "totalPlayers": 290, "barCount": 6 }
  ]
}
```

---

### `finalize-game-stats`
**Route:** None — EventBridge scheduled every 15 minutes, offset by 1 minute after each game slot ends
**Purpose:** After each game completes, summarize results into GameStats table for the admin dashboard.
**Logic:**
1. Identify the game that just ended (game whose 15-minute window ended 1 minute ago)
2. Query Answers table for that gameId — get all unique playerIds and their barCodes
3. Look up each bar's geo data from Bars table (batch get)
4. Calculate: totalPlayers, totalBars, barBreakdown (playerCount per bar with geo), stateBreakdown (players per state)
5. Write summary row to GameStats table
6. Mark game status as `completed` in Games table

**EventBridge schedule:** `rate(15 minutes)` — runs at the same cadence as games. Each invocation checks for the most recently ended game that hasn't been finalized yet.

---

## TERRAFORM STRUCTURE

```
terraform/
├── main.tf              # Provider (AWS us-east-1), S3 backend state
├── variables.tf         # stage, region, table names
├── outputs.tf           # API URL, CloudFront distribution URLs, Lambda ARNs
├── api-gateway.tf       # HTTP API, all routes, integrations, CORS
├── lambda.tf            # All 11 Lambda functions + shared layer (Phase 1.5: +3 admin functions)
├── dynamodb.tf          # All 6 tables with GSIs (Phase 1.5: +1 GameStats table)
├── eventbridge.tf       # Daily game generation cron (Phase 1.5: +finalize-game-stats schedule)
├── iam.tf               # Least-privilege roles per Lambda
├── s3.tf                # Lambda deploy bucket + 2 web app buckets (Phase 1.5: +1 admin bucket)
├── cloudfront.tf        # Two CloudFront distributions (Phase 1.5: +1 admin distribution)
└── terraform.tfvars
```

**Key requirements:**
- `aws_apigatewayv2_api` with `protocol_type = "HTTP"`
- `aws_dynamodb_table` with `billing_mode = "PAY_PER_REQUEST"` for all tables
- `archive_file` data source to zip Lambda functions
- EventBridge: `cron(0 21 * * ? *)` (4 PM ET = 21:00 UTC)
- CORS: `Access-Control-Allow-Origin: *`, allow `X-Player-ID` header
- **Bars table: NO `ttl` block** — records persist permanently
- **Bars table: `state-index` GSI** — PK: `state`, SK: `barCode` (for admin dashboard)
- `get-tv-state` Lambda needs `PLAYER_APP_URL` environment variable set to the Player CloudFront distribution URL (from `aws_cloudfront_distribution.player_app.domain_name`)
- `register-bar` Lambda needs outbound internet access (for IP geolocation API call to `ip-api.com`)
- **No ACM certificates or Route53 records** — Phase 1 uses default CloudFront `*.cloudfront.net` domains

### S3 Buckets

| Bucket | Purpose |
|--------|---------|
| `tap-trivia-lambda-deploy` | Lambda function zips |
| `tap-trivia-player-app` | Player web app static files |
| `tap-trivia-tv-app` | TV web app static files |
| `tap-trivia-admin-app` | **(Phase 1.5)** Admin dashboard static files |

Both web app buckets (and admin in Phase 1.5):
- Block all public access (served via CloudFront OAC only)
- Versioning enabled
- No server-side encryption needed (all public content)

### CloudFront Distributions

**No custom domains in Phase 1.** All use the default CloudFront distribution URL (e.g., `d1abc2def.cloudfront.net`) and CloudFront's default SSL certificate.

**Player App Distribution:**
- Origin: `tap-trivia-player-app` S3 bucket via OAC
- Default root object: `index.html`
- Custom error response: 403/404 → `/index.html` with 200 (SPA routing)
- Cache behavior: `*.js, *.css, *.png` → 1 year TTL; `index.html` → 60 second TTL
- HTTPS only, redirect HTTP→HTTPS
- No custom domain or ACM cert — uses default `*.cloudfront.net`

**TV App Distribution:**
- Same configuration as Player App, separate S3 origin (`tap-trivia-tv-app`)
- No custom domain or ACM cert — uses default `*.cloudfront.net`

**Admin App Distribution (Phase 1.5):**
- Same configuration as Player App, separate S3 origin (`tap-trivia-admin-app`)
- No custom domain or ACM cert — uses default `*.cloudfront.net`
- Auth is handled at the API level (Basic auth), not at CloudFront

**Terraform outputs must export both CloudFront domain names** so they can be configured in the web apps' `config.js` and used for the TV lobby display.

---

## ERROR HANDLING

Consistent shape:
```json
{"error": "CODE", "message": "Human readable", "statusCode": 4xx}
```

Codes: `QUESTION_NOT_AVAILABLE` (403), `INVALID_BAR_CODE` (404), `ALREADY_ANSWERED` (409), `GAME_NOT_FOUND` (404), `GLOBAL_LEADERBOARD_NOT_READY` (403), `ANSWER_WINDOW_CLOSED` (403), `BAR_NOT_FOUND` (404), `UNAUTHORIZED_TV` (403)
