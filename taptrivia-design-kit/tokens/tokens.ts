/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — Design Tokens
 *  The single source of truth for the entire design system.
 *  Consumed by React (web/TV) and React Native (mobile).
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Color Palette ───────────────────────────────────────────
// Dark-first design: built for dimly-lit bars.
// Avoids pure #000/#FFF to prevent TV haloing and OLED smear.

export const palette = {
  // Core Darks — backgrounds & surfaces
  midnight:    '#0B0E17',   // deepest background (TV & mobile)
  charcoal:    '#141825',   // primary surface / card background
  slate:       '#1E2333',   // elevated surface / active states
  graphite:    '#2A2F42',   // borders, dividers, subtle containers

  // Core Lights — text & icons
  snow:        '#EAEDF6',   // primary text (softer than pure white)
  frost:       '#B0B7CC',   // secondary text, labels, metadata
  ash:         '#6B7494',   // disabled text, placeholders, hints

  // Brand Accent — Electric Cyan
  cyan:        '#00D4FF',   // primary action, correct answer flash
  cyanMuted:   '#0098B8',   // hover/pressed state
  cyanGlow:    '#00D4FF33', // glow/shadow (20% opacity)
  cyanSurface: '#00D4FF12', // tinted surface (7% opacity)

  // Signal Colors
  correct:     '#00E676',   // correct answer
  correctGlow: '#00E67633',
  wrong:       '#FF3D5A',   // wrong answer
  wrongGlow:   '#FF3D5A33',
  warning:     '#FFB300',   // timer warning, low time
  warningGlow: '#FFB30033',

  // Category Accents — one per super-category pillar
  geo:         '#4FC3F7',   // Geography
  ent:         '#CE93D8',   // Entertainment
  hist:        '#FFB74D',   // History
  art:         '#F06292',   // Art & Culture
  sci:         '#81C784',   // Science & Nature
  sport:       '#64B5F6',   // Sports & Leisure

  // Utility
  transparent: 'transparent',
  overlay:     '#0B0E17CC',  // 80% dark overlay for modals
  overlayLight:'#0B0E1766',  // 40% overlay for dimming
} as const;


// ─── Typography ──────────────────────────────────────────────
// Mobile: DM Sans (clean, geometric, excellent small-screen legibility)
// TV Display: Chakra Petch (angular, techy, great at large sizes — game show energy)
// Mono/Scores: JetBrains Mono (crisp numerals, great for timers)
//
// Google Fonts imports:
//   DM Sans: https://fonts.google.com/specimen/DM+Sans
//   Chakra Petch: https://fonts.google.com/specimen/Chakra+Petch
//   JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono

export const fontFamily = {
  display:  '"Chakra Petch", sans-serif',
  body:     '"DM Sans", sans-serif',
  mono:     '"JetBrains Mono", monospace',
} as const;

// React Native equivalents (loaded via expo-font or react-native-asset)
export const fontFamilyNative = {
  display:       'ChakraPetch-Bold',
  displayMedium: 'ChakraPetch-Medium',
  body:          'DMSans-Regular',
  bodyMedium:    'DMSans-Medium',
  bodyBold:      'DMSans-Bold',
  mono:          'JetBrainsMono-Regular',
  monoBold:      'JetBrainsMono-Bold',
} as const;

// ─── Type Scale ──────────────────────────────────────────────
// Mobile-first sizes. TV overrides are in tokens.tv.ts

export const fontSize = {
  xs:    12,
  sm:    14,
  base:  16,
  md:    18,
  lg:    20,
  xl:    24,
  '2xl': 28,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const lineHeight = {
  tight:  1.1,
  snug:   1.25,
  normal: 1.5,
  relaxed:1.65,
} as const;

export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  black:    '900',
} as const;


// ─── Spacing Scale ───────────────────────────────────────────
// 4px base unit. Consistent across platforms.

export const space = {
  0:   0,
  px:  1,
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  2.5: 10,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  9:   36,
  10:  40,
  12:  48,
  14:  56,
  16:  64,
  20:  80,
  24:  96,
  32:  128,
} as const;


// ─── Border Radius ───────────────────────────────────────────

export const radius = {
  none: 0,
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl':20,
  '3xl':24,
  full: 9999,
} as const;


// ─── Shadows ─────────────────────────────────────────────────
// Web-only (React Native uses elevation or shadow* props)

