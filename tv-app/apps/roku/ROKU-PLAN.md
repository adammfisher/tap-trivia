# TapTrivia Roku App — Complete Development Plan

## Goal

Build a native Roku app that **recreates the existing web TV app pixel-for-pixel**. The source of truth is:

**`/tv-app/js/app.js`** (~1,800 lines)

Read that file thoroughly. Every screen, layout, color, font, animation, timing, API endpoint, polling interval, state machine transition, scoring formula, signage template, and visual behavior in `app.js` must be recreated in native BrightScript/SceneGraph. If something isn't specified in this plan, the answer is in `app.js`.

The only acceptable differences are platform-specific constraints:
- No SVG → use pre-rendered PNG assets or Poster rotation
- No CSS → absolute positioning (x, y, width, height) instead of flexbox
- No runtime drawing → pre-rendered image assets for gradients, rounded corners, timer rings
- No DOM → SceneGraph node tree with field observers
- No JavaScript timers → BrightScript Timer objects and Animation nodes

A patron looking at a Roku TV and a Fire Stick TV side by side should see identical experiences. When in doubt, match `app.js` exactly.

## Developer Account Setup

1. **Create Roku Account**: https://my.roku.com/signup (Visudo Labs email, payment method required)
2. **Enroll in Developer Program**: https://developer.roku.com/enrollment/standard (FREE)
3. **Enable Dev Mode on Physical Roku**: Press Home×3, Up×2, Right, Left, Right, Left, Right
4. **Set dev password**, note the IP address shown (e.g., 192.168.1.XXX)
5. **Verify**: Open http://ROKU_IP in browser (login: `rokudev` / your password)

## Mac Development Environment

- **VS Code + BrightScript Extension** (RokuCommunity): syntax highlighting, deploy, debugging
- Deploy: F5 in VS Code → instant upload to Roku device
- Optional: `npm install -g roku-deploy` for CLI deployment
- **No official Roku emulator for Mac**. Community simulator (brs-desktop) exists but SceneGraph support is alpha. Use physical Roku for all testing.

## Resolution Strategy

Design everything at **FHD (1920×1080)**. In the manifest, set:

```
ui_resolutions=fhd
```

Roku automatically scales the UI to match the actual display:
- **720p TV**: Roku scales 1080p down to 720p (no code changes needed)
- **1080p TV**: Renders natively at your design resolution
- **4K TV**: Roku scales 1080p up to 4K (no separate 4K UI resolution exists in SceneGraph)

All coordinates, font sizes, and image dimensions in the code should be specified at 1080p. Roku handles the math. This means one codebase covers all TV resolutions.

For image sharpness on 4K, provide high-res assets where possible (e.g., logo, QR code) — Roku will use them at the scaled size and they'll look crisp. For pre-rendered assets like timer ring frames and 9-patch cards, rendering at 1080p dimensions is fine since Roku's upscaler handles it well.

## Critical Roku Constraints

- **NO WebView, NO HTML, NO CSS** — everything is native BrightScript + SceneGraph XML
- **No npm, no package manager** — all code is hand-written .brs and .xml
- **Network calls MUST happen in Task nodes** (background threads)
- **No border-radius** on rectangles — use 9-patch PNG images
- **No z-index** — render order = XML declaration order (last declared = on top)
- **No CSS grid/flexbox** — all positioning is absolute (x, y, width, height)
- **Fonts must be TTF** — bundle Fredoka, Outfit, DM Mono
- **One sideloaded app at a time** — each deploy replaces previous

## Technology Mapping

| Web/CSS | Roku/SceneGraph |
|---------|----------------|
| `div` | `Group` or `Rectangle` |
| `background-color` | `Rectangle color="#08080c"` |
| `p`, `span` | `Label text="..."` |
| `font-size: 32px` | `Label fontSize="32"` |
| `font-family` | `Label font="font:Fredoka-Bold"` |
| `opacity: 0.4` | `node opacity="0.4"` |
| CSS gradient | `Poster` with gradient image asset |
| CSS animation | `Animation` node + `FloatFieldInterpolator` |
| `border-radius` | 9-patch image or `Poster` with rounded PNG |
| SVG circle (timer) | Pre-rendered ring PNGs or custom draw |
| QR code | Pre-generated QR PNG bundled as asset |

