# Claude Prompt: TapTrivia Design → Production Code

> **Purpose:** Hand this document + the referenced files to Claude (or use in Claude Code) to port the v4 prototype design into production-ready code for TV (HTML/CSS/JS) and mobile (React Native).

---

## CONTEXT

I'm building **TapTrivia** (working name — may change), a live trivia app for bars. Patrons play on their phones while questions display on the bar's TV. The architecture is:

- **TV App:** HTML/CSS/JS web app that polls a centralized API every 5 seconds. Currently targeting web fallback first, then Samsung Tizen (native web app), Fire TV (Android WebView wrapper), and eventually Roku (BrightScript rewrite — separate project).
- **Mobile App:** Ionic / React Native for iOS and Android. Players tap answers on their phones.
- **Backend:** AWS (DynamoDB, Lambda, API Gateway) with scale-to-zero architecture.

I have a **working interactive prototype** (`taptrivia-v4.jsx`) that shows all 6 TV screens and an interactive phone mockup. The design is final — I love how it looks. I need help extracting it into production-ready, platform-appropriate code.

---

## FILES TO REFERENCE

When starting work, read these files in this order:

1. **`taptrivia-v4.jsx`** — THE SOURCE OF TRUTH. This is the interactive React prototype with all 6 TV screens + phone UI. Every color, font, spacing, animation, and component is defined here. Port FROM this file.
2. **`tokens/tokens.ts`** — Previously extracted design tokens (may be slightly outdated vs v4 — reconcile with v4 as the authority).
3. **`tokens/tokens.tv.ts`** — TV-specific token overrides.
4. **`TAP_TRIVIA_DESIGN_SYSTEM.md`** — Comprehensive design system documentation. Use for reference but v4.jsx is the visual authority.
5. **`components/web/`** and **`components/native/`** — Earlier component extractions. Use as structural reference but re-derive styles from v4.

---

## WHAT I NEED BUILT

### Deliverable 1: TV App — Production HTML/CSS/JS

The TV app is a **single-page HTML app** that will run in a browser (or WebView on Fire TV / Tizen). It does NOT use React in production — it's vanilla HTML/CSS/JS for maximum compatibility and minimal bundle size.

**Requirements:**
- Single `index.html` file with embedded `<style>` and `<script>` tags (or minimal separate files)
- No build step, no npm, no bundler — must work when opened directly or served statically
- Must render at **1920×1080** (16:9) and look correct on TVs
- All fonts loaded from Google Fonts CDN
- All animations via CSS `@keyframes` (no JS animation libraries)
- State management via simple JS object + DOM manipulation (the app polls an API and re-renders based on state)
- TV-safe colors: no pure #000 or #FFF (causes haloing on cheap bar TVs)
- 10-foot UI: all text readable from 10+ feet away

**TV Screens to implement (extract from v4.jsx):**

| Screen | v4 Component | Description |
|--------|-------------|-------------|
| Lobby | `TLobby` | Big QR code, game code, "Scan to Join" CTA, player count |
| Get Ready | `TGetReady` | Countdown (3-2-1) with pulsing animation |
| Category | `TCategory` | Category name reveal with zoom animation + category icon |
| Playing | `TPlay` | Question text, 4 answer options (A/B/C/D), circular timer, draining points bar |
| Leaderboard | `TLeaderboard` | Podium (1st/2nd/3rd) + right sidebar with ranks 4-10 + QR badge |
| Results | `TResults` | Final standings, podium, confetti, "Game Over!" + QR badge |

**Shared TV components (extract from v4.jsx):**
- `TVFrame` — The 960×540 container with gradient background + rounded corners + glow
- `Orbs` — Floating gradient orbs for ambient background movement
- `Logo` — Brain icon + "TapTrivia" wordmark (uses Fredoka font)
- `Timer` — Circular SVG countdown timer with color transitions
- `Av` — Player avatar circles with rank medals (gold/silver/bronze)
- `QRCode` — Placeholder QR code (will be dynamic in production)
- `TVQRBadge` — Bottom-corner badge with QR + "Get the App!" + game code
- `Confetti` — CSS-animated falling confetti pieces

