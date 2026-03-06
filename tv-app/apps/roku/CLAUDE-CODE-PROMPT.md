# TapTrivia Roku App — Claude Code Prompt

## What You're Building

A native Roku TV app for TapTrivia using BrightScript and SceneGraph. This app must be a **pixel-for-pixel recreation of the existing web TV app**. 

## Source of Truth

**Read this file first — it IS the spec:**
`/Users/adamfisher/DEVELOP/tap-trivia/tv-app/js/app.js` (~1,800 lines)

Every screen, layout, color, font, animation, timing, API endpoint, polling interval, state machine transition, scoring formula, signage template, and visual behavior in `app.js` must be recreated natively. If something isn't specified in this prompt, the answer is in `app.js`. A patron looking at a Roku TV and a Fire Stick TV side by side should see identical experiences.

## Supporting Reference

Read the full development plan:
`/Users/adamfisher/DEVELOP/tap-trivia/tv-app/apps/roku/ROKU-PLAN.md`

This contains the project structure, technology mapping (CSS → SceneGraph equivalents), animation specs, API integration details, resolution strategy, screensaver prevention, and build phases.

## Output Location

All files go under:
```
/Users/adamfisher/DEVELOP/tap-trivia/tv-app/apps/roku/
```

## Technology

- **BrightScript** (.brs) — scripting language, similar to BASIC/JavaScript hybrid
- **SceneGraph** (.xml) — UI framework, XML-defined node trees with absolute positioning
- **No HTML, CSS, npm, WebView, or package manager** — everything is hand-written
- Resolution: Design at **1920×1080** (FHD). Set `ui_resolutions=fhd` in manifest. Roku auto-scales to 720p/4K.

## Key Roku Constraints

- **Network calls MUST happen in Task nodes** (background threads). HTTP on the main thread crashes the app.
- **No border-radius** — use pre-rendered 9-patch PNG images for rounded corners
- **No z-index** — render order = XML declaration order (last declared = on top)
- **No flexbox/grid** — all positioning is absolute: x, y, width, height
- **No SVG** — timer ring, QR codes, etc. must be pre-rendered PNG assets or Poster-based
- **No CSS gradients** — use Poster nodes with gradient image assets
- **Fonts must be TTF** — bundle them in `/fonts/` directory
- **One sideloaded app at a time** — each deploy replaces previous
- **Screensaver activates after ~10min** — prevent with silent 1-pixel video loop

## Mapping CSS/HTML → Roku

```
<div>                → <Group> or <Rectangle>
background-color     → Rectangle color="#hex"
<p>, <span>          → <Label text="..." />
font-size: 32px      → fontSize="32"
font-family          → font="font:FontName"
opacity: 0.4         → opacity="0.4"
CSS gradient         → <Poster> with pre-rendered gradient PNG
CSS animation        → <Animation> + <FloatFieldInterpolator>
border-radius        → 9-patch image
overflow: hidden     → clippingRect on Group
SVG timer ring       → pre-rendered ring frame PNGs, swap per tick
QR code              → pre-generated QR PNG asset
```

## Project Structure

```
roku/
├── manifest
├── source/
│   └── main.brs
├── components/
│   ├── TapTriviaScene.xml + .brs
│   ├── screens/
│   │   ├── SetupScreen.xml + .brs
│   │   ├── IdleScreen.xml + .brs
│   │   ├── LobbyScreen.xml + .brs
│   │   ├── GetReadyScreen.xml + .brs
│   │   ├── CategoryScreen.xml + .brs
│   │   ├── PlayingScreen.xml + .brs
│   │   ├── RevealScreen.xml + .brs
│   │   ├── LeaderboardScreen.xml + .brs
│   │   ├── BetweenScreen.xml + .brs
│   │   └── ResultsScreen.xml + .brs
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
│   ├── channel-poster.png      (540×405)
│   ├── splash-screen-fhd.png  (1920×1080)
│   ├── qr-play-120.png        (QR for badge)
│   ├── qr-play-360.png        (QR for lobby)
│   ├── timer-ring frames      (pre-rendered per second × 3 colors)
│   ├── orb-blue/red/green.png (gradient orb overlays)
│   ├── rounded-rect-*.9.png   (9-patch for rounded corners)
│   └── glass-bg.9.png         (glassmorphism card background)
└── fonts/
    ├── Fredoka-Bold.ttf
    ├── Outfit-Regular.ttf
    ├── Outfit-SemiBold.ttf
    ├── Outfit-Bold.ttf
    └── DMMono-Regular.ttf
```

