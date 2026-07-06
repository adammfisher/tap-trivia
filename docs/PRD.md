# TapTrivia — Product Requirements Document

**Version:** 2.0 (complete platform inventory)
**Date:** 2026-07-06
**Owner:** Visudo Labs LLC, Brevard NC (Adam Fisher)
**Status:** Reflects the product as built and deployed. Every capability, feature, and function documented here was verified against the codebase on the date above.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Model & Economics](#2-business-model--economics)
3. [System Architecture](#3-system-architecture)
4. [Core Game Design (shared across all products)](#4-core-game-design)
5. [Product: Player Web App](#5-product-player-web-app--apptaptriviatv)
6. [Product: Native Mobile App (iOS / Android)](#6-product-native-mobile-app-ios--android)
7. [Product: TV Web App](#7-product-tv-web-app--tvtaptriviatv)
8. [Product: Native TV Platform Apps (7 platforms)](#8-product-native-tv-platform-apps)
9. [Product: Bar Owner Dashboard](#9-product-bar-owner-dashboard--admintaptriviatv)
10. [Product: Operator Analytics Console](#10-product-operator-analytics-console--analyticstaptriviatv)
11. [Product: Marketing Websites](#11-product-marketing-websites)
12. [Backend Platform (API + Lambdas + Shared Modules)](#12-backend-platform)
13. [Data Model (DynamoDB)](#13-data-model-dynamodb)
14. [Infrastructure (AWS / Terraform)](#14-infrastructure-aws--terraform)
15. [Content: Question Bank & Pipeline](#15-content-question-bank--pipeline)
16. [Developer & Operations Tooling](#16-developer--operations-tooling)
17. [Design System](#17-design-system)
18. [Appendix: Known Gaps, Dead Code & Discrepancies](#18-appendix-known-gaps-dead-code--discrepancies)

---

## 1. Executive Summary

TapTrivia is a **live, synchronized trivia platform for physical venues** (bars, breweries, restaurants, country clubs, and 15+ venue types). A new 15-question trivia game starts **every 15 minutes**, globally synchronized to the wall clock. Guests play on their phones (mobile web or native app); venues display the shared game plus their own **digital signage** on TVs via 7 supported TV platforms. The platform is **free for venues** and monetized through a **$2.99/month consumer subscription** (7-day free trial) in the native mobile app.

The platform comprises **nine deployed products** on one shared backend:

| Product | URL / Distribution | Audience |
|---|---|---|
| Player web app | `https://app.taptrivia.tv` (`play.taptrivia.tv` redirects) | Guests (mobile browser) |
| Native mobile app | App Store (id 6762301564) / Google Play (`tv.taptrivia.mobile`) | Guests (subscription product) |
| TV web app | `https://tv.taptrivia.tv` | Venue TVs (browser + WebView wrappers) |
| Native TV apps | Roku, Apple TV, Fire TV (×3 packages), Samsung Tizen, LG webOS | Venue TVs |
| Bar owner dashboard | `https://admin.taptrivia.tv` | Venue owners |
| Operator analytics console | `https://analytics.taptrivia.tv` | Platform operator (single user) |
| Marketing website | `https://www.taptrivia.com` (apex `taptrivia.tv` redirects) | Venue owners (acquisition) |
| App-store redirect page | `https://app.taptrivia.tv` (desktop/UA-detect) | Guests (QR / business cards) |
| Backend API | `https://api.taptrivia.tv` | All clients |

**Core architectural bet:** no WebSockets, no push. Every client derives the full game state deterministically from a shared **game clock** (game start epoch + server-time-offset-corrected local clock) plus REST polling. Any client that loads mid-game renders the correct phase instantly with zero drift. Deterministic seeded PRNGs (answer shuffling, house players) guarantee byte-identical output across all platforms with no coordination.

---

## 2. Business Model & Economics

- **Venues: free forever.** No cost, no contract, no credit card. Positioning: replaces a hired trivia host ($150–300/event) and a digital-signage service ($50–100/mo) at $0.
- **Consumers: subscription.** "TapTrivia Pro" — `taptrivia_monthly` product, **$2.99/month with 7-day free trial**, sold through Apple/Google IAP and managed by **RevenueCat** (entitlement `TapTrivia Pro`, offering `default`). The mobile app gates game entry at the Lobby behind the paywall; the store (Apple/Google) determines intro-offer eligibility. RevenueCat is the single source of truth for subscription state.
- **Bypass codes:** bar code `DEMO1` bypasses the paywall (app-store review / demo). `__DEV__`/Expo Go builds grant Pro automatically.
- **Attribution:** each subscriber is attributed to the **first bar** they played at (`attributed_bar_code`), powering per-venue MRR in the analytics console (`PER_SUB_MRR = 2.99`). Net revenue reconciled from store actuals when available, else estimated at gross × 0.85.
- **Ad/signage inventory:** venue signage doubles as a future ad platform. Every signage display fires an impression event (content types `bar_promo` / `system` / `house_ad`), aggregated into **audience-seconds** (impressions × duration × concurrent players). An `adEligible` flag (computed nightly) restricts signage inventory to real, verified, non-group venues.
- **State at last snapshot (CONTEXT.md, 2026-05):** pre-revenue; 458 RevenueCat customers, 0 paid/0 trial; 1 demo bar. Free-trial purchase flow fixed and pending production submission.
- **AWS operating cost:** ~$5–6/month pre-revenue; all DynamoDB tables on-demand (scale-to-zero).

---

## 3. System Architecture

```
player-app/          Vanilla JS SPA        → S3 + CloudFront (app.taptrivia.tv)
TapTrivia/           Expo/React Native     → App Store + Google Play
tv-app/              Vanilla JS SPA        → S3 + CloudFront (tv.taptrivia.tv)
tv-app/apps/         7 native TV packages  → Roku/tvOS/Fire TV/Tizen/webOS stores & sideload
dashboard-app/       Vanilla JS SPA        → S3 + CloudFront (admin.taptrivia.tv)
analytics/frontend/  React 18 + Vite       → S3 + CloudFront (analytics.taptrivia.tv)
websites/            React 18 + Vite ×2    → S3 + CloudFront (www.taptrivia.com, app.taptrivia.tv)
backend/             29 Lambda functions   → API Gateway HTTP API (api.taptrivia.tv)
terraform/           16 .tf files          → All AWS infrastructure as code
```

### 3.1 Synchronization model (no WebSockets, by design)

1. **Server-time offset correction.** Every API client (web player, mobile, TV web, tvOS) reads the HTTP `Date` header on each successful response and computes `serverTimeOffset = serverTime − requestMidpoint`. `getServerNow()` = device time + offset. This corrects arbitrary device-clock drift.
2. **Shared game clock.** `game-clock.js` (canonical copy in `backend/shared/`, ports in player-app, tv-app, mobile app, tvOS, Roku) converts `(gameStartEpoch, now)` into the complete game state: question number, phase, points available, hints visible, reveal state. Clients are **deterministic renderers** of the clock — the server never pushes ticks.
3. **REST polling** fills in data the clock can't derive (questions, leaderboards, signage): TV polls `/game/tv-state` at 2s during games / 30s idle / 5s pre-game ramp; player web polls lobby every 10s; mobile ticks its game loop locally at 250ms and fetches per-question.
4. **Deterministic shared PRNG.** Answer shuffling (seeded by `gameId + questionNumber`) and house-player generation (seeded by `gameId + barCode + houseIndex + questionNumber`) use the same string-hash + LCG algorithm on every platform, so all screens show identical answer orders and identical bot scores with zero server state.

### 3.2 Identity & auth models

| Audience | Model |
|---|---|
| Players | Anonymous. UUID generated client-side, persisted (localStorage / AsyncStorage), sent as `X-Player-ID` header. No login, no password. Display name only. |
| Venue owners (dashboard) | Passwordless email OTP: email + bar code → 6-digit code (10-min expiry, 5 attempts, 60s resend cooldown) → opaque session token (60-day TTL; only SHA-256 hash stored server-side). |
| TVs | Device UUID (`tvDeviceId`), paired to a bar via 5-char code (`POST /tv/activate`), heartbeat every 5 min. |
| Operator (analytics) | AWS Cognito custom-auth email OTP (6-digit, 5-min expiry, 3 attempts). Single user. JWT enforced at API Gateway + origin check at Lambda. Token held in memory only. |

### 3.3 Key URLs

- Player: `https://app.taptrivia.tv` · TV: `https://tv.taptrivia.tv` · Dashboard: `https://admin.taptrivia.tv` · Analytics: `https://analytics.taptrivia.tv` · API: `https://api.taptrivia.tv` · Marketing: `https://www.taptrivia.com`
- All web clients support an `?api=<url>` override persisted to localStorage (`?api=prod` clears) for dev/staging testing.

---

## 4. Core Game Design

These rules are defined once in `backend/shared/` and replicated identically in every client. **Any change must be applied to all copies** (backend, player-app, tv-app, TapTrivia mobile, tvOS, Roku).

### 4.1 Game schedule

- Games are generated on **15-minute wall-clock slots**, 96 slots/day, keyed `GAME#YYYY-MM-DD#HHMM` in ET (`America/New_York`), DST-aware.
- A slot remains "current" until `start + 13 min game + 2 min results`; then the next slot takes over — a continuous 15-minute cycle: **13 min gameplay + 2 min results/break**.
- **Game-mode gate** (SSM parameter `/taptrivia/prod/game_mode`, cached 5 min) decides whether games are actually served:
  - `timed` (default): games served **4:00 PM – 4:00 AM ET** (crosses midnight).
  - `all_on`: 24/7. `all_off`: kill switch — clients show signage/"games unavailable".
- **Ad-hoc games:** a special `ADHOC_GAME` record (created by `scripts/start-test-game.js`) overrides the schedule for testing outside game hours.
- **Game generation:** EventBridge triggers `generate-games` daily at 17:00 UTC (noon ET); it idempotently pre-builds **192 slots** (today + tomorrow) with full question sets.

### 4.2 Per-question timeline (52 seconds per question, 15 questions)

| Phase | Window (ms into question) | Player experience |
|---|---|---|
| `category_splash` | 0 – 3,000 | Category + subcategory reveal, 3-2-1 countdown |
| `read_time` | 3,000 – 11,000 | Question shown, answering open, full 1,000 pts |
| `all_answers` | 11,000 – 15,000 | "Speed bump": points decay 1,000 → 800 |
| `hint_1` | 15,000 – 24,000 | 1st wrong answer eliminated; linear decay begins |
| `hint_2` | 24,000 – 31,000 | 2nd wrong answer eliminated |
| `reveal` | 31,000 – 37,000 | Correct answer revealed; answering still accepted (0 pts) until 37s |
| `scores` | 37,000 – 52,000 | Leaderboard/standings interstitial |

- **Answer window:** 3s – 37s. The server independently enforces 4s – 45s (`submit-answer`) as an anti-cheat envelope around the client window.
- **Hints** are wrong-answer eliminations: each question carries an `eliminateOrder` (2 of the 3 wrong answers, pre-shuffled server-side); eliminated cards display as "NOT \<answer\>" and are disabled.
- **Answer changing** is allowed any time before reveal (server overwrites the Answers record).
- **Deferred reveal:** clients compute points optimistically at tap time ("LOCKED IN"), but correctness and score updates are withheld until the reveal (31s) and scores (37s) phases respectively, so nobody can read correctness off a neighbor's phone.

### 4.3 Scoring (max 1,000 points/question)

`calculatePoints(elapsedMs)`:
- < 3,000 ms or > 37,000 ms → **0**
- 3,000 – 11,000 ms (read time) → flat **1,000**
- 11,000 – 15,000 ms (speed bump) → linear **1,000 → 800**
- 15,000 – 31,000 ms → linear **800 → 0** (~50 pts/sec)
- 31,000 – 37,000 ms (post-reveal) → **0**

Points are awarded only for correct answers; server time is authoritative. Maximum game score: 15,000.

### 4.4 Difficulty ramp

`DIFFICULTY_RAMP = [1,1,1,1, 2,2,2,2,2, 3,3,3,3,3,3]` — Q1–4 easy, Q5–9 medium, Q10–15 hard. Three live difficulty levels (bank taxonomy allows 1–5).

### 4.5 Question selection (LRU rotation)

- Per game: 15 questions, categories shuffled, difficulty per the ramp, **max 2 questions per category** per game.
- **LRU pick:** candidate pool = questions not used tonight AND `lastUsedEpoch` older than 30 days; sorted by least-recently-used; random pick from the bottom 30%. Fallback tiers: relax the 30-day rule → widen difficulty ±1, ±2 → raise category cap to 4 and allow cross-night repeats.
- Usage tracking: `lastUsedEpoch`/`usageCount` per question; per-category monitoring records (`USAGE#{category}`).

### 4.6 House players (leaderboard bots)

- Purpose: an empty bar leaderboard kills the vibe. When fewer than 3 real players are at a venue, up to **3 deterministic house players** fill the board, receding 1:1 as real players join.
- Fully deterministic from `(gameId, barCode, houseIndex, questionNumber)` — never stored, byte-identical on every screen and poll. Fixed 15-name bank.
- Behavior: per-question miss probability 0.32/0.38/0.44; hit scores 120–700 pts (capped below a real player's possible max); scores accrue at reveal ("freeze rule").
- **A real player always ranks #1** — house scores are clamped below the top real score.
- House players never appear in global/cross-venue leaderboards. Venue toggle: `housePlayersEnabled` (dashboard Settings; default ON, fail-open).

### 4.7 Display-name rules

- 2–20 characters, `[a-zA-Z0-9 _]`, profanity-filtered server-side (leetspeak-normalized substring + word blocklists → `INAPPROPRIATE_DISPLAY_NAME`).
- **Collision handling:** names stored as-is; deduplication happens at display time per bar+game — first (by playerId) keeps the bare name, others get `_2`, `_3`, … Join flow warns the player ("you'll appear as Name_2").

### 4.8 Groups (social play)

- Any player can create a **group** (`POST /group/create`, name 2–30 chars) — a virtual venue with its own 5-char code in the same namespace as bar codes. Friends join by code exactly like joining a bar; group leaderboards work like bar leaderboards. Groups are excluded from venue analytics, standings, and ad eligibility.

### 4.9 Weekly competitive layer

- **Player weekly leaderboard:** `weeklyPoints`/`weeklyGames` per player, keyed by `weekStart` (Monday, ET, lazy reset), backing the national Top-25 between-games screen.
- **Venue Score Index:** per-bar `weeklyTotalPoints / weeklyTotalQuestions` (rounded) — a per-question efficiency index that resets every Monday, powering state rankings ("Tap Standings") and a national venue rank shown on TVs between games.

---

## 5. Product: Player Web App — app.taptrivia.tv

**Stack:** dependency-free vanilla JS SPA (`player-app/`), no build step, served from S3/CloudFront. Single dark theme. Not an installable PWA (no manifest/service worker; iOS meta tags only).

### 5.1 Screens & flows

| Screen | Capabilities |
|---|---|
| **Welcome** | First-run display-name entry (2–20 chars, validated + shake on error). Generates player UUID, registers via `PUT /player/{id}`. Handles profanity rejection ("Let's keep it clean") and server name-adjustment (`nameWasAdjusted` → shows suffixed name, lets user re-edit or continue). |
| **Home** | Hero + tagline; Join a Game, Create a Group, How It Works. QR hint text (no in-app scanner). |
| **Join** | 5-character code entry across 5 boxes: auto-uppercase, alphanumeric-only, auto-advance, backspace-steps-back, Enter submits, paste distributes. `POST /bar/join`; error shake + message. Same code namespace joins bars **or** groups. |
| **Create Group** | Name (2–30 chars) → `POST /group/create` → auto-join. Success view: code display, **Web Share API** share (clipboard fallback with "Copied!"), Continue → Lobby. |
| **Lobby** | "You're In!" celebration; code + venue name + player card; live player count; 10s status poll + 1s countdown tick; handles `all_off` kill switch ("Games are currently unavailable"); auto-enters game when the clock goes active. |
| **Game** | Core gameplay (below). |
| **Results** | "GAME OVER" + final score; **Location tab** (rank of N at venue, top 10) and **Global tab** (rank of N globally, top 20 with venue names), self highlighted; next-game countdown (M:SS) with **auto-navigation to lobby at ≤60s** ("Auto-joining next game"). Empty state when no recent game. |
| **Profile** | Live stats (games played, total points) via `GET /player/{id}`; display-name editor; current location with Change/Leave; **"My Locations"** history (last 20 bars/groups, one-tap re-join); "How to Play" collapsible; Privacy/Terms links. |

Bottom nav (Leaderboard / Play / Profile); Play is context-aware (lobby if at a venue, else home). **Refresh-proof rejoin:** active game id + start epoch persisted; reloading mid-game drops straight back into the live question.

### 5.2 In-game experience

- Driven by a `requestAnimationFrame` loop reading the shared clock — no server ticks. Keyed rendering prevents animation replays.
- **Category splash:** "QUESTION n OF 15", category emoji (21-entry keyword map), subcategory, 5-4-3-2-1 "GO!" ring.
- **Question view:** live "POINTS AVAILABLE" with color-tiered drain bar (green > 60% / gold ≤ 60% / red ≤ 30%); running TOTAL pill; 35-second SVG timer ring (green/yellow/red at 50%/20%); category badge, Q-counter, progress bar; 4 answer cards (A/B/C/D) with states selected / eliminated ("NOT …") / correct ✓ / dimmed ✗.
- **Answering:** optimistic "LOCKED IN!" with client-computed points; server result stashed and revealed only at 31s; "+X CORRECT!" / "+0 WRONG" / "+0 TIME'S UP"; total updates deferred to the scores phase. Answer changeable pre-reveal; in-flight/tap-spam guards. Submits `clientElapsedMs` + `barCode`.
- **Back-to-back games:** break countdown ("Stay here — auto-joining next game"), polls for the next game and seamlessly resets state into it; falls back to Results if none appears.

### 5.3 API usage

`PUT/GET /player/{id}`, `POST /bar/join`, `POST /group/create`, `GET /game/current`, `GET /game/{id}/question/{n}`, `POST /game/{id}/answer`, `GET /game/{id}/leaderboard?type=bar|global`. All with `X-Player-ID`; `Date`-header clock sync; network errors surfaced as friendly messages.

---

## 6. Product: Native Mobile App (iOS / Android)

**Stack:** Expo SDK 54 / React Native 0.81 / React 19 / TypeScript strict (`TapTrivia/`). iPhone-only iOS (`com.visudolabs.taptrivia.app`, ASC app 6762301564) + Android (`tv.taptrivia.mobile`, Play track production). Dev variant apps via `APP_VARIANT=dev`. EAS build profiles: development / simulator / test / test-device / preview / production (auto-increment).

**This is the monetized player client.** Feature parity with the web player plus native-only capabilities.

### 6.1 Navigation & flow

`Welcome → Join / Create Group / Saved bar / Solo → Nickname → Lobby → Category → Playing → LockedIn → Correct|Wrong → Between → (×15) → Results → auto-return to Lobby`. Game stack is server-driven (`navigation.replace`, gestures disabled, no animations — the clock owns transitions). Modals: Subscription, Settings, Terms, Privacy, Feedback, EditNickname.

### 6.2 Screens (deltas vs web noted)

- **Welcome:** Join a Game / Create a Group / **Play Solo** (unique to mobile: `barCode='SOLO'`, global leaderboard scope, rank UI hidden) / **Saved locations** list (persistent, one-tap rejoin). Polls game mode every 60s; `all_off` → "Games currently unavailable" + TV-app promo banners. Footer: "Games run every 15 minutes, 24 hours a day."
- **Join / Create Group / Nickname:** as web, plus native Share sheet for codes and a name-collision banner ("you'll appear as {name}_2").
- **Lobby:** next-game TimerRing (15-min slot), share code, player count, "Did you know?" banner. **Paywall gate lives here** (§6.3). Auto-starts the game when the clock goes active.
- **Category / Playing / LockedIn:** mirror web gameplay; haptics on answer tap (Medium impact); answer changeable from LockedIn ("Waiting for reveal").
- **Correct / Wrong:** dedicated result screens with Success/Error haptics, points earned, correct answer highlight, and a **"DID YOU KNOW?" fun-fact card** (mobile-only surface for the question's `funFact`).
- **Between (scores phase):** score + venue **rank with rank-change indicator** (▲/▼ N spots), Correct/Wrong/Unanswered stat boxes, top-8 venue leaderboard.
- **Results:** confetti, final rank + score, stats grid incl. 🔥 **Best Streak** (mobile-only streak tracking), top-10 final standings, next-game countdown with auto-return to Lobby.
- **Settings:** profile edit, saved games, Leave Game, Terms/Privacy (external links), Send Feedback, dev-only trial reset.
- **Feedback:** category pills (General / Bug / Feature), message 10–2,000 chars, optional email; submits with platform/appVersion/deviceId → `POST /feedback`.

### 6.3 Subscription & paywall (revenue core)

- **SubscriptionScreen:** "TapTrivia Pro 👑" — unlimited games, stats & history, saved locations, all-time leaderboards. Single CTA **"Start Free Trial"** → native `Purchases.purchasePackage()` (price string pulled live from the RevenueCat offering; fallback $2.99); **Restore Purchases** (App Store guideline 3.1.1); Terms/Privacy links.
- Gate: Lobby requires Pro entitlement; dismissing the paywall kicks back after 3s; if a game goes live while unsubscribed the paywall re-presents. `DEMO1` venue code bypasses (store review). Apple/Google + RevenueCat own trial state entirely (client `trialStartedAt` is legacy, write-once server-side).

### 6.4 Game engine (GameContext)

- **250 ms tick** (not rAF — Android reliability), mutable refs + render-skip diffing. Per tick: clock state, new-question detection (counts a **timeout** and resets streak if unanswered), question fetch, scores-phase leaderboard fetch (+rank/rankChange), hint eliminations, live points, splash countdown.
- Reveal handling has network-failure fallbacks: derives correctness locally from `correctIndex` if the server response is slow/lost (double-count guarded). Keep-awake activated for game duration.

### 6.5 Native capabilities & explicit non-capabilities

Present: RevenueCat IAP, haptics, keep-awake, native Share, AsyncStorage (identity/saved bars) + SecureStore, AppState foreground re-sync, 13 custom font weights.
**Absent (by design or not yet):** push notifications, deep linking (no URL scheme), OTA updates (expo-updates placeholder only), crash reporting/Sentry, analytics SDKs, tablet/TV targets, hero video.

### 6.6 Test infrastructure

Jest unit suites (game context, hooks, API, clock, scoring) with full native-module mocks; **Detox** iOS E2E (6 suites); **Maestro** (7 core + 25 granular flows: paywall firing/bypass, trial opt-in, code validation, answer lock/change, early/late points, timeout, question cycling); `scripts/test-simulators.sh` (~28 cross-platform simulator tests incl. visual regression). testIDs throughout.

---

## 7. Product: TV Web App — tv.taptrivia.tv

**Stack:** vanilla JS SPA (`tv-app/`), authored at fixed **1920×1080** and scaled to the viewport via CSS transform. QR generation via `qrcode-generator`. This app is also the payload for 5 of the 7 native TV wrappers (§8). **Display-only** — no interaction during gameplay.

### 7.1 Setup, activation & identity

- **Setup screen** (first run): split panel — **Register** (venue name + optional owner email, with "Free Digital Signage" email upsell; `POST /bar/register` → 5-char code + welcome email) and **Activate** (enter existing code; "Use this code on all your TVs"; `POST /tv/activate` with generated `tvDeviceId` UUID + platform → "You're Live!").
- Persistent config in `localStorage.taptrivia_tv_config` (barCode, barName, tvDeviceId; legacy-key migration). Boot verifies the stored bar is still active (`GET /bar/{code}`), else returns to setup. Subtle reset arrow on most screens re-enters setup with the code pre-filled.
- **Heartbeat:** `POST /tv-heartbeat {tvId}` on activation and every 5 minutes (drives "active TVs" analytics).
- **Platform settings modal:** per-device screensaver/data-saver setup instructions (Fire TV Vega, Fire TV classic, Roku), with extensive TV-remote focus/keypress handling and no auto-focused text inputs (avoids on-screen keyboards).

### 7.2 Screen states

`idle` (full-screen signage/attract) → `lobby` ("N Players Ready", avatar grid, 360px join QR + code) → `getready` → `category` (splash + difficulty dots) → `playing` → `reveal` → `between` (scores) → `leaderboard` → `results` / `results-seq`, plus the 4-phase between-games set. Renders are surgical (DOM-diffed) where possible; a 60fps rAF clock drives the timer ring and points drain during questions.

- **Playing:** question + 4 answer cards, live points-available (tiered coloring), 96px timer ring, players badge, top-5 player avatar footer **without scores** (prevents inferring correctness), join QR.
- **Reveal:** correct card ✓, others dimmed, **answer-distribution percentage bars**, footer scores highlight correct answerers.
- **Between (scores, 15s):** two clock-derived sub-screens — Screen 1 (37–44s): "Did You Know?" fun fact | live top-7 standings; Screen 2 (44–52s): **venue ad** (rotated signage panel) | "Play TapTrivia!" QR card ("Free for 7 days").
- **Leaderboard (after each question):** podium (2/1/3) + runners; two layouts (with/without signage side panel).
- **Results:** trophy, podium, next-game countdown, optional signage panel.

### 7.3 Between-games experiences (the 2-minute results window)

- **Live system — 5-slide sequence**, offsets derived from the shared clock (a TV loading mid-window shows the correct slide): 0:00–0:20 Leader Results → 0:20–0:40 Signage slide 1 → 0:40–1:20 "Play TapTrivia" (520px QR) → 1:20–1:40 Signage slide 2 → 1:40–2:00 "Coming Up" (next round's categories + QR).
- **Legacy system — 4-phase experience** from `GET /game/between` (still used in demo mode/fallback): **Podium** (top 10 + confetti), **Tap Standings** (weekly venue Score Index: state rankings with ▲/▼ deltas, national rank, "resets every Monday" explainer), **National Top 25** (weekly players, platform stats), **Hype** ("COMING UP NEXT" category pills + QR).
- **Persistent "next game" pill:** top-notch overlay with M:SS countdown, shown on all waiting screens when a game is within 16 minutes.
- **Break screen rotation:** cycles results → idle(signage) → lobby (60s each; lobby only within 15 min of the next game).

### 7.4 Signage rendering & impressions

- **7 templates × 2 variants each** (full-screen + 680px in-game panel): specials, happyhour, event, brand, announcement, sports, custom — plus system defaults (`_default_cta` "Play TapTrivia!" QR, `_defaultQr`).
- Slides come from `/game/tv-state` (backend already filters by weekday schedule + enabled + venue ad-eligibility); rotation at the venue-configured speed (default 60s) with crossfade (idle) or surgical panel swap (in-game). Venue logo fetched by `logoUrl` and re-downloaded only when `logoHash` changes.
- **Impression logging:** fire-and-forget `POST /signage-impression` per display with context (`off_hours_idle` / `game_lobby` / `between_rounds` / `results`), content type, duration, concurrent players, game id, rotation position, and platform — deduped per context/slide.

### 7.5 Resilience & device support

- Poll-rate management (2s active / 30s idle / 5s pre-game ramp starting 90s out); "Reconnecting…" overlay only after ~30s of consecutive failures — the local clock keeps rendering through network blips so a bar TV never blanks.
- **Low-power mode** (`?platform=firestickclassic|firestickvega`): drops animated orbs and backdrop blur for ~1GB-RAM sticks.
- **Fire TV Vega in-page keep-alive:** Wake Lock API + 1×1 muted looping `silence.mp4` + Media Session metadata refresh (all in-app, per project rule: no external keepalive commands).
- **Demo/preview modes:** `?demo` (auto-cycles every screen with mock data; embeddable via `postMessage` from `demo.html`), `?screen=` lock, `?preview=between` (live 5-slide walkthrough with keyboard control), `?bar=` code injection.

---

## 8. Product: Native TV Platform Apps

Seven packages under `tv-app/apps/`, two strategies:

- **Full native re-implementations** (render the game natively, poll the API directly): **Roku** (BrightScript/SceneGraph) and **Apple TV** (React Native tvOS).
- **Thin wrappers of tv.taptrivia.tv** (all game logic in the web app; native layer adds keep-alive/robustness): **firestick** (Fire OS/Android), **firestick-vega** + **firestick-vega-web** (Vega OS WebView), **samsung-tizen** (iframe), **lg-webos** (iframe).

### 8.1 Roku (`roku/`) — native, store-track

- BrightScript + SceneGraph, FHD/UHD, v1.1 build 11. **17 native screens** matching the web app pixel-for-pixel, including the full between-games 5-slide rotation, next-game pill, and all 7 signage templates with impression logging (`tv_platform: "roku"`).
- Pre-rendered PNG asset pipeline (`scripts/generate-assets.js` renders emoji, timer-ring frames, gradients, QRs — Roku can't render SVG/emoji).
- Full native activation (register + activate split panel), registry persistence, dedicated heartbeat task (5 min), separate between-games API task to avoid poll races.
- **Keep-alive (in-app):** off-screen 2×2 silent looping video with `disableScreenSaver` — blocks the screensaver via active playback. Memory management for Roku certification (low-memory events → GC, exit-info logging).
- **Operational dependency:** `scripts/roku-watchdog.sh` (external machine) relaunches the channel if down and resets Roku's un-defeatable 4-hour Bandwidth Saver idle timer every 90 min. This is the one platform requiring an off-device daemon.

### 8.2 Apple TV / tvOS (`tvos/`) — native, App Store

- react-native-tvos 0.76, bundle `com.visudolabs.taptrivia.app` (same ASC app 6762301564), EAS build/submit configured. **18 native screens** with 800ms cross-dissolves on ambient screens, instant swaps in gameplay.
- Full parity: tv-state polling (2s active / 5s idle) with server-time sync, question phases, points drain (50ms local clock), post-game rotation, between-games 5-slide clock-offset rotation, next-game pill (≤16 min), all 7 signage templates + impressions (`tv_platform: "appletv"`), native activation + AsyncStorage config, 5-min heartbeat, error overlay after 10 failed polls, dev preview screen.
- **Keep-alive (in-app, 6 layers):** looping silent audio (AVQueuePlayer), a 1×1 transparent `AVPlayerLayer` on the key window (the "video is displaying" signal), Now Playing media session + remote command targets, `isIdleTimerDisabled` re-asserted every 15s, focus-engine nudges, perpetual Core Animation — re-verified on a 15s timer and on foreground.

### 8.3 Fire TV — three packages

- **`firestick/` (Fire OS sticks/Cube, versionName 1.0.2):** WebView of `tv.taptrivia.tv?platform=firestickclassic`. Native Kotlin hardening: keep-screen-on window flags, partial wake locks, **foreground KeepAliveService** (survives swipe-kill, restarts activity), **BootReceiver** (auto-relaunch after power cycle — unique among all platforms), and a **native dpad→WebView key bridge** (Amazon WebView swallows remote keys). Auto-reload on render-process death.
- **`firestick-vega/` (Fire TV 4K Select, Vega OS):** Kepler WebView of `…?platform=firestickvega`. In-app keep-alive via Vega `AudioPlayer` media session playing `silence.wav` (with media-control focus — the fix that survives Vega's 5-minute idle kill), backup silent-audio bridge, 45s recovery checks. Proven 8h+ overnight. ⚠️ Contains a complete **orphaned native implementation** (17 screens) from before the WebView pivot — dead code.
- **`firestick-vega-web/`:** a second, cleaner Vega WebView package (`tv.taptrivia.firestick.web`) with slightly different keep-alive tuning (retains a 30s seek timer). ⚠️ Overlaps with `firestick-vega`; consolidation candidate.

### 8.4 Samsung Tizen (`samsung-tizen/`) & LG webOS (`lg-webos/`)

- Both: vanilla JS shells with a full-screen iframe of `tv.taptrivia.tv`, back-key swallowed, iframe auto-reload on error (10s).
- **Tizen keep-alive:** `tizen.power.request(SCREEN_NORMAL)` re-asserted every 5 min + `setScreenSaver(OFF)` + Wake Lock API + silent looping 1×1 MP4. Tizen 4.0+/2019+.
- **webOS keep-alive:** Luna `tvpower turnOnScreen` every 5 min + Wake Lock + silent MP4; `keepAlive:true` app flag. webOS 4.0+/2018+.
- Marketing lists both as "coming soon"; packages exist for developer-mode deployment.

### 8.5 Parity matrix

| Capability | Roku | tvOS | Vega | Vega-web | Fire legacy | Tizen | webOS |
|---|---|---|---|---|---|---|---|
| Native game rendering | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| In-app keep-alive | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-start after reboot | watchdog | — | ❌ | ❌ | ✅ | TV-level | TV-level |
| External daemon required | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| dpad→WebView bridge | n/a | n/a | ❌ | ❌ | ✅ | ❌ | ❌ |
| Packaging | ZIP/ECP | App Store (EAS) | .vpkg | .vpkg | APK | Tizen ZIP | webOS ZIP |

**Product requirement carried by all TV apps:** all keep-alive logic must be self-contained in-app. External keypresses/ECP pings to keep apps alive are prohibited (they mask whether the in-app solution works).

---

## 9. Product: Bar Owner Dashboard — admin.taptrivia.tv

**Stack:** vanilla JS SPA (`dashboard-app/`), no build step. Scoped to a single authenticated venue (no multi-location switching, no billing — venues are free).

### 9.1 Authentication (3-step passwordless OTP)

1. **Credentials:** email + location code (the code shown on the TV at registration).
2. **OTP:** 6 one-time-code boxes (auto-advance, paste-distribute, auto-submit), 10-minute expiry, resend, masked email display.
3. **Trust device:** "Trust this computer?" — Yes → token in localStorage (persists), No → sessionStorage (tab-scoped).

Sessions last 60 days server-side; any 401 clears the token and forces re-login. Sign-out clears all storage.

### 9.2 Screens

- **Dashboard:** venue active/dormant status card (TV last poll, players' last answer, slides in rotation); 4 stat cards (players this week, games played, avg session, peak players); "Tonight's Schedule" (today's signage slides + ACTIVE/OFF); quick-action cards.
- **Signage Creator** (flagship venue tool):
  - **7 templates**: Daily Specials (featured item + up to 4 menu items w/ emoji, name, description, price), Happy Hour (time range, frequency, up to 4 color-coded deals), Event Promo, Location Branding (live logo + tagline), Announcement, Game Day/Sports, Custom (headline, body, up to 6 emoji-bulleted items).
  - **Rotation:** max **10 slides**; speed 15/30/60s; per-slide enable/disable toggle; **per-day scheduling** via inline Mon–Sun chips (none selected = every day); day-filter tabs; drag-free list with edit/remove.
  - **Live dual TV preview** at 960×540 scale: in-game panel mode (mock leaderboard + signage panel + join-QR) shown by default; full-screen renderers power thumbnails and a full-screen preview modal; ←/→ slide stepping. (Off-hours preview mode toggle exists in code but is hidden.)
  - Categorized **emoji pickers** (Food & Drink, Events & Music, Sports, Celebrate, General) at slide and line-item level.
  - Explicit Save with dirty tracking → `PUT /dashboard/signage`; "changes appear on your TV within seconds."
- **Analytics:** period tabs (Today / Week / Month / All Time) → `GET /dashboard/data?period=`; status row; stat cards (total players, games, avg session, avg correct %); charts — Players Per Game (bars), Popular Categories (with per-category correct %), Peak Hours (horizontal bars), Player Retention funnel (played ≥1 → returned same night → returned another night).
- **Logo & Branding:** drag-drop upload (square PNG/JPEG ≤5MB, squareness validated ±5%, client-resized to 256×256); three processing modes — **Remove background** (AI, default), **Make it white**, **Keep original** → `POST /dashboard/logo`; cache-busted preview; logo flows to TV signage and player app.
- **Settings:** **House Players** on/off toggle (see §4.6) with explicit save → `PUT /dashboard/settings`.

### 9.3 Dashboard API surface

`POST /dashboard/auth/otp`, `POST /dashboard/auth/verify`, `GET /dashboard/data[?period=]`, `PUT /dashboard/signage`, `PUT /dashboard/settings`, `POST /dashboard/logo` — all Bearer-token authenticated.

---

## 10. Product: Operator Analytics Console — analytics.taptrivia.tv

**Stack:** React 18 + Vite + AWS Amplify (`analytics/frontend/`). **Single-operator internal product** ("TapTrivia Operator Console · Visudo Labs") — deliberately separate from the venue dashboard, on its own subdomain, bucket, and distribution.

### 10.1 Auth

Cognito custom-auth **email OTP** (no password, no self-signup): email → 6-digit code (5-min expiry, one code reused across retries, **3 attempts max**, unknown emails silently no-op to prevent enumeration). Amplify `CUSTOM_WITHOUT_SRP`; ID token in memory only; JWT enforced by an API Gateway Cognito authorizer **plus** an origin allowlist inside the Lambda. Sole user: the operator.

### 10.2 Architecture: sync/api split

- **`analytics-sync`** (Python, 1024MB, scheduled + on-demand `{force:true}`): pulls four external sources — **RevenueCat v2** (subscription truth: MRR, trials, churn, events), **App Store Connect** (ES256 JWT; sales/refunds/payouts; tolerates `permission_pending` pre-revenue), **Google Play Developer API**, **AWS Cost Explorer** (+forecast) — failure-isolated per source, idempotent, CloudWatch `SourceFailure` metric with SNS-alarmed 3-strike detection. Then computes cross-source rollups (`computed:*` cache keys): platform overview, bar activity (active = play within 7d, slow = 21d, else dormant), **per-venue `adEligible` flag written back to Bars**, question-round progress, first-bar MRR attribution, signage/audience aggregates.
- **`analytics-api`** (Python): serves cached aggregates (503 `data_not_ready` if the cache is cold); only `/analytics/bars` and the bar drill-in query DynamoDB live. Pre-launch test players excluded via `PLAYER_TEST_CUTOFF`; group-type virtual bars culled.
- Cache lives in `TapTrivia-AnalyticsCache`; every response carries per-source freshness metadata surfaced as a "Synced N ago" pill with a manual **Refresh** (async 202) in the UI.

### 10.3 Tabs (7 + drill-in)

- **Overview:** Total Users (paid/trial/free), Net MRR (store actuals vs RC×0.85 estimate), Active Bars, AWS month-to-date + margin; subscriber-growth chart with compare mode; question-bank round progress; top bars table; AWS cost-mix donut.
- **Subscribers:** active trials/subs/MRR; 28-day revenue/new/active customers; funnel (users → played → trial → paid); live RevenueCat event feed (trial/converted/cancelled/expired/billing-issue) with filters; iOS-vs-Android platform split.
- **Bars:** fleet stats; **Active TVs** grouped by venue (screens, platforms, heartbeat age); searchable/filterable all-bars table → **drill-in** (geo + DMA, TV count, paid/trial/free patron split, full player roster with subscription pills and recency).
- **Signage:** impressions, **audience-seconds**, active TVs, avg/peak concurrent; hour×day audience heatmap in bar-local time; context split; inventory-health checks.
- **Finance:** gross / net-after-store-fees / refunds / AWS cost + margin, with YoY or prior-period compare; 3-year monthly revenue heatmap; Apple & Google next-payout cards.
- **Questions:** bank size + round number, % consumed, games-until-repeat, difficulty average; supercategory and difficulty distributions.
- **AWS:** MTD spend, EOM forecast, **$/active bar**, service mix, trailing-30-day daily cost.

Date-range control (incl. custom range + compare modes) applies to Overview/Subscribers/Finance. All charts are hand-rolled SVG/CSS (no chart library).

### 10.4 GeoIP enrichment

MaxMind GeoLite2-City (`taptrivia-internal` S3, refreshed monthly by `geoip-update` from Secrets-Manager credentials). A Lambda layer resolves TV pairing IPs to `{city, state, zip, lat/lng, timezone, DMA}` (zip→DMA table baked in); the first paired TV copies geo onto the venue record — powering local-time signage analytics and DMA-based ad-market reporting.

---

## 11. Product: Marketing Websites

### 11.1 taptrivia.com (venue acquisition site)

React 18 + Vite SPA. Audience: venue owners. Core promise: **"Live Trivia & Digital Signage for Any Venue. Free for Venues."** — "NO COST. NO CONTRACT. NO CATCH."

Sections: fixed nav; hero with **self-hosted product video** (custom tap-to-play/mute/fullscreen controls, iOS-safe) + cycling mini-TV preview (question → leaderboard → signage) + platform pills (Roku, Fire Stick, Apple TV; Samsung/LG staged as "coming soon"); animated social-proof counters (**200,000+ questions, 60 categories, 7 TV platforms, $0**); 4-step How It Works (install TV app → register (30s, permanent code) → guests play nightly → customize via dashboard); 8 feature cards; **interactive signage demo** (type venue name/headline/details, watch the TV panel update live — "replaces a $50–100/mo signage service, included for $0"); 15 venue-type cards; trivia-host cost comparison; full platform strip; CTA with trust badges; 8-item FAQ (new round every 15 minutes; nightly 5 PM–5 AM ET; private events "on roadmap"); **contact form** → `POST /contact` (SES → operator inboxes, reply-to submitter, origin-locked CORS); footer (Visudo Labs · Brevard NC, privacy/terms).

### 11.2 app.taptrivia.tv (smart store redirect)

The QR/business-card destination. UA detection: iOS → 3-2-1 countdown → App Store; Android → countdown → Google Play; desktop → both store buttons; "Stay on this page" cancels. Live store URLs baked in. (`play.taptrivia.tv` 301s here via a CloudFront function; a stale pre-launch static prototype also exists at `/app-redirect/` — superseded.)

---

## 12. Backend Platform

**29 Lambda functions** (Node 20 + Python 3.12) behind one API Gateway HTTP API. Shared modules live in `backend/shared/` and are copied into each function by `scripts/build-lambdas.sh` (never edit copies). `auth.js` ships only to the 4 dashboard functions. Dev stage (`Dev-TapTrivia-*`) via Terraform workspace.

### 12.1 Full public API route table

| Route | Function | Notes |
|---|---|---|
| `POST /bar/register` | register-bar | 5-char code from 30-char unambiguous alphabet (crypto-random, uniqueness retried ×5); tvDeviceId idempotency; IP geolocation (ip-api.com, fail-soft); optional ownerEmail → SES welcome email |
| `GET /bar/{barCode}` | get-bar | Public venue lookup; 404 unless active |
| `POST /bar/join` | join-bar | Moves player between venues (activePlayers counters); name-collision detection (same display name active in last 30 min) |
| `POST /bar/{barCode}/reset` | reset-bar-code | TV-owner-verified (tvDeviceId match) code rotation; old bar deactivated |
| `GET /game/current` | get-current-game | Game-mode gate → `no_game`/slot state; ADHOC override |
| `GET /game/{gameId}/question/{n}` | get-question | 403 until the question's start epoch; deterministic answer shuffle; eliminateOrder; funFact |
| `POST /game/{gameId}/answer` | submit-answer | Server-authoritative scoring; 4s–45s window enforcement; registered-player check (anti-forgery); overwrite = answer change; fire-and-forget weekly player/venue stats |
| `GET /game/{gameId}/leaderboard` | get-leaderboard | `type=bar` (top 20 + you + house players, score-freeze rule) / `type=global` (**403 until game end**, top 20 with venue names) |
| `GET /game/tv-state` | get-tv-state | The TV render feed: state machine (idle/break/active_game/game_over), throttled venue heartbeat, answers + eliminations + reveal gating, answer-distribution stats, leaderboards, day-filtered + `adEligible`-gated signage, hash-busted logo URL |
| `GET /game/between` | get-between-game-data | Podium / state standings (Score Index) / national weekly top 25 + platform stats / next-game hype; each phase fail-soft |
| `GET`/`PUT /player/{playerId}` | get-player | Profile read; create/update with name validation + profanity filter; write-once `trialStartedAt` |
| `POST /group/create` | create-group | Virtual venue, `type: group` |
| `POST /dashboard/auth/otp` | send-otp | Anti-enumeration (always generic success); 60s cooldown; OTP stored as HMAC-SHA256(barCode); 10-min expiry |
| `POST /dashboard/auth/verify` | verify-otp | 5 attempts → 429; success = email verified + 60-day session (token hash only) |
| `GET /dashboard/data` | get-dashboard | Session-auth; period analytics (players/day, ET peak hours, categories, retention, dormancy at 14 days) |
| `PUT /dashboard/signage` | save-signage | ≤10 slides, rotation 5–60s, template whitelist, recursive data validation (depth ≤4, strings ≤500, **no HTML**), ≤50KB total |
| `PUT /dashboard/settings` | save-settings | Whitelisted venue flags (`housePlayersEnabled`) |
| `POST /dashboard/logo` | upload-logo | ≤5MB + magic-byte validation; Jimp processing (background key-out / whiten / passthrough); S3 + CloudFront invalidation + MD5 logoHash |
| `POST /tv/activate` | tv-activate (py) | TV↔venue pairing; IP→geo enrichment; first TV copies geo to venue; `total_tvs` counter |
| `POST /tv-heartbeat` | tv-heartbeat (py) | <50ms target; unknown TVs answered 200 (no retry storms) |
| `POST /signage-impression` | signage-impression (py) | Fast-path event write (<100ms p95); context/content validation; 90-day TTL |
| `POST /feedback` | submit-feedback | Player feedback → DynamoDB (1-year TTL) + SES notification |
| `POST /contact` | contact | Marketing-site form; origin allowlist; SES to operator |
| `GET /analytics/*` (8 routes) + `POST /analytics/refresh` | analytics-api (py) | Cognito JWT + origin check (§10) |

Non-API functions: **generate-games** (EventBridge daily; §4.1), **geoip-update** (EventBridge monthly), **analytics-sync** (EventBridge), **analytics-auth-define/create/verify** (Cognito triggers).

### 12.2 Security properties

- No plaintext secrets at rest: OTPs stored as HMAC-SHA256, session tokens as SHA-256 hashes; anti-enumeration on both OTP flows.
- Server-side answer-window and registered-player enforcement; server time authoritative for scoring.
- Signage input hardened (no HTML, size/depth caps); logo upload magic-byte checked.
- Public routes CORS `*` (anonymous players); `contact` and `analytics-api` origin-restricted. `SKIP_SES=true` disables email in dev.

---

## 13. Data Model (DynamoDB)

All tables `PAY_PER_REQUEST`. Prefix `TapTrivia-` (dev: `Dev-TapTrivia-`).

| Table | Keys | GSIs | TTL | Contents |
|---|---|---|---|---|
| Games | `GAME#{date}#{HHMM}` (+ `ADHOC_GAME`) | gameId-index | 7 days | Full 15-question array, categories, status, startTimeEpoch |
| Questions | `Q#{id}` | category-difficulty-index (`category`, `difficultySort = "{diff}#{id}"`) | — | Question, answer, 3 wrong answers, category/subcategory/topicLeaf, funFact, difficulty, shelfLife, expired, lastUsedEpoch, usageCount |
| QuestionUsage | `USAGE#{category}` | — | — | Per-category totals, usedTonight, cycle tracking |
| QuestionUsageByQuestion | per-question | — | — | times_used / current_round (analytics round-progress) |
| Answers | `ANSWER#{gameId}#{q}` / `PLAYER#{id}` | game-player-index, game-bar-index (`gameId#barCode`), barCode-time-index | 30 days | Selected answer, correctness, elapsedMs, points, timestamp |
| Players | `PLAYER#{id}` | WeeklyLeaderboard (weekStart, weeklyPoints) | — | displayName, current venue, lifetime + weekly stats, trialStartedAt, subscription_status, attributed_bar_code |
| Bars | `BAR#{code}` | tvDeviceId-index, state-index, StateScoreIndex (state, scoreIndex) | — | Venue/group profile, status, geo + DMA, activePlayers, ownerEmail + OTP fields, signage config, logo, housePlayersEnabled, adEligible, weekly Score Index, total_tvs |
| Sessions | `SESSION#{sha256}` | — | 60 days | Dashboard sessions |
| Feedback | `FEEDBACK#{uuid}` | — | 365 days | Player feedback |
| GameStats | `STAT#…` | date-index | ttl | Declared; currently unused |
| TvPairings | `tv_id` | GSI1 (bar_code, paired_at) | — | TV↔venue pairing, IP, geo, platform, last_heartbeat_utc |
| SignageImpressions | `bar_code` / ULID | GSI1 (GLOBAL, time), GSI2 (tv_id, time) | 90 days | Raw impression events (aggregates persist in cache) |
| AnalyticsCache | `cache_key` | — | — | `computed:*`, `revenuecat:*`, `appstore:*`, `googleplay:*`, `aws:costs:*`, `meta:*` |

S3 content buckets: `taptrivia-logos` (venue logos, served via tv.taptrivia.tv `/logos/*`), `taptrivia-internal` (GeoIP database).

---

## 14. Infrastructure (AWS / Terraform)

16 `.tf` files; S3 remote state + DynamoDB locking; `us-east-1`; workspace-based dev/prod staging (EventBridge disabled in dev).

- **API Gateway:** one HTTP API v2, `$default` auto-deploy stage, 34 routes, custom domain `api.taptrivia.tv`.
- **Lambda:** shared execution role; per-function sizing (defaults 128MB/10s; generate-games 512MB/300s; upload-logo 256MB/30s; analytics-sync 1024MB/300s). Layers: `geoip-py` (maxminddb + zip→DMA), `analytics-py` (PyJWT/crypto/google-auth).
- **CloudFront:** 7 distributions + shared OAC (all S3 origins private): player app, TV app (dual-origin with `/logos/*`), dashboard, app-redirect, marketing www, analytics, plus two CloudFront Functions doing 301s (`play.→app.`, apex `taptrivia.tv → www.taptrivia.tv`). SPA 403/404 → index.html.
- **DNS/TLS:** Route53 zone `taptrivia.tv`; ACM wildcard cert; A-aliases for play/tv/api/admin/app/www/analytics/apex.
- **SES:** domain identity + DKIM + custom MAIL FROM (`mail.taptrivia.tv`) + SPF + DMARC. Senders: `noreply@taptrivia.tv` (transactional), operator address (contact form).
- **EventBridge:** GenerateGames daily 17:00 UTC; GeoIP monthly; AnalyticsSync (terraform declares hourly at :05; operating notes say daily 06:05 UTC — see Appendix).
- **Cognito:** AdminPool (no self-signup, custom-auth triggers, optional TOTP MFA) + web client + JWT authorizer for `/analytics/*`.
- **Monitoring:** SNS alert topic → operator email; 4 CloudWatch alarms on analytics source failures; 30-day log retention on Python services.
- **IAM highlights:** DynamoDB scoped to `TapTrivia-*`; SES send; S3 logos/internal; **Bedrock InvokeModel** (`stable-image-remove-background-v1:0`) provisioned for logo background removal; CloudFront invalidation; SSM `/taptrivia/prod/*`; Secrets Manager `taptrivia/*`.

---

## 15. Content: Question Bank & Pipeline

- **Taxonomy (`topic_tree.json`):** 60 categories × 6 supercategories (Geography, Entertainment, History, Art & Culture, Science & Nature, Sports & Leisure), 4 levels deep, each leaf designed for 20–30 questions across difficulties 1–5.
- **Master bank (`Questions/questions.json`, 90MB):** **185,440 questions** (snake_case schema: question, answer, 3 wrong answers, fun_fact on every row, category, difficulty, expired flag). 176,398 active / 9,042 expired; difficulty split ≈ 70k/71k/44k (L1/L2/L3); 194 categories.
- **Seed file (`trivia_questions.json`):** 9,997 questions (camelCase), the active DynamoDB seed source; production table holds ~100,010 rows (marketing claims "200,000+").
- **Seeding (`backend/seed/seed-questions.js`):** normalizes both schemas → `Q#{id}` items with `difficultySort`, zeroed usage; `--incremental` (preserve usage), `--wipe`, `--local`, `--stage`; rebuilds per-category usage records.
- **Quality pipeline (`scripts/`):**
  - `dedupe.js` / `find-duplicate-questions.js` — union-find duplicate clustering (exact-text pass + same-answer/rare-token pass), Jaccard-tiered confidence, safe-cut vs review outputs, apply-with-backup.
  - `sanitize-questions.js` — 14 tiered QA checks (duplicate ids, empty fields, answer-leaks, contradictions, AI artifacts, placeholders, …) with safe auto-fix for whitespace only.
  - `fix-truncated-categories.js` — repairs 50-char-truncated category names in file + DynamoDB + usage records.
  - `reset-questions.js` (zero all usage for launch), `reset-games.js` (delete future pre-generated games).
- **Rotation math:** LRU + 30-day window means at current bank size no venue sees a repeat for months; the analytics console tracks "round" completion (% of bank served) and games-to-next-round.

---

## 16. Developer & Operations Tooling

- **Build/deploy:** `scripts/build-lambdas.sh` (stages shared modules per function, Node + Python aware) → `terraform apply`. Static apps deploy via per-site `deploy.sh` (S3 sync + CloudFront invalidation). Mobile via EAS build/submit.
- **Local dev:** `python3 -m http.server` per web app (8090/8091/8092); `dev-env.sh` (dev table env), `seed-dev.sh` (dev seed + `DEVBR` test bar), `dev-test-game.sh` / `start-test-game.js` (ad-hoc games with 90s countdown outside game hours, start/stop/status).
- **Testing:** `test-house-players.js` + `test-house-injection.js` (bot determinism/recede/rank invariants); `test-simulators.sh` (~28 iOS-simulator + Android-emulator tests against prod API: paywall/trial gating, name collisions, timing sync, score deferral, visual regression); `install-test-build.sh` (EAS test builds onto simulators); mobile Jest/Detox/Maestro suites (§6.6); Roku/tvOS Jest suites.
- **Fleet monitoring** (operator-side dev tools): `monitor-firestick.sh` / `watch-taptrivia.sh` (adb crash-detect + relaunch + cause classification for Fire TV devices), `monitor-roku.sh` + `roku/scripts/roku-watchdog.sh` (ECP active-app check + relaunch; Bandwidth-Saver timer reset).
- **Demo assets:** `demo.html` (embeds the TV app's `?demo` mode), design-kit JSX prototypes (`taptrivia-design-kit/taptrivia-v4.jsx`, mobile mockup, between-rounds POC, analytics dashboard mockup).

---

## 17. Design System

- **Aesthetic:** "Dark cocktail lounge, not sports bar neon." Source of truth: `taptrivia-design-kit/taptrivia-v4.jsx` (tokens + React/RN component libraries).
- **Background:** `linear-gradient(150deg, #0f0326, #1e0f4a, #3d1866, #6b2358, #a8334a)` + three floating animated orbs (blue/red/green).
- **Fonts:** Fredoka (display/scores), Outfit (body/UI), DM Mono (technical). Used identically across web, mobile, TV, dashboard, analytics, and marketing.
- **Palette:** green `#00d4aa` (correct/safe), red `#ff4757` (wrong/danger), gold `#ffd200` (accent/warning), blue `#667eea`, purple `#764ba2`. Glass morphism (`backdrop-filter: blur(12px)`, `rgba(255,255,255,0.06)` surfaces).
- **Answer cards:** white with colored A/B/C/D badges; selected = blue-purple gradient; correct = green gradient; wrong = red gradient; eliminated = faded/strikethrough.
- **TV rules:** authored at 2× from the 960×540 prototype → 1920×1080; **no pure #000 or #FFF** (TV-safe); low-power CSS tier for weak devices; Roku consumes pre-rendered PNG equivalents of every visual asset.
- Cross-platform TV screen-consistency audit completed 2026-03-09 (web/Roku/tvOS visually aligned).

---

## 18. Appendix: Known Gaps, Dead Code & Discrepancies

Items surfaced during this inventory that a roadmap or cleanup pass should address:

**User-facing copy vs. code**
1. Player-app "How to Play" says 60s questions, hints at 20s/35s, and "5 PM ET–12 AM PT"; the engine uses 52s questions, hints at 15s/24s, and the timed window is 4 PM–4 AM ET. Marketing FAQ says "nightly 5 PM–5 AM ET." One truth should win.
2. Marketing claims "200,000+ questions"; production table holds ~100k (master bank holds 185k).

**Dead / orphaned code**
3. `firestick-vega/` carries a complete unused native RN implementation (17 screens) from before the WebView pivot; `firestick-vega` vs `firestick-vega-web` are overlapping packages to consolidate.
4. Player web app: `#btn-find-bars` ("Find locations near you") has no handler; `tt_muted` storage key, `renderScoresPhase`, `buildDots`, `isNewPlayer` unused; `points-fly-up`/`chatSlide` CSS has no JS trigger.
5. Mobile app: `Countdown` screen route and `GamePhase 'countdown'` unreachable; `getPlayer` API unused; `react-native-purchases-ui` dependency unimported; `src/updates/updates.ts` is a commented-out OTA placeholder.
6. `GameStats` table declared but unwritten. `/app-redirect/` static prototype superseded by `websites/app-taptrivia-tv`.
7. TV web app retains the legacy 4-phase between-games system alongside the live 5-slide sequence (demo/fallback only).
8. Dashboard: full-screen ("off-hours") signage preview mode and the global signage enable/disable flag are implemented but hidden from the UI.

**Configuration reconciliations**
9. Analytics sync cadence: terraform schedules hourly (`cron(5 * * * ? *)`); operating notes state daily 06:05 UTC.
10. Logo background removal: current handler uses Jimp corner-key processing; IAM still provisions Bedrock `stable-image-remove-background` (either re-enable Bedrock path or trim the permission).
11. `create-group` uses `Math.random` for code generation while `register-bar` uses crypto randomness — harmonize.
12. Idle poll intervals differ across native TV apps (tvOS 5s vs orphaned Vega config 15s vs web 30s).

**Operational risks**
13. Five of seven TV platforms depend entirely on `tv.taptrivia.tv` availability (WebView/iframe wrappers).
14. Roku requires an external always-on watchdog for the Bandwidth-Saver idle timer; reboot resilience is inconsistent across platforms (only legacy Fire TV auto-starts on boot).
15. Secrets committed in-repo: `TapTrivia/credentials.json` (Android keystore credentials) and `eas.json` key paths.

**Product gaps (candidate roadmap)**
16. No group-scoped leaderboard type (groups reuse the bar leaderboard); no friends layer.
17. No push notifications, deep links, OTA updates, or crash/analytics SDKs in the mobile app.
18. Player web app is not an installable PWA (no manifest/service worker/offline).
19. No in-app QR scanner (join is manual code entry; QR relies on the camera app).
20. No multi-location support or TV-device management UI in the venue dashboard.
21. Private-events capability is publicly promised as "on the roadmap" (marketing FAQ).

---

*End of document. Generated from a full-repository capability audit on 2026-07-06.*


