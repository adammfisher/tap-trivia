# TapTrivia


 NEVER EVER Modify the tv os on any system like fire tv everything must be done in the app.

Live trivia game platform for bars. Synchronized global gameplay every 15 minutes (5 PM–2 AM ET). Players play on mobile browsers, bars optionally display on TVs.

## Architecture

```
player-app/     → Vanilla JS SPA (mobile web, hosted on CloudFront/S3)
tv-app/         → Vanilla JS SPA (1920x1080 bar display, CloudFront/S3)
dashboard-app/  → Vanilla JS SPA (bar owner dashboard, CloudFront/S3)
backend/        → 16 AWS Lambda functions (Node.js 18, DynamoDB)
terraform/      → All infrastructure as code (11 .tf files)
```

**No frameworks. No WebSockets.** Clock-sync + REST polling only (TV polls every 2s, player every 5s). Players have no login — UUID stored in localStorage, sent via `X-Player-ID` header. Bar owners authenticate via passwordless email OTP.

## Key URLs

- **Player App:** `https://play.taptrivia.tv` (also `https://taptrivia.tv`)
- **TV App:** `https://tv.taptrivia.tv`
- **Dashboard:** `https://admin.taptrivia.tv`
- **API:** `https://api.taptrivia.tv`

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
│       ├── app.js        # Screen renderers + signage (idle/lobby/playing/reveal/leaderboard/results)
│       ├── config.js     # API_BASE, POLL_INTERVAL (2s)
│       ├── api.js
│       ├── scoring.js
│       └── game-clock.js
├── dashboard-app/        # Bar owner dashboard
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js        # SPA router, sidebar navigation
│       ├── config.js     # API_BASE, LOGO_BASE
│       ├── api.js        # Bearer token auth, apiCall helper
│       ├── auth.js       # Session state management, checkSession()
│       └── screens/
│           ├── login.js          # 3-step OTP login flow
│           ├── dashboard.js      # Stats overview, quick actions
│           ├── signage-editor.js # 7 templates, emoji pickers, slide management
│           └── logo-upload.js    # Drag-drop upload with Bedrock bg removal
├── backend/
│   ├── shared/           # Single source of truth, copied to each Lambda
│   │   ├── dynamo.js     # DynamoDB client + CRUD helpers
│   │   ├── auth.js       # Dashboard session auth (authenticate, unauthorized)
│   │   ├── game-clock.js # Phase calculation + scheduling
│   │   ├── scoring.js    # Points decay algorithm
│   │   └── questions.js  # Question selection + rotation
│   └── functions/        # 16 Lambda handlers
│       ├── register-bar/
│       ├── get-bar/
│       ├── join-bar/
│       ├── reset-bar-code/
│       ├── get-current-game/
│       ├── get-question/
│       ├── get-tv-state/     # TV polling endpoint (includes signage data)
│       ├── get-player/
│       ├── submit-answer/
│       ├── get-leaderboard/
│       ├── generate-games/   # EventBridge scheduled
│       ├── send-otp/         # POST /dashboard/auth/otp
│       ├── verify-otp/       # POST /dashboard/auth/verify
│       ├── get-dashboard/    # GET /dashboard/data
│       ├── save-signage/     # PUT /dashboard/signage
│       └── upload-logo/      # POST /dashboard/logo (Bedrock bg removal)
├── terraform/            # AWS infra (DynamoDB, Lambda, API GW, S3, CloudFront)
├── taptrivia-design-kit/ # Design system source of truth
│   ├── taptrivia-v4.jsx  # Interactive prototype (all screens + phone mockup)
│   ├── tokens/           # TypeScript design tokens
│   └── components/       # React + React Native component libraries
├── docs/                 # 01-06 numbered spec documents + SETUP_GUIDE.md
├── scripts/
│   ├── build-lambdas.sh    # Copies shared modules into each Lambda dir
│   ├── start-test-game.js  # Create ad-hoc test games outside business hours
│   └── reset-questions.js  # Reset all question usage data (for launch)
├── trivia_questions.json   # Question bank (seed file)
└── topic_tree.json       # Category/subcategory hierarchy
```

## Game Logic

- **15 questions per game**, 44 seconds each (11 min gameplay + 2 min results + 2 min break = 15 min cycle)
- **Game window:** 5:00 PM – 2:00 AM ET (36 games/night, crosses midnight)
- **Question phases:** category_splash (0–3s) → read_time (3–11s, 1000pts) → all_answers (11–14s) → hint_1 (14–24s) → hint_2 (24–32s) → reveal (32–37s) → scores (37–44s)
- **Points:** Speed bump 1000→800 (11–14s) then linear 800→0 (14–32s)
- **Difficulty ramp:** Q1-4=L1, Q5-9=L2, Q10-15=L3 (3 levels only)
- **Question rotation:** LRU-based — always prefer least-recently-used questions. 110K questions = ~6.8 months before any repeat

## DynamoDB Tables

| Table | Key Pattern |
|-------|-------------|
| TapTrivia-Games | `GAME#{date}#{time}` |
| TapTrivia-Questions | `Q#{questionId}` |
| TapTrivia-QuestionUsage | `USAGE#{category}` |
| TapTrivia-Answers | `ANSWER#{gameId}#{qNum}` |
| TapTrivia-Players | `PLAYER#{playerId}` |
| TapTrivia-Bars | `BAR#{barCode}` |
| TapTrivia-Sessions | `SESSION#{sessionId}` (TTL-enabled) |
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