export const shadow = {
  sm:   '0 1px 2px rgba(0,0,0,0.3)',
  md:   '0 4px 12px rgba(0,0,0,0.4)',
  lg:   '0 8px 24px rgba(0,0,0,0.5)',
  glow: (color: string) => `0 0 20px ${color}, 0 0 40px ${color}`,
  inner:'inset 0 2px 4px rgba(0,0,0,0.3)',
} as const;

// React Native elevation mapping
export const elevation = {
  none: 0,
  sm:   2,
  md:   4,
  lg:   8,
  xl:   12,
} as const;


// ─── Z-Index ─────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  card:    10,
  sticky:  20,
  overlay: 30,
  modal:   40,
  toast:   50,
  max:     100,
} as const;


// ─── Timing / Easing ─────────────────────────────────────────

export const duration = {
  instant: 100,
  fast:    200,
  normal:  300,
  slow:    500,
  reveal:  800,
} as const;

export const easing = {
  ease:      'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
  easeOut:   'cubic-bezier(0, 0, 0.2, 1)',
  spring:    'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce:    'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;


// ─── Breakpoints ─────────────────────────────────────────────
// Mobile-first. TV is treated as its own surface, not a breakpoint.

export const breakpoint = {
  sm:  480,
  md:  768,
  lg:  1024,
  xl:  1280,
  tv:  1920,  // reference only — TV uses its own token set
} as const;


// ─── Component Tokens ────────────────────────────────────────
// Semantic tokens scoped to specific component patterns.

export const component = {
  // Buttons
  button: {
    height: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    paddingX: {
      sm: space[3],
      md: space[4],
      lg: space[6],
    },
    radius: radius.lg,
    fontSize: {
      sm: fontSize.sm,
      md: fontSize.base,
      lg: fontSize.lg,
    },
  },

  // Answer Option Cards
  answerCard: {
    height: {
      mobile: 56,
      tv:     96,
    },
    radius: radius.xl,
    padding: space[4],
    gap: space[3],
    borderWidth: 2,
    colors: {
      default:  { bg: palette.slate, border: palette.graphite, text: palette.snow },
      selected: { bg: palette.cyanSurface, border: palette.cyan, text: palette.cyan },
      correct:  { bg: '#00E67618', border: palette.correct, text: palette.correct },
      wrong:    { bg: '#FF3D5A18', border: palette.wrong, text: palette.wrong },
      disabled: { bg: palette.charcoal, border: palette.graphite, text: palette.ash },
    },
  },

  // Question Display
  question: {
    fontSize: {
      mobile: fontSize['xl'],
      tv:     fontSize['5xl'],
    },
    lineHeight: lineHeight.snug,
    maxWidth: {
      mobile: '100%',
      tv:     960,
    },
  },

  // Timer
  timer: {
    size: {
      mobile: 64,
      tv:     120,
    },
    strokeWidth: {
      mobile: 4,
      tv:     6,
    },
    fontSize: {
      mobile: fontSize['2xl'],
      tv:     fontSize['5xl'],
    },
    colors: {
      safe:    palette.cyan,
      warning: palette.warning,
      danger:  palette.wrong,
    },
  },

  // Scoreboard
  scoreboard: {
    rowHeight: {
      mobile: 48,
      tv:     64,
    },
    avatarSize: {
      mobile: 32,
      tv:     48,
    },
    nameSize: {
      mobile: fontSize.base,
      tv:     fontSize.xl,
    },
    scoreSize: {
      mobile: fontSize.lg,
      tv:     fontSize['2xl'],
    },
  },

  // Toast / Notification
  toast: {
    minHeight: 48,
    radius: radius.lg,
    padding: space[4],
    maxWidth: 400,
  },

  // Header / Nav Bar
  header: {
    height: {
      mobile: 56,
      tv:     80,
    },
  },

  // Category Pill
  categoryPill: {
    height: 28,
    radius: radius.full,
    paddingX: space[3],
    fontSize: fontSize.xs,
  },

  // Input
  input: {
    height: 44,
    radius: radius.lg,
    paddingX: space[4],
    fontSize: fontSize.base,
    borderWidth: 1.5,
    colors: {
      bg:       palette.slate,
      border:   palette.graphite,
      focus:    palette.cyan,
      text:     palette.snow,
      placeholder: palette.ash,
    },
  },
} as const;


// ─── Convenience: Full Theme Object ─────────────────────────
export const theme = {
  palette,
  fontFamily,
  fontFamilyNative,
  fontSize,
  lineHeight,
  fontWeight,
  space,
  radius,
  shadow,
  elevation,
  zIndex,
  duration,
  easing,
  breakpoint,
  component,
} as const;

export type TapTriviaTheme = typeof theme;
export default theme;
