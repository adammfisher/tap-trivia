# TV Scores-Phase Data Contract (Phase 0 Audit)

Audit of everything the web TV app (`tv.taptrivia.tv`) has available during the
Scores phase (0:37–0:52 of each 52s question), in support of the two-screen
rotation + house-players task. **Report only — no code changes.**

Audited: 2026-06-12. Reference mockup: `~/Downloads/taptrivia-2screen.jsx`
(not yet in the repo; recommend copying to `docs/` when Phase 3 starts).

---

## 1. Phase mechanics — how the TV detects the Scores phase

**Source of truth:** `backend/shared/game-clock.js` (identical copy at
`tv-app/js/game-clock.js`). `PHASES.SCORES = { start: 37000, end: 52000 }`
within `QUESTION_DURATION_MS = 52000`. ✅ Matches the task spec exactly
(15 s window; the older CLAUDE.md "44s question" text is stale).

Two parallel detection paths in the web TV app:

| Path | Where | How |
|---|---|---|
| Server-driven (poll) | `tv-app/js/app.js` → `translateApiState()` (line ~3214) | `GET /tv-state` every 2 s during active games (`POLL_INTERVAL_ACTIVE` in `tv-app/js/config.js`) returns `phase: 'scores'`; the TV maps it to `gs.screen = 'between'` → `renderBetween(state)` (line ~1992) |
| Local clock (60 fps) | `tv-app/js/app.js` → `startLocalClock()` (line ~2760) | `getGameState(localGameStartEpoch, getServerNow())` from the shared game clock. `localGameStartEpoch` is captured from `apiState.gameStartEpoch` (line ~3075). `getServerNow()` (`tv-app/js/api.js:9`) = `Date.now() + serverTimeOffset`, where the offset is re-synced from the HTTP `Date` header on every API call. |

**Implication for Phase 3 timing:** the TV already has a drift-corrected,
server-synced clock and the shared phase math. The 6 s/9 s split can be derived
as `elapsedInQuestion`: 37000–43000 ms → Screen 1, 43000–52000 ms → Screen 2.
`getGameState()` already returns `elapsedInQuestion`, so a join-in-progress TV
computes the correct screen with zero new state. No setTimeout chain needed.

**Current Scores-phase display being replaced:** `renderBetween()`
(`tv-app/js/app.js` ~1992–2070) — fun-fact card + top-5 standings on the left
half, signage panel on the right half.

---

## 2. Venue record (`TapTrivia-Bars`, PK = `BAR#{barCode}`)

Every field observed across the backend (writers: `register-bar`,
`save-signage`, `upload-logo`, `send-otp`/`verify-otp`, `get-tv-state`
heartbeat, `submit-answer` weekly rollups, `analytics-sync`):

| Field | Type | Written by | Notes |
|---|---|---|---|
| `PK` | string | register-bar | `BAR#{barCode}` |
| `barCode` | string | register-bar | 5 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L) |
| `barName` | string | register-bar | (`locationName` appears as a legacy fallback in reads) |
| `status` | string | register-bar | `'active'` required by get-tv-state |
| `type` | string | analytics-sync reads | venue classification |
| `activePlayers` | number | join-bar | **stale counter** — increments on join, rarely decrements; real-time count is derived from leaderboard length |
| `city`, `state`, `country`, `latitude`, `longitude` | string/number | register-bar | IP geolocation at registration |
| `createdAt`, `lastPollAt` | ISO string | register-bar / get-tv-state | `lastPollAt` is the TV heartbeat (throttled to 30 s) |
| `tvDeviceId` | string? | register-bar | optional, GSI `tvDeviceId-index` |
| `ownerEmail`, `emailVerified` | string?, bool | register-bar | dashboard login identity |
| `pendingOtpHash`, `otpExpiresAt`, `otpAttempts` | — | send-otp/verify-otp | auth transients |
| `signage`, `signageUpdatedAt` | object | save-signage | `{ enabled, rotationSpeed, slides[] }` — 7 templates, per-slide `enabled` + `schedule.days` |
| `logoUrl`, `logoHash` | string | upload-logo | logo + cache-buster |
| `adEligible` | bool | analytics-sync (hourly) | `false` ⇒ get-tv-state withholds signage (fail-open) |
| `scoreIndex`, `weekStart`, `weeklyTotalPoints`, `weeklyTotalQuestions` | number/string | submit-answer | weekly bar-ranking rollups (GSI `StateScoreIndex`) |