**Critical design details from v4.jsx to preserve exactly:**
```
Background gradient: linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)
Gold gradient (scores): linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)
Correct green: #00d4aa
Wrong red: #ff4757
Selected blue/purple: #667eea → #764ba2
Gold accent: #ffd200
Font - Display/Scores: 'Fredoka', sans-serif (weights: 400-700)
Font - Body/UI: 'Outfit', sans-serif (weights: 300-900)
Font - Mono (not used on TV currently): 'DM Mono', monospace
Answer cards: glass morphism with backdrop-filter:blur, letter badges (A/B/C/D) with colored left borders
Podium: 1st = 130px tall gold-tinted, 2nd = 100px silver, 3rd = 80px bronze
```

**API Integration Hooks:**
The TV app needs to transition between screens based on a game state object received from API polling. Structure the JS so there's a clear `renderScreen(gameState)` function that accepts:
```javascript
{
  screen: "lobby" | "getready" | "category" | "playing" | "leaderboard" | "results",
  gameCode: "BR7X",
  playerCount: 14,
  question: { text: "...", answers: [{id, text}], category: "Science", difficulty: 3 },
  timer: { remaining: 15, total: 20 },
  scores: [{ name, score, rank, isCurrentCorrect }],
  // etc
}
```

**Additional TV-only screens to design (not in v4 prototype yet):**
- **Answer Reveal:** After timer expires, highlight correct answer green, flash wrong answers red, show % of players who picked each option (horizontal bar chart overlay on each answer card)
- **Between Questions:** Brief "scoreboard flash" showing who moved up/down + streak indicators
- **Idle/Attract Screen:** When no game is active — animated logo, "Ask your bartender to start a game!" with ambient orb animations
- **Error/Disconnected:** "Reconnecting..." overlay with spinner

### Deliverable 2: React Native Component Library

Port the v4 design into a React Native component library for the mobile player app. This will be used in an Ionic/React Native project.

**Mobile screens the components need to support:**
- **Join Game:** Enter game code or scan QR
- **Waiting/Lobby:** See who's joined, your avatar, game starts countdown
- **Playing:** See question + 4 answer buttons, tap to select, circular timer, current score
- **Answer Result:** Your pick highlighted, correct answer shown, points earned animation
- **Leaderboard:** Your rank + surrounding players, streak indicator
- **Game Over:** Final rank, stats summary, "Play Again" CTA

**Component list for React Native:**
- `AnswerButton` — The 4 answer option cards (A/B/C/D with colored letter badges)
- `CircleTimer` — SVG circular countdown (same design as TV but sized for mobile)
- `PlayerAvatar` — Avatar circle with optional rank medal
- `ScoreDisplay` — Animated score counter with Fredoka font
- `LeaderboardRow` — Player rank row with position indicator
- `StreakBadge` — Fire emoji + streak count badge
- `PointsEarned` — "+750" floating animation after correct answer
- `CategoryBadge` — Rounded pill showing category name + color
- `GameCodeInput` — 4-character input for joining games
- `QRScanner` — Camera view for scanning TV QR code

**React Native specific considerations:**
- Use `StyleSheet.create()` for all styles
- No `backdrop-filter` (not supported in RN) — use solid semi-transparent backgrounds instead
- Animations via `react-native-reanimated` or `Animated` API
- Fonts loaded via `expo-font` or `react-native-fonts`
- Export a `theme` object consumable by both styled-components and raw StyleSheet
- All sizes in density-independent pixels, not CSS pixels
- Touch targets minimum 44×44pt

### Deliverable 3: Shared Design Tokens

Create a single source of truth token file that both platforms consume:

```
tokens/
  colors.ts      — All color values
  typography.ts   — Font families, sizes, weights, line heights
  spacing.ts      — Spacing scale (4px base)
  animation.ts    — Duration, easing, keyframe definitions
  shadows.ts      — Elevation/shadow definitions
  index.ts        — Barrel export
```

