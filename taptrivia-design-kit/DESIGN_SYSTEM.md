# Tap Trivia — Design System Documentation

## Overview

A dark-first, bar-optimized design system that spans **three surfaces**:
- **📱 Mobile** (React Native / Ionic) — players tap answers on their phones
- **🌐 Web** (React) — admin panels, join screens, lobby
- **📺 TV** (React web) — question display on bar TVs (Samsung Tizen, Fire TV, Roku)

The system is built around a **shared design token layer** that both React and React Native components consume, with TV-specific overrides for the unique constraints of displaying content on a screen viewed from 8-25 feet away in dim lighting.

---

## Architecture

```
tap-trivia-ds/
├── tokens/
│   ├── tokens.ts          # Core design tokens (source of truth)
│   ├── tokens.tv.ts       # TV-specific overrides
│   └── tokens.css          # CSS custom properties for web
├── components/
│   ├── web/               # React components (web + TV)
│   │   ├── ThemeProvider.tsx
│   │   ├── Button.tsx
│   │   ├── AnswerCard.tsx
│   │   └── Components.tsx  # Timer, CategoryPill, QuestionCard, etc.
│   ├── native/            # React Native components
│   │   └── Components.tsx
│   └── tv/                # TV-specific layouts (future)
└── docs/
    └── DESIGN_SYSTEM.md   # This file
```

---

## Design Tokens

### Color Palette

**Surfaces** (dark backgrounds, no pure black to prevent TV haloing):
| Token | Hex | Usage |
|-------|-----|-------|
| `midnight` | `#0B0E17` | Deepest background |
| `charcoal` | `#141825` | Primary surface, card backgrounds |
| `slate` | `#1E2333` | Elevated surfaces, inputs |
| `graphite` | `#2A2F42` | Borders, dividers |

**Text** (no pure white to prevent OLED smear):
| Token | Hex | Usage |
|-------|-----|-------|
| `snow` | `#EAEDF6` | Primary text |
| `frost` | `#B0B7CC` | Secondary text, labels |
| `ash` | `#6B7494` | Disabled, placeholders |

**Brand & Signals**:
| Token | Hex | Usage |
|-------|-----|-------|
| `cyan` | `#00D4FF` | Primary action, brand accent |
| `correct` | `#00E676` | Correct answer |
| `wrong` | `#FF3D5A` | Wrong answer |
| `warning` | `#FFB300` | Timer warning, low time |

**Category Accents** (one per super-category):
| Token | Hex | Category |
|-------|-----|----------|
| `geo` | `#4FC3F7` | Geography |
| `ent` | `#CE93D8` | Entertainment |
| `hist` | `#FFB74D` | History |
| `art` | `#F06292` | Art & Culture |
| `sci` | `#81C784` | Science & Nature |
| `sport` | `#64B5F6` | Sports & Leisure |

### Typography

Three-font system:

| Font | Family | Usage |
|------|--------|-------|
| **Display** | Chakra Petch | TV questions, round titles, hero moments |
| **Body** | DM Sans | Answer text, UI labels, all body copy |
| **Mono** | JetBrains Mono | Scores, timers, counters, percentages |

All available on Google Fonts. For React Native, load via `expo-font`:
- ChakraPetch-Bold, ChakraPetch-Medium
- DMSans-Regular, DMSans-Medium, DMSans-Bold
- JetBrainsMono-Regular, JetBrainsMono-Bold

### Mobile Type Scale

| Token | Size | Usage |
|-------|------|-------|
| `xs` | 12px | Tiny labels |
| `sm` | 14px | Secondary text |
| `base` | 16px | Body text, answers |
| `md` | 18px | Emphasized text |
| `lg` | 20px | Section headers |
| `xl` | 24px | Question text (mobile) |
| `2xl` | 28px | Timer digits |
| `3xl`–`6xl` | 32–64px | Display sizes |

### TV Type Scale

Everything is larger. Minimum readable text on a 1080p TV from 10+ feet: **28px**.

| Token | Size | Usage |
|-------|------|-------|
| `label` | 28px | Smallest TV text |
| `body` | 36px | Player names, secondary |
| `bodyLg` | 42px | Answer option text |
| `heading` | 56px | Question text |
| `headingLg` | 72px | Round titles |
| `display` | 96px | Timer digits |
| `hero` | 128px | Splash screens |

---

## Components

### Surface Prop

Every component accepts a `surface` prop (`'mobile' | 'tv'`) that switches between size/layout presets. This is the primary mechanism for adapting components across surfaces.

```tsx
<AnswerCard letter="A" text="..." surface="tv" />
<Timer seconds={15} total={20} surface="mobile" />
```