## Project Structure

```
roku/
├── manifest
├── source/
│   └── main.brs
├── components/
│   ├── TapTriviaScene.xml + .brs       (root scene, state router, polling)
│   ├── screens/
│   │   ├── SetupScreen.xml + .brs      (split panel: Register | Activate)
│   │   ├── IdleScreen.xml + .brs       (full-screen signage rotation)
│   │   ├── LobbyScreen.xml + .brs      (QR + code + players + signage panel)
│   │   ├── GetReadyScreen.xml + .brs   (3-2-1 countdown)
│   │   ├── CategoryScreen.xml + .brs   (category emoji + difficulty)
│   │   ├── PlayingScreen.xml + .brs    (question + answers + timer + points)
│   │   ├── RevealScreen.xml + .brs     (correct answer + percentages)
│   │   ├── LeaderboardScreen.xml + .brs(podium + 4th/5th + signage panel)
│   │   ├── BetweenScreen.xml + .brs    (standings + signage panel)
│   │   └── ResultsScreen.xml + .brs    (game over + podium + signage panel)
│   ├── widgets/
│   │   ├── QRBadge.xml + .brs
│   │   ├── TimerRing.xml + .brs
│   │   ├── AnswerCard.xml + .brs
│   │   ├── Avatar.xml + .brs
│   │   ├── Podium.xml + .brs
│   │   ├── LeaderRow.xml + .brs
│   │   ├── OrbBackground.xml + .brs
│   │   ├── SignagePanel.xml + .brs
│   │   ├── ProgressBar.xml + .brs
│   │   └── Logo.xml + .brs
│   └── tasks/
│       └── ApiTask.xml + .brs
├── images/
│   ├── channel-poster.png       (540×405)
│   ├── splash-screen-fhd.png   (1920×1080)
│   ├── qr-play.png             (pre-generated QR)
│   ├── timer-ring frames       (pre-rendered per second)
│   ├── orb-blue/red/green.png  (gradient orb overlays)
│   ├── rounded-rect-*.9.png    (9-patch for rounded corners)
│   └── glass-bg.9.png          (glassmorphism card bg)
└── fonts/
    ├── Fredoka-Bold.ttf
    ├── Outfit-Regular.ttf
    ├── Outfit-SemiBold.ttf
    ├── Outfit-Bold.ttf
    └── DMMono-Regular.ttf
```

## All 10 TV Screens

### Design Constants (1920×1080)

```
Background: #08080c
Fonts: Outfit (body), Fredoka (display/scores), DM Mono (counters/codes)
Gold: #ffd200    Green: #00d4aa    Red: #ff4757
Blue: #667eea    Purple: #764ba2
Glass cards: rgba(255,255,255, 0.04-0.08)
```

### Screen 1: SETUP (Split Panel)

**LEFT** — Register New Location:
- "🆕 New Location" badge (blue bg)
- "Register Your Location" title
- Input: 📍 location name
- Input: ✉️ email (optional)
- Signage callout: 📺 "Free Digital Signage"
- 3 feature bullets (🎯📺📊)
- Gold button: "📧 Register & Get Code"

**DIVIDER** — vertical line + "OR" badge

**RIGHT** — Activate This TV:
- "🔑 Have a Code" badge (green bg)
- 5 code input boxes (DM Mono, gold border)
- "Use this code on all your TVs" note
- Green button: "📺 Activate This TV" (pulses when ready)

**States**: form → sending → sent (code auto-fills right) → activated ("You're Live!" 🎉)

### Screen 2: IDLE / SIGNAGE

Full-screen signage rotation. Header: bar logo + name | countdown + TapTrivia logo.
7 templates: specials, happyhour, event, brand, announcement, sports, custom.
Defaults if no custom signage: "Play TapTrivia!", "How to Play", large QR.

