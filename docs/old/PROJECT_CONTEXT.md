# TapTrivia — Complete Project Context

> Generated 2026-02-15. Comprehensive reference for the entire TapTrivia codebase.

---

## Table of Contents

1. [What Is TapTrivia](#1-what-is-taptrivia)
2. [Architecture Overview](#2-architecture-overview)
3. [Game Timing & Phases](#3-game-timing--phases)
4. [Scoring System](#4-scoring-system)
5. [Backend — Shared Modules](#5-backend--shared-modules)
6. [Backend — Lambda Functions (11)](#6-backend--lambda-functions-11)
7. [DynamoDB Tables (7)](#7-dynamodb-tables-7)
8. [Player App](#8-player-app)
9. [TV App](#9-tv-app)
10. [Terraform Infrastructure](#10-terraform-infrastructure)
11. [Design System](#11-design-system)
12. [Question Bank](#12-question-bank)
13. [Scripts & Build Process](#13-scripts--build-process)
14. [Critical Rules & Integration Notes](#14-critical-rules--integration-notes)

---

## 1. What Is TapTrivia

Live trivia game platform for bars. Synchronized global gameplay every 15 minutes (10 AM–9 PM ET). Players play on mobile browsers, bars optionally display on TVs.

- **Player App:** `https://play.taptrivia.tv` (also `https://taptrivia.tv`)
- **TV App:** `https://tv.taptrivia.tv`
- **API:** `https://api.taptrivia.tv`

**No frameworks. No WebSockets.** Clock-sync + REST polling only. No login — UUID stored in localStorage, sent via `X-Player-ID` header.

---

## 2. Architecture Overview

```
player-app/  → Vanilla JS SPA (mobile web, hosted on CloudFront/S3)
tv-app/      → Vanilla JS SPA (1920x1080 bar display, CloudFront/S3)
backend/     → 11 AWS Lambda functions (Node.js 20.x, DynamoDB)
terraform/   → All infrastructure as code (11 .tf files)
```

**Key design decisions:**
- **No WebSockets:** Games start at known times; clients calculate elapsed time locally
- **Scale-to-zero:** Lambda + on-demand DynamoDB = $0 when idle
- **No login:** UUID in localStorage, sent via X-Player-ID header
- **Shared modules:** `game-clock.js` and `scoring.js` identical across backend, player-app, TV-app
- **Player app is standalone:** TV enhances atmosphere but isn't required
- **All infrastructure as code:** Terraform, single `terraform apply`

---

## 3. Game Timing & Phases

### Schedule
- **Active Window:** 10:00 AM – 9:00 PM ET (44 games/day)
- **Interval:** Every 15 minutes
- **Questions per game:** 15
- **Question duration:** 59 seconds (total game = 14 min 45 sec)

### Question Phases (per 59-second question)

| Phase | Start | End | Duration | Description |
|-------|-------|-----|----------|-------------|
| `category_splash` | 0ms | 5000ms | 5s | Category icon + name zoom |
| `read_time` | 5000ms | 13000ms | 8s | Full 1000 points available |
| `all_answers` | 13000ms | 17000ms | 4s | All 4 answers visible, speed bump |
| `hint_1` | 17000ms | 32000ms | 15s | First wrong answer eliminated |
| `hint_2` | 32000ms | 44000ms | 12s | Second wrong answer eliminated |
| `reveal` | 44000ms | 49000ms | 5s | Correct answer shown |
| `scores` | 49000ms | 59000ms | 10s | Scoreboard between questions |

### Difficulty Ramp

```
Q1-4:  Level 1 (easy)
Q5-9:  Level 2 (medium)
Q10-15: Level 3 (hard)
```

---

## 4. Scoring System

| Time Window | Duration | Points |
|-------------|----------|--------|
| 0–5s | — | 0 (not accepted yet) |
| 5–13s | 8 sec | **1000 (flat)** — read time |
| 13–16s | 3 sec | **1000 → 800** (speed bump) |
| 16–44s | 28 sec | **800 → 0** (linear decay) |
| 44–49s | 5 sec | **0** (answer revealed) |
| 49s+ | — | **0** (closed) |

**Formula:** Linear interpolation within each window. Speed bump: `points = round(1000 - 200 * t)`. Linear decay: `points = round(max * (1 - t))`.

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
  GAME_STATS: 'TapTrivia-GameStats'
}
```

**Exported:** `get`, `put`, `query`, `scan`, `update`, `batchWrite`, `TABLE`

### `game-clock.js` — Game Timing & Phase Logic

**Key constants:**
- `QUESTION_DURATION_MS = 59000`
- `TOTAL_QUESTIONS = 15`
- `GAME_DURATION_MS = 885000` (15 × 59s)

**Key functions:**

| Function | Returns | Purpose |
|----------|---------|---------|
| `getNextGameTime(nowEpoch)` | epoch ms | Current game start or next scheduled |
| `gameTimeslotPK(epochMs)` | `GAME#YYYY-MM-DD#HHMM` | DynamoDB primary key |
| `getGameState(gameStartEpoch, nowEpoch)` | `{gamePhase, questionNumber, questionPhase, ...}` | Full game state at any moment |
| `questionStartEpoch(gameStartEpoch, questionNumber)` | epoch ms | When a specific question starts |
| `getDifficultyForQuestion(questionNumber)` | `1\|2\|3` | Difficulty for question 1–15 |

**`getGameState()` response:**

```javascript
// When active:
{
  gamePhase: 'active',
  questionNumber: 1-15,
  questionPhase: 'category_splash' | 'read_time' | 'all_answers' | 'hint_1' | 'hint_2' | 'reveal' | 'scores',
  elapsedInQuestion: number,   // ms
  canAnswer: boolean,          // true during 5–49s
  pointsAvailable: number,     // from calculatePoints()
  hintsVisible: number[],      // [0] or [0, 1]
  correctRevealed: boolean,    // true from 44s
  questionSecondsRemaining: number
}
```

### `scoring.js` — Points Calculation

```javascript
calculatePoints(elapsedMs) → 0–1000
```

UMD export: works in both Node.js (CommonJS) and browsers (global).

### `questions.js` — Question Selection & LRU Algorithm

**Key constants:** `MAX_PER_CATEGORY = 2` (relaxes to 4 in fallback)

| Function | Purpose |
|----------|---------|
| `selectQuestionsForGame(allCategories, tonightUsedIds, questionCache)` | Select 15 questions for one game |
| `queryQuestions(category, difficulty)` | Query from GSI (paginated) |
| `lruPick(questions, tonightUsedIds)` | Pick from least-recently-used (bottom 30%) |
| `generateEliminateOrder(wrongCount)` | Shuffle-pick 2 of 3 wrong answer indices |

**LRU strategy:** Sort by `lastUsedEpoch` ascending, randomly select from bottom 30%.

---

## 6. Backend — Lambda Functions (11)

### 1. `register-bar` — POST /bar/register

Generates unique 5-char bar code, geo-locates TV via `ip-api.com`.

**Input:** `{ barName, tvDeviceId }` | **Output:** `{ barCode, barName, city, state, isNew }`

Bar code: 5 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (avoids 0/O/1/I/L confusion). Retries up to 5x on collision.

### 2. `get-bar` — GET /bar/{barCode}

**Output:** `{ barCode, barName, city, state, activePlayers, status }`

### 3. `join-bar` — POST /bar/join

Assigns player to bar. Decrements old bar's `activePlayers` if switching. Requires `X-Player-ID` header.

**Input:** `{ barCode }` | **Output:** `{ barCode, barName, activePlayers }`

### 4. `reset-bar-code` — POST /bar/{barCode}/reset

TV-initiated. Marks old bar inactive, generates new code. Verifies `tvDeviceId` matches (403 if not).

**Input:** `{ tvDeviceId }` | **Output:** `{ oldBarCode, newBarCode, barName }`

### 5. `get-current-game` — GET /game/current

Checks for ad-hoc game (PK=`ADHOC_GAME`) first, then scheduled timeslot.

**Output:** `{ gameId, status, startTimeEpoch, currentQuestionNumber, totalQuestions, secondsUntilStart }`

### 6. `get-question` — GET /game/{gameId}/question/{questionNumber}

Deterministic answer shuffling (seeded PRNG from `hash(gameId + questionNumber)`). Gated by timing — can't fetch before question starts (403).

**Output:**
```javascript
{
  questionNumber, question, category, subcategory, difficulty,
  answers: string[4],        // shuffled deterministically
  correctIndex: 0-3,
  eliminateOrder: number[2], // shuffled indices to eliminate
  questionStartEpoch, questionEndEpoch
}
```

### 7. `get-tv-state` — GET /tv/state?barCode={barCode}

TV polls every 2s. Returns full display state. Updates bar's `lastPollAt`.

**Response states:** `break` | `active_game` | `game_over`

Active game includes: question, answers, phase, elapsed time, points, answer percentages, bar leaderboard (top 10), eliminated indices.

### 8. `get-player` — GET/PUT /player/{playerId}

GET: fetch profile. PUT: create/update (displayName 2–16 chars, alphanumeric + spaces).

**Output:** `{ playerId, displayName, currentBarCode, gamesPlayed, totalPoints, createdAt, lastPlayedAt }`

### 9. `submit-answer` — POST /game/{gameId}/answer

**Input:** `{ questionNumber, selectedAnswer, playerName?, clientElapsedMs? }`

Server validates timing (5s–49s window). Client time override if within ±2s of server time (fairness). Answer records get 30-day TTL.

**Output:** `{ correct, pointsAwarded, correctAnswer, totalGameScore, elapsedMs }`

### 10. `get-leaderboard` — GET /game/{gameId}/leaderboard

**Bar type:** `?type=bar&barCode=ABCDE` — available immediately. Top 20, tie-aware ranking.
**Global type:** `?type=global` — only after game ends. 403 if still active. Bar names fetched for top 20.

Both include `you` field if `X-Player-ID` header present.

### 11. `generate-games` — EventBridge Scheduled

Runs daily at 9 AM ET (`cron(0 14 * * ? *)`). Pre-generates all 44 games for the day.

- Loads all categories from QuestionUsage
- Selects 15 questions per game via `selectQuestionsForGame()`
- `tonightUsedIds` Set prevents cross-game repeats
- `questionCache` Map reduces DynamoDB queries
- Batch writes in chunks of 25
- Updates question usage: `lastUsedEpoch`, `usageCount++`
- 512 MB memory, 5-minute timeout

---

## 7. DynamoDB Tables (7)

All use **PAY_PER_REQUEST** billing (on-demand, scale-to-zero).

### TapTrivia-Games
| Key | Pattern |
|-----|---------|
| PK | `GAME#{date}#{time}` (e.g., `GAME#2026-02-15#1430`) |
| GSI | `gameId-index` (hash: gameId) |
| TTL | 7 days |

### TapTrivia-Questions
| Key | Pattern |
|-----|---------|
| PK | `Q#{questionId}` |
| GSI | `category-difficulty-index` (hash: category, range: difficultySort) |

`difficultySort` format: `{difficulty}#{questionId}` (e.g., `2#Q12345`)

### TapTrivia-QuestionUsage
| Key | Pattern |
|-----|---------|
| PK | `USAGE#{category}` |

Simple key-value. Tracks LRU per category.

### TapTrivia-Answers
| Key | Pattern |
|-----|---------|
| PK | `ANSWER#{gameId}#{questionNumber}` |
| SK | `PLAYER#{playerId}` |
| GSI | `game-player-index` (hash: gameId, range: playerId) |
| GSI | `game-bar-index` (hash: gameIdBarCode, range: pointsAwarded) |
| TTL | 30 days |

### TapTrivia-Players
| Key | Pattern |
|-----|---------|
| PK | `PLAYER#{playerId}` |

### TapTrivia-Bars
| Key | Pattern |
|-----|---------|
| PK | `BAR#{barCode}` |
| GSI | `tvDeviceId-index` (hash: tvDeviceId) |
| GSI | `state-index` (hash: state, range: barCode) |

No TTL — bars are permanent.

### TapTrivia-GameStats
| Key | Pattern |
|-----|---------|
| PK | `STAT#{gameId}` |
| GSI | `date-index` (hash: date, range: PK) |
| TTL | Enabled |

---

## 8. Player App

**Location:** `player-app/` — Vanilla JS SPA, no build step, served from S3/CloudFront.

### File Structure

```
player-app/
├── index.html        # Entry point, all screen sections as hidden divs
├── css/styles.css    # All styling (1852 lines)
└── js/
    ├── app.js        # SPA router, screen management (showScreen/hideScreen)
    ├── config.js     # API_BASE, PLAYER_APP_URL
    ├── api.js        # HTTP client (X-Player-ID header)
    ├── player.js     # localStorage state (name, UUID, bar code)
    ├── scoring.js    # Points calculation (shared with backend)
    ├── game-clock.js # Game timing & phases (shared with backend)
    └── screens/
        ├── welcome.js    # Name entry (2–16 chars, alphanumeric + spaces)
        ├── home.js       # Main menu, join game button
        ├── join-bar.js   # 5-char bar code entry (auto-advance inputs)
        ├── lobby.js      # "You're in!" — polls /game/current every 5s
        ├── question.js   # Core gameplay (~560 lines, rAF game loop)
        ├── results.js    # Post-game bar + global leaderboards
        └── profile.js    # Stats, name edit, how to play
```

### Screen Flow

```
Boot → Check localStorage
  ├── No name → Welcome (name entry)
  └── Has name → Home
       └── Join a Game → Join Bar (5-char code)
            └── Success → Lobby (polling for game)
                 └── Game active → Question Screen (15 questions, 60fps rAF loop)
                      └── Post-game → Results (leaderboards)
                           └── Next Game button → Home
```

### Question Screen (`question.js`) — Core Gameplay

Most complex module. Handles:
- Frame-by-frame game loop via `requestAnimationFrame` (60fps)
- Real-time clock sync with server game clock
- Question data fetching
- Answer submission with optimistic client-side feedback
- Points calculation every frame
- Phase transitions and answer state changes
- Between-game break countdown (auto-joins next game if ≤60s away)

**Optimization layers:**
1. **Structural key:** Full DOM rebuild only when question/phase changes
2. **State key:** In-place answer button updates when selection/reveal changes
3. **Fast path:** Every frame updates only 3 DOM elements (points, timer ring, total score)

### Bottom Navigation

3 fixed buttons: Leaderboard (🏆) | Play (▶) | Profile (👤)
Hidden during welcome, join-bar, lobby, and game screens.

### API Endpoints Called

| Endpoint | Method | Called From |
|----------|--------|------------|
| `/player/{id}` | PUT | welcome.js, profile.js |
| `/player/{id}` | GET | profile.js |
| `/bar/join` | POST | join-bar.js |
| `/game/current` | GET | lobby.js, question.js |
| `/game/{gameId}/question/{qNum}` | GET | question.js |
| `/game/{gameId}/answer` | POST | question.js |
| `/game/{gameId}/leaderboard` | GET | results.js |

---

## 9. TV App

**Location:** `tv-app/` — Vanilla JS SPA, display-only (no player interaction), serves 1920×1080.

### File Structure

```
tv-app/
├── index.html        # Viewport scaling (1920×1080 → actual display via CSS scale())
├── css/styles.css    # All styling (1501 lines, 2x from 960×540 prototype)
└── js/
    ├── app.js        # Main controller (1226 lines): screen renderers, polling, local clock
    ├── config.js     # API_BASE, POLL_INTERVAL (2000ms)
    ├── api.js        # HTTP client
    ├── scoring.js    # Shared with backend
    └── game-clock.js # Shared with backend
```

### Key Architecture

- **Single entry point:** `renderScreen(gameState)` drives all screen transitions
- **Polling:** Every 2 seconds via `GET /game/tv-state?barCode={barCode}`
- **Local clock:** 60fps `requestAnimationFrame` for smooth timer/points during gameplay
- **Surgical DOM updates:** Same screen + same question = targeted element updates only (no re-render)
- **Demo mode:** `?demo` URL parameter cycles through all screens with mock data

### 10 Screen Types

| Screen | When | Description |
|--------|------|-------------|
| `setup` | First time | Bar name input, registration |
| `idle` | No game | Attract mode, floating logo |
| `lobby` | Break/pre-game | QR code, player avatars, bar code |
| `getready` | 3s countdown | Pulsing ring countdown |
| `category` | 5s splash | Big emoji, category name, difficulty dots |
| `playing` | 44s gameplay | Question, answers, timer, points, footer scores |
| `reveal` | 5s | Answers show correct/wrong, percentage bars |
| `between` | 10s scores | Podium (1st/2nd/3rd), top 5, countdown to next |
| `leaderboard` | Mid-game | Full top 10 with podium |
| `results` | Game over | Trophy, confetti, podium, final standings |

### Local Clock (60fps)

When playing screen renders:
1. `startLocalClock()` uses `requestAnimationFrame`
2. Calculates phase/elapsed from `localGameStartEpoch + Date.now()`
3. Updates only SVG timer ring + points display (no innerHTML)
4. Stops on screen change

This eliminates choppiness from 2s polling intervals.

### State Machine

```
SETUP → REGISTER BAR → IDLE ↔ LOBBY → GETREADY → CATEGORY → PLAYING → REVEAL → BETWEEN → [loop Q2-15] → RESULTS → IDLE
```

---

## 10. Terraform Infrastructure

11 `.tf` files managing all AWS resources. Backend: S3 state + DynamoDB lock table.

### Resources Summary

| Resource | Details |
|----------|---------|
| **DynamoDB** | 7 tables, all PAY_PER_REQUEST |
| **Lambda** | 11 functions, Node.js 20.x, shared IAM role |
| **API Gateway** | HTTP API (v2), CORS: `*` origin, `X-Player-ID` header |
| **S3** | 3 buckets (lambda deploy, player app, TV app) |
| **CloudFront** | 2 distributions (player + TV), OAC, SPA error routing |
| **EventBridge** | Daily `cron(0 14 * * ? *)` → generate-games |
| **Route 53** | 4 DNS records (play., tv., api., root) |
| **ACM** | Wildcard cert `*.taptrivia.tv` + root |
| **IAM** | Lambda execution role with DynamoDB + CloudWatch |

### API Routes

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

### Lambda Specs

| Function | Memory | Timeout | Trigger |
|----------|--------|---------|---------|
| All API functions | 128 MB | 10s | API Gateway |
| generate-games | 512 MB | 300s (5 min) | EventBridge |

### Security

- S3 buckets: all public access blocked, CloudFront OAC only
- HTTPS enforced (redirect), TLS 1.2 minimum
- ACM wildcard cert for all subdomains
- IAM scoped to `TapTrivia-*` tables
- CORS: allows GET, POST, PUT, OPTIONS from any origin

---

## 11. Design System

**Aesthetic:** "Dark cocktail lounge, not sports bar neon"

**Source of truth:** `taptrivia-design-kit/taptrivia-v4.jsx`

### Fonts
| Role | Font |
|------|------|
| Display/scores | Fredoka |
| Body/UI | Outfit |
| Monospace | DM Mono |

### Colors
```css
--bg-grad: linear-gradient(150deg, #0f0326, #1e0f4a, #3d1866, #6b2358, #a8334a);
--green:  #00d4aa;
--red:    #ff4757;
--gold:   #ffd200;
--blue:   #667eea;
--purple: #764ba2;
```

### Surfaces
- Glass morphism: `backdrop-filter: blur(12px)` with `rgba(255,255,255,0.06)`
- Floating orbs (blue, red, green) with CSS keyframe animations

### Answer Card States
- Default: white bg with colored letter badges (A/B/C/D)
- Selected: blue-purple gradient + glow
- Correct: green gradient + checkmark
- Wrong: red gradient + X
- Eliminated: faded + strikethrough ("NOT {answer}")

### TV Rules
- 2x from 960×540 prototype → 1920×1080
- Minimum 28px font (10ft readability)
- No pure #000 or #FFF (TV haloing)
- Overscan-safe: 48px horizontal, 27px vertical margins
- Slower animations (600–1200ms vs 200–300ms mobile)

---

## 12. Question Bank

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
- Current: 110K+ questions
- 60 categories organized into 6 super-categories
- 3 difficulty levels (1=easy, 2=medium, 3=hard)
- LRU rotation: ~6.8 months before any question repeats

### Category Hierarchy (`topic_tree.json`)
6 super-categories × 10 categories each = 60 categories:
- Geography, Entertainment, History, Art & Culture, Science & Nature, Sports & Leisure

---

## 13. Scripts & Build Process

### `scripts/build-lambdas.sh`
Copies shared modules (`dynamo.js`, `scoring.js`, `game-clock.js`, `questions.js`) + `node_modules/` into each Lambda function directory.

```bash
bash scripts/build-lambdas.sh
```

### `scripts/start-test-game.js`
Create ad-hoc test games outside business hours.

```bash
node scripts/start-test-game.js start    # Game in 90 seconds
node scripts/start-test-game.js stop     # Delete ad-hoc game
node scripts/start-test-game.js status   # Check status
```

Uses PK=`ADHOC_GAME` in Games table. Auto-expires 2 hours via TTL.

### `scripts/reset-questions.js`
Reset all question usage data for a clean slate.

```bash
node scripts/reset-questions.js --confirm
```

### `backend/seed/seed-questions.js`
Load questions from JSON into DynamoDB.

```bash
node backend/seed/seed-questions.js --stage prod --incremental
```

Supports `--local` (DynamoDB Local), `--incremental` (skip existing, preserve usage data).

### `dev.html`
Side-by-side dev view: TV app (1920×1080 scaled) + iPhone mockup. Toggle between local (`localhost:8090/8091`) and cloud URLs.

---

## 14. Critical Rules & Integration Notes

### Shared Module Consistency
`game-clock.js` and `scoring.js` must be **identical** across:
- `backend/shared/` (source of truth)
- `player-app/js/` (copy)
- `tv-app/js/` (copy)

`build-lambdas.sh` handles backend copies. Frontend copies must be updated manually.

### Deterministic Answer Shuffling
Both `get-question` and `get-tv-state` use the same seeded PRNG shuffle:
- Seed = `hash(gameId + questionNumber)`
- Ensures TV and player see identical answer order

### Answer Timing Leniency
`submit-answer` accepts `clientElapsedMs`. If within ±2s of server time, client time is used for scoring (fairness: player sees the points they earned at tap time).

### TTL Cleanup
- ANSWERS: 30 days
- GAMES: 7 days
- Bars: no TTL (permanent)

### Global Leaderboard Lock
Only available after game ends (`now >= gameStartEpoch + 885000ms`). Bar leaderboards available immediately.

### Bar Heartbeat
TV polls `get-tv-state` every 2s, which updates `lastPollAt` (bar activity tracking).

---

## Glossary

| Term | Definition |
|------|-----------|
| **gameId** | UUID identifying a game instance |
| **barCode** | 5-character code displayed on TV for players to join |
| **playerId** | UUID in browser localStorage, sent via X-Player-ID |
| **PK** | DynamoDB partition key (format varies by table) |
| **SK** | DynamoDB sort key (optional composite lookup) |
| **GSI** | Global Secondary Index for querying non-key attributes |
| **Timeslot** | 15-minute game window (e.g., 10:00 AM, 10:15 AM) |
| **LRU** | Least Recently Used — question selection strategy |
| **TTL** | Time To Live — DynamoDB auto-deletes expired records |
| **Eliminate Order** | Indices of 2 wrong answers to reveal as hints |
| **Ad-hoc Game** | Test game outside business hours, PK=`ADHOC_GAME` |
| **OAC** | Origin Access Control — CloudFront → S3 secure access |