Include platform-specific overrides:
- TV: Larger font sizes, wider spacing, bolder weights
- Mobile: Standard sizes, tighter spacing, touch-optimized
- Both: Same color palette, same brand identity

---

## DESIGN PRINCIPLES TO FOLLOW

1. **"Dark cocktail lounge, not sports bar neon"** — Elegant, moody, premium feel
2. **Glass morphism for depth** — Translucent panels with blur on TV (solid fallback on RN)
3. **Gold = rewards** — Scores, streaks, prizes always in gold gradient
4. **Animations are information** — Every animation communicates state change (correct flash, wrong shake, rank slide)
5. **TV is passive display, phone is interactive** — TV never receives input, phone is all touch
6. **Bar-friendly contrast** — Must be readable in both dim bars and moderately lit spaces
7. **No pure black/white** — Prevents TV haloing and looks more premium

---

## PLATFORM COMPATIBILITY NOTES

### Samsung Tizen (WebView)
- Uses Chromium-based WebView — modern CSS/JS works well
- No hardware acceleration issues with `backdrop-filter`
- 1920×1080 native resolution
- Memory limit ~150MB for web apps — keep DOM light

### Fire TV (Android WebView)
- Older Chromium WebView — test `backdrop-filter` support, may need fallback
- Hardware acceleration can be flaky — prefer CSS transforms over JS animation
- 1920×1080 output but may render at lower internal resolution
- D-pad navigation not needed (TV app is display-only, no user input)

### Roku (Future — BrightScript)
- **Cannot use any web technology** — this is a full rewrite
- For now, just ensure the design tokens are documented clearly enough that a BrightScript developer could recreate the visual design
- Roku uses SceneGraph XML for UI — no CSS equivalent
- Roku has limited animation capabilities — prioritize which animations are essential vs nice-to-have

### Web Fallback (Desktop/Mobile Browser)
- Standard modern browser — full CSS support
- This is the primary development target
- Should degrade gracefully if `backdrop-filter` isn't supported

---

## CODING STANDARDS

- **No frameworks on TV** — vanilla HTML/CSS/JS only
- **React Native on mobile** — functional components, hooks, TypeScript
- **Tokens in TypeScript** — `as const` for type safety
- **CSS naming on TV** — BEM-ish class names: `.tt-lobby`, `.tt-timer__ring`, `.tt-answer--correct`
- **Comments** — Document every non-obvious value (why this specific px? why this opacity?)
- **Accessibility** — ARIA labels on TV (for screen readers in WebView), `accessibilityLabel` in RN
- **Performance** — No layout thrashing on TV. Use `transform` and `opacity` for animations only. Minimize repaints during 5-second poll cycle.

---

## STEP-BY-STEP APPROACH

1. **First:** Read `taptrivia-v4.jsx` completely. Understand every component, every style value, every animation.
2. **Extract tokens** into the `tokens/` structure described above.
3. **Build TV HTML** screen by screen, starting with Lobby (simplest) → Playing (most complex) → Leaderboard/Results.
4. **Build RN components** starting with AnswerButton and CircleTimer (core gameplay), then LeaderboardRow and Avatar.
5. **Test** the TV HTML at 1920×1080 in a browser. Every element should be readable from 10 feet.
6. **Document** anything that differs between platforms or needs platform-specific implementation.

---

## EXAMPLE: How to translate v4 prototype → TV HTML

**v4 JSX (prototype):**
```jsx
<div style={{background:C.b(.35), backdropFilter:"blur(12px)", borderRadius:14, padding:"10px 14px", border:`1px solid ${C.w(.06)}`}}>
```

**TV HTML (production):**
```html
<div class="tt-qr-badge">
```
```css
.tt-qr-badge {
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); /* Tizen/WebView compat */
  border-radius: 14px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
/* Fallback for platforms without backdrop-filter */
@supports not (backdrop-filter: blur(12px)) {
  .tt-qr-badge { background: rgba(10, 5, 20, 0.85); }
}
```

Scale ALL sizes by 2× for 1920×1080 production (the v4 prototype renders at 960×540 half-size).
