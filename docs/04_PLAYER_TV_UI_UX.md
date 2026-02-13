# Tap Trivia — 04: UI/UX Specification (Player Web App + TV Web App)

---

## DESIGN PHILOSOPHY

Dark, premium, bar-friendly. Think cocktail lounge lighting, not sports bar neon. Fast, rewarding, slightly addictive. Every tap gets instant feedback. Scoring animations create dopamine hits. **The player's phone browser is a complete game experience — no TV required.**

Both apps are vanilla HTML + CSS + JavaScript. No framework, no build step. Static files served from S3 via CloudFront.

---

## COLOR THEME (shared across player app + TV app)

```css
:root {
  /* Backgrounds */
  --bg-primary: #0D0D0F;       /* Near-black main background */
  --bg-secondary: #1A1A2E;     /* Dark navy cards/panels */
  --bg-tertiary: #16213E;      /* Elevated surfaces */

  /* Accents */
  --accent-primary: #E94560;   /* Hot coral-red — branding, CTAs */
  --accent-secondary: #F5A623; /* Warm amber — points, rewards */
  --accent-tertiary: #00D4AA;  /* Teal-green — correct, success */

  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #A0A0B0;
  --text-disabled: #4A4A5A;

  /* Semantic */
  --correct: #00D4AA;
  --wrong: #E94560;
  --eliminated: #333345;       /* Struck-through answers */
  --points: #F5A623;

  /* Timer */
  --timer-plenty: #00D4AA;
  --timer-warning: #F5A623;
  --timer-danger: #E94560;

  /* Spacing */
  --sp-xs: 4px;
  --sp-sm: 8px;
  --sp-md: 16px;
  --sp-lg: 24px;
  --sp-xl: 32px;
  --sp-xxl: 48px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}
```

**Fonts:**
- Headings: `Inter`, weight 700 (load from Google Fonts)
- Body: `Inter`, weight 400
- Mono/Numbers: `JetBrains Mono`, weight 700 (load from Google Fonts)

---

# PART A: PLAYER WEB APP (CloudFront Distribution — Player)

**Mobile-first responsive web app.** Portrait orientation assumed. Single-page app (SPA) — one `index.html`, JavaScript-driven screen switching via `data-screen` attributes and CSS visibility.

---

## ROUTING / SCREEN MANAGEMENT

No framework router. Simple screen management:

```html
<!-- index.html contains all screens as hidden sections -->
<section id="screen-welcome" class="screen" data-screen="welcome">...</section>
<section id="screen-home" class="screen" data-screen="home">...</section>
<section id="screen-join-bar" class="screen" data-screen="join-bar">...</section>
<section id="screen-game" class="screen" data-screen="game">...</section>
<section id="screen-results" class="screen" data-screen="results">...</section>
<section id="screen-profile" class="screen" data-screen="profile">...</section>
```