## Dashboard & Signage

- **Auth:** Passwordless OTP via email + bar code → 6-digit OTP → session token (60-day TTL, stored in localStorage/sessionStorage)
- **Signage:** 7 templates (specials, happyhour, event, brand, announcement, sports, custom) with per-day scheduling, rotation speed, and enable/disable toggle
- **TV rendering:** Full-screen signage during idle/breaks; in-game panel (680px at 2×) during leaderboard/between/results screens
- **Logo upload:** Bedrock Titan Image Generator v2 removes background, stored in S3 `taptrivia-logos/`
- **Shared auth module:** `backend/shared/auth.js` — copied by build script to dashboard Lambdas only

## Implementation Progress (Dashboard, Auth & Signage — from CLAUDE-CODE-PROMPT.md)

### Phase 1: Backend Infrastructure ✅ COMPLETE
- `backend/shared/dynamo.js` — SESSIONS + FEEDBACK tables defined
- `backend/shared/auth.js` — `authenticate()` / `unauthorized()` functions
- `scripts/build-lambdas.sh` — copies auth.js to dashboard Lambda functions

### Phase 2: Lambda Functions ✅ COMPLETE
- `send-otp/` — validates email+barCode pair, rate-limits (60s), sends 6-digit OTP via SES
- `verify-otp/` — validates OTP (max 5 attempts, 10min expiry), creates 60-day session
- `get-dashboard/` — real analytics (playersPerDay, peakHours, popularCategories, retention)
- `save-signage/` — validates signage structure (7 templates, max 50KB, day scheduling)
- `upload-logo/` — Bedrock bg removal, S3 upload, CloudFront invalidation, MD5 hash
- `register-bar/` — modified: accepts ownerEmail, sends welcome email via SES
- `get-tv-state/` — modified: includes signage, logoUrl, logoHash in all response states

### Phase 3: Dashboard Web App ✅ COMPLETE
- `dashboard-app/js/screens/login.js` — 3-step flow (credentials → OTP → trust)
- `dashboard-app/js/screens/dashboard.js` — stats cards, quick actions
- `dashboard-app/js/screens/signage-editor.js` — full editor (1306 lines), all 7 templates, dual TV preview, emoji pickers
- `dashboard-app/js/screens/analytics.js` — period selector, charts, retention funnel
- `dashboard-app/js/screens/logo-upload.js` — drag-drop, Bedrock bg removal toggle
- `dashboard-app/js/auth.js` — session state management
- `dashboard-app/js/api.js` — Bearer token auth, auto-redirect on 401

### Phase 4: TV App Signage Rendering ✅ COMPLETE
- Signage renderers built inline in `tv-app/js/app.js` (lines 318-856)
- `SIGNAGE_FS` — 7 full-screen renderers (specials, happyhour, event, brand, announcement, sports, custom)
- `SIGNAGE_PANEL` — 7 in-game panel renderers
- Day-of-week filtering via `getActiveSlides()`
- Rotation logic with configurable speed
- Integrated into idle, lobby, between, leaderboard, and results screens
- Signage CSS in `tv-app/css/styles.css`
- Poll handler captures signage config and logo hash from API

### Phase 5: Terraform ✅ COMPLETE
- Sessions DynamoDB table with TTL
- SES configuration with DKIM/SPF
- S3 logos bucket with CloudFront OAC
- Dashboard S3 + CloudFront + Route53
- 5 new Lambda functions with IAM policies
- 5 API Gateway routes for dashboard endpoints
- upload-logo at 256MB/30s timeout
- Bedrock, S3, CloudFront IAM policies

