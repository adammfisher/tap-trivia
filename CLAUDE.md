# TapTrivia

Live trivia game platform for bars. Synchronized global gameplay every 15 minutes (9 AM–10 PM ET). Players play on mobile browsers, bars optionally display on TVs.

## Architecture

```
player-app/  → Vanilla JS SPA (mobile web, hosted on CloudFront/S3)
tv-app/      → Vanilla JS SPA (1920x1080 bar display, CloudFront/S3)
backend/     → 11 AWS Lambda functions (Node.js 18, DynamoDB)
terraform/   → All infrastructure as code (10 .tf files)
```

**No frameworks. No WebSockets.** Clock-sync + REST polling only (TV polls every 2s, player every 5s). No login — UUID stored in localStorage, sent via `X-Player-ID` header.

## Key URLs

- **API:** `https://rb72ldqh8g.execute-api.us-east-1.amazonaws.com`
- **Player App:** `https://d1qwd1uvh2tnf5.cloudfront.net`

## Project Structure

```
tap-trivia/
├── player-app/           # Mobile player web app
│   ├── index.html        # Entry point, all screen sections
│   ├── css/styles.css    # All styling
│   └── js/
│       ├── app.js        # SPA router, screen management
│       ├── config.js     # API_BASE, PLAYER_APP_URL
│       ├── api.js        # HTTP client (X-Player-ID header)
│       ├── player.js     # localStorage state (name, UUID, bar code)
│       ├── scoring.js    # Points calculation (shared with backend)
│       ├── game-clock.js # Game timing & phases (shared with backend)
│       └── screens/
│           ├── welcome.js    # Name entry
│           ├── home.js       # Countdown to next game
│           ├── join-bar.js   # 5-char bar code entry
│           ├── question.js   # Core gameplay (rAF game loop)
│           ├── results.js    # Post-game leaderboards
│           └── profile.js    # Stats, name edit, how to play
├── tv-app/               # TV bar display
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js        # Screen renderers (idle/lobby/playing/reveal/leaderboard/results)
│       ├── config.js     # API_BASE, POLL_INTERVAL (2s)
│       ├── api.js
│       ├── scoring.js
│       └── game-clock.js
├── backend/
│   ├── shared/           # Single source of truth, copied to each Lambda
│   │   ├── dynamo.js     # DynamoDB client + CRUD helpers
│   │   ├── game-clock.js # Phase calculation + scheduling
│   │   ├── scoring.js    # Points decay algorithm
│   │   └── questions.js  # Question selection + rotation
│   └── functions/        # 11 Lambda handlers
│       ├── register-bar/
│       ├── get-bar/
│       ├── join-bar/
│       ├── reset-bar-code/
│       ├── get-current-game/
│       ├── get-question/
│       ├── get-tv-state/     # TV polling endpoint
│       ├── get-player/
│       ├── submit-answer/
│       ├── get-leaderboard/
│       └── generate-games/   # EventBridge scheduled
├── terraform/            # AWS infra (DynamoDB, Lambda, API GW, S3, CloudFront)
├── taptrivia-design-kit/ # Design system source of truth
│   ├── taptrivia-v4.jsx  # Interactive prototype (all screens + phone mockup)
│   ├── tokens/           # TypeScript design tokens
│   └── components/       # React + React Native component libraries
├── docs/                 # 01-06 numbered spec documents + SETUP_GUIDE.md
├── scripts/
│   ├── build-lambdas.sh  # Copies shared modules into each Lambda dir
│   └── start-test-game.js # Create ad-hoc test games outside business hours
├── trivia_questions.json # 100 seed questions (dev)
└── topic_tree.json       # Category/subcategory hierarchy
```

## Game Logic

- **15 questions per game**, 60 seconds each (15 min total)
- **Question phases:** category_splash (0–5s) → read_time (5–13s, 1000pts) → playing (13–50s, points decay) → reveal (45–50s) → scores (50–60s)
- **Hint system:** 1st wrong eliminated at 15s, 2nd at 30s, correct revealed at 45s
- **Points:** Exponential decay from 1000→0 (k=3.0, front-weighted)
- **Difficulty ramp:** Q1-4=L1, Q5-9=L2, Q10-12=L3, Q13-14=L4, Q15=L5

## DynamoDB Tables

| Table | Key Pattern |
|-------|-------------|
| TapTrivia-Games | `GAME#{date}#{time}` |
| TapTrivia-Questions | `Q#{questionId}` |
| TapTrivia-QuestionUsage | `USAGE#{category}` |
| TapTrivia-Answers | `ANSWER#{gameId}#{qNum}` |
| TapTrivia-Players | `PLAYER#{playerId}` |
| TapTrivia-Bars | `BAR#{barCode}` |
| TapTrivia-GameStats | `STAT#{gameId}` |

## Design System (v4)

- **Aesthetic:** "Dark cocktail lounge, not sports bar neon"
- **Source of truth:** `taptrivia-design-kit/taptrivia-v4.jsx`
- **Background:** `linear-gradient(150deg, #0f0326, #1e0f4a, #3d1866, #6b2358, #a8334a)` + floating orbs
- **Fonts:** Fredoka (display/scores), Outfit (body/UI), DM Mono (monospace)
- **Colors:** green=#00d4aa, red=#ff4757, gold=#ffd200, blue=#667eea, purple=#764ba2
- **Answer cards:** White bg (#fff) with colored letter badges (A/B/C/D), states: selected (blue-purple gradient), correct (green gradient), wrong (red gradient), eliminated (faded strikethrough)
- **Glass morphism:** `backdrop-filter: blur(12px)` with `rgba(255,255,255,0.06)` surfaces
- **TV scaling:** 2x from 960x540 prototype → 1920x1080 output
- **TV-safe:** No pure #000 or #FFF

## Development

```bash
# Local dev servers
cd player-app && python3 -m http.server 8091
cd tv-app && python3 -m http.server 8090

# Build & deploy
bash scripts/build-lambdas.sh
cd terraform && terraform apply

# Test game outside business hours
node scripts/start-test-game.js start
```

## Critical Rules

- **game-clock.js and scoring.js are shared** between frontend (player-app, tv-app) and backend (Lambda). Changes must be consistent across all copies.
- **Backend shared modules** live in `backend/shared/` and are copied by `build-lambdas.sh` — never edit the copies in function dirs directly.
- Player-app and tv-app are **vanilla JS with no build step** — just static files served from S3/CloudFront.
- The TV app is **display-only** (no player interaction). The player app is **fully standalone** (works without TV).
- All DynamoDB tables use **on-demand billing** (PAY_PER_REQUEST) for scale-to-zero cost.
