# Tap Trivia — Component Design System

> **Version:** 1.0
> **Platforms:** React Native (iOS/Android mobile) + React (TV web app)
> **Design Philosophy:** Dark cocktail lounge, not sports bar neon. Fast, rewarding, slightly addictive.

---

## 1. DESIGN TOKENS

### 1.1 Colors

```typescript
// theme/colors.ts

export const colors = {
  // ─── Backgrounds ───
  bg: {
    primary:    '#0D0D0F',   // Near-black — main canvas
    secondary:  '#1A1A2E',   // Dark navy — cards, panels, modals
    tertiary:   '#16213E',   // Elevated surfaces, active states
    overlay:    'rgba(13, 13, 15, 0.85)', // Modal/sheet backdrop
    glass:      'rgba(26, 26, 46, 0.6)',  // Glassmorphism panels
  },

  // ─── Brand / Accent ───
  accent: {
    primary:    '#E94560',   // Hot coral-red — CTAs, branding, logo
    secondary:  '#F5A623',   // Warm amber — points, rewards, streaks
    tertiary:   '#00D4AA',   // Teal-green — correct, success, progress
    purple:     '#8B5CF6',   // Electric purple — special rounds, power-ups
  },

  // ─── Text ───
  text: {
    primary:    '#FFFFFF',   // Headings, important content
    secondary:  '#A0A0B0',   // Body text, descriptions
    tertiary:   '#6B6B7B',   // Hints, timestamps, meta
    disabled:   '#4A4A5A',   // Disabled controls
    inverse:    '#0D0D0F',   // Text on light backgrounds
  },

  // ─── Semantic / Functional ───
  semantic: {
    correct:    '#00D4AA',   // Correct answer flash
    wrong:      '#E94560',   // Wrong answer flash
    eliminated: '#333345',   // Struck-through eliminated answers
    warning:    '#F5A623',   // Warnings, time running low
    info:       '#5B8DEF',   // Informational badges
  },

  // ─── Timer States ───
  timer: {
    plenty:     '#00D4AA',   // > 60% time remaining
    warning:    '#F5A623',   // 30-60% time remaining
    danger:     '#E94560',   // < 30% time remaining
    pulse:      '#FF2D55',   // Final 5 seconds — pulsing red
  },

  // ─── Answer Option States ───
  answer: {
    idle:       '#1A1A2E',   // Unselected answer card
    hover:      '#222240',   // Hover/focus state (TV remote navigation)
    selected:   '#2A2A4A',   // Player has tapped this
    correct:    '#0A3D2E',   // Revealed as correct (dark green bg)
    wrong:      '#3D0A1A',   // Revealed as wrong (dark red bg)
    eliminated: '#1A1A22',   // Greyed out after hint elimination
  },

  // ─── Borders & Dividers ───
  border: {
    subtle:     '#2A2A3A',   // Card borders, dividers
    medium:     '#3A3A4A',   // Input borders
    focus:      '#E94560',   // Focused input border
    correct:    '#00D4AA',   // Correct answer border glow
    wrong:      '#E94560',   // Wrong answer border glow
  },

  // ─── Gradients (CSS/RN linear gradient values) ───
  gradient: {
    brandHero:     ['#E94560', '#8B5CF6'],       // Hero sections, splash
    pointsFlash:   ['#F5A623', '#FF6B35'],       // Points earned animation
    correctFlash:  ['#00D4AA', '#00B894'],       // Correct answer celebration
    cardShine:     ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'], // Subtle card sheen
    timerDanger:   ['#E94560', '#FF2D55'],       // Timer critical
  },
} as const;
```

### 1.2 Typography

