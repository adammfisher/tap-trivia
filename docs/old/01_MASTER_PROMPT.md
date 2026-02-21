# Tap Trivia — 01: Master Project Specification

## READ FIRST
Read ALL files (01 through 05) before writing any code. Do not guess — if something is ambiguous, flag it and ask.

---

## PHASE ROADMAP

This project is built in phases. **Only Phase 1 is in scope for the initial build.**

| Phase | What | Details |
|-------|------|---------|
| **1 (NOW)** | **Web-only launch** | Two static web apps (player + TV) on CloudFront + AWS serverless backend. No native apps. Free to play. |
| **1.5 (after core works)** | **Admin dashboard** | Standalone admin web app — real-time active bars, historical stats (total users, by bar, by state). Basic auth. |
| 2 (later) | React Native mobile app | iOS + Android via Expo. App Store/Google Play subscriptions ($2.99/mo). |
| 3 (later) | Native TV platform apps | Samsung Tizen, Fire TV, Roku, Google TV, Apple TV app store wrappers. |

Phase 1 is designed so that Phase 2 can reuse shared modules (`game-clock.js`, `scoring.js`) and all backend infrastructure without changes. Phase 1.5 adds observability but does not change any player-facing behavior.

---

## PROJECT SUMMARY

Tap Trivia is a live trivia game played at bars. A TV at the bar displays the Tap Trivia TV web app, which shows questions, hints, and the bar leaderboard. Patrons play along on their phones by opening the Tap Trivia player web app in their mobile browser. Games run on a **fixed global schedule** — every 15 minutes from 5:00 PM Eastern to 12:00 AM Pacific, every night. ALL players worldwide play the SAME game at the same time.

**The player web app is a fully standalone experience.** Players can play with or without a TV. The phone browser shows everything: questions, all four answers, hint eliminations (wrong answers crossed out at 15s and 30s), the correct answer reveal, scores, and leaderboards. The TV enhances the bar atmosphere but is not required.

There are two leaderboards:
- **Bar leaderboard** — shown on the TV and phone during the game. Only players who entered that bar's 5-character code see/appear on it.
- **Global leaderboard** — shown on TV and phone only at the END of each game.

---

## TWO WEB APPS + BACKEND (Phase 1)

### 1. Player Web App (CloudFront Distribution — Player)
A mobile-first responsive web app. Players open it in their phone's browser. **Fully playable without a TV.** Served from S3 via CloudFront — accessed by CloudFront distribution URL (e.g., `d1abc2def.cloudfront.net`). Custom domain (`app.taptrivia.com`) can be added later via ACM + Route53.
- No login required — player identified by auto-generated UUID stored in localStorage
- Pick a display name on first visit, can change anytime
- Optionally enter a 5-character bar code from the TV to join that bar's session
- See questions, all four answers, hint eliminations (wrong answers struck through at 15s and 30s), correct answer reveal at 45s — identical to TV
- Submit answers, see points earned
- 2-second read time: when answers first appear, points display at 1000 for 2 seconds before decay begins — gives players time to read
- See bar leaderboard during game (if at a bar), global leaderboard after game
- **Phase 1 is free to play** — no paywall, no subscription. Subscription comes in Phase 2 with the native app.

### 2. TV Web App (CloudFront Distribution — TV)
The bar's display. Landscape orientation. Runs in any browser — smart TV browser, laptop connected to TV via HDMI, Fire Stick browser, etc. Accessed by its own CloudFront distribution URL. Custom domain (`tv.taptrivia.com`) can be added later.

The TV app is a **display-only + bar registration** app:
- Bar owner opens the TV CloudFront URL on their TV or connected device
- Enters their bar name → gets a **5-character alphanumeric bar code**
- **The code is persistent** — the bar keeps this code forever unless the owner chooses to reset it
- The bar code is displayed prominently on the TV for patrons to enter on their phones
- TV polls the backend every 2 seconds and displays: questions, hints, bar leaderboard, scores
- During breaks: shows bar code, URL to open the player web app, countdown to next game
- Bar owners don't pay — this is free

### 3. AWS Serverless Backend
Powers everything. Lambda + DynamoDB + API Gateway + EventBridge + S3 + CloudFront. Terraform for IaC.

---

## CORE ARCHITECTURAL DECISIONS (NON-NEGOTIABLE)

### 1. NO WEBSOCKETS — Clock-Sync + REST Polling Only
Every game starts at a known wall-clock time. TV and phones calculate what to display using `gameStartTime + elapsed`. TV polls backend every 2 seconds. Phones fetch questions one at a time and use the local clock to drive hint animations.

### 2. TRUE SCALE-TO-ZERO
Lambda + DynamoDB on-demand = $0 when nobody is playing. No always-on infrastructure.