**Venue ad asset:** there is **no dedicated "venue ad" field**. The closest
existing concept is `bar.signage.slides[]` — the bar-owner-authored signage
(specials, happyhour, event, brand, announcement, sports, custom), already
day-scheduled and filtered server-side by `filterSignageForDay()` in
get-tv-state. The current Scores-phase right half already renders this as the
in-game signage panel. **Recommendation:** Screen 2's left half ("venue ad")
should render the venue's active signage slide full-half, with the mockup's
clean venue-name/welcome card as the fallback when no slide is active —
no new field needed.

**Settings/flags object:** none exists. Per-venue flags live as **top-level
attributes** on the bar record (`adEligible`, `emailVerified`, …).
**Recommendation:** the Phase 1/2 toggle should follow that convention as a
top-level `housePlayersEnabled` attribute (absent ⇒ enabled, matching the
fail-open pattern used by `adEligible`), pending approval.

---

## 3. Leaderboard API — what the TV (and mobile) actually poll

Two assembly points; **both must inject house players** for TV and mobile to
stay consistent (recommend one shared `backend/shared/` module):

### a) `GET /tv-state?barCode=X` — `backend/functions/get-tv-state/index.js` (the TV's only source)

- Assembly: `getBarLeaderboard(gameId, barCode, limit, excludeQuestion)`
  (lines 134–152) — queries `TapTrivia-Answers` GSI `game-bar-index`
  (`gameIdBarCode = "{gameId}#{barCode}"`), aggregates `pointsAwarded` per
  player, dedupes display names, returns top 10.
- Entry shape: `{ rank, playerName, score }` (no playerId on the wire).
- Sort: score descending; ties share a rank.
- Included as `barLeaderboard` in `active_game` (line ~567), `game_over`
  (~379, ~426) responses; `activePlayers` is derived from its length.
- **Freeze rule:** during playing phases, the current question's answers are
  excluded (`excludeQuestion`) so scores stay frozen until reveal/scores
  (lines 500–503). House-score accrual must respect the same
  question-index semantics (house entries for question N appear when real
  scores for question N appear, i.e. during reveal/scores).
- `state: 'game_over'` also includes `globalLeaderboard` (top 10 cross-venue).

### b) `GET /game/{gameId}/leaderboard?type=bar&barCode=X` — `backend/functions/get-leaderboard/index.js` (mobile + web player)

- Same Answers-table aggregation (`aggregateScores`, lines 19–55); returns
  `leaders` (top 20, `{ rank, playerName, score }`), `you`, `totalPlayers`,
  `questionsCompleted`.
- `type=global` (lines 129–201): cross-venue board, **403 until game end**.

**Injection note:** house players exist only in these responses — they never
write to `TapTrivia-Answers`, `TapTrivia-Players`, or anywhere else, so every
stored-data aggregate excludes them by construction. The `isHouse: true` flag
is additive to the entry shape; clients render entries opaquely (TV:
`p.name || p.playerName`, `p.score`), so extra fields are ignored safely.

---

## 4. Did You Know / fun facts

- **Pipeline exists end-to-end:** question records may carry `funFact`
  (`backend/shared/questions.js:157` copies it into game records;
  `backend/seed/seed-questions.js:98` maps `funFact || fun_fact` at seed time).
  `get-tv-state` returns `funFact: currentQ.funFact || ''` (line 556) in every
  `active_game` response, and `renderBetween()` already renders a
  "DID YOU KNOW?" card from it — hiding it when empty or when it starts with
  the literal placeholder text `"This is a fun fact placeholder"` (app.js ~1999).
- **⚠️ But content is essentially absent:** neither the new master bank
  (`Questions/questions.json`, 176,398 records — fields: `id, question, answer,
  wrong_answers, category, difficulty`) nor `trivia_questions.json` (9,997
  records) contains a single `funFact` value. The live DB (older 100K seed) has
  at most placeholder text, which the TV already filters out.
- **Recommendation:** Phase 3 should keep consuming `state.funFact` with a
  graceful fallback for the empty case (e.g., swap the left half to a generic
  TapTrivia card or extend Screen 2's duration is NOT possible — keep a static
  fallback card). Authoring real fun-fact content is a separate content task.

---

## 5. QR / join link

