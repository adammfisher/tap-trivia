# Claude Code Prompt: Mobile Web View Rewrite + React Native Prep

> **Run this in your project root with:** `claude -p "$(cat MOBILE_REWRITE_PROMPT.md)"`
> Or paste the contents into Claude Code as a task.

---

## MISSION

Rewrite the **mobile player web view** for TapTrivia using the v4 design as the visual source of truth. The TV web view is already built and working — **do NOT touch it.** This task is mobile only.

### Critical Rule: PRESERVE ALL EXISTING FUNCTIONALITY

The current prototype (`taptrivia-v4.jsx`, `PhoneInteractive` component, lines 216-462) has working game logic. **Every behavior must be preserved exactly:**

1. **3-2-1 Countdown phase** — Displays "Question X of Y", category, animated countdown ring with numbers, "GO!" on zero, then transitions to playing
2. **Playing phase with draining points** — Timer ticks every 100ms. Points drain linearly from 1000 → 100 over 20 seconds. Points display changes color: green (>60%) → gold (30-60%) → red (<30%) with a pulsing animation at <30%
3. **Answer selection** — Tap an answer card to lock in. Once tapped: that card shows "selected" state (blue/purple gradient + glow pulse), other cards become non-interactive, points freeze at the locked-in value, "Locked In! / 1000" label appears
4. **Reveal after 2 seconds** — Correct answer (index 0 in demo) shows green + checkmark + 🎉. Wrong answer shows red + ✗. Background flashes green (correct) or red (wrong). Points earned (+N in green) or wrong (+0 in red) or timeout (+0 gray)
5. **Timer expiry** — If no answer selected and timer hits 0, auto-reveal with "Time's Up!" message
6. **Total score pill** — Persistent display showing running total, updates on correct answer
7. **Chat messages** — Two sample chat bubbles at bottom during play, replaced by "Try Again" button after reveal

### State Machine (preserve exactly):
```
countdown → playing → revealed
    ↑                      |
    └──── (reset) ─────────┘
```

### State Variables (preserve all):
```javascript
phase: "countdown" | "playing" | "revealed"
countNum: 3 → 2 → 1 → 0 (triggers phase transition)
timeLeft: 20.0 → 0.0 (decrements by 0.1 every 100ms)
selected: null | 0-3 (answer index)
lockedPts: null | number (frozen points when answer selected)
revealed: boolean
totalScore: number (running total)
```

---

## WHAT TO BUILD

### File Structure
```
src/
  mobile/
    styles/
      tokens.ts          ← Shared design tokens (colors, fonts, spacing, animations)
      animations.css      ← All @keyframes (extracted, importable)
    components/
      MobileShell.tsx     ← Full-screen container (replaces PhoneFrame)
      Header.tsx          ← Logo + player count badge
      CountdownScreen.tsx ← 3-2-1 countdown phase
      PointsDisplay.tsx   ← Draining / locked-in / result points
      CircleTimer.tsx     ← SVG countdown ring
      AnswerCard.tsx      ← A/B/C/D answer buttons with all states
      ScorePill.tsx       ← Total score display
      CategoryBar.tsx     ← Category badge + question progress
      ChatBubble.tsx      ← In-game chat messages
      GameScreen.tsx      ← Main orchestrator (playing + revealed phases)
    hooks/
      useGameTimer.ts     ← Timer logic (100ms tick, points calculation)
      useGameState.ts     ← Phase transitions, answer handling, scoring
    types/
      game.ts             ← TypeScript interfaces for all game state
```

### Design Token File (`tokens.ts`)

Extract these EXACT values from v4.jsx. These are the source of truth:

```typescript
// ─── COLORS ───
export const colors = {
  // Background gradient
  gradMain: 'linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)',
  
  // Accent gradients
  gradGold: 'linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)',
  gradCorrect: 'linear-gradient(135deg, #00c9a7, #2ee6b6)',
  gradWrong: 'linear-gradient(135deg, #ff4757, #ff6b81)',
  gradSelected: 'linear-gradient(135deg, #667eea, #764ba2)',
  gradHeader: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
  gradFooter: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)',

  // Flat colors
  green: '#00d4aa',
  red: '#ff4757',
  gold: '#ffd200',
  blue: '#667eea',
  purple: '#764ba2',
  darkGold: '#f7971e',

  // Helpers — use these for rgba overlays
  white: (alpha: number) => `rgba(255,255,255,${alpha})`,
  black: (alpha: number) => `rgba(0,0,0,${alpha})`,
} as const;

// ─── TYPOGRAPHY ───
export const fonts = {
  display: "'Fredoka', sans-serif",    // Scores, numbers, headings
  body: "'Outfit', sans-serif",        // UI text, labels, buttons
  mono: "'DM Mono', monospace",        // Not currently used on mobile
} as const;

// ─── SPACING (mobile) ───
export const space = {
  xs: 4,   sm: 8,   md: 12,  lg: 16,
  xl: 24,  xxl: 32, xxxl: 48,
} as const;

// ─── SIZES (mobile phone view) ───
export const sizes = {
  // Timer
  timerSize: 58,
  timerStroke: 3,
  
  // Answer cards
  cardMinHeight: 56,
  cardPadding: '15px 18px',
  cardRadius: 14,
  cardGap: 8,
  letterBadgeSize: 32,
  
  // Avatar
  avatarSmall: 18,   // chat
  avatarMedium: 24,  // leaderboard rows
  avatarLarge: 36,   // profile
  
  // Points display
  pointsFontDraining: 52,
  pointsFontLocked: 48,
  pointsFontResult: 52,
  
  // Misc
  scorePillRadius: 10,
  categoryBadgeRadius: 16,
  progressBarHeight: 3,
} as const;
```

### React Native Compatibility Layer

**IMPORTANT:** Structure every component so it can be swapped to React Native later with minimal changes. Follow these rules:

1. **No DOM-specific APIs** in component logic — keep `onClick` handlers as simple callback props, don't use `e.target`, `e.preventDefault()`, etc.

2. **Export prop interfaces** for every component:
```typescript
// This interface works for both web and RN
export interface AnswerCardProps {
  label: string;
  letter: 'A' | 'B' | 'C' | 'D';
  state: 'default' | 'selected' | 'correct' | 'wrong' | 'eliminated';
  onPress: () => void;
  disabled?: boolean;
  animationDelay?: number;
}
```

3. **Separate style objects from JSX** — Don't inline styles. Use style objects or CSS classes that map 1:1 to RN `StyleSheet.create()`:
```typescript
// WEB VERSION (what you're building now):
const styles = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '15px 18px',
    minHeight: 56,
    borderRadius: 14,
    // ...
  }
};

// FUTURE RN VERSION (same structure, RN values):
// const styles = StyleSheet.create({
//   card: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 14,
//     paddingHorizontal: 18,
//     paddingVertical: 15,
//     minHeight: 56,
//     borderRadius: 14,
//   }
// });
```

4. **Animation strategy:**
   - Web: CSS `@keyframes` + `animation` property (current approach — keep it)
   - RN: Will use `react-native-reanimated` — so structure animation triggers as boolean props or state changes, NOT as CSS class toggles
   - Add a comment `// RN: Animated.timing()` or `// RN: withSpring()` next to each animation to document the planned RN equivalent

5. **No `backdrop-filter`** in any component that will become RN — use solid semi-transparent backgrounds instead. The web version CAN use it but add a comment noting the RN fallback:
```typescript
// Web: backdrop-filter: blur(12px) with rgba(0,0,0,0.35)
// RN fallback: solid rgba(10, 5, 20, 0.85) — no blur support
```

6. **Touch targets** — All interactive elements must be minimum 44px tall (already true for answer cards at 56px minHeight, but verify buttons, badges, etc.)

---

## COMPONENT SPECIFICATIONS

### `MobileShell.tsx`
Full-screen container. Replaces the `PhoneFrame` wrapper.
- Background: `colors.gradMain`
- Contains animated `Orbs` (3 floating gradient circles)
- Wraps all content with relative positioning
- **Web:** `width: 100%; height: 100vh; overflow: hidden`
- **RN note:** Will become a `<View style={{flex: 1}}>` with `LinearGradient` from expo

### `Header.tsx`
Top bar with logo and player count.
```
┌─────────────────────────────┐
│ TapTrivia          👥 14    │
└─────────────────────────────┘
```
- Logo: "Tap" in white + "Trivia" in gold gradient (Fredoka 17px bold)
- Player count: pill badge with `rgba(255,255,255,0.08)` background, 👥 emoji + count

### `CountdownScreen.tsx`
The 3-2-1 pre-question screen. Props:
```typescript
interface CountdownScreenProps {
  questionNumber: number;
  totalQuestions: number;
  category: string;
  categoryEmoji: string;
  countdownValue: number; // 3, 2, 1, or 0 (shows "GO!")
}
```
- Centered layout: Logo → "Question X of Y" → category → animated ring with number → "Get ready!" → "Answer fast for more points"
- Ring: 120×120px circle, `rgba(255,255,255,0.06)` bg, 3px `colors.blue` border, `ringPulse` animation
- Number: Fredoka 64px bold, white, `countdownNum` keyframe animation on each change
- On value 0: display "GO!" text instead of number