### 3. NO LOGIN — localStorage UUID
Players identified by a UUID auto-generated on first visit and stored in `localStorage`. UUID sent as `X-Player-ID` header on all API calls. Pick a display name on first visit, can change anytime.

### 4. BAR REGISTRATION VIA TV APP — PERSISTENT CODES
- Bar owner opens TV web app → enters bar name → system generates a unique **5-character** code
- **Code is permanent** — persists across browser restarts, power cycles, indefinitely (stored in localStorage)
- TV app reads localStorage on load; if code found, verifies with backend and resumes
- Bar owner can manually request a new code from TV app settings (old code is retired)
- Players enter the bar code on their phone to join that bar's leaderboard
- A player can only be at one bar at a time
- Players who don't enter a bar code can still play but only see global results at end of game

### 5. PLAYER WEB APP IS FULLY STANDALONE
The phone browser shows ALL game content: questions, four answers, hint eliminations (wrong answers struck through), correct answer reveal, scoring, and leaderboards. Players do NOT need a TV to play. The TV is an enhancement for bars, not a requirement.

### 6. TERRAFORM FOR ALL INFRASTRUCTURE
Single Terraform project. Modules for API Gateway, Lambda, DynamoDB, EventBridge, S3, CloudFront, IAM.

### 7. PHASE 1 IS FREE — NO SUBSCRIPTION
No paywall in Phase 1. All players can play for free. This aligns with the go-to-market strategy (3 months free to build user base). Subscription ($2.99/mo) will be added in Phase 2 via App Store / Google Play in-app purchases when the React Native app ships.

---

## GAME SCHEDULE

- Every 15 minutes, 5:00 PM ET to 12:00 AM PT (3:00 AM ET), every night
- 40 games per night, 15 questions each, ~1 minute per question
- Games start on the quarter hour: 5:00, 5:15, 5:30, 5:45...
- Between games: TV shows bar code + player app URL + countdown to next game

---

## DIFFICULTY RAMP

```
Questions 1–4:   Difficulty 1  (4 questions — easy warmup)
Questions 5–9:   Difficulty 2  (5 questions — building up)
Questions 10–12: Difficulty 3  (3 questions — middle)
Questions 13–14: Difficulty 4  (2 questions — getting hard)
Question 15:     Difficulty 5  (1 question — the "killer closer")
```

### Question Bank Targets (~108,000 total at production scale)

| Level | Qs/Game | Bank Target | Count   |
|-------|---------|-------------|---------|
| L1    | 4       | 27%         | 28,800  |
| L2    | 5       | 33%         | 36,000  |
| L3    | 3       | 20%         | 21,600  |
| L4    | 2       | 13%         | 14,400  |
| L5    | 1       | 7%          | 7,200   |

These percentages are calculated so that every difficulty level sustains 6 months (7,200 games) of nightly play without repeating within a category. The question generator must target these ratios.

**Phase 1 Testing:** The project root contains `trivia_questions.json` with 100 seed questions for development and testing. The seed script loads these into DynamoDB. The full 108K question bank will be generated separately before production launch.

---

## QUESTION TIMING OVERVIEW (60 seconds per question)

```
0s     5s  7s       15s       30s       45s  50s  60s
|──────|──|─────────|─────────|─────────|────|────|
 CAT     R  DECAY     HINT 1    HINT 2   REV  SCORES
 SPLASH  E  1000→500  500→250   250→0
         A
         D
```

- **0–5s:** Category splash (question not visible yet)
- **5–7s:** All 4 answers visible, **2-second read time** — points frozen at 1000
- **7–15s:** Points decay 1000→500 (fast, front-weighted)
- **15–30s:** 1st wrong answer eliminated ("NOT X" struck through) on BOTH phone and TV, points 500→250
- **30–45s:** 2nd wrong answer eliminated ("NOT Y" struck through) on BOTH phone and TV, points 250→0
- **45–50s:** Correct answer revealed (highlighted green) on BOTH phone and TV
- **50–60s:** Bar leaderboard + transition to next question

**Both phone AND TV show the eliminations.** The phone is a complete game experience.

---

## LEADERBOARD RULES

### During the Game (questions 1–15):
- **TV shows:** Bar leaderboard ONLY — ranked list of players at THIS bar
- **Phone shows:** Your score + bar leaderboard for your bar (if you entered a bar code)
- Global leaderboard is NOT shown during active play

### After the Game (post question 15):
- **TV shows:** Bar leaderboard final results THEN global leaderboard (top 20)
- **Phone shows:** Your final score, your bar rank, your global rank, both leaderboards
- Global leaderboard shows top players across ALL bars and solo players

---

## PROJECT STRUCTURE (Phase 1)