### Screen 3: LOBBY

Three columns: QR+code (left) | Player list (center-right) | Signage panel (~340px right).
Next game countdown (Fredoka gold, codeGlow animation).
Large QR (360px) + bar code (72px gold, letter-spacing 12, codeGlow).
Player chips: avatar + name, popIn staggered.

### Screen 4: GET READY

Centered: Logo → "GAME STARTING" → countdown ring (240px, blue border, ringPulse) → number (128px Fredoka, countdownNum animation) → "Get ready!" → QR badge.

### Screen 5: CATEGORY

Centered: "QUESTION 7 OF 15" → emoji 144px (categoryZoom) → name 64px (slideUp) → subcategory → difficulty dots. QR badge.

### Screen 6: PLAYING

Header: Logo | Points (Fredoka 64px, color drain green→gold→red) | Players + Timer ring (96px).
Body left: category pill + counter → question (Fredoka 52px) → progress bar.
Body right: 4 answer cards (glass bg, letter badge A/B/C/D, slideUp staggered).
Footer: top 5 player strip.

Points formula: `max(100, round(1000 * (timeRemaining / 20)))`
Color: green >60%, gold 30-60%, red <30%.

### Screen 7: REVEAL

Same layout as Playing. Center shows "Answer Revealed" in green.
Correct: green gradient bg, ✓ icon, bounceIn, 🎉.
Wrong: dimmed bg, ✗ icon, 30% opacity text.
All show percentage fill bar + label.

### Screen 8: LEADERBOARD

Left: Logo → "AFTER QUESTION 7" → podium (2nd-1st-3rd, medalDrop) → 4th/5th cards → "Next question in 5s..."
Right: Signage panel (~340px).

### Screen 9: BETWEEN

Left: Logo → "STANDINGS" → top 5 glass rows (rankSlide staggered) → countdown.
Right: Signage panel.

### Screen 10: RESULTS

Left: Countdown → 🏆 (trophy animation) → "Game Over!" → stats → podium → 4th/5th.
Right: Signage panel.
Screen rotation after: results → idle → lobby (repeating).

## Animation Spec for BrightScript

| Animation | Duration | Description | Used On |
|-----------|----------|-------------|---------|
| popIn | 0.3s | scale .85→1.03→1, opacity 0→1 | Player chips, cards |
| slideUp | 0.4s | translateY 14→0, opacity 0→1 | Content reveal, lists |
| categoryZoom | 0.5s | scale .5→1.1→1, opacity 0→1 | Category emoji |
| medalDrop | 0.5s | translateY -30→4→0, scale 0→1.1→1 | Podium avatars |
| rankSlide | 0.3s | translateX -30→0, opacity 0→1 | Leaderboard rows |
| trophy | 0.6s | scale 0→1.2→1, rotate -30→5→0 | Trophy emoji |
| bounceIn | 0.4s | scale 1→1.07→1 | Correct answer |
| ringPulse | 2s ∞ | opacity glow cycle | Countdown ring |
| codeGlow | 3s ∞ | glow poster opacity cycle | Bar code |
| breathe | 4s ∞ | scale 1→1.05→1, opacity .7→1 | Logo idle |
| orb1/2 | 18-28s ∞ | translate+scale float | Background orbs |
| pulse | 1s ∞ | opacity 1→.6→1 | Low timer |

BrightScript pattern:
```xml
<Animation id="popInAnim" duration="0.3" easeFunction="outCubic">
  <FloatFieldInterpolator key="[0.0, 0.6, 1.0]"
    keyValue="[0.85, 1.03, 1.0]" fieldToInterp="scale.x" />
  <FloatFieldInterpolator key="[0.0, 0.6, 1.0]"
    keyValue="[0.85, 1.03, 1.0]" fieldToInterp="scale.y" />
  <FloatFieldInterpolator key="[0.0, 1.0]"
    keyValue="[0.0, 1.0]" fieldToInterp="opacity" />
</Animation>
```