```typescript
// theme/typography.ts

export const fonts = {
  // ─── Font Families ───
  family: {
    heading:  'Inter-Bold',          // All headings, CTAs, emphasis
    body:     'Inter-Regular',       // Body text, descriptions
    medium:   'Inter-Medium',        // Labels, secondary headings
    semibold: 'Inter-SemiBold',      // Subheadings, nav items
    mono:     'JetBrainsMono-Bold',  // Points, timers, codes, scores
  },

  // ─── Size Scale (in px for React, same values for RN) ───
  size: {
    // Display — splash, hero, game-over screens
    display:  { xl: 64, lg: 48 },

    // Headings — screen titles, section headers
    heading:  { xl: 32, lg: 28, md: 24, sm: 20 },

    // Body — readable content
    body:     { lg: 18, md: 16, sm: 14, xs: 12 },

    // Mono — numerical displays (points, timer, codes)
    mono:     { xl: 72, lg: 48, md: 32, sm: 24, xs: 16 },
  },

  // ─── Line Heights ───
  lineHeight: {
    tight:    1.1,  // Display text, headings
    normal:   1.4,  // Body text
    relaxed:  1.6,  // Long-form descriptions
  },

  // ─── Letter Spacing ───
  tracking: {
    tight:    -0.5,  // Display headings
    normal:   0,     // Body text
    wide:     1.0,   // Labels, uppercase text
    mono:     2.0,   // Code entry, scores
  },
} as const;

// ─── Preset Text Styles ───
export const textStyles = {
  // Display
  displayXL:    { fontFamily: fonts.family.heading,  fontSize: fonts.size.display.xl,  lineHeight: fonts.lineHeight.tight,   letterSpacing: fonts.tracking.tight },
  displayLG:    { fontFamily: fonts.family.heading,  fontSize: fonts.size.display.lg,  lineHeight: fonts.lineHeight.tight,   letterSpacing: fonts.tracking.tight },

  // Headings
  h1:           { fontFamily: fonts.family.heading,  fontSize: fonts.size.heading.xl,  lineHeight: fonts.lineHeight.tight },
  h2:           { fontFamily: fonts.family.heading,  fontSize: fonts.size.heading.lg,  lineHeight: fonts.lineHeight.tight },
  h3:           { fontFamily: fonts.family.semibold, fontSize: fonts.size.heading.md,  lineHeight: fonts.lineHeight.tight },
  h4:           { fontFamily: fonts.family.semibold, fontSize: fonts.size.heading.sm,  lineHeight: fonts.lineHeight.tight },

  // Body
  bodyLG:       { fontFamily: fonts.family.body,     fontSize: fonts.size.body.lg,     lineHeight: fonts.lineHeight.normal },
  bodyMD:       { fontFamily: fonts.family.body,     fontSize: fonts.size.body.md,     lineHeight: fonts.lineHeight.normal },
  bodySM:       { fontFamily: fonts.family.body,     fontSize: fonts.size.body.sm,     lineHeight: fonts.lineHeight.normal },
  bodyXS:       { fontFamily: fonts.family.body,     fontSize: fonts.size.body.xs,     lineHeight: fonts.lineHeight.normal },

  // Labels
  labelLG:      { fontFamily: fonts.family.medium,   fontSize: fonts.size.body.lg,     lineHeight: fonts.lineHeight.tight,   letterSpacing: fonts.tracking.wide, textTransform: 'uppercase' as const },
  labelMD:      { fontFamily: fonts.family.medium,   fontSize: fonts.size.body.sm,     lineHeight: fonts.lineHeight.tight,   letterSpacing: fonts.tracking.wide, textTransform: 'uppercase' as const },
  labelSM:      { fontFamily: fonts.family.medium,   fontSize: fonts.size.body.xs,     lineHeight: fonts.lineHeight.tight,   letterSpacing: fonts.tracking.wide, textTransform: 'uppercase' as const },

  // Mono / Numeric
  scoreXL:      { fontFamily: fonts.family.mono,     fontSize: fonts.size.mono.xl,     lineHeight: fonts.lineHeight.tight,   letterSpacing: fonts.tracking.mono },
  scoreLG:      { fontFamily: fonts.family.mono,     fontSize: fonts.size.mono.lg,     lineHeight: fonts.lineHeight.tight,   letterSpacing: fonts.tracking.mono },
  scoreMD:      { fontFamily: fonts.family.mono,     fontSize: fonts.size.mono.md,     lineHeight: fonts.lineHeight.tight,   letterSpacing: fonts.tracking.mono },
  scoreSM:      { fontFamily: fonts.family.mono,     fontSize: fonts.size.mono.sm,     lineHeight: fonts.lineHeight.tight,   letterSpacing: fonts.tracking.mono },

  // Question text (special — needs to be readable at speed on a phone screen in a bar)
  question:     { fontFamily: fonts.family.semibold, fontSize: 22,                     lineHeight: 1.35 },
  questionTV:   { fontFamily: fonts.family.semibold, fontSize: 56,                     lineHeight: 1.3 },
} as const;
```

### 1.3 Spacing

```typescript
// theme/spacing.ts

export const spacing = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

// ─── Layout-Specific Spacing ───
export const layout = {
  // Screen padding
  screenPadding: {
    mobile: spacing.md,         // 16px horizontal padding
    tv:     spacing.xxxl,       // 64px — TV needs breathing room
  },

  // Card internal padding
  cardPadding: {
    mobile: spacing.md,         // 16px
    tv:     spacing.xl,         // 32px
  },

  // Gap between stacked items
  stackGap: {
    tight:  spacing.sm,         // 8px — compact lists
    normal: spacing.md,         // 16px — standard stack
    loose:  spacing.lg,         // 24px — section separators
  },

  // Answer option spacing
  answerGap: {
    mobile: spacing.sm,         // 8px between answer cards
    tv:     spacing.md,         // 16px on TV
  },

  // Safe areas (physical screen edges)
  safeArea: {
    top:    spacing.xxl,        // 48px — below notch/dynamic island
    bottom: spacing.xl,         // 32px — above home indicator
  },
} as const;
```

### 1.4 Border Radius

```typescript
// theme/radius.ts

export const radius = {
  none: 0,
  xs:   4,    // Tiny badges
  sm:   8,    // Input fields, small cards
  md:   12,   // Standard cards, buttons
  lg:   16,   // Large cards, answer options
  xl:   24,   // Modal sheets, panels
  full: 9999, // Pills, circular avatars
} as const;
```