```javascript
// js/app.js
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screenId}`).classList.add('active');
}
```

```css
.screen { display: none; }
.screen.active { display: flex; flex-direction: column; }
```

**Bottom nav bar:** 3 tabs — **Play** (center, prominent), **Leaderboard**, **Profile**. Fixed to bottom, semi-transparent background.

---

## PLAYER WEB APP SCREENS

### P1: Welcome (first visit only)
- Shown when no UUID exists in localStorage
- "TAP TRIVIA" logo centered
- "Pick your player name" — single text input, large, auto-focused
- "Let's Play" button in `accent-primary`
- On submit: generate UUID, store in localStorage, save name via `PUT /player/{playerId}`, show Home screen
- Name validation: 2–16 characters, alphanumeric + spaces

### P2: Home — Waiting
**Between games:**
1. Header: "TAP TRIVIA" + player name
2. **Next game countdown**: massive timer `12:47` in mono font, circular SVG progress ring
3. **Your bar card**: "Playing at Murphy's Pub (K7M2X)" or "Join a Bar →" button to open join screen
4. **Last game recap card**: "You placed #4 at Murphy's Pub • #147 globally • 8,420 pts"

**Outside game hours:**
- "Games start at 5:00 PM ET tonight"

### P3: Join Bar
- Shown when player taps "Join a Bar" or navigates from home
- Large heading: "Enter the code from the TV"
- **5-character code input** — 5 individual `<input>` elements, max-length 1 each, auto-advance on input, auto-uppercase
- Stylized like a PIN entry (each character in its own rounded box, `bg-tertiary` background, white text, mono font)
- On valid code → API call → "Joined Murphy's Pub!" with bar name + player count → return to Home
- On invalid code → CSS shake animation on input boxes + "That code doesn't match any active bar"
- "Skip — Play Solo" link below (player can play without bar, sees only global results after game)
- Player can change bar anytime from profile tab

### P4: Pre-Game Countdown (last 30 seconds)
- Giant pulsing countdown number
- "Playing as BeerChamp at Murphy's Pub"
- Player count at your bar: "23 players at Murphy's Pub"
- Dramatic flash at 0 → transitions to first question

### P5: Category Splash (0–5s per question)
- Full-screen: "QUESTION 7" + "NHL HOCKEY" + difficulty dots (1–5 filled circles)
- "GET READY" pulsing via CSS animation
- 5 seconds, auto-transitions to question

### P6: Active Question (5–50s per question)
**THE core screen. Must be perfect. Player's phone shows everything the TV shows.**

**Top bar (fixed):**
- Left: "7/15" question counter
- Center: Points available — large mono font, amber color
  - **5–7s (read time):** Shows "1000" frozen, no animation, small "READ" pill badge
  - **At 7s:** "READ" pill disappears, counter starts animated decay via `requestAnimationFrame`
- Right: Circular SVG timer ring (green→amber→red), depleting over 45s (5s–50s)

**Question area (middle ~30%):**
- Category pill badge top-left
- Question text, large bold, max 3 lines, white

**Answer buttons (bottom ~55%):**
- 4 full-width `<button>` elements, stacked vertically, min height 60px, generous padding
- BIG tap targets — users are drinking
- `touch-action: manipulation` to prevent double-tap zoom on mobile

**Button states and CSS classes:**

| State | CSS Class | Background | Text | Other |
|-------|-----------|-----------|------|-------|
| Default | `.answer-btn` | `var(--bg-tertiary)` | White | Tappable |
| Tapped (awaiting response) | `.answer-tapped` | Border glow `var(--accent-primary)` | White | CSS pulse animation |
| Correct | `.answer-correct` | `var(--correct)` | White + ✓ | CSS bounce-scale |
| Wrong | `.answer-wrong` | `var(--wrong)` | White + ✗ | CSS horizontal shake |
| Eliminated (hint) | `.answer-eliminated` | `var(--eliminated)` | "NOT {answer}", line-through | CSS slide-left + fade |
| Revealed correct | `.answer-revealed` | `var(--correct)` | White + ✓ | CSS glow pulse |

**HINT SEQUENCE ON PLAYER APP (same as TV):**
- **At 15s:** One answer button gets `.answer-eliminated` class — `transform: translateX(-10px)`, `text-decoration: line-through`, text changes to "NOT {answer}", `opacity: 0.4`. CSS `transition: all 400ms ease-out`. Button becomes `disabled`.
- **At 30s:** Second answer button same treatment.
- **At 45s:** Correct answer gets `.answer-revealed`. Remaining wrong answer gets `.answer-eliminated`.
- Player app uses `game-clock.js` + `eliminateOrder` from the question API to determine which buttons to eliminate and when. The animations are driven by `requestAnimationFrame` using the local clock, not by API polling.

**After answering:**
- Correct: "+847" element flies from center up to score counter via CSS `@keyframes fly-up` (600ms arc), button shows ✓
- Wrong: "The answer was: {correct}" appears below the question in `var(--correct)` color
- Cannot change answer. Remaining hints still animate at their scheduled times.

**Timer ring detail (SVG circle with `stroke-dashoffset`):**
- Full ring at 5s, empty at 50s
- Color: `--timer-plenty` (5–15s) → `--timer-warning` (15–30s) → `--timer-danger` (30–50s)
- Last 5 seconds: CSS pulsing animation on ring

### P7: Scores Flash (50–60s per question)
- "Your score: 5,230" + points from this question highlighted
- **Bar leaderboard snapshot**: top 5 at your bar (if at a bar)
- Solo players: just their score + "Global results after the game"
- Auto-transitions to next category splash at 60s

### P8: Post-Game Results
- "GAME OVER" + final score in large mono font
- Your bar rank: "#4 of 23 at Murphy's Pub" (if at a bar)
- Your global rank: "#147 of 1,842 players"
- Score breakdown: all 15 questions with ✓/✗, points, category, difficulty dots
- **Two leaderboard tabs: "YOUR BAR" | "GLOBAL"** — CSS tab switching, no page reload
  - Bar tab: all players at your bar, final scores
  - Global tab: top players worldwide + your rank
- CSS confetti animation for top 25% finishers
- "Next game in 12:47" CTA

### P9: Profile
- Display name (editable inline, saves on blur via `PUT /player/{playerId}`)
- Current bar: "Murphy's Pub (K7M2X)" + "Change Bar" / "Leave Bar" buttons
- Stats: games played, total points, average score
- "How to Play" expandable section
- Phase 1: No subscription management needed

---

## PLAYER APP TECHNICAL NOTES

### localStorage Keys
```javascript
const STORAGE_KEYS = {
  PLAYER_ID: 'tt_player_id',       // UUID v4
  PLAYER_NAME: 'tt_player_name',
  BAR_CODE: 'tt_bar_code',
  BAR_NAME: 'tt_bar_name',
};
```

### UUID Generation
```javascript
function generateUUID() {
  return crypto.randomUUID(); // Supported in all modern browsers
}
```

### API Client
```javascript
// js/api.js — reads from CONFIG set in js/config.js
async function apiCall(method, path, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Player-ID': localStorage.getItem('tt_player_id'),
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${CONFIG.API_BASE}${path}`, opts);
  return res.json();
}
```

```javascript
// js/config.js — updated after Terraform deploy with real values
const CONFIG = {
  API_BASE: 'https://your-api-id.execute-api.us-east-1.amazonaws.com',
  PLAYER_APP_URL: 'https://d1abc2def.cloudfront.net',  // Used by TV app for QR code
};
```

### Game Loop
The active question screen runs a `requestAnimationFrame` loop:
```javascript
function gameLoop() {
  const state = getGameState(gameStartEpoch, Date.now());
  updatePointsDisplay(state.pointsAvailable);
  updateTimerRing(state.elapsedInQuestion);
  updateHints(state.hintsVisible);
  updatePhase(state.questionPhase);
  if (state.gamePhase === 'active') requestAnimationFrame(gameLoop);
}
```

### Mobile Browser Considerations
- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` — prevent zoom during fast tapping
- `touch-action: manipulation` on answer buttons — prevent 300ms delay
- `overscroll-behavior: none` on body — prevent pull-to-refresh during game
- `-webkit-tap-highlight-color: transparent` — remove iOS tap highlight
- `position: fixed` bottom nav — stays above mobile keyboard if name input focused
- Test on iOS Safari and Android Chrome as primary targets

---

# PART B: TV WEB APP (CloudFront Distribution — TV)

**Landscape, optimized for 1920×1080.** Full-screen web app displayed on bar TVs.

---

## TV SCREENS

### TV1: Bar Setup (first visit)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    TAP TRIVIA                               │
│                                                             │
│               Enter Your Bar Name:                          │
│           ┌──────────────────────────┐                      │
│           │  Murphy's Pub            │                      │
│           └──────────────────────────┘                      │
│                                                             │
│              [ GET YOUR BAR CODE ]                          │
│                                                             │
│   Use your TV's remote to type or connect a USB keyboard.  │
└─────────────────────────────────────────────────────────────┘
```

On submit → calls `POST /bar/register` → transitions to lobby with code.

**Input considerations for TV browsers:**
- Large input field, high contrast
- On-screen keyboard works with most smart TV remotes
- USB keyboard also works if connected to the TV or streaming device
- Bar name stored in localStorage alongside barCode

### TV2: Lobby / Between Games
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   TAP TRIVIA          MURPHY'S PUB          NEXT GAME IN   │
│                                              12:47          │
│     ┌──────────────────────┐    ┌────────────────────────┐  │
│     │                      │    │                        │  │
│     │    K 7 M 2 X         │    │   Play on your phone:  │  │
│     │                      │    │   [QR CODE]            │  │
│     │  Enter this code     │    │                        │  │
│     │  on your phone       │    │   Scan to play →       │  │
│     └──────────────────────┘    └────────────────────────┘  │
│                                                             │
│     ┌──────────────────────┐    ┌────────────────────────┐  │
│     │                      │    │  LAST GAME WINNERS     │  │
│     │   Scan QR code or    │    │  🥇 TriviaKing  9,420  │  │
│     │   open your phone    │    │  🥈 BeerChamp   8,100  │  │
│     │   browser to play!   │    │  🥉 QuizMaster  7,350  │  │
│     │                      │    │                        │  │
│     └──────────────────────┘    └────────────────────────┘  │
│                                                             │
│     23 players at Murphy's Pub                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Key elements:
- **Bar code HUGE** — the primary thing patrons need to see. 5 characters, spaced, bold mono font.
- **QR code** — generated client-side pointing to the Player CloudFront URL. Primary onboarding method since the CloudFront URL is too long to type. Use a JS QR code library (e.g., `qrcode-generator` loaded from CDN).
- Countdown to next game
- Last game's bar winners (if applicable)
- Player count at this bar

**Phase 1 note:** Since there's no custom domain yet, the CloudFront URL (e.g., `d1abc2def.cloudfront.net`) is too long for patrons to type manually. A QR code is essential — generate it dynamically on the TV app using the Player CloudFront URL from `config.js`. The QR code should be large enough to scan from 10+ feet away.

### TV3: Category Splash (0–5s)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    QUESTION 7 of 15                         │
│                                                             │
│                   NHL HOCKEY                                │
│                    ● ● ○ ○ ○                                │
│                                                             │
│                   GET READY!                                │
│                                                             │
│   Murphy's Pub  •  23 players  •  K7M2X                    │
└─────────────────────────────────────────────────────────────┘
```

### TV4: Active Question — Read Time (5–7s)
```
┌─────────────────────────────────────────────────────────────┐
│  Q7/15   NHL Hockey  ●●○○○         ⏱ 1000 POINTS  [RING]  │
│─────────────────────────────────────────────────────────────│
│                                                             │
│   How many players from each team are                      │
│   typically on the ice during regular play?                │
│                                                             │
│   ┌─────────────────────┐  ┌─────────────────────┐         │
│   │     A)  5           │  │     B)  6           │         │
│   └─────────────────────┘  └─────────────────────┘         │
│   ┌─────────────────────┐  ┌─────────────────────┐         │
│   │     C)  7           │  │     D)  8           │         │
│   └─────────────────────┘  └─────────────────────┘         │
│                                                             │
│   Murphy's Pub  •  K7M2X                     📖 READ       │
└─────────────────────────────────────────────────────────────┘
```

"1000 POINTS" stays frozen. "READ" indicator visible. Timer ring full.

### TV5: Active Question — Decay (7–15s)
Same layout but "READ" disappears, points counter starts ticking down, timer ring depleting.

### TV6: Hint States
At **15s**: One answer box → `.eliminated` style:
- Background darkens to `var(--eliminated)`
- Text changes to "NOT 7" with `text-decoration: line-through`
- CSS transition: slide left + fade, 400ms

At **30s**: Second answer box same treatment.

Two remaining answers stay bright.

### TV7: Answer Reveal (45–50s)
- Correct answer box glows `var(--correct)` green, scales up slightly
- All wrong answers dark/struck through
- "0 POINTS" in points area

### TV8: Bar Leaderboard Flash (50–60s)
```
┌─────────────────────────────────────────────────────────────┐
│              MURPHY'S PUB LEADERBOARD                       │
│                                                             │
│   🥇  TriviaKing .............. 5,420                      │
│   🥈  BeerChamp ............... 4,830                      │
│   🥉  QuizMaster .............. 4,210                      │
│   4.  HopHead ................. 3,900                      │
│   5.  BarFly22 ................ 3,650                      │
│   ...                                                      │
│                                                             │
│   After Question 7 of 15           K7M2X  •  23 players    │
└─────────────────────────────────────────────────────────────┘
```

Bar leaderboard ONLY during game.

### TV9: Game Over — Bar Results (after Q15, ~30 seconds)
```
┌─────────────────────────────────────────────────────────────┐
│              🏆  GAME OVER  🏆                              │
│           MURPHY'S PUB FINAL STANDINGS                     │
│                                                             │
│   🥇  TriviaKing ............. 12,420                      │
│   🥈  BeerChamp .............. 11,830                      │
│   🥉  QuizMaster ............. 10,210                      │
│   (full list scrolling...)                                 │
│                                                             │
│   NEXT: GLOBAL LEADERBOARD                                 │
└─────────────────────────────────────────────────────────────┘
```

### TV10: Game Over — Global Leaderboard (~30 seconds)
```
┌─────────────────────────────────────────────────────────────┐
│              🌎  GLOBAL LEADERBOARD  🌎                     │
│                                                             │
│   🥇  NerdAlert (The Pub, Austin) ....... 14,200           │
│   🥈  QuizWhiz (O'Malley's, Boston) ..... 13,950           │
│   🥉  BrainBrew (Tap Room, Denver) ...... 13,400           │
│   4.  TriviaKing (Murphy's Pub) ......... 12,420           │
│   ...top 20...                                             │
│                                                             │
│   1,842 players  •  247 bars  •  Tonight                   │
│   NEXT GAME IN 12:47                                       │
└─────────────────────────────────────────────────────────────┘
```

Then transitions back to TV2 (lobby) with countdown.

---

## TV APP TECHNICAL APPROACH

### Core: Static Web App (`tv-app/`)
Single-page web app: `index.html` + `js/app.js` + `css/styles.css` + shared `js/game-clock.js` + `js/scoring.js`

- Polls `GET /game/tv-state?barCode=XXXXX` every 2 seconds via `setInterval`
- Points counter and timer tick client-side between polls via `requestAnimationFrame` (smooth, not jerky)
- Hint animations triggered by client-side clock (not waiting for poll)
- CSS animations for hints, reveals, transitions
- localStorage: stores `barCode` and `barName` for persistence across restarts

### TV Setup Flow
1. Open the TV CloudFront URL in TV browser
2. Check localStorage for existing barCode
3. If found → call `GET /bar/{barCode}` → if valid, skip to lobby
4. If not found or invalid → show bar name entry → call `POST /bar/register` → store barCode → lobby

### TV Settings
Accessible via a small gear icon in corner (clickable with remote):
- "Reset Bar Code" — generates new code, retires old one
- "Change Bar Name" — updates bar name

---

## ANIMATIONS (both apps)

All animations use CSS transitions and `@keyframes`. No JavaScript animation libraries.

1. **Points counter:** Frozen at "1000" during 5–7s read time. At 7s, begins smooth animated decay via `requestAnimationFrame` updating `textContent`. Never snaps.
2. **Timer ring (SVG):** Continuous `stroke-dashoffset` update from 5s to 50s, color shifts via CSS classes
3. **Answer tap (player app):** Instant color change + CSS `transform: scale(0.97)` on `:active`
4. **Correct answer:** `@keyframes bounce` (scale 1.0→1.05→1.0) + green background
5. **Wrong answer (player app):** `@keyframes shake` (translateX ±3px, 3 cycles) + red background
6. **Hint elimination (BOTH player app and TV):** `transition: all 400ms ease-out` — `transform: translateX(-10px)`, `text-decoration: line-through`, text changes to "NOT {answer}", `opacity: 0.4`
7. **Points fly-up (player app):** `@keyframes fly-up` from center to score counter, 600ms
8. **Question transition:** `@keyframes crossfade`, 300ms
9. **Countdown pulse:** `@keyframes pulse-scale` with increasing frequency as time nears 0
10. **Confetti (player app):** CSS-only confetti using multiple `@keyframes` on pseudo-elements, triggered for top 25% finishers
11. **TV transitions:** CSS `transition: opacity 500ms` between all screens

### Key CSS Animations
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-3px); }
  40%, 80% { transform: translateX(3px); }
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes fly-up {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-200px); opacity: 0; }
}

.answer-eliminated {
  transform: translateX(-10px);
  text-decoration: line-through;
  opacity: 0.4;
  background: var(--eliminated);
  pointer-events: none;
  transition: all 400ms ease-out;
}

.answer-correct, .answer-revealed {
  background: var(--correct);
  animation: bounce 400ms ease-out;
}

.answer-wrong {
  background: var(--wrong);
  animation: shake 400ms ease-out;
}
```

---

## SOUNDS (Player App, optional)

Use the Web Audio API or simple `<audio>` elements. All sounds optional with a mute toggle stored in localStorage.

- Correct: short chime (`correct.mp3`)
- Wrong: soft thud (`wrong.mp3`)
- Hint eliminated: whoosh (`hint.mp3`)
- Game start: rising tone (`game-start.mp3`)
- Points counting: soft tick (`tick.mp3`)

```javascript
function playSound(name) {
  if (localStorage.getItem('tt_muted') === 'true') return;
  const audio = new Audio(`/assets/sounds/${name}.mp3`);
  audio.volume = 0.5;
  audio.play().catch(() => {}); // Silently fail if autoplay blocked
}
```

---

## RESPONSIVE DESIGN

### Player App Breakpoints
- **Mobile (default, < 768px):** Full-width answer buttons stacked, single column
- **Tablet (768px–1024px):** Slightly wider content area, same layout
- **Desktop (> 1024px):** Max-width 480px centered (phone-like experience)

### TV App
- Fixed 1920×1080 layout. Use `vw`/`vh` units for sizing.
- Fallback: also works at 1280×720 (720p TVs) — test at both resolutions.
- No responsive breakpoints — TV is always landscape fullscreen.
