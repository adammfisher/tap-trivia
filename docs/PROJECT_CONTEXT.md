# TapTrivia — Complete Project Context

> Updated 2026-02-18. Comprehensive reference for the entire TapTrivia codebase.

---

## Table of Contents

1. [What Is TapTrivia](#1-what-is-taptrivia)
2. [Architecture Overview](#2-architecture-overview)
3. [Game Timing & Phases](#3-game-timing--phases)
4. [Scoring System](#4-scoring-system)
5. [Backend — Shared Modules](#5-backend--shared-modules)
6. [Backend — Lambda Functions (16)](#6-backend--lambda-functions-16)
7. [DynamoDB Tables (8)](#7-dynamodb-tables-8)
8. [Player App](#8-player-app)
9. [TV App](#9-tv-app)
10. [Dashboard App](#10-dashboard-app)
11. [Signage System](#11-signage-system)
12. [Terraform Infrastructure](#12-terraform-infrastructure)
13. [Design System](#13-design-system)
14. [Question Bank](#14-question-bank)
15. [Scripts & Build Process](#15-scripts--build-process)
16. [Critical Rules & Integration Notes](#16-critical-rules--integration-notes)

---

## 1. What Is TapTrivia

Live trivia game platform for bars. Synchronized global gameplay every 15 minutes (10 AM–9 PM ET, 44 games/day). Players play on mobile browsers, bars optionally display on TVs. Bar owners manage signage and analytics via a dashboard.

- **Player App:** `https://play.taptrivia.tv` (also `https://taptrivia.tv`)
- **TV App:** `https://tv.taptrivia.tv`
- **Dashboard:** `https://admin.taptrivia.tv`
- **API:** `https://api.taptrivia.tv`

**No frameworks. No WebSockets.** Clock-sync + REST polling only. Players have no login — UUID stored in localStorage, sent via `X-Player-ID` header. Bar owners authenticate via passwordless email OTP.

---

## 2. Architecture Overview

```
player-app/     → Vanilla JS SPA (mobile web, hosted on CloudFront/S3)
tv-app/         → Vanilla JS SPA (1920x1080 bar display, CloudFront/S3)
dashboard-app/  → Vanilla JS SPA (bar owner dashboard, CloudFront/S3)
backend/        → 16 AWS Lambda functions (Node.js 20.x, DynamoDB)
terraform/      → All infrastructure as code (11 .tf files)
```

### Key Design Decisions

- **No WebSockets:** Games start at known times; clients calculate elapsed time locally from a server-provided epoch
- **Scale-to-zero:** Lambda + on-demand DynamoDB = $0 when idle
- **No player login:** UUID in localStorage, sent via `X-Player-ID` header on every request
- **Shared modules:** `game-clock.js` and `scoring.js` identical across backend, player-app, and tv-app
- **Player app is standalone:** TV enhances atmosphere but isn't required
- **All infrastructure as code:** Single `terraform apply` deploys everything
- **Deterministic shuffling:** Seeded PRNG ensures TV and player see identical answer order
- **Clock-sync architecture:** Server provides `startTimeEpoch` once; all clients derive current state from `Date.now() - startTimeEpoch`

### Communication Patterns

| Client | Method | Interval | Endpoint |
|--------|--------|----------|----------|
| Player App (lobby) | REST poll | 5s | `GET /game/current` |
| Player App (game) | Local clock | 60fps rAF | No polling — derives state from epoch |
| Player App (answer) | REST POST | On tap | `POST /game/{gameId}/answer` |
| TV App | REST poll | 2s | `GET /game/tv-state?barCode={code}` |
| TV App (playing) | Local clock | 60fps rAF | Timer/points only — overlaid on 2s data |
| Dashboard | REST | On demand | `GET /dashboard/data`, `PUT /dashboard/signage` |

### Full Project Structure

```
tap-trivia/
├── player-app/           # Mobile player web app
│   ├── index.html        # Entry point, 9 screen sections as hidden divs
│   ├── css/styles.css    # All styling (~1940 lines)
│   └── js/
│       ├── app.js        # SPA router, screen management, bottom nav
│       ├── config.js     # API_BASE, PLAYER_APP_URL
│       ├── api.js        # HTTP client (X-Player-ID header on every request)
│       ├── player.js     # localStorage state (name, UUID, bar code, bar history)
│       ├── scoring.js    # Points calculation (shared with backend)
│       ├── game-clock.js # Game timing & phases (shared with backend)
│       └── screens/
│           ├── welcome.js    # Name entry (2-16 chars)
│           ├── home.js       # Main menu, join game button
│           ├── join-bar.js   # 5-char bar code entry (auto-advance, paste support)
│           ├── lobby.js      # "You're In!" — polls /game/current every 5s
│           ├── question.js   # Core gameplay (rAF game loop, ~560 lines)
│           ├── results.js    # Post-game bar + global leaderboards
│           └── profile.js    # Stats, name edit, bar history, how to play
├── tv-app/               # TV bar display (1920x1080, display-only)
│   ├── index.html        # Viewport scaling + qrcode-generator CDN script
│   ├── css/styles.css    # All styling (~2360 lines, 2x from 960x540 prototype)
│   └── js/
│       ├── app.js        # Main controller (~2016 lines): screens, polling, signage, local clock
│       ├── config.js     # API_BASE, PLAYER_APP_URL, POLL_INTERVAL (2000ms)
│       ├── api.js        # HTTP client
│       ├── scoring.js    # Shared with backend
│       └── game-clock.js # Shared with backend
├── dashboard-app/        # Bar owner dashboard
│   ├── index.html        # Login screen + sidebar dashboard layout
│   ├── css/styles.css    # All styling (~2100 lines)
│   └── js/
│       ├── app.js        # SPA router, sidebar nav, screen management (~122 lines)
│       ├── config.js     # API_BASE, LOGO_BASE
│       ├── api.js        # Bearer token auth, apiCall helper, 401 auto-redirect
│       ├── auth.js       # Session state (currentBar, dashboardData), checkSession()
│       └── screens/
│           ├── login.js          # 3-step OTP flow (credentials → otp → trust)
│           ├── dashboard.js      # Stats overview, quick action cards
│           ├── signage-editor.js # 7 templates, emoji pickers, TV preview (~1307 lines)
│           ├── analytics.js      # Charts, period tabs, player metrics
│           └── logo-upload.js    # Drag-drop upload with Bedrock bg removal
├── backend/
│   ├── shared/           # Single source of truth, copied to each Lambda
│   │   ├── dynamo.js     # DynamoDB DocumentClient + CRUD helpers + pagination
│   │   ├── auth.js       # Dashboard session auth (authenticate, unauthorized)
│   │   ├── game-clock.js # Phase calculation + scheduling (UMD export)
│   │   ├── scoring.js    # Points decay algorithm (UMD export)
│   │   └── questions.js  # Question selection + LRU rotation
│   ├── seed/
│   │   └── seed-questions.js  # Load question bank into DynamoDB
│   └── functions/        # 16 Lambda handlers
│       ├── register-bar/       # POST /bar/register
│       ├── get-bar/            # GET /bar/{barCode}
│       ├── join-bar/           # POST /bar/join
│       ├── reset-bar-code/     # POST /bar/{barCode}/reset
│       ├── get-current-game/   # GET /game/current
│       ├── get-question/       # GET /game/{gameId}/question/{questionNumber}
│       ├── get-tv-state/       # GET /game/tv-state?barCode=XXXXX
│       ├── get-player/         # GET|PUT /player/{playerId}
│       ├── submit-answer/      # POST /game/{gameId}/answer
│       ├── get-leaderboard/    # GET /game/{gameId}/leaderboard
│       ├── generate-games/     # EventBridge scheduled (daily 9 AM ET)
│       ├── send-otp/           # POST /dashboard/auth/otp
│       ├── verify-otp/         # POST /dashboard/auth/verify
│       ├── get-dashboard/      # GET /dashboard/data
│       ├── save-signage/       # PUT /dashboard/signage
│       └── upload-logo/        # POST /dashboard/logo
├── terraform/            # AWS infra (DynamoDB, Lambda, API GW, S3, CloudFront)
├── taptrivia-design-kit/ # Design system source of truth
│   ├── taptrivia-v4.jsx  # Interactive prototype (all screens + phone mockup)
│   ├── tokens/           # TypeScript design tokens
│   └── components/       # React + React Native component libraries
├── docs/                 # 01-06 numbered spec documents + SETUP_GUIDE.md
├── scripts/
│   ├── build-lambdas.sh    # Copies shared modules + node_modules into each Lambda dir
│   ├── start-test-game.js  # Create ad-hoc test games outside business hours
│   └── reset-questions.js  # Reset all question usage data (for launch)
├── trivia_questions.json   # Question bank seed file (110K+ questions)
└── topic_tree.json       # Category/subcategory hierarchy (60 categories)
```

---

## 3. Game Timing & Phases

### Schedule
- **Active Window:** 10:00 AM – 9:00 PM ET (44 games/day, every 15 minutes)
- **Questions per game:** 15
- **Question duration:** 54 seconds
- **Total game duration:** 810,000ms (13 min 30 sec)
- **Results window:** 30,000ms after game ends

### Question Phases (per 54-second question)

| Phase | Start | End | Duration | Description |
|-------|-------|-----|----------|-------------|
| `category_splash` | 0ms | 5,000ms | 5s | Category icon + name zoom in |
| `read_time` | 5,000ms | 13,000ms | 8s | Full 1000 points available |
| `all_answers` | 13,000ms | 17,000ms | 4s | All 4 answers visible, speed bump decay |
| `hint_1` | 17,000ms | 32,000ms | 15s | First wrong answer eliminated |
| `hint_2` | 32,000ms | 44,000ms | 12s | Second wrong answer eliminated |
| `reveal` | 44,000ms | 49,000ms | 5s | Correct answer revealed, 0 points |
| `scores` | 49,000ms | 54,000ms | 5s | Scoreboard between questions |

### Difficulty Ramp

```
Q1-4:   Level 1 (easy)     — DIFFICULTY_RAMP[0..3]
Q5-9:   Level 2 (medium)   — DIFFICULTY_RAMP[4..8]
Q10-15: Level 3 (hard)     — DIFFICULTY_RAMP[9..14]
```

### Clock Sync Flow

1. **Lobby:** Player polls `GET /game/current` → receives `startTimeEpoch` (Unix ms)
2. **Game start:** Stored in localStorage (`ACTIVE_GAME_ID`, `ACTIVE_GAME_START`)
3. **During game:** Every frame calls `getGameState(startTimeEpoch, Date.now())`
4. **All state derived from time:** Question number, phase, points, hints — all deterministic
5. **Rejoin on refresh:** Reads stored epoch from localStorage, resumes at correct question
6. **No server polling during gameplay** (player app) — only on answer submit

---

## 4. Scoring System

| Time Window | Duration | Points | Description |
|-------------|----------|--------|-------------|
| 0–5s | 5s | N/A | Answers not accepted (category splash) |
| 5–13s | 8s | **1000 (flat)** | Read time — full points |
| 13–16s | 3s | **1000 → 800** | Speed bump (fast linear drop) |
| 16–44s | 28s | **800 → 0** | Linear decay (~28.6 pts/sec) |
| 44–49s | 5s | **0** | Reveal phase — answer shown |
| 49s+ | — | **0** | Scoring closed |

**Constants:**
```javascript
ANSWER_START_MS   = 5000   // When answers become tappable
READ_TIME_END_MS  = 13000  // End of full-points window
SPEED_BUMP_END_MS = 16000  // End of speed bump
REVEAL_START_MS   = 44000  // Answer revealed, 0 points
ANSWER_END_MS     = 49000  // Answer window closes
```

**Dual validation:** Client calculates points for instant UI feedback; server recalculates authoritatively. Client's `clientElapsedMs` accepted if within ±2s of server time (fairness for network latency).

---

## 5. Backend — Shared Modules

All live in `backend/shared/` and are copied by `build-lambdas.sh` to each Lambda function's `shared/` directory.

### `dynamo.js` — DynamoDB Client

```javascript
TABLE = {
  GAMES: 'TapTrivia-Games',
  QUESTIONS: 'TapTrivia-Questions',
  QUESTION_USAGE: 'TapTrivia-QuestionUsage',
  ANSWERS: 'TapTrivia-Answers',
  PLAYERS: 'TapTrivia-Players',
  BARS: 'TapTrivia-Bars',
  GAME_STATS: 'TapTrivia-GameStats',
  SESSIONS: 'TapTrivia-Sessions'
}
```

**Exported:** `docClient`, `TABLE`, `get`, `put`, `query`, `scan`, `update`, `batchWrite`

**Features:**
- Automatic pagination for `query`/`scan` (loops until no `LastEvaluatedKey`)
- `batchWrite` auto-chunks to 25 items with exponential backoff (5 retries, 100ms–3.2s)
- Removes `undefined` values from marshalled items
- Supports DynamoDB Local via `DYNAMODB_LOCAL=true` env var

### `game-clock.js` — Game Timing & Phase Logic

**UMD export:** Works in both Node.js (CommonJS) and browsers (global).

**Constants:**
```javascript
QUESTION_DURATION_MS = 54000   // 54 seconds per question
TOTAL_QUESTIONS      = 15
GAME_DURATION_MS     = 810000  // 15 × 54s = 13.5 minutes
RESULTS_DURATION_MS  = 30000   // 30s post-game results window
DIFFICULTY_RAMP      = [1,1,1,1, 2,2,2,2,2, 3,3,3,3,3,3]
```

**Functions:**

| Function | Returns | Purpose |
|----------|---------|---------|
| `getNextGameTime(nowEpoch)` | epoch ms | Current game start or next scheduled (10 AM–9 PM ET, every 15 min) |
| `gameTimeslotPK(epochMs)` | `GAME#YYYY-MM-DD#HHMM` | DynamoDB partition key from epoch |
| `getGameState(gameStartEpoch, nowEpoch)` | `{gamePhase, questionNumber, questionPhase, ...}` | Full game state at any moment |
| `questionStartEpoch(gameStartEpoch, questionNumber)` | epoch ms | When a specific question starts |
| `getDifficultyForQuestion(questionNumber)` | `1\|2\|3` | Difficulty level for question 1–15 |

**`getGameState()` response:**
```javascript
{
  gamePhase: 'pre_game' | 'active' | 'post_game',
  questionNumber: 1-15,
  questionPhase: 'category_splash' | 'read_time' | 'all_answers' | 'hint_1' | 'hint_2' | 'reveal' | 'scores',
  elapsedInQuestion: number,       // ms since question started
  canAnswer: boolean,              // true during 5–49s only
  pointsAvailable: number,         // from calculatePoints()
  hintsVisible: number[],          // [] or [0] or [0, 1] — eliminated answer indices
  correctRevealed: boolean,        // true from 44s onward
  questionSecondsRemaining: number // countdown display value
}
```

### `scoring.js` — Points Calculation

```javascript
calculatePoints(elapsedMs) → 0–1000
```

UMD export: works in both Node.js (CommonJS) and browsers (global).

### `auth.js` — Dashboard Session Authentication

**Dashboard-only module** — only copied to dashboard Lambda functions (send-otp, verify-otp, get-dashboard, save-signage, upload-logo).

**Exports:**
- `authenticate(event)` → `Promise<barRecord|null>` — Extracts Bearer token from `Authorization` header, validates against Sessions table, returns bar record if valid
- `unauthorized()` → `{ statusCode: 401, body: JSON error }` — Standard 401 response

### `questions.js` — Question Selection & LRU Algorithm

**Constants:** `MAX_PER_CATEGORY = 2` (relaxes to 4 in fallback)

| Function | Purpose |
|----------|---------|
| `selectQuestionsForGame(allCategories, tonightUsedIds, questionCache)` | Select 15 questions for one game following difficulty ramp |
| `queryQuestions(category, difficulty)` | Query Questions table via `category-difficulty-index` GSI (paginated) |
| `lruPick(questions, tonightUsedIds)` | Pick randomly from bottom 30% of least-recently-used |
| `generateEliminateOrder(wrongCount)` | Randomly select 2 of 3 wrong answers for hint elimination |

**LRU strategy:** Sort by `lastUsedEpoch` ascending (0 = never used = highest priority), randomly select from bottom 30% for variety.

**Fallback chain:**
1. Target difficulty + category (max 2 per category per game)
2. Adjacent difficulty ±1, ±2 with same category
3. Relax category limit to 4, any difficulty
4. Allow cross-night repeats (should never happen with 110K questions)

---

## 6. Backend — Lambda Functions (16)

All Lambda functions: **Node.js 20.x, 128MB memory, 10s timeout** (except generate-games).

### Player & Bar Management

#### 1. `register-bar` — `POST /bar/register`

Generates unique 5-char bar code, geo-locates TV via `ip-api.com`, sends welcome email via SES.

- **Input:** `{ barName, tvDeviceId, ownerEmail? }`
- **Output:** `{ barCode, barName, city, state, isNew }`
- **Tables:** Bars (write)
- **Integrations:** AWS SES, ip-api.com (geolocation)
- **Bar code charset:** `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (avoids 0/O/1/I/L confusion)
- **Collision handling:** Conditional PutCommand with up to 5 retries
- **Dedup:** Returns existing active bar if `tvDeviceId` already registered (via `tvDeviceId-index` GSI)

#### 2. `get-bar` — `GET /bar/{barCode}`

- **Output:** `{ barCode, barName, city, state, activePlayers, status }`
- **Tables:** Bars (read)

#### 3. `join-bar` — `POST /bar/join`

Assigns player to bar. Handles bar switching (decrements old, increments new). Requires `X-Player-ID` header.

- **Input:** `{ barCode }`
- **Output:** `{ barCode, barName, activePlayers }`
- **Tables:** Bars (read/write), Players (read/write)
- **Logic:** Validates bar exists and is active. Conditional decrement prevents `activePlayers` going below 0.

#### 4. `reset-bar-code` — `POST /bar/{barCode}/reset`

TV-initiated. Marks old bar inactive, generates new code, copies settings/location.

- **Input:** `{ tvDeviceId }`
- **Output:** `{ oldBarCode, newBarCode, barName }`
- **Tables:** Bars (read/write)
- **Auth:** Verifies `tvDeviceId` matches bar ownership (403 if mismatch)

### Game State

#### 5. `get-current-game` — `GET /game/current`

Returns current or next scheduled game. Checks for `ADHOC_GAME` override first.

- **Output:** `{ gameId, status, startTimeEpoch, currentQuestionNumber, totalQuestions, secondsUntilStart }`
- **Tables:** Games (read), Sessions (read for ad-hoc check)
- **Status values:** `active`, `scheduled`, `completed`, `no_game`

#### 6. `get-question` — `GET /game/{gameId}/question/{questionNumber}`

Deterministic answer shuffling via seeded PRNG. Gated by timing — returns 403 if question hasn't started yet.

- **Output:**
  ```javascript
  {
    questionNumber, question, category, subcategory, difficulty,
    answers: string[4],          // shuffled deterministically
    correctIndex: 0-3,           // position after shuffle
    eliminateOrder: number[2],   // shuffled indices to eliminate for hints
    questionStartEpoch, questionEndEpoch
  }
  ```
- **Tables:** Games (read via `gameId-index` GSI)
- **Seeded PRNG:** `seed = hash(gameId + '#' + questionNumber)` → same shuffle for all clients

#### 7. `get-tv-state` — `GET /game/tv-state?barCode={barCode}`

TV's main polling endpoint — called every 2 seconds. Returns full display state. Updates bar's `lastPollAt` as heartbeat.

- **Tables:** Games (read), Answers (read for stats), Bars (read/write for heartbeat)
- **Response states:** `break`, `active_game`, `game_over`
- **Active game includes:** question text, shuffled answers, phase, elapsed time, answer percentages (who picked what), average answer time, bar leaderboard (top 10), eliminated indices
- **Post-game includes:** bar + global leaderboards (top 10)
- **Also returns:** signage config, logoUrl, logoHash for TV display
- **Security:** Hides correct answer until reveal phase

#### 8. `get-player` — `GET /player/{playerId}` or `PUT /player/{playerId}`

- **GET:** Returns player profile
- **PUT:** Create new player (201) or update existing (200)
- **Output:** `{ playerId, displayName, currentBarCode, gamesPlayed, totalPoints, createdAt, lastPlayedAt }`
- **Tables:** Players (read/write)
- **Validation:** `displayName` 2-16 chars, alphanumeric + spaces only

#### 9. `submit-answer` — `POST /game/{gameId}/answer`

- **Input:** `{ questionNumber, selectedAnswer, playerName?, clientElapsedMs? }`
- **Output:** `{ correct, pointsAwarded, correctAnswer, totalGameScore, elapsedMs }`
- **Tables:** Games (read via `gameId-index`), Answers (write), Players (read)
- **Headers:** `X-Player-ID` required
- **Timing validation:** Server enforces 5s–49s answer window
- **Client time override:** If `clientElapsedMs` within ±2s of server time and in valid range, client time used for scoring (fairness)
- **Answer overwriting:** Player can change answer before deadline
- **Composite fields:** `gameIdBarCode` stored for bar leaderboard queries
- **TTL:** 30 days on answer records

#### 10. `get-leaderboard` — `GET /game/{gameId}/leaderboard`

- **Bar type:** `?type=bar&barCode=XXXXX` — available immediately, top 20, tie-aware ranking
- **Global type:** `?type=global` — only after game ends (403 if still active), includes bar names
- **Headers:** `X-Player-ID` (optional) — finds "you" in rankings
- **Tables:** Answers (read via `game-bar-index` or `game-player-index`), Bars (read for bar names)

### Game Generation

#### 11. `generate-games` — EventBridge Scheduled

Runs daily at **9 AM ET** (`cron(0 14 * * ? *)`). Pre-generates all 44 games for the day.

- **Memory:** 128MB | **Timeout:** 10s
- **Logic:**
  1. Loads all categories from QuestionUsage table
  2. For each of 44 timeslots (10:00 AM – 8:45 PM ET):
     - Calls `selectQuestionsForGame()` to pick 15 questions per difficulty ramp
     - `tonightUsedIds` Set prevents cross-game repeats within the day
     - `questionCache` Map reduces DynamoDB queries
  3. Batch writes all games (chunks of 25)
  4. Updates each question's `lastUsedEpoch` + `usageCount`
  5. Sets game TTL to 7 days
- **Output:** Summary with gamesCreated, failedSlots, questionsUsed, categoriesHit, executionTime

### Dashboard Authentication

#### 12. `send-otp` — `POST /dashboard/auth/otp`

Sends 6-digit OTP via email for dashboard login.

- **Input:** `{ email, barCode }`
- **Tables:** Bars (read/write)
- **Integrations:** AWS SES (HTML + plaintext email)
- **Security:**
  - Rate limiting: no OTP within 60s of previous send
  - Always returns 200 (prevents email/barCode enumeration)
  - Resets `otpAttempts` to 0 on successful send
  - OTP expires in 10 minutes (`pendingOtpExpiry`)

#### 13. `verify-otp` — `POST /dashboard/auth/verify`

Validates OTP and creates session token.

- **Input:** `{ email, barCode, otp }`
- **Output:** `{ token, barCode, barName, expiresAt }`
- **Tables:** Bars (read/write), Sessions (write)
- **Security:**
  - Max 5 OTP attempts per code
  - Increments `otpAttempts` on mismatch
  - On success: generates UUID session token, stores in Sessions table (60-day TTL)
  - Marks `emailVerified=true` on bar, clears `pendingOtp` fields

### Dashboard Data & Settings

#### 14. `get-dashboard` — `GET /dashboard/data?period=week`

Returns bar info + analytics. **Auth required** (Bearer token).

- **Query Params:** `period` = `today` | `week` | `month` | `all`
- **Tables:** Answers (query via `barCode-time-index`), Games (query via `gameId-index`)
- **Response includes:**
  - **Bar info:** barCode, barName, city, state, ownerEmail, emailVerified, logoUrl, logoHash, signage config
  - **Summary stats (this week):** playersThisWeek, gamesThisWeek, peakPlayers, avgCorrect%, avgSessionMin
  - **Detailed analytics (selected period):**
    - `playersPerDay` — grouped by day-of-week (Mon–Sun)
    - `peakHours` — top 6 hours in ET with player count and percentage
    - `popularCategories` — top 6 categories by answer count + correct%
    - `retention` — total players, multi-game repeats, multi-night repeats

#### 15. `save-signage` — `PUT /dashboard/signage`

Saves signage configuration to bar record. **Auth required.**

- **Input:** `{ slides, rotationSpeed, enabled }`
- **Validation:**
  - Max 10 slides per bar
  - `rotationSpeed` 5–60 seconds
  - `enabled` must be boolean
  - Each slide: `{ id, template, enabled, data, schedule }`
  - Valid templates: `specials`, `happyhour`, `event`, `brand`, `announcement`, `sports`, `custom`
  - Valid schedule days: Mon–Sun
  - Total payload < 50KB
- **Tables:** Bars (write)

#### 16. `upload-logo` — `POST /dashboard/logo`

Uploads bar logo with optional AI background removal. **Auth required.**

- **Input:** `{ image: base64, contentType: 'image/png'|'image/jpeg', removeBackground?: boolean }`
- **Integrations:** AWS Bedrock (Titan Image Generator v2), AWS S3, AWS CloudFront
- **Validation:** Base64 image < 5MB, JPEG or PNG, minimum 256x256 (Bedrock requirement)
- **Logic:**
  1. Optionally calls Bedrock Titan for background removal (`taskType: BACKGROUND_REMOVAL`)
  2. Uploads to S3 `taptrivia-logos/logos/{barCode}.png`
  3. Computes MD5 hash for cache busting
  4. Invalidates CloudFront cache for TV app
  5. Updates bar record with `logoUrl`, `logoHash`, `logoUpdatedAt`
- **Output:** `{ logoUrl, logoHash }`

---

## 7. DynamoDB Tables (8)

All use **PAY_PER_REQUEST** billing (on-demand, scale-to-zero).

### TapTrivia-Games
| Key | Pattern |
|-----|---------|
| PK | `GAME#{date}#{time}` (e.g., `GAME#2026-02-18#1430`) |
| GSI | `gameId-index` (hash: `gameId`) |
| TTL | 7 days |

Special record: `ADHOC_GAME` PK for test games outside business hours.

### TapTrivia-Questions
| Key | Pattern |
|-----|---------|
| PK | `Q#{questionId}` |
| GSI | `category-difficulty-index` (hash: `category`, range: `difficultySort`) |

`difficultySort` format: `{difficulty}#{questionId}` (e.g., `2#Q12345`) — enables querying by category + difficulty.

### TapTrivia-QuestionUsage
| Key | Pattern |
|-----|---------|
| PK | `USAGE#{category}` |

Simple key-value. Tracks LRU metadata per category: `totalInCategory`, `lastUpdated`, `usedTonight`.

### TapTrivia-Answers
| Key | Pattern |
|-----|---------|
| PK | `ANSWER#{gameId}#{questionNumber}` |
| SK | `PLAYER#{playerId}` |
| GSI | `game-player-index` (hash: `gameId`, range: `playerId`) |
| GSI | `game-bar-index` (hash: `gameIdBarCode`, range: `pointsAwarded`) |
| GSI | `barCode-time-index` (hash: `barCode`, range: `serverTimestamp`) |
| TTL | 30 days |

### TapTrivia-Players
| Key | Pattern |
|-----|---------|
| PK | `PLAYER#{playerId}` |

Fields: `displayName`, `currentBarCode`, `gamesPlayed`, `totalPoints`, `createdAt`, `updatedAt`, `lastPlayedAt`.

### TapTrivia-Bars
| Key | Pattern |
|-----|---------|
| PK | `BAR#{barCode}` |
| GSI | `tvDeviceId-index` (hash: `tvDeviceId`) |
| GSI | `state-index` (hash: `state`, range: `barCode`) |

No TTL — bars are permanent. Fields include: `barName`, `ownerEmail`, `emailVerified`, `city`, `state`, `activePlayers`, `tvDeviceId`, `lastPollAt`, `signage`, `logoUrl`, `logoHash`, `pendingOtp`, `pendingOtpExpiry`, `otpAttempts`.

### TapTrivia-Sessions
| Key | Pattern |
|-----|---------|
| PK | `SESSION#{token}` |
| TTL | 60 days |

Dashboard session tokens. Fields: `barCode`, `createdAt`, `expiresAt`, `ttl` (DynamoDB TTL attribute).

### TapTrivia-GameStats
| Key | Pattern |
|-----|---------|
| PK | `STAT#{gameId}` |
| GSI | `date-index` (hash: `date`, range: `PK`) |
| TTL | 7 days |

Aggregated game statistics.

---

## 8. Player App

**Location:** `player-app/` — Vanilla JS SPA, no build step, served from S3/CloudFront.

### HTML Structure (`index.html`)

**Meta tags:** UTF-8, mobile viewport (no zoom), iOS web app capable, black-translucent status bar.

**Fonts:** Google Fonts — Fredoka (display), Outfit (body), DM Mono (monospace).

**9 Screen Sections (hidden divs):**
1. `#screen-welcome` — Name entry
2. `#screen-home` — Main menu
3. `#screen-join-bar` — 5-char bar code entry
4. `#screen-lobby` — Waiting room ("You're In!")
5. `#screen-game` — Core gameplay (all phases rendered here)
6. `#screen-results` — Post-game leaderboards
7. `#screen-profile` — Player stats & settings
8. `#bottom-nav` — Fixed bottom navigation (3 buttons)
9. `#tt-bg` — Persistent animated gradient background with 3 floating orbs

**Script load order (dependency chain):**
`config.js` → `scoring.js` → `game-clock.js` → `api.js` → `player.js` → screens → `app.js`

### Player Identity System

```javascript
// player.js — UUID generation
Player.getId() {
  let id = localStorage.getItem('tt_player_id');
  if (!id) {
    id = crypto.randomUUID();  // Browser native UUID v4
    localStorage.setItem('tt_player_id', id);
  }
  return id;
}

// api.js — Attached to every request
headers: {
  'Content-Type': 'application/json',
  'X-Player-ID': localStorage.getItem('tt_player_id') || ''
}
```

**localStorage keys:** `tt_player_id`, `tt_player_name`, `tt_bar_code`, `tt_bar_name`, `tt_muted`, `tt_active_game_id`, `tt_active_game_start`, `tt_last_game_id`, `tt_last_game_score`, `tt_bar_history`

**Bar history:** Array of up to 20 previously joined bars (code, name, joinedAt) for quick rejoin from profile screen.

### Screen Flow

```
Boot → Check localStorage
  ├── No name → Welcome (name entry)
  └── Has name
       ├── Active game in localStorage still active? → Rejoin game screen (instant recovery)
       ├── Has bar? → Lobby
       └── No bar → Home
            └── "Join a Game" → Join Bar (5-char code, auto-advance, paste support)
                 └── POST /bar/join success → Lobby (polling for game)
                      └── Game becomes active → Game screen (15 questions, 60fps)
                           └── Post-game → Results (bar + global tabs)
                                └── Next Game → Lobby / Home
```

### SPA Router (`app.js`)

- `App.showScreen(screenId, ...args)` — Hides previous screen (calls `.hide()`), shows new (calls `.show(...args)`)
- `App.getScreenModule(screenId)` — Maps screen IDs to module objects
- `App.startGame(gameId, startTimeEpoch)` — Saves to localStorage, transitions to game screen
- Bottom nav: Leaderboard / Play (context-aware: lobby if at bar, home if not) / Profile
- Bottom nav hidden on: welcome, join-bar screens

### Question Screen (`question.js`) — Core Gameplay

Most complex module (~560 lines). Handles the entire game experience.

**rAF Game Loop:**
```javascript
startGameLoop() {
  const loop = () => {
    this.update();  // Async state check + render
    if (this.animFrame !== null)
      this.animFrame = requestAnimationFrame(loop);
  };
  this.animFrame = requestAnimationFrame(loop);
}
```

**Update cycle per frame:**
1. Call `getGameState(gameStartEpoch, Date.now())` for current phase/question
2. Detect `post_game` → check if next game within 120s (show break countdown) or transition to results
3. Detect question number change → reset answer/question data
4. Fetch question data if needed (`GET /game/{gameId}/question/{qNum}`)
5. Render based on phase: `category_splash` → `renderCategorySplash()`, all others → `renderQuestion()`

**Three-tier rendering optimization:**
1. **Structural key** (`questionNumber|questionPhase`) — Full DOM rebuild (only ~105 times per game)
2. **State key** (`selectedIdx|eliminatedIndices|correctRevealed`) — In-place answer button updates
3. **Fast path** (every frame) — Updates only: points number, timer ring SVG `stroke-dashoffset`, drain bar, total score

**Answer submission flow:**
1. Player taps answer → client calculates points, shows optimistic feedback
2. `POST /game/{gameId}/answer` with `clientElapsedMs`
3. Server responds with authoritative `pointsAwarded` and `totalGameScore`
4. UI updates to match server values

### Join Bar Flow

- 5 separate input fields (`.code-char`), 56x68px, gold text
- Auto-advance on input, auto-backspace on delete
- Paste handler: extracts 5 chars, distributes across inputs
- Uppercase only, alphanumeric validation
- Error: red text + shake animation on invalid code

### Bottom Navigation

3 fixed buttons: Leaderboard / Play / Profile
- Active button: blue color
- Safe area padding for notched devices
- Hidden during welcome, join-bar, game screens

### API Endpoints Called

| Endpoint | Method | Called From |
|----------|--------|------------|
| `/player/{id}` | PUT | welcome.js (create), profile.js (update name) |
| `/player/{id}` | GET | profile.js |
| `/bar/join` | POST | join-bar.js, profile.js (bar history rejoin) |
| `/game/current` | GET | lobby.js (5s poll), question.js (break detection) |
| `/game/{gameId}/question/{qNum}` | GET | question.js |
| `/game/{gameId}/answer` | POST | question.js |
| `/game/{gameId}/leaderboard` | GET | results.js (bar + global) |

### CSS Architecture (`styles.css` — ~1940 lines)

**CSS Variables:**
```css
--bg-grad: linear-gradient(150deg, #0f0326, #1e0f4a, #3d1866, #6b2358, #a8334a);
--green: #00d4aa;  --red: #ff4757;  --gold: #ffd200;  --blue: #667eea;  --purple: #764ba2;
--surface-glass: rgba(255,255,255,0.06);  --surface-glass-border: rgba(255,255,255,0.08);
--text-primary: #f0f0f0;  --text-secondary: rgba(255,255,255,0.5);
--sp-xs: 4px;  --sp-sm: 8px;  --sp-md: 16px;  --sp-lg: 24px;  --sp-xl: 32px;
--radius-sm: 9px;  --radius-md: 14px;  --radius-lg: 16px;  --radius-xl: 24px;
```

**Responsive breakpoints:**
- Mobile-first: 100% width
- `@media (min-width: 768px)`: max-width 600px centered
- `@media (min-width: 1024px)`: max-width 480px centered

**Answer card states:**
- Default: white bg with colored letter badges (A=green, B=gold, C=pink, D=red)
- `.answer-selected`: blue-purple gradient + pulsing glow
- `.answer-tapped`: pulsing during submission
- `.answer-correct`: green gradient + checkmark
- `.answer-wrong`: red gradient + X mark + shake
- `.answer-dimmed`: greyed out (50% opacity)
- `.answer-eliminated`: strikethrough, dashed border, faded

**40+ CSS animations:** `float`, `pulse`, `popIn`, `slideUp`, `shake`, `bounceIn`, `countdownNum`, `ringPulse`, `pointsEarned`, `drainPulse`, `glowPulse`, `fly-up`, etc.

---

## 9. TV App

**Location:** `tv-app/` — Vanilla JS SPA, display-only (no player interaction), 1920x1080.

### HTML Structure (`index.html`)

- Viewport scaling: inline script scales body from 1920x1080 base to actual screen via `transform: scale()`
- External script: `qrcode-generator@1.4.4/qrcode.min.js` for real QR code generation
- Single `#tt-screen` container where all content is swapped
- `#tt-error-overlay` for reconnecting state

### State Management

```javascript
barCode              // 5-char bar code (localStorage)
barName              // Bar name (localStorage)
tvDeviceId           // UUID (localStorage, persistent)
currentScreen        // Current screen name
pollInterval         // 2s API polling interval ID
localGameStartEpoch  // For 60fps local clock
localQuestionNumber  // Current question for local clock
signageSlides        // Array of slide objects from API
signageRotationSpeed // Seconds per slide
signageCurrentIndex  // Current slide in rotation
rotationActive       // Boolean: in screen rotation mode
rotationScreens      // Array of screens to cycle through
rotationIdx          // Current rotation index
```

### Screen Types (10)

| Screen | When | Description |
|--------|------|-------------|
| `setup` | First boot | Bar name + email input, registration or join with code |
| `idle` | No game scheduled | Full-screen signage (if configured) or attract mode (floating logo, CTA) |
| `lobby` | Break/pre-game | Left: QR code (360px) + bar code. Right: player avatar grid. Countdown top-left. Optional signage panel. |
| `getready` | 3s before question | Pulsing ring countdown (3-2-1), "Game Starting" label |
| `category` | 5s splash | Question counter (Q7/15), category emoji + name, difficulty dots (1-3) |
| `playing` | 44s gameplay | Header: logo + points + timer ring + player count. Body: question (left) + 4 answer cards (right). Footer: top 5 leaderboard. 60fps local clock. |
| `reveal` | 5s | Same as playing but answers show correct (green) + percentage bars. Players with green names if correct. |
| `between` | 5s scores flash | Left: standings (top 5). Countdown to next question. Optional signage panel (50% right). |
| `leaderboard` | Post-question | Podium (2nd/1st/3rd) + runners up. Top 10 sidebar. Optional signage panel. |
| `results` | Game over | Trophy emoji, podium, 4th/5th runners, confetti, "Next game in Xs..." Optional signage panel. |

### Screen Rotation (During Breaks)

When API returns `state=break` (between games), the TV cycles through screens:
- `cacheForRotation()` — stores screen data for offline rendering
- `buildRotationList()` — orders screens: results → lobby
- `startRotationTimer()` — per-screen durations: results=30s, lobby=60s
- `exitRotationMode()` — exits when active game detected

### Polling & API Integration

```
Every 2 seconds:
1. GET /game/tv-state?barCode=${barCode}
2. Capture: signage config, gameStartEpoch, logoUrl/logoHash
3. translateApiState(apiResponse) → normalized gameState
4. If state=break → handleScreenRotation()
5. Else → exitRotationMode() + renderScreen(gameState)
```

**`translateApiState()`** converts raw API response to screen-specific state:
- Maps API fields to `screen` property for renderer routing
- Calculates timer remaining (49s - elapsedSeconds)
- Maps category → emoji icon
- Builds leaderboard objects with ranks, movement indicators, streak counts

**Error handling:** 3 consecutive API errors → shows reconnecting overlay. First success → hides overlay.

### Local Clock (60fps)

Separate from polling — runs `requestAnimationFrame` during `playing` screen only:
1. `startLocalClock()` — begins RAF tick loop
2. Each tick: `getGameState(localGameStartEpoch, Date.now())`
3. Updates SVG timer ring `stroke-dashoffset` directly (no innerHTML)
4. Updates timer number + color tier (safe/warning/danger)
5. Updates points value + color class
6. `stopLocalClock()` — cancels when leaving playing screen

### Surgical DOM Updates

Same screen + same question → targeted element updates only (no full re-render):
- `updatePlayingDynamic()` — player badge, answer hints, footer scores
- `updateRevealDynamic()` — player badge, footer scores
- `updateTimerFromState()` — timer ring SVG + text
- `updatePointsFromState()` — points value + color
- `updateAnswerHints()` — adds `.tt-answer--eliminated` class
- `updateFooterScores()` — top 5 footer leaderboard
- `updateResultsCountdown()` / `updateLobbyCountdown()` / `updateBetweenCountdown()` — countdown text

### Helper Functions

- `nameHue(name)` — Deterministic hue from name string for consistent avatar colors
- `logoHTML(size)` — TapTrivia logo: "Tap" (white) + "Trivia" (gold gradient)
- `avatarHTML(name, opts)` — Circular avatar with gradient, rank medals (gold/silver/bronze glow), "you" indicator
- `qrCodeHTML(size)` — Real QR code SVG pointing to `play.taptrivia.tv`
- `qrBadgeHTML(position)` — Glass morphism badge with QR + bar code
- `timerHTML(sec, total, size)` — SVG ring timer, color-coded (green/gold/red)
- `answerCardHTML(text, letterIndex, state, opts)` — Answer card with percentage bar overlay
- `podiumHTML(players)` — Display order: 2nd, 1st (tallest), 3rd
- `leaderboardRowsHTML(players, startRank)` — Rows with movement (arrows) + streak (fire) indicators
- `difficultyHTML(level)` — 1-3 colored dots (green/gold/red)
- `confettiHTML(count)` — CSS confetti animation pieces

### Demo Mode

Enabled via `?demo` URL parameter. Cycles through all screens every 6s with mock data (12 sample players). Lock to specific screen: `?demo&screen=playing`.

### State Machine

```
INIT → Generate/restore tvDeviceId
  ├── ?demo → DEMO LOOP (cycle all screens)
  ├── Stored barCode valid? → Start POLLING
  └── No barCode → SETUP SCREEN
       ├── Register (name+email) → POST /bar/register → Get code → POLLING
       └── Join with code → GET /bar/{code} → POLLING

POLLING (every 2s: GET /game/tv-state)
  ├── state=break → SCREEN ROTATION (lobby ↔ results, 30-60s each)
  └── state=active → RENDER BY PHASE:
       category_splash → CATEGORY
       get_ready → GETREADY (3-2-1)
       read_time/all_answers/hint_1/hint_2 → PLAYING + LOCAL CLOCK (60fps)
       reveal → REVEAL
       scores → BETWEEN
       (post-scores) → LEADERBOARD
       game_over → RESULTS → IDLE
```

---

## 10. Dashboard App

**Location:** `dashboard-app/` — Vanilla JS SPA, bar owner interface, served from S3/CloudFront.

### HTML Structure (`index.html`)

Two main layout sections:
1. `#screen-login` — Full-screen login flow (hidden after auth)
2. `#dashboard-layout` — Sidebar + main content (shown after auth)
   - `#sidebar` — Navigation, bar info, user menu
   - `#main-content` — 4 dashboard screens

**Script load order:** `config.js` → `api.js` → `auth.js` → `login.js` → `dashboard.js` → `signage-editor.js` → `analytics.js` → `logo-upload.js` → `app.js`

### Authentication System

**Token storage (dual-mode):**
- `getToken()` — Checks localStorage first (trusted), then sessionStorage (untrusted)
- `setToken(token, persist)` — localStorage if `persist=true`, sessionStorage if false
- `clearToken()` — Removes from both storages
- **401 auto-redirect:** Any API call returning 401 clears token and redirects to login

| Aspect | Trusted Device | Untrusted Device |
|--------|---------------|-----------------|
| Storage | localStorage | sessionStorage |
| Persistence | Survives browser close | Cleared on tab close |
| Use case | Personal device | Shared/public device |
| TTL (backend) | 60 days | 60 days |
| Choice | User clicks "Trust this computer" | User clicks "Don't trust" |

### OTP Login Flow (`login.js`)

**3-step state machine:**

```
Step 1: CREDENTIALS
  Email input + 6-char barCode input (uppercase, monospace)
  → POST /dashboard/auth/otp { email, barCode }
  → Success: advance to Step 2

Step 2: OTP VERIFICATION
  6 separate digit inputs (auto-advance, paste support)
  Auto-submits when all 6 digits filled
  "Resend code" and "Back to sign in" links
  → POST /dashboard/auth/verify { email, barCode, otp }
  → Success: receives session token, advance to Step 3

Step 3: TRUST DEVICE
  "Trust this computer?" with lock emoji
  → "Yes" → setToken(token, persist=true) → localStorage
  → "No"  → setToken(token, persist=false) → sessionStorage
  → GET /dashboard/data to validate session
  → setAuthState(bar, data)
  → Enter dashboard
```

### Session State (`auth.js`)

```javascript
currentBar    // Bar object (name, code, logo, signage, location)
dashboardData // Full dashboard analytics data

getAuthState()         → { bar: currentBar, data: dashboardData }
setAuthState(bar, data) → Updates both globals
clearAuthState()        → Nullifies both + clearToken()
checkSession()          → GET /dashboard/data, validates existing token on app boot
```

### SPA Router (`app.js`)

- `DashApp.init()` — Boots on DOMContentLoaded; checks session, routes to login or dashboard
- `DashApp.showScreen(screenId)` — Hides all screens, shows one, re-renders sidebar, calls screen render function
- `DashApp.renderSidebar(activePage)` — Renders sidebar with nav items, bar info (logo, name, code), logout

**Sidebar navigation:**
- Dashboard (overview + stats)
- Signage Creator (7 templates)
- Analytics (charts + metrics)
- Logo & Branding (upload)
- Sign Out

### Dashboard Screen (`dashboard.js`)

Overview page with:
1. **TV Status Card** — gradient background, active slide count
2. **4 Stat Cards** — Players this week, games played, avg session, peak players
3. **Tonight's Schedule** — Today's signage slides (filtered by day-of-week)
4. **3 Action Cards** — Quick links to Signage, Analytics, Logo

### Analytics Screen (`analytics.js`)

**Period tabs:** Today | This Week (default) | This Month | All Time

Fetches `GET /dashboard/data?period={period}` on tab change.

**Sections:**
1. **Stat cards** — Total players, games played, avg session, avg correct%
2. **Players per game** — Horizontal bar chart by day-of-week
3. **Popular categories** — Category list with correct% color dots
4. **Peak hours** — Horizontal progress bars (ET time labels)
5. **Player retention** — 1 game / returned same night / came back another night

### Logo Upload Screen (`logo-upload.js`)

**Drag-drop interface:**
- Dropzone card: click or drag-and-drop
- File validation: PNG/JPEG only, max 5MB, must be square (1:1 ±5% tolerance)
- Client-side resize: Canvas to 256x256 PNG
- "Remove background" checkbox (checked by default)
- Upload: `POST /dashboard/logo { image: base64, contentType, removeBackground }`
- Backend uses AWS Bedrock Titan Image Generator v2 for bg removal
- Returns `{ logoUrl, logoHash }` — cache-busted URL

### API Endpoints Called

| Method | Endpoint | Auth | Screen |
|--------|----------|------|--------|
| POST | `/dashboard/auth/otp` | No | login |
| POST | `/dashboard/auth/verify` | No | login |
| GET | `/dashboard/data?period=X` | Bearer | dashboard, analytics, login (session check) |
| PUT | `/dashboard/signage` | Bearer | signage editor |
| POST | `/dashboard/logo` | Bearer | logo upload |

---

## 11. Signage System

The signage system spans the dashboard (editor), backend (storage/validation), and TV app (rendering).

### 7 Templates

| Template | Icon | Fields |
|----------|------|--------|
| `specials` | Beer | emoji, label, headline, subheadline, featuredName/Desc/Price, menuItems[] (max 6) |
| `happyhour` | Cocktail | emoji, timeRange, frequency, deals[] (max 4, each with color swatch) |
| `event` | Music | emoji, eventName, when, details, prizes[] (place, prize, emoji) |
| `brand` | Palm | tagline, hours[] (label, hours) — pulls bar name/logo from auth state |
| `announcement` | Megaphone | emoji, headline, message (textarea), subtext |
| `sports` | Football | emoji, headline, matchup, when, promo, tagline |
| `custom` | Sparkles | emoji, headline, body (textarea), items[] (emoji, text) |

### Slide Data Structure

```javascript
{
  id: string,                    // UUID
  template: 'specials' | 'happyhour' | 'event' | 'brand' | 'announcement' | 'sports' | 'custom',
  enabled: boolean,
  data: { /* template-specific fields */ },
  schedule: {
    days: ['mon', 'tue', 'wed', ...] // day-of-week filter, empty = all days
  }
}
```

### Dashboard Signage Editor (`signage-editor.js` — ~1307 lines)

**State:**
```javascript
{
  slides: [],              // Array of slide objects
  rotationSpeed: 15,       // 15s | 30s | 60s
  enabled: true,           // Master toggle
  editing: null,           // { templateId, data, editIdx } while editing
  selectedDay: 'All Days', // Slide list filter
  previewSlide: 0,         // Preview index
  previewMode: 'offhours', // 'offhours' (full-screen) | 'ingame' (panel)
  dirty: false             // Unsaved changes
}
```

**Two views:**
1. **Slide list** — Template grid (7 cards), "Your Rotation" with slides, live TV preview pane (960x540 scaled)
2. **Slide editor** — Two-column: form (left) + live TV preview (right) with mode toggle (off-hours / in-game)

**Emoji system:** 5 emoji groups (Food & Drink, Events & Music, Sports, Celebrate, General). Modal dropdown pickers. Large version for main slide icon, small inline for menu items.

**TV preview renderers (960x540 canvas):**
- `tvFsXxx()` functions — 7 full-screen renderers (what shows during idle)
- `tvPanelContent()` functions — 7 panel renderers (what shows alongside game leaderboard)
- CSS `transform: scale()` sizes preview to fit responsive container

### TV Signage Rendering (`tv-app/js/app.js`)

**Display modes:**
- **Idle screen:** Full-screen signage with auto-rotation timer
- **Lobby/between/leaderboard/results:** 50% left content + 50% right signage panel (680px at 2x)
- **Playing/reveal/category/getready:** No signage (full game display)

**Rotation logic:**
- `getActiveSlides()` — Filters by: `enabled=true` + day-of-week match
- `startSignageRotation()` — setInterval advances slide every `rotationSpeed` seconds
- During in-game panels: slides advance one per screen render (not continuous)

**Renderer objects:**
- `SIGNAGE_FS` — 7 full-screen template renderers
- `SIGNAGE_PANEL` — 7 panel template renderers
- `renderSignageFullScreen(slide)` → HTML string
- `signagePanelWrapHTML()` → panel HTML with divider

### Backend Validation (`save-signage` Lambda)

- Max 10 slides per bar
- `rotationSpeed` 5–60 seconds
- Valid templates: 7 predefined names
- Valid schedule days: Mon–Sun
- Total payload < 50KB
- Writes to bar record as `signage` attribute

---

## 12. Terraform Infrastructure

11 `.tf` files managing all AWS resources. S3 backend state + DynamoDB lock table.

### Resources Summary

| Resource | Details |
|----------|---------|
| **DynamoDB** | 8 tables, all PAY_PER_REQUEST |
| **Lambda** | 16 functions, Node.js 20.x, shared IAM role |
| **API Gateway** | HTTP API (v2), CORS: `*` origin, `X-Player-ID` + `Authorization` headers |
| **S3** | 4 buckets (lambda deploy, player app, TV app, dashboard app) + logos bucket |
| **CloudFront** | 3 distributions (player + TV + dashboard), OAC, SPA error routing |
| **EventBridge** | Daily `cron(0 14 * * ? *)` → generate-games |
| **Route 53** | DNS records (play., tv., admin., api., root) |
| **ACM** | Wildcard cert `*.taptrivia.tv` + root |
| **IAM** | Lambda execution role: DynamoDB, CloudWatch, S3, SES, Bedrock, CloudFront |

### API Routes (16)

| Route | Method | Lambda |
|-------|--------|--------|
| `/bar/register` | POST | register-bar |
| `/bar/{barCode}` | GET | get-bar |
| `/bar/join` | POST | join-bar |
| `/bar/{barCode}/reset` | POST | reset-bar-code |
| `/game/current` | GET | get-current-game |
| `/game/{gameId}/question/{questionNumber}` | GET | get-question |
| `/game/{gameId}/answer` | POST | submit-answer |
| `/game/{gameId}/leaderboard` | GET | get-leaderboard |
| `/game/tv-state` | GET | get-tv-state |
| `/player/{playerId}` | GET/PUT | get-player |
| `/dashboard/auth/otp` | POST | send-otp |
| `/dashboard/auth/verify` | POST | verify-otp |
| `/dashboard/data` | GET | get-dashboard |
| `/dashboard/signage` | PUT | save-signage |
| `/dashboard/logo` | POST | upload-logo |

### Lambda Specs

| Function | Memory | Timeout | Trigger |
|----------|--------|---------|---------|
| All 15 API functions | 128 MB | 10s | API Gateway |
| generate-games | 128 MB | 10s | EventBridge daily |

### Security

- S3 buckets: all public access blocked, CloudFront OAC only
- HTTPS enforced (redirect), TLS 1.2 minimum
- ACM wildcard cert for all subdomains
- IAM scoped to `TapTrivia-*` tables
- CORS: allows GET, POST, PUT, OPTIONS from any origin
- Dashboard routes require `Authorization: Bearer {token}` header
- OTP rate limiting: 60s cooldown, max 5 attempts, 10-min expiry

---

## 13. Design System

**Aesthetic:** "Dark cocktail lounge, not sports bar neon"

**Source of truth:** `taptrivia-design-kit/taptrivia-v4.jsx`

### Fonts

| Role | Font | Weights |
|------|------|---------|
| Display/scores | Fredoka | 300–900 |
| Body/UI | Outfit | 300–900 |
| Monospace | DM Mono | 400 |

### Colors

```css
--bg-grad: linear-gradient(150deg, #0f0326, #1e0f4a, #3d1866, #6b2358, #a8334a);
--green:   #00d4aa;   /* correct, success, safe timer */
--red:     #ff4757;   /* wrong, error, danger timer */
--gold:    #ffd200;   /* premium, scores, warning timer */
--blue:    #667eea;   /* primary actions, selected states */
--purple:  #764ba2;   /* gradients paired with blue */
```

### Surfaces

- **Glass morphism:** `backdrop-filter: blur(12px)` with `rgba(255,255,255,0.06)` background
- **Glass border:** `rgba(255,255,255,0.08)`
- **Dark surface:** `rgba(0,0,0,0.35)`
- **Floating orbs:** 3 blurred circles (blue 350px, red 280px, green 200px) with CSS keyframe animations

### Answer Card States

| State | Visual |
|-------|--------|
| Default | White bg (#fff) with colored letter badges (A=green, B=gold, C=pink, D=red) |
| Selected | Blue-purple gradient + pulsing glow animation |
| Tapped | Pulsing during submission |
| Correct | Green gradient + checkmark icon |
| Wrong | Red gradient + X icon + shake animation |
| Dimmed | Greyed out (50% opacity) |
| Eliminated | Strikethrough text, dashed border, faded opacity |

### TV-Specific Rules

- **Scaling:** 2x from 960x540 prototype → 1920x1080 output
- **Minimum font:** 28px for 10ft readability
- **TV-safe colors:** No pure #000 (use #0a0218) or #FFF (use #f0f0f0) to avoid haloing
- **Overscan-safe:** 48px horizontal, 27px vertical margins
- **Animation speed:** Slower than mobile (600–1200ms vs 200–300ms)

### Dashboard Design

- **Sidebar:** 240px sticky left, gradient background, bar info + nav + logout
- **Cards:** Dark bg (#111827), subtle border, hover shadow
- **TV preview frames:** 960x540 base, CSS `transform: scale()` to fit container
- **Responsive breakpoints:** 1100px (sidebar collapses), 860px (single column)

---

## 14. Question Bank

### Format

```json
{
  "id": 94722,
  "question": "Which early streaming technology...",
  "answer": "RealPlayer",
  "wrongAnswers": ["Windows Media Player", "QuickTime", "Vorbis"],
  "category": "Social Media & Internet Culture",
  "subcategory": "Internet Culture & History > Online Culture",
  "difficulty": 2,
  "sourceType": "static"
}
```

### Scale

- **Current:** 110K+ questions
- **Categories:** 60 categories organized into 6 super-categories
- **Difficulty:** 3 levels (1=easy, 2=medium, 3=hard)
- **LRU rotation:** ~6.8 months before any question repeats (at 44 games/day × 15 questions)

### Category Hierarchy (`topic_tree.json`)

6 super-categories x 10 categories each = 60 categories:
Geography, Entertainment, History, Art & Culture, Science & Nature, Sports & Leisure

### Deterministic Answer Shuffling

Both `get-question` and `get-tv-state` use the same seeded PRNG:
- Seed = `hash(gameId + '#' + questionNumber)`
- Produces identical shuffle order for all clients
- `eliminateOrder` indices are mapped to shuffled positions

### Hint Elimination

For each question, `generateEliminateOrder()` picks 2 of 3 wrong answers:
- `hint_1` phase (17s): First wrong answer gets `.eliminated` state
- `hint_2` phase (32s): Second wrong answer gets `.eliminated` state
- Remaining wrong answer stays visible until `reveal` phase

---

## 15. Scripts & Build Process

### `scripts/build-lambdas.sh`

Copies shared modules + `node_modules/` into each Lambda function directory. **Must run before `terraform apply`.**

```bash
bash scripts/build-lambdas.sh
```

**What it copies:**
- All functions get: `dynamo.js`, `scoring.js`, `game-clock.js`, `questions.js`
- Dashboard functions only get: `auth.js` (send-otp, verify-otp, get-dashboard, save-signage, upload-logo)
- All functions get: `node_modules/` from `backend/`

### `scripts/start-test-game.js`

Create ad-hoc test games outside business hours.

```bash
node scripts/start-test-game.js start    # Game starts in 90 seconds
node scripts/start-test-game.js stop     # Delete ad-hoc game
node scripts/start-test-game.js status   # Check current status
```

Uses PK=`ADHOC_GAME` in Games table. Checked by `get-current-game` and `get-tv-state` before normal scheduling. Auto-expires via TTL.

### `scripts/reset-questions.js`

Reset all question usage data for a clean slate before launch.

```bash
node scripts/reset-questions.js --confirm [--local]
```

Scans all questions, zeros out `lastUsedEpoch` + `usageCount`. Resets QuestionUsage records.

### `backend/seed/seed-questions.js`

Load questions from JSON into DynamoDB.

```bash
node backend/seed/seed-questions.js --stage prod --incremental
```

- `--local`: DynamoDB Local on port 8000
- `--incremental`: Skip existing questions, preserve usage data
- `--stage prod`: Target production tables

### Development Servers

```bash
cd player-app && python3 -m http.server 8091
cd tv-app && python3 -m http.server 8090
cd dashboard-app && python3 -m http.server 8092
```

### Deploy

```bash
bash scripts/build-lambdas.sh
cd terraform && terraform apply
```

---

## 16. Critical Rules & Integration Notes

### Shared Module Consistency

`game-clock.js` and `scoring.js` must be **identical** across:
- `backend/shared/` (source of truth)
- `player-app/js/` (copy)
- `tv-app/js/` (copy)

`build-lambdas.sh` handles backend copies. **Frontend copies must be updated manually.**

### Auth Module Scope

`backend/shared/auth.js` is **dashboard-only** — only copied to: send-otp, verify-otp, get-dashboard, save-signage, upload-logo. Never included in player/game Lambdas.

### No Build Step

Player-app, tv-app, and dashboard-app are **vanilla JS with no build step** — just static files served from S3/CloudFront. No webpack, no bundler, no transpilation.

### Standalone Apps

- **Player app is fully standalone** — works without TV
- **TV app is display-only** — no player interaction, no answer submission
- **Dashboard app is independent** — separate auth system (Bearer tokens, not X-Player-ID)

### Answer Timing Leniency

`submit-answer` accepts `clientElapsedMs`. If within ±2s of server time and in valid range, client time is used for scoring. This ensures the player sees the points they earned at tap time despite network latency.

### TTL Cleanup

| Record | TTL |
|--------|-----|
| Answers | 30 days |
| Games | 7 days |
| Sessions | 60 days |
| GameStats | 7 days |
| Bars | No TTL (permanent) |
| Players | No TTL (permanent) |
| Questions | No TTL (permanent) |

### Global Leaderboard Lock

Global leaderboard only available after game ends (`now >= gameStartEpoch + GAME_DURATION_MS`). Bar leaderboards available immediately during game.

### Bar Heartbeat

TV polls `get-tv-state` every 2s, which updates `lastPollAt` on bar record (activity tracking).

### On-Demand Billing

All DynamoDB tables use PAY_PER_REQUEST (on-demand). Scale-to-zero cost — $0 when no traffic.

---

## Glossary

| Term | Definition |
|------|-----------|
| **gameId** | UUID identifying a game instance |
| **barCode** | 5-character code displayed on TV for players to join (e.g., `ABCDE`) |
| **playerId** | UUID in browser localStorage, sent via `X-Player-ID` header |
| **tvDeviceId** | UUID identifying a TV device, persisted in TV's localStorage |
| **PK** | DynamoDB partition key (format varies by table) |
| **SK** | DynamoDB sort key (optional composite lookup) |
| **GSI** | Global Secondary Index for querying non-key attributes |
| **Timeslot** | 15-minute game window (e.g., 10:00 AM, 10:15 AM ET) |
| **LRU** | Least Recently Used — question selection strategy |
| **TTL** | Time To Live — DynamoDB auto-deletes expired records |
| **Eliminate Order** | Indices of 2 wrong answers to reveal as hints during hint_1/hint_2 |
| **Ad-hoc Game** | Test game outside business hours, PK=`ADHOC_GAME` in Games table |
| **OAC** | Origin Access Control — CloudFront → S3 secure access |
| **OTP** | One-Time Passcode — 6-digit code for dashboard authentication |
| **Signage** | Bar-configured slides shown on TV during idle/breaks |
| **Panel** | Right-side signage display (680px at 2x) during in-game screens |
| **Structural key** | Optimization: full DOM rebuild only on question/phase change |
| **State key** | Optimization: in-place update on answer selection/elimination change |
| **Fast path** | Optimization: per-frame update of only timer/points/score elements |
| **Speed bump** | 1000→800 point drop during 13–16s (rewards quick answers) |
| **Local clock** | 60fps rAF loop using `getGameState()` for smooth timer/points between API polls |