### Button

**Variants**: `primary` | `secondary` | `ghost` | `danger`
**Sizes**: `sm` (36px) | `md` (44px) | `lg` (52px)

- Primary uses cyan gradient for the main CTA
- Ghost for secondary actions (skip, cancel)
- Danger for destructive actions (leave game)

### AnswerCard

The core gameplay component. **States**: `idle` | `selected` | `correct` | `wrong` | `disabled`

**Mobile**: Tappable, vertical stack layout, 56px min height
**TV**: Display-only, 2×2 grid layout, 120px min height with percentage bars

**Slot Colors**: Each answer position (A/B/C/D) has a unique accent color so viewers can distinguish options from across the bar:
- A: Blue `#4FC3F7`
- B: Purple `#CE93D8`
- C: Amber `#FFB74D`
- D: Green `#81C784`

### Timer (CircleTimer)

Circular countdown with color transitions:
- `>50%` remaining → Cyan (safe)
- `25-50%` remaining → Amber (warning)
- `<25%` remaining → Red (danger)

Uses SVG `strokeDashoffset` animation for smooth countdown.

### CategoryPill

Color-coded pill showing the question's super-category. Automatically maps category strings to the 6 accent colors.

### DifficultyDots

Visual 5-dot indicator for question difficulty level:
- Level 1-2: Green
- Level 3: Amber
- Level 4-5: Red

### ScoreboardRow

Leaderboard entry with rank, avatar, name, streak indicator, and score. Top 3 get medal emojis.

### Toast

Notification component with 4 variants: `info`, `success`, `error`, `warning`. Each has matching color scheme from the signal palette.

### Input

Text input with label and error state support. Uses slate background with graphite border.

---

## TV-Specific Design Rules

1. **Minimum 28px font size** — anything smaller is unreadable from 10ft+
2. **Overscan-safe margins** — 48px horizontal, 27px vertical (5% of 1920×1080)
3. **Dark theme mandatory** — reduces screen glare in dim bar environment
4. **No pure black/white** — prevents haloing on cheap TVs and OLED smear
5. **Bold weights preferred** — thin weights fall apart on TV rendering
6. **Center-aligned questions** — viewers approach from different angles
7. **2×2 answer grid** — easy to scan quickly from distance
8. **Larger color contrast** — TV colors are slightly boosted vs mobile
9. **Slower animations** — dramatic reveals look better on big screens (600-1200ms vs 200-300ms)
10. **JetBrains Mono for all numbers** — clear distinction between similar digits (0/O, 1/l)

---

## CSS Variables Usage (Web)

Import `tokens.css` in your root, then use variables anywhere:

```css
@import './tokens/tokens.css';

.my-component {
  background: var(--tt-charcoal);
  color: var(--tt-snow);
  border-radius: var(--tt-radius-lg);
  font-family: var(--tt-font-body);
  transition: all var(--tt-dur-normal) var(--tt-ease);
}
```

For TV mode, add `.tv-mode` class to `<html>` — all size variables automatically scale up.

---

## React Native Usage

Import tokens directly:

```tsx
import { palette, fontFamilyNative, fontSize, space, radius } from '../tokens/tokens';
import { Button, AnswerCard, Timer } from '../components/native/Components';
```

Fonts must be loaded at app startup:

```tsx
import * as Font from 'expo-font';

await Font.loadAsync({
  'ChakraPetch-Bold': require('./assets/fonts/ChakraPetch-Bold.ttf'),
  'DMSans-Regular': require('./assets/fonts/DMSans-Regular.ttf'),
  'DMSans-Medium': require('./assets/fonts/DMSans-Medium.ttf'),
  'DMSans-Bold': require('./assets/fonts/DMSans-Bold.ttf'),
  'JetBrainsMono-Regular': require('./assets/fonts/JetBrainsMono-Regular.ttf'),
  'JetBrainsMono-Bold': require('./assets/fonts/JetBrainsMono-Bold.ttf'),
});
```

---

## Implementation Notes

- **Ionic/Capacitor**: Since you're using Ionic, the web components can be used directly. The CSS variables approach works well with Ionic's theming system.
- **Samsung Tizen / Fire TV**: These render standard web — use the React web components with `surface="tv"` and add `.tv-mode` to the root element.
- **Roku (BrightScript)**: The token values (colors, sizes, spacing) can be ported to BrightScript constants. The component logic would need to be rewritten, but the visual spec stays the same.
- **Animations**: Web components use CSS transitions. For React Native, use `react-native-reanimated` for the Timer and answer state transitions.