### 1.5 Shadows & Elevation

```typescript
// theme/shadows.ts

export const shadows = {
  // Mobile (React Native shadow props)
  none:   { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  sm:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 },  shadowOpacity: 0.25, shadowRadius: 4,  elevation: 2 },
  md:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 },  shadowOpacity: 0.30, shadowRadius: 8,  elevation: 4 },
  lg:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 },  shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  glow:   { shadowColor: '#E94560', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.40, shadowRadius: 20, elevation: 10 },
  correctGlow: { shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.40, shadowRadius: 20, elevation: 10 },
  pointsGlow:  { shadowColor: '#F5A623', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.40, shadowRadius: 20, elevation: 10 },
} as const;

// TV (CSS box-shadow equivalents)
export const tvShadows = {
  none:   'none',
  sm:     '0 2px 4px rgba(0,0,0,0.25)',
  md:     '0 4px 8px rgba(0,0,0,0.30)',
  lg:     '0 8px 16px rgba(0,0,0,0.35)',
  glow:   '0 0 20px rgba(233,69,96,0.4)',
  correctGlow: '0 0 20px rgba(0,212,170,0.4)',
  pointsGlow:  '0 0 20px rgba(245,166,35,0.4)',
} as const;
```

### 1.6 Animation Tokens

```typescript
// theme/animation.ts

export const animation = {
  // ─── Durations (ms) ───
  duration: {
    instant:  100,   // Tap feedback, color change
    fast:     200,   // Button press, state toggle
    normal:   300,   // Card transitions, reveals
    slow:     500,   // Page transitions, celebrations
    dramatic: 1000,  // Score reveal, game over
  },

  // ─── Easing Curves ───
  easing: {
    standard:   'cubic-bezier(0.4, 0.0, 0.2, 1)',    // General motion
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',    // Entering elements
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',      // Exiting elements
    bounce:     'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Playful — points, celebrations
    spring:     'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Answer card snap
  },

  // ─── Haptic Feedback Types (React Native) ───
  haptic: {
    tap:        'impactLight',     // Any button tap
    select:     'impactMedium',    // Answer selection
    correct:    'notificationSuccess',
    wrong:      'notificationError',
    countdown:  'impactHeavy',     // 3-2-1 countdown ticks
    celebrate:  'notificationSuccess',  // Score earned
  },
} as const;
```

---

## 2. COMPONENT LIBRARY

All components are designed mobile-first for React Native, with TV web variants noted where they differ.

### 2.1 Buttons

```
┌─────────────────────────────────────────────────────────────┐
│  BUTTON VARIANTS                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ● Primary    — accent.primary bg, white text, full-width   │
│                  Main CTAs: "Join Game", "Subscribe"         │
│                                                              │
│  ● Secondary  — transparent bg, accent.primary border/text  │
│                  Secondary actions: "Change Name", "Leave"   │
│                                                              │
│  ● Ghost      — transparent bg, text.secondary text         │
│                  Tertiary: "Skip", "Cancel", "Maybe Later"  │
│                                                              │
│  ● Danger     — semantic.wrong bg, white text               │
│                  Destructive: "Leave Game", "Unsubscribe"   │
│                                                              │
│  ● Icon       — circular, icon only, bg.tertiary bg         │
│                  Settings gear, back arrow, close X          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
// components/Button.tsx

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
  size: 'sm' | 'md' | 'lg';
  label?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean; // default true
}

// ─── Sizing ───
const buttonSizes = {
  sm: { height: 36,  paddingH: 16,  fontSize: 14, iconSize: 18, radius: radius.sm },
  md: { height: 48,  paddingH: 24,  fontSize: 16, iconSize: 20, radius: radius.md },
  lg: { height: 56,  paddingH: 32,  fontSize: 18, iconSize: 24, radius: radius.md },
};

// ─── States ───
// idle → pressed (scale 0.97, 100ms) → released (scale 1.0, 200ms)
// disabled: opacity 0.4, no interaction
// loading: spinner replaces content, no interaction

// ─── Minimum Tap Target ───
// ALL interactive elements: minimum 44x44px (Apple HIG)
// In bar context (drunk fingers): prefer 48x48px minimum
```

### 2.2 Answer Option Card

The most critical component in the entire app. This is what players tap 15 times per game.