### `PointsDisplay.tsx`
The most complex visual component. Three distinct states:

**State 1: Draining (no answer selected yet)**
```typescript
interface PointsDrainingProps {
  mode: 'draining';
  points: number;        // 1000 → 100
  maxPoints: number;     // 1000
  color: string;         // green/gold/red based on percentage
}
```
- Points number: Fredoka 52px bold, color from prop, drop-shadow glow
- "Points Available" label: 11px uppercase, `rgba(255,255,255,0.4)`
- Drain bar: 180px wide, 4px tall, rounded, background track `rgba(255,255,255,0.08)`, fill matches color
- Pulse animation when <30%: `drainPulse` keyframe

**State 2: Locked In (answer selected, waiting for reveal)**
```typescript
interface PointsLockedProps {
  mode: 'locked';
  points: number;        // frozen value
  maxPoints: number;
}
```
- Points number: Fredoka 48px bold, gold gradient text (`background-clip: text`)
- "Locked In! / 1000" label: gold color
- Entry animation: `pointsEarned` keyframe (scale bounce)

**State 3: Revealed (after answer reveal)**
```typescript
interface PointsRevealedProps {
  mode: 'revealed';
  earned: number;         // points earned (0 if wrong/timeout)
  maxPoints: number;
  result: 'correct' | 'wrong' | 'timeout';
}
```
- Correct: "+N" in green 52px, "Points Earned! / 1000" label
- Wrong: "+0" in red 48px, "Wrong Answer" label
- Timeout: "+0" in gray 48px, "Time's Up!" label
- Entry animation: `pointsEarned` keyframe

### `CircleTimer.tsx`
SVG circular countdown. Props:
```typescript
interface CircleTimerProps {
  seconds: number;       // integer display value
  total: number;         // max seconds
  size?: number;         // default 58 (mobile)
  strokeWidth?: number;  // default 3
}
```
- SVG ring with background track (`rgba(255,255,255,0.08)`) and progress arc
- Color transitions: green (>50%) → gold (20-50%) → red (<20%)
- Progress arc: `strokeDasharray` + `strokeDashoffset`, 1s linear transition
- Center number: Fredoka, `size * 0.32` font, matching color
- Glow: `drop-shadow(0 0 8px {color})`
- Pulse animation on center number when <20%: `pulse 1s infinite`
- **RN note:** Will use `react-native-svg` `<Circle>` — same math, different import

### `AnswerCard.tsx`
The answer option buttons. Props:
```typescript
interface AnswerCardProps {
  label: string;          // Answer text
  letter: 'A' | 'B' | 'C' | 'D';
  state: 'default' | 'selected' | 'correct' | 'wrong' | 'eliminated';
  onPress: () => void;
  disabled?: boolean;
  animationDelay?: number; // stagger index (0-3)
}
```

**State styles (from v4.jsx lines 98-126):**

| State | Background | Letter Badge | Text Color | Animation |
|-------|-----------|-------------|------------|-----------|
| default | `rgba(255,255,255,1)` (white) | Pastel purple gradient `#eef1ff → #e4d8ff` | `#1e0f4a` (dark purple) | `slideUp` with stagger delay |
| selected | `gradSelected` (blue→purple) | `rgba(255,255,255,0.2)` | white | `glowPulse 2s infinite` |
| correct | `gradCorrect` (green) | green bg, "✓" | white | `bounceIn .4s` |
| wrong | `gradWrong` (red) | red bg, "✗" | white | `shake .4s` |
| eliminated | `rgba(255,255,255,0.25)` | `rgba(255,255,255,0.2)` | `rgba(255,255,255,0.3)` | none, opacity 0.45, dashed border, line-through |

- Letter badge: 32×32px, 9px border radius
- Card: 14px border radius, 56px min height, `15px 18px` padding
- Hover (web only): `translateY(-2px)`, elevated shadow
- Active (web only): `scale(0.97)`
- Correct shows 🎉 emoji on right side
- **RN note:** `TouchableOpacity` with `Animated.View` wrapper for state transitions

### `ScorePill.tsx`
Small centered pill showing running total. Props:
```typescript
interface ScorePillProps {
  score: number;
}
```
- Container: `rgba(255,255,255,0.06)` bg, 10px radius, `5px 14px` padding
- "TOTAL" label: 10px, `rgba(255,255,255,0.35)`
- Score: Fredoka 16px bold, gold