```
tap-trivia/
├── terraform/                      # ALL AWS infrastructure
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── api-gateway.tf
│   ├── lambda.tf
│   ├── dynamodb.tf
│   ├── eventbridge.tf
│   ├── iam.tf
│   ├── s3.tf                      # S3 buckets for both web apps
│   ├── cloudfront.tf              # Two CloudFront distributions
│   └── terraform.tfvars
│
├── backend/
│   ├── functions/
│   │   ├── get-current-game/       # GET /game/current
│   │   ├── get-question/           # GET /game/{gameId}/question/{num}
│   │   ├── submit-answer/          # POST /game/{gameId}/answer
│   │   ├── get-leaderboard/        # GET /game/{gameId}/leaderboard
│   │   ├── get-tv-state/           # GET /game/tv-state?barCode=XXXXX
│   │   ├── register-bar/           # POST /bar/register
│   │   ├── join-bar/               # POST /bar/join
│   │   ├── get-bar/                # GET /bar/{barCode}
│   │   ├── reset-bar-code/         # POST /bar/{barCode}/reset
│   │   ├── generate-games/         # EventBridge: pre-gen nightly games
│   │   └── get-player/             # GET/PUT /player/{playerId}
│   ├── shared/
│   │   ├── dynamo.js
│   │   ├── scoring.js
│   │   ├── game-clock.js
│   │   └── questions.js
│   └── seed/
│       └── seed-questions.js
│
├── trivia_questions.json              # 100 test questions (root level — seed into DynamoDB)
├── topic_tree.json                    # Category tree reference (root level)
│
├── player-app/                     # Player web app (CloudFront distro)
│   ├── index.html                  # SPA entry point
│   ├── css/
│   │   └── styles.css              # All styles
│   ├── js/
│   │   ├── app.js                  # Main app controller + routing
│   │   ├── api.js                  # API client (fetch wrapper)
│   │   ├── game-clock.js           # Same clock module as backend/TV
│   │   ├── scoring.js              # Same scoring module
│   │   ├── player.js               # UUID management, name, bar state
│   │   └── screens/
│   │       ├── welcome.js          # First visit: pick name
│   │       ├── home.js             # Main: countdown or active game
│   │       ├── join-bar.js         # Enter 5-char bar code
│   │       ├── question.js         # Active question with hints
│   │       ├── results.js          # Post-game results
│   │       └── profile.js          # Name, bar, stats
│   └── assets/
│       └── sounds/                 # Optional sound effects
│
├── tv-app/                         # TV web app (CloudFront distro)
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js                  # Main TV app controller
│   │   ├── api.js                  # API client
│   │   ├── game-clock.js           # Same clock module
│   │   └── scoring.js              # Same scoring module
│   └── assets/
│
├── admin-app/                      # (Phase 1.5) Admin dashboard (CloudFront distro)
│   ├── index.html                  # Login + dashboard SPA
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js                  # Auth, routing, dashboard controller
│       ├── api.js                  # API client with Basic auth header
│       └── charts.js               # Chart rendering (Chart.js from CDN)
│
└── README.md
```

### Shared Modules: Build Once, Use Everywhere
`game-clock.js` and `scoring.js` are identical across backend, player-app, and tv-app. Copy them during build/deploy. These same modules will carry into Phase 2 (React Native) and Phase 3 (native TV apps) unchanged.

### Both Apps Are Static Files
Both `player-app/` and `tv-app/` are vanilla HTML + CSS + JavaScript. No build step, no framework, no bundler. Just files served from S3 via CloudFront. This keeps Phase 1 fast to build and deploy.

---

## CloudFront DISTRIBUTIONS

| Distribution | S3 Bucket | Purpose |
|-------------|-----------|---------|
| Player App | `tap-trivia-player-app` | Mobile-first player web app |
| TV App | `tap-trivia-tv-app` | Landscape TV display app |

**No custom domains in Phase 1.** Both apps are accessed via their CloudFront distribution URLs (e.g., `d1abc2def.cloudfront.net`). Custom domains, ACM certificates, and Route53 DNS records can be added later when `taptrivia.com` is purchased.

Both distributions:
- HTTPS only (CloudFront default certificate)
- Default root object: `index.html`
- Custom error response: 404 → `index.html` (SPA routing)
- Cache policy: static assets cached, `index.html` short TTL for fast deploys

---

## NEXT DOCUMENTS

- **02** — Backend: DynamoDB tables (including persistent Bars table with geo fields), all Lambda functions, API contracts, Terraform (including S3 + CloudFront)
- **03** — Game Logic: scoring with 2s read time, question selection with adjusted ramp, clock math, 5-char bar code generation
- **04** — UI/UX: every screen for both web apps (player shows full hint eliminations), themes, animations, CSS
- **05** — Testing & Deployment: local dev, Terraform, S3 sync, CloudFront invalidation
- **06** — Admin Dashboard (Phase 1.5): live bar monitoring, historical stats by bar/state, basic auth, Chart.js