```
┌─────────────────────────────────────────────────────────────┐
│  ANSWER CARD STATES                                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ A   The Battle of Gettysburg                    │    │    │
│  │     ───────────────────────────────────────────  │    │    │
│  │     bg: answer.idle | border: border.subtle      │    │    │
│  └─────────────────────────────────────────────────────┘    │
│  IDLE — default state, ready for tap                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ A   The Battle of Gettysburg                 ✓  │    │    │
│  │     ───────────────────────────────────────────  │    │    │
│  │     bg: answer.selected | border: accent.primary │    │    │
│  └─────────────────────────────────────────────────────┘    │
│  SELECTED — player has chosen this answer                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ A   The Battle of Gettysburg                 ✓  │    │    │
│  │     ───────────────────────────────────────────  │    │    │
│  │     bg: answer.correct | border: semantic.correct │    │    │
│  │     glow: correctGlow                             │    │    │
│  └─────────────────────────────────────────────────────┘    │
│  CORRECT — revealed as the right answer                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ A   The Battle of Antietam               ✗    │    │    │
│  │     ───────────────────────────────────────────  │    │    │
│  │     bg: answer.wrong | border: semantic.wrong     │    │    │
│  └─────────────────────────────────────────────────────┘    │
│  WRONG — player selected this, it was wrong                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ A   ̶T̶h̶e̶ ̶B̶a̶t̶t̶l̶e̶ ̶o̶f̶ ̶B̶u̶l̶l̶ ̶R̶u̶n̶          ❌  │    │    │
│  │     ───────────────────────────────────────────  │    │    │
│  │     bg: answer.eliminated | text: text.disabled   │    │    │
│  │     opacity: 0.5, not tappable                    │    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ELIMINATED — hint removed this option                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
// components/AnswerCard.tsx

interface AnswerCardProps {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  state: 'idle' | 'selected' | 'correct' | 'wrong' | 'eliminated' | 'revealed_correct' | 'revealed_neutral';
  onPress: () => void;
  disabled?: boolean;
}

// ─── Layout ───
// Mobile: full-width, min-height 56px, padding 16px
// TV: max-width 800px centered, min-height 80px, padding 24px
// Letter badge: 28x28 circle, bg.tertiary, mono font
// Text: question font, left-aligned, wraps if needed
// Checkmark/X icon: right-aligned, 24px

// ─── Transitions ───
// idle → selected: 100ms, scale(0.98) then scale(1.0), bg color shift, haptic.select
// selected → correct: 300ms, bg to answer.correct, border glow animation, haptic.correct
// selected → wrong: 300ms, bg to answer.wrong, shake animation (3px, 3 cycles), haptic.wrong
// idle → eliminated: 500ms, fade to 0.5 opacity, strikethrough slides in left-to-right

// ─── Letter Badge Colors (per letter for visual distinction) ───
const letterColors = {
  A: '#E94560',  // coral-red
  B: '#F5A623',  // amber
  C: '#00D4AA',  // teal
  D: '#8B5CF6',  // purple
};
```

### 2.3 Timer Display

```
┌─────────────────────────────────────────────────────────────┐
│  TIMER VARIANTS                                              │
│                                                              │
│  ● RING TIMER (Mobile — primary game timer)                  │
│    ┌──────────┐                                              │
│    │   ╭──╮   │  Circular progress ring                      │
│    │  │ 42 │  │  Countdown number in center (mono XL)        │
│    │   ╰──╯   │  Ring color transitions: green→amber→red     │
│    └──────────┘  Ring width: 4px mobile, 6px TV              │
│                  Diameter: 80px mobile, 120px TV              │
│                                                              │
│  ● BAR TIMER (TV — secondary / progress bar)                 │
│    ┌──────────────────────────────────────────────┐          │
│    │ ████████████████░░░░░░░░░░░░░░░░░░░░  42s   │          │
│    └──────────────────────────────────────────────┘          │
│    Full-width bar, same color transitions                    │
│    Height: 8px, radius.full                                  │
│                                                              │
│  ● MICRO TIMER (Mobile — inline, compact)                    │
│    ⏱ 42s                                                     │
│    Icon + number, no ring, mono SM font                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Color Thresholds:
  > 30s remaining  → timer.plenty  (#00D4AA)
  15-30s remaining → timer.warning (#F5A623)
  < 15s remaining  → timer.danger  (#E94560)
  < 5s remaining   → timer.pulse   (#FF2D55) + pulse animation
```

```typescript
// components/Timer.tsx

interface TimerProps {
  variant: 'ring' | 'bar' | 'micro';
  totalSeconds: number;
  remainingSeconds: number;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}
```

### 2.4 Points Display

```
┌─────────────────────────────────────────────────────────────┐
│  POINTS VARIANTS                                             │
│                                                              │
│  ● HERO (post-question reveal)                               │
│    ┌──────────────────┐                                      │
│    │   +850           │  mono XL, accent.secondary           │
│    │   points         │  label SM, text.tertiary             │
│    └──────────────────┘                                      │
│    Entrance: count-up from 0, bounce easing, 800ms           │
│    Glow: pointsGlow shadow                                   │
│                                                              │
│  ● INLINE (header bar, leaderboard)                          │
│    💰 4,250           │  mono MD, accent.secondary           │
│                                                              │
│  ● DELTA (score change notification)                         │
│    +850 ↑             │  Floats up and fades, 1200ms         │
│    Green if positive, Red if penalty (future feature)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
// components/PointsDisplay.tsx

interface PointsDisplayProps {
  variant: 'hero' | 'inline' | 'delta';
  value: number;
  animated?: boolean;    // count-up animation
  prefix?: string;       // "+", "-", or none
}
```

