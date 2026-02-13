/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — TV Token Overrides
 *  Everything that changes when rendering on a bar TV screen.
 *  Viewers are 8–25 feet away in a dimly lit, noisy environment.
 * ═══════════════════════════════════════════════════════════════
 */

import { fontSize, space, radius, palette, fontWeight } from './tokens';

// ─── TV Typography Scale ─────────────────────────────────────
// Rule of thumb: minimum 36px for any text on a 1080p TV
// viewed from 10+ feet away.

export const tvFontSize = {
  label:     28,    // smallest readable text (category pills, metadata)
  body:      36,    // secondary info, player names
  bodyLg:    42,    // answer options text
  heading:   56,    // question text
  headingLg: 72,    // round titles, category headers
  display:   96,    // countdown timer digits
  hero:      128,   // game state splashes ("CORRECT!", score reveals)
} as const;


// ─── TV Spacing ──────────────────────────────────────────────
// More generous spacing — everything needs breathing room at distance.

export const tvSpace = {
  xs:     8,
  sm:     16,
  md:     24,
  lg:     40,
  xl:     56,
  '2xl':  80,
  '3xl':  120,
  overscanX: 48,   // safe margin from horizontal screen edges (5%)
  overscanY: 27,   // safe margin from vertical screen edges (5%)
} as const;


// ─── TV Layout ───────────────────────────────────────────────

export const tvLayout = {
  // Target resolution
  width:  1920,
  height: 1080,

  // Safe area (inside overscan margins)
  safeArea: {
    x: 48,
    y: 27,
    width:  1920 - 96,  // 1824
    height: 1080 - 54,  // 1026
  },

  // Question area takes up ~60% of screen height
  questionZone: {
    maxWidth: 1400,
    minHeight: 400,
  },

  // Answer grid: 2x2 for 4 options
  answerGrid: {
    columns: 2,
    rows: 2,
    gap: 24,
    cardMinHeight: 120,
    cardRadius: radius['2xl'],
  },

  // Scoreboard sidebar (when shown)
  scoreboard: {
    width: 380,
    rowHeight: 72,
    maxVisible: 10,
  },

  // Timer position and size
  timer: {
    size: 140,
    strokeWidth: 8,
  },

  // Header bar
  header: {
    height: 88,
  },
} as const;


// ─── TV Answer Card Variants ─────────────────────────────────
// Letter-coded (A/B/C/D) with distinct accent colors for each option

export const tvAnswerSlots = {
  A: {
    letter: 'A',
    accentColor: '#4FC3F7',  // blue
    bgIdle:      '#4FC3F710',
    bgSelected:  '#4FC3F730',
    borderIdle:  '#4FC3F740',
    borderActive:'#4FC3F7',
  },
  B: {
    letter: 'B',
    accentColor: '#CE93D8',  // purple
    bgIdle:      '#CE93D810',
    bgSelected:  '#CE93D830',
    borderIdle:  '#CE93D840',
    borderActive:'#CE93D8',
  },
  C: {
    letter: 'C',
    accentColor: '#FFB74D',  // amber
    bgIdle:      '#FFB74D10',
    bgSelected:  '#FFB74D30',
    borderIdle:  '#FFB74D40',
    borderActive:'#FFB74D',
  },
  D: {
    letter: 'D',
    accentColor: '#81C784',  // green
    bgIdle:      '#81C78410',
    bgSelected:  '#81C78430',
    borderIdle:  '#81C78440',
    borderActive:'#81C784',
  },
} as const;


// ─── TV Animation Timings ────────────────────────────────────
// Slightly slower/more dramatic for the big-screen experience

export const tvDuration = {
  questionReveal: 600,     // question text fade-in
  answerStagger:  150,     // delay between each answer card appearing
  answerLock:     300,     // flash when answers lock
  correctReveal:  500,     // correct answer highlight
  scoreUpdate:    400,     // scoreboard position changes
  roundTransition:1200,    // between-round splash screen
  timerTick:      1000,    // per-second countdown
  celebration:    2000,    // winner celebration / confetti
} as const;


// ─── TV-Safe Color Adjustments ───────────────────────────────
// TVs handle color differently than monitors.
// Slightly desaturated to prevent color bleeding on cheap bar TVs.

export const tvPalette = {
  ...palette,
  // Soften the extremes
  midnight: '#0D1019',     // slightly lighter than mobile to avoid crushing
  snow:     '#E2E5EE',     // slightly warmer to prevent eye strain
  // Boost contrast on action colors
  cyan:     '#00DCFF',     // slightly brighter for TV
  correct:  '#00FF80',     // brighter green for distance visibility
  wrong:    '#FF4466',     // brighter red
  warning:  '#FFC107',     // brighter amber
} as const;


// ─── TV Component Presets ────────────────────────────────────

export const tvComponent = {
  questionCard: {
    fontSize: tvFontSize.heading,
    fontWeight: fontWeight.bold,
    lineHeight: 1.2,
    padding: tvSpace.lg,
    maxWidth: tvLayout.questionZone.maxWidth,
    textAlign: 'center' as const,
  },

  answerCard: {
    fontSize: tvFontSize.bodyLg,
    fontWeight: fontWeight.semibold,
    letterFontSize: tvFontSize.display,
    minHeight: tvLayout.answerGrid.cardMinHeight,
    borderWidth: 3,
    borderRadius: tvLayout.answerGrid.cardRadius,
    padding: `${tvSpace.md}px ${tvSpace.lg}px`,
  },

  timer: {
    ...tvLayout.timer,
    fontSize: tvFontSize.display,
    fontFamily: '"JetBrains Mono", monospace',
    fontWeight: fontWeight.bold,
  },

  scoreboard: {
    nameSize: tvFontSize.body,
    scoreSize: tvFontSize.bodyLg,
    rankSize: tvFontSize.label,
    avatarSize: 56,
    rowPadding: tvSpace.sm,
  },

  categoryPill: {
    fontSize: tvFontSize.label,
    height: 44,
    paddingX: tvSpace.md,
    borderRadius: radius.full,
    fontWeight: fontWeight.semibold,
  },

  roundSplash: {
    titleSize: tvFontSize.hero,
    subtitleSize: tvFontSize.heading,
    fontWeight: fontWeight.black,
  },

  playerCount: {
    fontSize: tvFontSize.body,
    iconSize: 32,
  },
} as const;


export const tvTheme = {
  fontSize: tvFontSize,
  space: tvSpace,
  layout: tvLayout,
  answerSlots: tvAnswerSlots,
  duration: tvDuration,
  palette: tvPalette,
  component: tvComponent,
} as const;

export type TapTriviaTVTheme = typeof tvTheme;
export default tvTheme;