### Phase 6: Testing ✅ COMPLETE
- `scripts/test-dashboard-auth.js` — end-to-end OTP flow test (8 tests)
- `scripts/test-signage.js` — signage save/retrieve/render test (7 tests)

### Manual Testing Checklist
- [ ] Register a bar with email → receive welcome email
- [ ] Request OTP → receive OTP email
- [ ] Enter wrong OTP → get error, attempts increment
- [ ] Enter correct OTP → get session token
- [ ] Use token to fetch dashboard data → get bar info
- [ ] Save signage with all 7 template types → round-trip check
- [ ] Upload a logo → verify background removal and S3 storage
- [ ] Poll tv-state → verify signage appears in break state
- [ ] Poll tv-state → verify signage appears in active_game state
- [ ] Wait for session expiry → verify 401 on next request
- [ ] Rate limit: request OTP twice within 60s → second should be ignored

## Development

```bash
# Local dev servers
cd player-app && python3 -m http.server 8091
cd tv-app && python3 -m http.server 8090
cd dashboard-app && python3 -m http.server 8092

# Build & deploy
bash scripts/build-lambdas.sh
cd terraform && terraform apply

# Test game outside business hours
node scripts/start-test-game.js start

# Seed questions (incremental mode preserves existing usage data)
node backend/seed/seed-questions.js --stage prod --incremental

# Reset all question usage (clean slate for launch)
node scripts/reset-questions.js --confirm
```

## Critical Rules

- **game-clock.js and scoring.js are shared** between frontend (player-app, tv-app) and backend (Lambda). Changes must be consistent across all copies.
- **Backend shared modules** live in `backend/shared/` and are copied by `build-lambdas.sh` — never edit the copies in function dirs directly.
- **auth.js is dashboard-only** — only copied to dashboard Lambda functions (send-otp, verify-otp, get-dashboard, save-signage, upload-logo).
- Player-app, tv-app, and dashboard-app are **vanilla JS with no build step** — just static files served from S3/CloudFront.
- The TV app is **display-only** (no player interaction). The player app is **fully standalone** (works without TV).
- The dashboard-app uses **Bearer token auth** — session tokens stored in localStorage (trusted) or sessionStorage (untrusted).
- All DynamoDB tables use **on-demand billing** (PAY_PER_REQUEST) for scale-to-zero cost.

## Next Task: Cross-Platform TV Screen Consistency Audit

### Goal
Ensure every screen on Roku and tvOS native apps is visually consistent with the web TV app (`tv-app/js/app.js`). The web app is the source of truth.

### Screens to Compare (all platforms must match web)
- **Setup** — bar code entry, registration
- **Idle** — signage rotation, QR code, branding
- **Lobby** — countdown to game, player count, bar name
- **Category Splash** — category name + icon, question number
- **Playing** — question text, answer cards (A/B/C/D), timer ring, points available
- **Reveal** — correct/wrong answer states, point award
- **Between Questions** — leaderboard mini-view, transition
- **Leaderboard** — podium (top 3), full rankings, bar vs global scope
- **Results** — final standings, game summary, next game countdown

### What to Check Per Screen
- Layout, spacing, element positioning
- Colors (backgrounds, gradients, text, answer card states)
- Fonts (Fredoka for display, Outfit for body, DM Mono for monospace)
- Answer card states: default (white), selected (blue-purple gradient), correct (green gradient), wrong (red gradient), eliminated (faded strikethrough)
- Timer ring appearance and countdown
- Signage panel rendering (7 templates) during leaderboard/between/results
- Full-screen signage rendering during idle
- QR code and bar branding

### Approach
1. **Code audit** — compare Roku BrightScript (`tv-app/apps/roku/`) and tvOS React Native (`tv-app/apps/tvos/`) screen rendering against web (`tv-app/js/app.js`)
2. **Live screenshot monitoring** (requires screen recording permission for terminal):
   - Roku: ECP screenshot API at `http://<roku-ip>:8060`
   - Apple TV: QuickTime screen mirror → `screencapture` of QuickTime window
   - Web: Playwright browser automation
   - Capture every 30-60s, save timestamped side-by-side comparisons
3. Grant **Screen Recording** permission to terminal app in System Settings → Privacy & Security before running live monitoring