### 2.5 Code Entry Input

```
┌─────────────────────────────────────────────────────────────┐
│  CODE ENTRY (Join Bar screen)                                │
│                                                              │
│    ┌───┐  ┌───┐  ┌───┐  ┌───┐                              │
│    │ 7 │  │ 2 │  │ _ │  │   │                              │
│    └───┘  └───┘  └───┘  └───┘                              │
│                                                              │
│  Each box: 64x72px, bg.secondary, border.medium              │
│  Active box: border.focus (accent.primary), slight scale-up  │
│  Filled box: mono LG font, text.primary                      │
│  Auto-advance on input, auto-submit on 4th digit             │
│  Keyboard: numeric only, auto-opens on mount                 │
│  Error state: boxes shake, border turns semantic.wrong        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
// components/CodeEntry.tsx

interface CodeEntryProps {
  length: number;         // default 4
  onComplete: (code: string) => void;
  error?: boolean;
  errorMessage?: string;
}
```

### 2.6 Player Name Input

```
┌─────────────────────────────────────────────────────────────┐
│  NAME INPUT                                                  │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Your Name                                        │       │
│  │  ─────────────────────────────────────────────    │       │
│  │  TriviaMaster420                             ✏️  │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  Standard text input: bg.secondary, rounded md               │
│  Floating label pattern                                      │
│  Max 20 characters                                           │
│  Edit icon right-aligned                                     │
│  Inline validation (no profanity, not empty)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.7 Leaderboard Row

```
┌─────────────────────────────────────────────────────────────┐
│  LEADERBOARD ROW                                             │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │  1  👑  TriviaMaster420       4,250  ██████  │       │
│  │  2      BarFly99              3,800  █████   │       │
│  │  3      QuizWhiz              3,100  ████    │       │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │       │
│  │  7  ★   YOU                   1,850  ███     │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  Rank: mono SM, #1=gold #2=silver #3=bronze, rest white      │
│  Crown icon for #1                                           │
│  Name: body MD, text.primary (YOU row highlighted)           │
│  Score: mono SM, accent.secondary, right-aligned             │
│  Progress bar: tiny inline bar showing relative score        │
│  Current player row: bg.tertiary, sticky at bottom           │
│  Row height: 52px mobile, 72px TV                            │
│                                                              │
│  Top 3 colors:                                               │
│    #1: #FFD700 (gold)                                        │
│    #2: #C0C0C0 (silver)                                      │
│    #3: #CD7F32 (bronze)                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
// components/LeaderboardRow.tsx

interface LeaderboardRowProps {
  rank: number;
  name: string;
  score: number;
  maxScore: number;      // for relative bar width
  isCurrentPlayer: boolean;
  isAnimating?: boolean; // rank change animation
}
```

### 2.8 Category Badge

```
┌─────────────────────────────────────────────────────────────┐
│  CATEGORY BADGE                                              │
│                                                              │
│  ● PILL (in-game, above question)                            │
│    ┌────────────────────┐                                    │
│    │  🏈  NFL Football  │  bg.glass, radius.full             │
│    └────────────────────┘  label SM, icon + text             │
│                                                              │
│  ● CARD (category intro screen, 5s before question)          │
│    ┌────────────────────────────┐                            │
│    │                            │                            │
│    │       🏈                   │  Large icon centered       │
│    │    NFL Football            │  h2, text.primary          │
│    │    Question 7 of 15        │  body SM, text.tertiary    │
│    │                            │                            │
│    └────────────────────────────┘                            │
│    Full-screen takeover, 5s, bg.primary with gradient        │
│                                                              │
│  Super Category → Emoji mapping:                             │
│    Geography:        🌍                                      │
│    Entertainment:    🎬                                      │
│    History:          📜                                      │
│    Art & Culture:    🎨                                      │
│    Science & Nature: 🔬                                      │
│    Sports & Leisure: 🏆                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.9 Game Status Bar (Mobile Header)