## How Roku Apps Work

### Entry Point (main.brs)
```brs
sub Main()
  screen = CreateObject("roSGScreen")
  m.port = CreateObject("roMessagePort")
  screen.setMessagePort(m.port)
  scene = screen.CreateScene("TapTriviaScene")
  screen.show()
  while true
    msg = wait(0, m.port)
    msgType = type(msg)
    if msgType = "roSGScreenEvent"
      if msg.isScreenClosed() then return
    end if
  end while
end sub
```

### Component Pattern (every screen/widget)
Each component is an XML file + a BrightScript file:

**MyComponent.xml** — defines UI tree and interface fields:
```xml
<?xml version="1.0" encoding="utf-8" ?>
<component name="MyComponent" extends="Group">
  <interface>
    <field id="someData" type="assocarray" onChange="onDataChanged" />
  </interface>
  <children>
    <Rectangle id="bg" color="#08080c" width="1920" height="1080" />
    <Label id="title" text="Hello" translation="[100, 50]" 
           font="font:Fredoka-Bold" fontSize="48" color="#ffffff" />
  </children>
  <script type="text/brightscript" uri="MyComponent.brs" />
</component>
```

**MyComponent.brs** — defines behavior:
```brs
sub init()
  m.title = m.top.findNode("title")
  ' Set up observers, initialize state
end sub

sub onDataChanged()
  data = m.top.someData
  m.title.text = data.title
end sub
```

### Task Node Pattern (required for ALL network calls)
```xml
<component name="ApiTask" extends="Task">
  <interface>
    <field id="requestUrl" type="string" />
    <field id="response" type="assocarray" onChange="onResponse" />
  </interface>
  <script type="text/brightscript" uri="ApiTask.brs" />
</component>
```

```brs
sub init()
  m.top.functionName = "doRequest"
end sub

sub doRequest()
  url = CreateObject("roUrlTransfer")
  url.SetUrl(m.top.requestUrl)
  url.SetCertificatesFile("common:/certs/ca-bundle.crt")
  url.InitClientCertificates()
  response = url.GetToString()
  m.top.response = ParseJson(response)
end sub
```

### Animation Pattern
```xml
<Animation id="slideUpAnim" duration="0.4" easeFunction="outCubic" repeat="false">
  <Vector2DFieldInterpolator key="[0.0, 1.0]" 
    keyValue="[[0, 28], [0, 0]]" fieldToInterp="translation" />
  <FloatFieldInterpolator key="[0.0, 1.0]" 
    keyValue="[0.0, 1.0]" fieldToInterp="opacity" />
</Animation>
```

Start animation: `m.top.findNode("slideUpAnim").control = "start"`
Stagger delay: `anim.delay = i * 0.05`

### Font Registration (in manifest)
```
fonts/Fredoka-Bold.ttf
fonts/Outfit-Regular.ttf
```
Use in XML: `font="font:Fredoka-Bold"` or create font node for more control.

### Registry (persistent storage, like localStorage)
```brs
sub saveConfig(barCode as String, barName as String)
  sec = CreateObject("roRegistrySection", "TapTrivia")
  sec.Write("barCode", barCode)
  sec.Write("barName", barName)
  sec.Flush()
end sub

function loadConfig() as Object
  sec = CreateObject("roRegistrySection", "TapTrivia")
  if sec.Exists("barCode")
    return { barCode: sec.Read("barCode"), barName: sec.Read("barName") }
  end if
  return invalid
end function
```

### Screen Switching (in TapTriviaScene)
```brs
sub switchScreen(screenName as String)
  ' Hide all screens
  for each name in m.screenNames
    m.screens[name].visible = false
  end for
  ' Show target
  m.screens[screenName].visible = true
  ' Update that screen's data
  m.screens[screenName].gameState = m.currentState
end sub
```

### Screensaver Prevention
```xml
<Video id="keepAwake" visible="false" width="1" height="1" loop="true">
  <ContentNode url="pkg:/images/silent.mp4" />
</Video>
```
Start in init(): `m.top.findNode("keepAwake").control = "play"`

## API Endpoints