- Generated client-side in `tv-app/js/app.js` → `qrCodeHTML()` (line 264) using
  the bundled `qrcode` generator; reused by `qrBadgeHTML`,
  `betweenQRBadgeHTML`, `sidebarQRBadgeHTML`.
- **Canonical encoded URL today: `https://app.taptrivia.tv` — hard-coded, with
  no bar code embedded** (line 266). The bar code is displayed as text beside
  the QR; players type it manually.
- The web player app reads **no** join/bar URL parameter (only an `api`
  override in `player-app/js/config.js`). No `?bar=`/`/join/` deep-link format
  exists anywhere in the codebase. (Note: per project memory, the web player
  app is deprecated for production — players use the native apps; a richer
  deep link would need universal-link support, out of scope here.)
- `PLAYER_APP_URL` env var exists on the API responses (`playerAppUrl`) and in
  `tv-app/js/config.js`.
- **Recommendation:** Phase 3's Screen 2 QR should reuse `qrCodeHTML()`
  encoding the existing canonical `https://app.taptrivia.tv` (per constraint 5,
  we do not invent a new deep-link format; venue identity stays on-screen via
  the large 5-char code, exactly as the mockup shows).

---

## 6. National / cross-venue standings

More exists than expected, but **nothing usable mid-game**:

| Aggregate | Where | Availability |
|---|---|---|
| Global per-game leaderboard | `get-leaderboard` `type=global`; `getGlobalLeaderboard()` in get-tv-state | **Post-game only** (explicit 403 / only in `game_over` state) |
| Weekly national top-25 players | `get-between-game-data` → `buildNational()` — `TapTrivia-Players` GSI `WeeklyLeaderboard` (`weekStart` + `weeklyPoints`, written by submit-answer) | Between games (TV `between` endpoint) |
| Bar-vs-bar state/national ranking | `get-between-game-data` → `buildBarStandings()` — `bar.scoreIndex`, GSI `StateScoreIndex` | Between games |
| Business analytics | `backend/functions/analytics-sync/` (Python, hourly) — overview metrics, bar attribution, `adEligible` | Internal |

There is **no during-game cross-venue standings record** equivalent to the
mockup's "TOP ACROSS TAPTRIVIA TONIGHT" strip (a "tonight" aggregate doesn't
exist at all). Per the task spec: **omit the national strip from Screen 1 and
leave a marked extension point.** Not built in this task.

**House-player exclusion audit (for Phase 1):** all aggregates above read
stored data (`Answers`, `Players`, bar rollups written by `submit-answer`).
House players never submit answers and have no player records, so they are
structurally excluded from every existing aggregation path with no code
changes. The `isHouse` flag still ships on API entries for tooling/debugging,
and any *future* code that consumes leaderboard API responses for aggregation
must filter `isHouse === true`.

---

## Flags for confirmation before Phase 1

1. **Venue-record toggle field:** no settings object exists; propose top-level
   attribute `housePlayersEnabled` on the bar record, absent ⇒ enabled
   (fail-open, mirrors `adEligible`). Needs approval (constraint 5).
2. **Admin persistence:** there is **no venue-settings screen and no generic
   settings endpoint** in the dashboard — the only settings write path is
   `PUT /dashboard/signage` (`save-signage`, strict signage-only validation).
   Phase 2 options: (a) add the toggle to the dashboard home screen and extend
   an existing dashboard Lambda to persist the single flag, or (b) a minimal
   new `PUT /dashboard/settings` route following the save-signage pattern.
   Recommend (b) — cleaner than overloading signage validation; needs approval.
3. **Fun-fact content is empty** in both question banks and placeholder-only in
   the live DB. Screen 1's left half needs a defined fallback (static card);
   real fact authoring is a separate content task.
4. **No bar-code deep link exists** — QR encodes bare `https://app.taptrivia.tv`.
   Screen 2 will reuse this canonical URL + large on-screen code (as mocked).
5. **Venue ad source** = existing `bar.signage` slides (day-filtered
   server-side); fallback = venue-name/welcome card. No new field.
6. **Two leaderboard assembly points** (`get-tv-state` and `get-leaderboard`)
   — house injection will live in one shared module
   (`backend/shared/house-players.js`, copied by `build-lambdas.sh`) and be
   called from both.
7. **Mockup location:** `~/Downloads/taptrivia-2screen.jsx` is outside the
   repo; recommend copying to `docs/` for permanence.