```
┌─────────────────────────────────────────────────────────────┐
│  MOBILE GAME HEADER                                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🏈 NFL Football    ⏱ 42     Q 7/15    💰 4,250    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Fixed at top, bg.secondary with bottom border               │
│  Height: 48px + safe area top                                │
│  Category pill left, timer center, question count, score     │
│  Timer uses color thresholds from §2.3                       │
│  Semi-transparent blur background (iOS vibrancy)             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.10 TV Layout Shell

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TV LAYOUT (1920x1080 landscape)                                        │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  HEADER BAR                                                       │  │
│  │  ┌──────┐  TAP TRIVIA         Q 7 of 15    ⏱ 42    Murphy's Pub │  │
│  │  │ LOGO │                                                         │  │
│  │  └──────┘                                                         │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │                                                                   │  │
│  │                     MAIN CONTENT AREA                             │  │
│  │                                                                   │  │
│  │           (Question, answers, category intro, etc.)               │  │
│  │                                                                   │  │
│  │                     Max-width: 1200px centered                    │  │
│  │                                                                   │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  FOOTER BAR                                                       │  │
│  │  ┌─────────┐    12 players connected    ┌──────────────────────┐ │  │
│  │  │ QR CODE │    Join: TRIVIA.APP/7249   │  [AD SPACE 400x100] │ │  │
│  │  └─────────┘                            └──────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Header: 80px height, bg.secondary                                      │
│  Content: remaining height, bg.primary                                  │
│  Footer: 120px height, bg.secondary, QR left, ad right                  │
│  All text: min 36px for 10-foot readability                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.11 Modal / Bottom Sheet

```
┌─────────────────────────────────────────────────────────────┐
│  BOTTOM SHEET (Mobile)                                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ────  (drag handle, 40x4, border.subtle)            │   │
│  │                                                       │   │
│  │  Sheet Title                           ✕              │   │
│  │                                                       │   │
│  │  [Content area — scrollable]                          │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │          PRIMARY ACTION BUTTON               │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  bg.secondary, radius.xl top corners only                    │
│  Backdrop: bg.overlay, dismissable on tap                    │
│  Drag to dismiss enabled                                     │
│  Safe area padding at bottom                                 │
│  Entrance: slide up 300ms, decelerate easing                 │
│  Exit: slide down 200ms, accelerate easing                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.12 Toast / Notification

```
┌─────────────────────────────────────────────────────────────┐
│  TOAST                                                       │
│                                                              │
│  ● SUCCESS                                                   │
│  ┌────────────────────────────────────────┐                  │
│  │  ✓  Joined Murphy's Pub!              │                  │
│  └────────────────────────────────────────┘                  │
│  Left border: 3px semantic.correct                           │
│                                                              │
│  ● ERROR                                                     │
│  ┌────────────────────────────────────────┐                  │
│  │  ✗  Invalid room code                 │                  │
│  └────────────────────────────────────────┘                  │
│  Left border: 3px semantic.wrong                             │
│                                                              │
│  ● INFO                                                      │
│  ┌────────────────────────────────────────┐                  │
│  │  ℹ  Next game starts in 2 minutes     │                  │
│  └────────────────────────────────────────┘                  │
│  Left border: 3px semantic.info                              │
│                                                              │
│  Position: top, below safe area, centered                    │
│  bg.tertiary, radius.md, shadow.md                           │
│  Auto-dismiss: 3s (success/info), 5s (error)                 │
│  Swipe up to dismiss                                         │
│  Entrance: slide down + fade, 300ms                          │
│  Max-width: screen - 32px                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.13 Player Count Badge

```typescript
// components/PlayerCount.tsx — shows how many players are in the game

interface PlayerCountProps {
  count: number;
  variant: 'inline' | 'badge';
}

// inline: "👥 12 players" — text only, used in headers
// badge:  Pill shape with icon + count, used on TV footer
// Animate count changes with a flip/scale micro-animation
```

### 2.14 Streak Indicator

```
┌─────────────────────────────────────────────────────────────┐
│  STREAK INDICATOR (shown after consecutive correct answers)  │
│                                                              │
│    🔥 3 streak!       →  accent.secondary, body MD           │
│    🔥🔥 5 streak!     →  accent.primary, body LG, glow      │
│    🔥🔥🔥 8 streak!   →  gradient(amber→red), h3, big glow  │
│                                                              │
│  Appears above points display for 2s after correct answer    │
│  Scales up on entry with bounce easing                       │
│  Each fire emoji pulses independently                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.15 Subscription Card

```typescript
// components/SubscriptionCard.tsx

interface SubscriptionCardProps {
  plan: { price: string; period: string; features: string[] };
  isActive: boolean;
  onSubscribe: () => void;
}

// Layout:
// bg.secondary card, radius.lg
// Plan name: h3, text.primary
// Price: scoreLG, accent.secondary ("$2.99")
// Period: body SM, text.tertiary ("/month")
// Features: check icon + body MD, stacked
// CTA: Primary button at bottom
// Active state: accent.primary border, "Current Plan" badge
```

---

## 3. SCREEN COMPOSITIONS

### 3.1 Mobile Screens

```
SCREEN MAP (React Native / Expo Router)
────────────────────────────────────────

app/
├── index.tsx                  → Splash (1-2s, logo pulse, route check)
├── subscribe.tsx              → Paywall (hero + features + CTA)
├── (tabs)/
│   ├── _layout.tsx            → Tab bar (3 tabs, floating pill style)
│   ├── play.tsx               → Home/Join (enter code or waiting state)
│   ├── leaderboard.tsx        → Leaderboards (per-game + all-time)
│   └── profile.tsx            → Profile (name, stats, subscription)
├── game/
│   ├── lobby.tsx              → Pre-game lobby (player list, countdown)
│   ├── category-intro.tsx     → Category reveal (5s, full-screen)
│   ├── question.tsx           → Active question (timer + 4 answers)
│   ├── answer-reveal.tsx      → Answer result (+points or wrong)
│   └── results.tsx            → Game over (final scores, leaderboard)
```