```
Base URL: https://api.taptrivia.tv  (check app.js for exact base URL)

GET  /game/tv-state?barCode={code}  → full game state + signage config + logo
POST /bar/register                   → { barName, ownerEmail? } → { barCode }
POST /tv/activate                    → { barCode } → { barCode, barName }
GET  /bar/{barCode}                  → bar details
```

Polling intervals (from app.js):
- Idle/Break: every 5 seconds
- Active game: every 2 seconds

## State Machine (from app.js)

```
API state              → Roku screen
─────────────────────────────────────
break                  → idle (signage rotation)
active_game/countdown  → getready (3-2-1)
active_game/category   → category
active_game/read_time  → playing
active_game/answer_time→ playing
active_game/reveal     → reveal
active_game/scores     → between
active_game/between    → leaderboard
game_over              → results → rotation (results → idle → lobby)
```

Read app.js for the exact field names and transition logic.

## Scoring (from app.js)

```
TOTAL_TIME = 20 seconds
MAX_PTS = 1000
MIN_PTS = 100

points = max(100, round(1000 * (timeRemaining / 20)))

Color tiers:
  > 60% remaining → green (#00d4aa)
  30-60%          → gold  (#ffd200)
  < 30%           → red   (#ff4757)
```

## Build Order

Work through these phases sequentially. Each phase should be fully working before moving to the next.

### Phase 1: Skeleton + API Connection
1. Create manifest, main.brs, TapTriviaScene
2. Create ApiTask that polls GET /game/tv-state
3. Verify HTTP works and responses parse correctly
4. Add silent video screensaver prevention
5. Add Registry save/load for barCode

### Phase 2: Setup + Idle Screens
1. SetupScreen — split panel with register/activate
2. Hook up POST /bar/register and POST /tv/activate
3. On successful activation, save to Registry and switch to idle
4. IdleScreen — static signage layout (match app.js SIGNAGE_FS templates)
5. State routing: if Registry has barCode, go to idle; else go to setup

### Phase 3: Core Gameplay Screens
1. LobbyScreen — QR + bar code + player list + signage panel
2. GetReadyScreen — countdown ring animation
3. CategoryScreen — emoji zoom + difficulty dots
4. PlayingScreen — question + 4 answer cards + timer ring + points drain
5. RevealScreen — correct/wrong states + percentage bars

### Phase 4: Post-Game Screens
1. LeaderboardScreen — podium (2nd-1st-3rd) + 4th/5th + signage panel
2. BetweenScreen — standings list + signage panel
3. ResultsScreen — trophy + podium + signage panel
4. Screen rotation during break: results → idle → lobby

### Phase 5: Polish
1. All animations (popIn, slideUp, medalDrop, rankSlide, etc.)
2. Custom fonts loaded and applied everywhere
3. Background orbs (animated Poster nodes)
4. Glass card styling with 9-patch images
5. Error/reconnecting overlay
6. Remote control navigation

### Phase 6: Channel Store Submission
1. Channel artwork (poster 540×405, splash 1920×1080)
2. Package and sign
3. Submit to Roku Channel Store

## Development & Deploy Workflow

The developer uses **VS Code with the BrightScript Language extension** (RokuCommunity). The physical Roku device is at `192.168.40.16` with password `0000`.

**F5 in VS Code does everything:**
1. Zips the project (manifest at root)
2. Uploads to the Roku via HTTP
3. Installs and launches the app
4. Connects the debug console for logs and errors

**Do NOT write build scripts, deploy scripts, zip scripts, or install scripts.** The VS Code extension handles all of that. Just write `.brs` and `.xml` source files. The only scripts needed are asset generation (e.g., generating timer ring PNGs, QR codes) — not deployment.

**To take screenshots** of the running app: `http://192.168.40.16/plugin_inspect` has a Screenshot button, or use the VS Code command palette: "BrightScript: Screenshot".

## Important Notes

- **Read app.js first.** It's the definitive reference for every visual and behavioral detail.
- **Test on physical Roku** — there is no reliable emulator.
- **All HTTP in Task nodes** — never on the render thread.
- **Design at 1080p** — Roku auto-scales to 720p and 4K.
- When generating pre-rendered assets (timer rings, gradients, etc.), create a helper script that generates the PNGs programmatically.
- Refer to ROKU-PLAN.md for the full technology mapping, animation table, and detailed screen specs.