Stagger pattern:
```brs
for i = 0 to items.count() - 1
  anim = items[i].findNode("popInAnim")
  anim.delay = i * 0.05
  anim.control = "start"
end for
```

## API Integration

Same endpoints as web TV:
```
GET  /game/tv-state?barCode={code}  → full game state
POST /bar/register                   → { barName, ownerEmail? }
POST /tv/activate                    → { barCode }
GET  /bar/{barCode}                  → { barCode, barName, status }
```

Polling: Idle 5s, Active game 2s, Playing with local clock 2s.

State mapping:
```
break                    → idle (signage)
active_game/category_splash → category
active_game/countdown    → getready
active_game/read_time    → playing
active_game/reveal       → reveal
active_game/scores       → between
active_game/between      → leaderboard
game_over                → results → rotation
```

ApiTask.xml (required — HTTP must be in Task node):
```xml
<component name="ApiTask" extends="Task">
  <interface>
    <field id="barCode" type="string" />
    <field id="response" type="assocarray" />
    <field id="pollInterval" type="integer" value="5000" />
  </interface>
  <script type="text/brightscript" uri="ApiTask.brs" />
</component>
```

## Screensaver Prevention

Play silent 1-pixel video on loop. Roku thinks media playing = no screensaver.
```xml
<Video id="keepAwake" visible="false" width="1" height="1" loop="true" />
```

## Timer Ring Strategy

No SVG on Roku. Pre-render 35 PNG frames (one per second, 3 color variants).
Swap Poster source each tick. Or use rotation on a partial-ring image.

## QR Code Strategy

Pre-generate PNGs for play.taptrivia.tv and bundle:
- qr-badge-120.png (corner badge)
- qr-large-360.png (lobby)

## Roku Registry (localStorage)

```brs
sub saveTvConfig(barCode, barName, tvDeviceId)
  sec = CreateObject("roRegistrySection", "TapTrivia")
  sec.Write("barCode", barCode)
  sec.Write("barName", barName)
  sec.Write("tvDeviceId", tvDeviceId)
  sec.Flush()
end sub

function loadTvConfig()
  sec = CreateObject("roRegistrySection", "TapTrivia")
  return {
    barCode: sec.Read("barCode"),
    barName: sec.Read("barName"),
    tvDeviceId: sec.Read("tvDeviceId")
  }
end function
```

## Build Phases

### Phase 1: Hello World + API (Days 1-2)
- manifest, main.brs, TapTriviaScene
- ApiTask with HTTP GET polling
- Silent video screensaver prevention

### Phase 2: Setup + Idle (Days 3-4)
- SetupScreen with split panels + keyboard input
- Register + Activate API calls
- Registry storage
- IdleScreen with static signage

### Phase 3: Core Gameplay (Days 5-10)
- Lobby, GetReady, Category screens
- PlayingScreen (the complex one): timer ring, points drain, answer cards
- RevealScreen with percentage bars

### Phase 4: Leaderboard + Results (Days 11-13)
- Leaderboard with podium widget
- Between with standings
- Results with trophy + confetti
- Screen rotation (results → idle → lobby)
- Signage panel widget

### Phase 5: Polish (Days 14-16)
- All animations
- Custom fonts
- Background orbs
- Glass card styling (9-patch)
- Error overlay
- Remote control handling

### Phase 6: Channel Store (Day 17+)
- Artwork: channel poster 540×405, splash 1920×1080
- Package, sign, submit (~1-2 week review)

## Deploy Workflow

Dev: F5 in VS Code → instant upload → debug in console.
Manual: ZIP (manifest at root) → http://ROKU_IP → upload.
CLI: `npx roku-deploy --host ROKU_IP --password PWD --rootDir ./`

## Reference Links

- Dev Portal: https://developer.roku.com
- SceneGraph: https://developer.roku.com/docs/developer-program/core-concepts/scenegraph-brightscript/overview.md
- BrightScript: https://developer.roku.com/docs/references/brightscript/language/brightscript-language-reference.md
- Samples: https://github.com/rokudev/samples
- VS Code ext: https://rokucommunity.github.io/vscode-brightscript-language/