### 3.2 TV Screens

```
SCREEN MAP (React Web App)
────────────────────────────────────────

pages/
├── setup.tsx                  → First-time bar setup (enter bar name)
├── idle.tsx                   → Idle screen (logo + QR + "Start a game")
├── lobby.tsx                  → Game lobby (room code, player list filling)
├── category-intro.tsx         → Category reveal (full-screen, 5s)
├── question.tsx               → Question display (question + 4 answers + timer bar)
├── answer-reveal.tsx          → Correct answer highlight + scoreboard flash
├── mid-game-leaderboard.tsx   → Quick leaderboard between questions (3s)
├── results.tsx                → Final leaderboard + winner celebration
└── ad-break.tsx               → Ad display between games (future)
```

---

## 4. SHARED PATTERNS

### 4.1 Loading States

```
● Skeleton screens (not spinners) for content loading
● Shimmer animation: left-to-right gradient sweep, 1.5s loop
● Skeleton color: bg.tertiary → bg.secondary gradient
● Match exact layout of loaded state to prevent layout shift
```

### 4.2 Empty States

```
● Centered illustration/icon (64px, text.disabled color)
● Heading: h3, text.primary
● Description: body MD, text.secondary, max 2 lines
● CTA button if actionable
● Examples:
  - No games available: "🎯 No games right now" + "Check back soon"
  - Empty leaderboard: "🏆 No scores yet" + "Play a game to get on the board"
```

### 4.3 Error States

```
● Inline errors: red text below input, shake animation
● Full-screen errors: centered icon + message + retry button
● Network errors: banner at top, "No connection" + retry
● Toast for transient errors (wrong code, etc.)
```

### 4.4 Transition Patterns

```
● Screen transitions: cross-fade 300ms (mobile), instant swap (TV)
● Question transitions: old question slides left, new slides in from right
● Score reveals: count-up animation with bounce
● Leaderboard rank changes: rows animate to new positions (spring easing)
● Elimination hints: answer card fades + strikethrough sweeps L→R
```

### 4.5 Sound Design Hooks

```typescript
// sounds/index.ts — sound effect triggers (audio files TBD)

export const sounds = {
  tap:            'tap.mp3',           // Any button press
  joinGame:       'join-chime.mp3',    // Successfully joined a bar
  countdownTick:  'tick.mp3',          // 3-2-1 countdown
  questionAppear: 'whoosh.mp3',        // New question slides in
  answerSelect:   'click.mp3',         // Tapped an answer
  correctAnswer:  'ding-success.mp3',  // Got it right
  wrongAnswer:    'buzz-fail.mp3',     // Got it wrong
  elimination:    'swoosh-out.mp3',    // Answer eliminated by hint
  streakBonus:    'streak-fire.mp3',   // Streak milestone hit
  gameOver:       'fanfare.mp3',       // Game complete
  winner:         'champion.mp3',      // You won the game
  pointsEarned:   'coins.mp3',        // Points counting up
} as const;

// All sounds: short (<1s), layerable, no music loops in Phase 1
// Volume: respect device volume, no independent volume control Phase 1
// Haptics fire simultaneously with sounds on mobile
```

---

## 5. PLATFORM DIFFERENCES

### 5.1 Mobile vs TV Quick Reference

| Aspect            | Mobile (React Native)        | TV (React Web)                |
|-------------------|------------------------------|-------------------------------|
| Orientation       | Portrait locked              | Landscape locked (1920x1080)  |
| Min font size     | 14px                         | 36px (10-foot viewing)        |
| Tap targets       | 48x48px minimum              | N/A (no touch)                |
| Navigation        | Tab bar + stack navigation   | Auto-advance, no user nav     |
| Input             | Touch + keyboard             | None (TV is display-only)     |
| Timer             | Ring timer (center screen)   | Bar timer (top) + countdown   |
| Answer display    | Stacked vertically           | 2x2 grid                      |
| QR code           | Not shown                    | Always visible in footer       |
| Player count      | Hidden (not critical)        | Always visible in footer       |
| Animations        | React Native Animated/Reanimated | CSS transitions + keyframes |
| Sound             | expo-av                      | Web Audio API                  |
| Haptics           | expo-haptics                 | N/A                           |

### 5.2 TV-Specific Rules

```
● All text minimum 36px (readable from 10 feet)
● High contrast only — no subtle grays below #808080
● No hover states (no mouse) — use focus states for remote nav if needed
● QR code always visible — this is how players join
● Room code always visible — displayed large in header
● Player count always visible — social proof drives engagement
● No scrolling — everything fits in viewport, paginate if needed
● Animations: CSS only, avoid JS-driven animations for performance
● Auto-cycle: screens advance automatically, no user interaction needed
```

### 5.3 Accessibility Notes