### `CategoryBar.tsx`
Category badge + progress bar. Props:
```typescript
interface CategoryBarProps {
  category: string;
  categoryEmoji: string;
  current: number;        // question number
  total: number;          // total questions
}
```
- Left: pill badge with emoji + category name (11px uppercase)
- Right: "7/15" (Fredoka 14px, current white, total gray)
- Below: 3px progress bar, blue→purple gradient fill

### `ChatBubble.tsx`
In-game chat messages. Props:
```typescript
interface ChatBubbleProps {
  name: string;
  message: string;
  delay?: number;
}
```
- 18px avatar circle (color derived from name hash)
- Name in hue-matched color, message in `rgba(255,255,255,0.45)`
- `chatSlide` entrance animation

### `GameScreen.tsx`
The main orchestrator component. This is where all the game logic lives.

**IMPORTANT: Port the EXACT logic from `PhoneInteractive` (v4.jsx lines 216-462).** Don't simplify, don't refactor the timing, don't change the state machine. The 100ms timer tick, the 2-second reveal delay, the points formula — all must be identical.

Compose all the above components:
```
MobileShell
  ├── Header
  ├── PointsDisplay (draining | locked | revealed)
  ├── ScorePill
  ├── CircleTimer
  ├── CategoryBar + progress
  ├── Question text
  ├── AnswerCard × 4
  └── Footer (ChatBubbles during play, action button after reveal)
```

---

## HOOKS FOR REACT NATIVE

### `useGameTimer.ts`
```typescript
interface UseGameTimerReturn {
  timeLeft: number;           // 20.0 → 0.0
  displaySeconds: number;     // ceil(timeLeft) for display
  availablePoints: number;    // 1000 → 100 linear drain
  pointsPercent: number;      // 0.0 → 1.0
  pointsColor: string;        // green/gold/red
  isExpired: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}
```
- Ticks every 100ms (setInterval) for smooth points drain
- Points formula: `Math.max(100, Math.round(1000 * (timeLeft / 20)))`
- Color thresholds: green >60%, gold 30-60%, red <30%
- **RN note:** Same hook works in RN — `setInterval` is available. For smoother animations, can upgrade to `useSharedValue` from reanimated later.

### `useGameState.ts`
```typescript
interface UseGameStateReturn {
  phase: 'countdown' | 'playing' | 'revealed';
  countdownValue: number;
  selected: number | null;
  lockedPoints: number | null;
  revealed: boolean;
  totalScore: number;
  isCorrect: boolean;
  result: 'correct' | 'wrong' | 'timeout';
  selectAnswer: (index: number) => void;
  reset: () => void;
}
```
- Manages phase transitions
- `selectAnswer`: locks points, sets 2-second reveal timeout, updates total score if correct
- `reset`: returns to countdown phase
- **RN note:** Identical hook, no platform-specific code needed

### `types/game.ts`
```typescript
export interface Question {
  id: string;
  text: string;
  answers: Answer[];
  correctIndex: number;
  category: string;
  categoryEmoji: string;
  difficulty: number;
}

export interface Answer {
  id: string;
  text: string;
}

export interface PlayerScore {
  name: string;
  score: number;
  rank: number;
  streak: number;
  isYou: boolean;
}

export interface GameState {
  phase: 'lobby' | 'countdown' | 'playing' | 'revealed' | 'leaderboard' | 'gameover';
  gameCode: string;
  playerCount: number;
  currentQuestion: Question | null;
  questionNumber: number;
  totalQuestions: number;
  timer: { remaining: number; total: number };
  scores: PlayerScore[];
  myScore: number;
}

// API response shape (what the phone polls from the backend)
export interface GamePollResponse {
  screen: GameState['phase'];
  gameCode: string;
  playerCount: number;
  question?: {
    id: string;
    text: string;
    answers: { id: string; text: string }[];
    category: string;
    difficulty: number;
  };
  timer?: { remaining: number; total: number };
  correctAnswerId?: string;  // only present during 'revealed' phase
  scores?: { name: string; score: number }[];
}
```

---

## ALL CSS ANIMATIONS TO INCLUDE

Extract these exactly from v4.jsx (lines 23-56). Put them in `animations.css`:

```css
/* ─── Shared Animations ─── */
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
@keyframes popIn { 0%{transform:scale(.85);opacity:0} 60%{transform:scale(1.03)} 100%{transform:scale(1);opacity:1} }
@keyframes slideUp { from{transform:translateY(14px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes fadeDown { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
@keyframes bounceIn { 0%{transform:scale(1)} 35%{transform:scale(1.07)} 100%{transform:scale(1)} }
@keyframes chatSlide { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:.75} }

/* ─── Background Orbs ─── */
@keyframes orb1 { 0%,100%{transform:translate(0,0)scale(1)} 33%{transform:translate(50px,-30px)scale(1.15)} 66%{transform:translate(-25px,25px)scale(.9)} }
@keyframes orb2 { 0%,100%{transform:translate(0,0)scale(1)} 33%{transform:translate(-35px,45px)scale(.85)} 66%{transform:translate(35px,-25px)scale(1.1)} }

/* ─── Game-Specific ─── */
@keyframes countdownNum { 0%{transform:scale(2);opacity:0} 30%{transform:scale(0.9);opacity:1} 50%{transform:scale(1)} 100%{transform:scale(1);opacity:1} }
@keyframes ringPulse { 0%,100%{box-shadow:0 0 0 0 rgba(102,126,234,.4)} 50%{box-shadow:0 0 0 12px rgba(102,126,234,0)} }
@keyframes pointsEarned { 0%{transform:scale(0.5);opacity:0} 50%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
@keyframes drainPulse { 0%,100%{opacity:1} 50%{opacity:.85} }
@keyframes glowPulse { 0%,100%{box-shadow:0 0 15px rgba(102,126,234,.25)} 50%{box-shadow:0 0 30px rgba(102,126,234,.5)} }

/* ─── Result Flashes ─── */
@keyframes correctFlash { 0%{background:rgba(0,212,170,0)} 30%{background:rgba(0,212,170,.08)} 100%{background:rgba(0,212,170,0)} }
@keyframes wrongFlash { 0%{background:rgba(255,71,87,0)} 30%{background:rgba(255,71,87,.08)} 100%{background:rgba(255,71,87,0)} }

/* ─── Answer Card Interaction ─── */
.answer-card { transition: all .2s cubic-bezier(.34,1.56,.64,1); cursor: pointer; }
.answer-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,.2); }
.answer-card:active { transform: scale(.97); }
```

---

## GOOGLE FONTS IMPORT

Include this in the HTML `<head>` or CSS:
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
```

For React Native, load via `expo-font`:
```typescript
// RN font loading (future reference)
// Fredoka-Regular, Fredoka-Medium, Fredoka-SemiBold, Fredoka-Bold
// Outfit-Light through Outfit-Black
// DMMono-Regular, DMMono-Medium
```

---

## VERIFICATION CHECKLIST

After building, verify each of these works identically to v4.jsx:

- [ ] Countdown: 3 → 2 → 1 → GO! with ring pulse and number pop animation
- [ ] Points drain smoothly from 1000 → 100 over 20 seconds
- [ ] Points color transitions: green → gold → red at correct thresholds
- [ ] Points pulse animation activates below 30%
- [ ] Drain bar width shrinks in sync with points
- [ ] Tapping answer locks in points immediately (no further drain)
- [ ] Selected card shows blue/purple gradient with glow pulse
- [ ] Other cards become non-interactive after selection
- [ ] "Locked In!" label appears with gold gradient text
- [ ] 2-second delay between selection and reveal
- [ ] Correct answer: green + ✓ + 🎉 + bounce animation
- [ ] Wrong answer: red + ✗ + shake animation
- [ ] Background flash: green for correct, red for wrong
- [ ] Points result: "+N" green (correct), "+0" red (wrong), "+0" gray (timeout)
- [ ] Total score updates after correct answer
- [ ] Timer hitting 0 triggers auto-reveal with "Time's Up!"
- [ ] Timer ring color matches seconds remaining
- [ ] Timer center number pulses below 20%
- [ ] Chat bubbles visible during play, slide-in animation
- [ ] "Try Again" button appears after reveal
- [ ] Reset returns all state to countdown phase
- [ ] All fonts render correctly (Fredoka for numbers, Outfit for text)
- [ ] Orb animations are subtle and continuous
- [ ] No layout shift or jank during any transition

---

## DO NOT

- ❌ Do NOT modify the TV web view code
- ❌ Do NOT use a CSS framework (Tailwind, Bootstrap, etc.)
- ❌ Do NOT use a state management library (Redux, Zustand, etc.)
- ❌ Do NOT use any animation library (Framer Motion, GSAP, etc.) — CSS keyframes only
- ❌ Do NOT change the visual design — match v4.jsx pixel-for-pixel
- ❌ Do NOT simplify the timer tick rate (must be 100ms for smooth drain)
- ❌ Do NOT change the points formula
- ❌ Do NOT change the 2-second reveal delay
- ❌ Do NOT use `localStorage` or any persistence — state is ephemeral
- ❌ Do NOT add screens that aren't in the current v4 phone view (lobby, leaderboard, etc. come later)