```
● Color is never the ONLY indicator — always pair with icons/text
● Answer states use both color AND icon (✓, ✗, ❌, —)
● Timer has both visual ring AND number — never ring-only
● All interactive elements have accessible labels
● Minimum contrast ratio: 4.5:1 (our dark theme naturally exceeds this)
● Screen reader: announce question, answers, timer warnings, results
● Reduce Motion: disable animations, use instant state changes
```

---

## 6. FILE STRUCTURE FOR IMPLEMENTATION

```
src/
├── theme/
│   ├── index.ts              # Re-exports everything
│   ├── colors.ts             # §1.1
│   ├── typography.ts         # §1.2
│   ├── spacing.ts            # §1.3
│   ├── radius.ts             # §1.4
│   ├── shadows.ts            # §1.5
│   └── animation.ts          # §1.6
│
├── components/
│   ├── primitives/           # Atomic building blocks
│   │   ├── Text.tsx          # Themed text with style presets
│   │   ├── Button.tsx        # §2.1
│   │   ├── Card.tsx          # Base card (bg.secondary, radius, shadow)
│   │   ├── Badge.tsx         # Small pill labels
│   │   ├── Icon.tsx          # Icon wrapper with sizing
│   │   ├── Divider.tsx       # Horizontal line, border.subtle
│   │   └── Spacer.tsx        # Flexible spacing component
│   │
│   ├── game/                 # Game-specific components
│   │   ├── AnswerCard.tsx    # §2.2
│   │   ├── Timer.tsx         # §2.3
│   │   ├── PointsDisplay.tsx # §2.4
│   │   ├── CategoryBadge.tsx # §2.8
│   │   ├── GameStatusBar.tsx # §2.9
│   │   ├── StreakIndicator.tsx # §2.14
│   │   ├── PlayerCount.tsx   # §2.13
│   │   └── EliminationHint.tsx
│   │
│   ├── input/                # User input components
│   │   ├── CodeEntry.tsx     # §2.5
│   │   ├── NameInput.tsx     # §2.6
│   │   └── TextInput.tsx     # Base themed input
│   │
│   ├── data/                 # Data display components
│   │   ├── LeaderboardRow.tsx # §2.7
│   │   ├── LeaderboardList.tsx
│   │   ├── PlayerList.tsx
│   │   └── StatCard.tsx
│   │
│   ├── feedback/             # User feedback
│   │   ├── Toast.tsx         # §2.12
│   │   ├── BottomSheet.tsx   # §2.11
│   │   ├── LoadingSkeleton.tsx
│   │   └── EmptyState.tsx
│   │
│   └── layout/               # Structural components
│       ├── Screen.tsx        # Mobile screen wrapper (safe area, bg, scroll)
│       ├── TVLayout.tsx      # §2.10 — TV header/content/footer shell
│       ├── TabBar.tsx        # Mobile floating tab bar
│       └── Header.tsx        # Screen-level header
│
├── hooks/
│   ├── useTimer.ts           # Countdown logic + color thresholds
│   ├── useHaptic.ts          # Haptic feedback triggers
│   ├── useSound.ts           # Sound effect player
│   ├── useAnimation.ts       # Common animation presets
│   └── useGameState.ts       # WebSocket game state subscription
│
└── utils/
    ├── formatScore.ts        # "4,250" formatting
    ├── formatTime.ts         # "42s" or "0:42" formatting
    └── platform.ts           # isMobile / isTV detection
```

---

## 7. IMPLEMENTATION NOTES FOR CLAUDE CODE

### 7.1 React Native Specifics

```
● Use Expo SDK 50+ with Expo Router for navigation
● Use react-native-reanimated for performant animations (not Animated API)
● Use expo-haptics for haptic feedback
● Use expo-av for sound effects
● Use expo-linear-gradient for gradient backgrounds
● Use @shopify/flash-list for leaderboard lists (not FlatList)
● Use react-native-safe-area-context for safe area handling
● All images: use @expo/vector-icons or custom SVGs, no raster images for UI
● Test on iPhone SE (smallest) and iPhone 15 Pro Max (largest)
```

### 7.2 React Web (TV) Specifics

```
● Vanilla React + TypeScript, no framework (Vite for bundling)
● CSS Modules or styled-components for styling
● No external UI library — everything custom from this design system
● Target 1920x1080 viewport, no responsive breakpoints needed
● Use CSS animations/transitions exclusively — no JS animation libraries
● Font loading: self-host Inter and JetBrains Mono (no Google Fonts CDN in bars)
● Build output: static files for S3 + CloudFront hosting
● Test in Chrome at 1920x1080 (simulates Smart TV browser)
```

### 7.3 Shared Code Strategy

```
● Theme tokens (§1) are 100% shared — same TypeScript objects
● Component LOGIC can be shared (hooks, state management)
● Component RENDERING differs — React Native views vs HTML/CSS
● Consider a packages/ monorepo:
    packages/
    ├── shared/          # Theme, types, game logic, hooks
    ├── mobile/          # React Native app
    └── tv/              # React web app
```
