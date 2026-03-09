# TV App Platform Context

All TV apps display the TapTrivia bar trivia experience at 1920x1080. Most platforms load the shared web app (`https://tv.taptrivia.tv`) via WebView/iframe — Roku is the exception (100% native BrightScript).

## Platform Summary

| Platform | Tech | Wrapper | Keepalive | Deploy |
|----------|------|---------|-----------|--------|
| Fire TV Vega | RN 0.72 + Kepler SDK | WebView | AudioPlayer + PlayerSession | Vega SDK + ADB |
| Fire TV Legacy | RN 0.74-tvos + WebView | WebView | `android:keepScreenOn` | Gradle + ADB |
| Roku | BrightScript + SceneGraph | Native (no WebView) | External watchdog + bg video | ZIP → ECP curl |
| tvOS | RN 0.76-tvos + Native screens | Native (no WebView) | SilentAudioPlayer bridge | Xcode |
| Samsung Tizen | Vanilla HTML/JS | iframe | Tizen Power API + Wake Lock + silent video | Tizen Studio |
| LG webOS | Vanilla HTML/JS | iframe | Luna service + Wake Lock + silent video | webOS Dev Mode |

---

## 1. Fire TV Stick 4K Select (Vega OS) — `firestick-vega/`

**Tech:** React Native 0.72.0, @amazon-devices/webview, Kepler SDK 2.0, TypeScript
**OS:** Vega OS 1.1 (Linux-based, NOT Android), KeplerScript runtime, armv7l

### Architecture
React Native wrapper loads `https://tv.taptrivia.tv?platform=firestickvega` in a WebView. All game logic lives in the shared web app — the native wrapper handles keepalive only.

### Key Files
- `src/App.tsx` — WebView + AudioPlayer keepalive + PlayerSession patches
- `manifest.toml` — Declares media services, IMediaPlaybackServer interface
- `scripts/setup-firestick.sh` — Build, install, launch via Vega SDK + ADB
- `scripts/tail-logs.sh` — Stream device logs to `/tmp/taptrivia-firestick.log`
- `assets/silence.m4a` — 10-minute silent audio (610KB, mono AAC 8kbps)

### Keepalive (3-layer)
1. **PlayerSession patch:** `IPlayerSession.create()` is undefined on this hardware — patched to `() => true`. Then `setPlaybackState(PLAYING)` called every 15s with advancing trackPositionMs.
2. **AudioPlayer:** Creates AUDIO_PLAYBACK session (weight 130) using `CONTENT_TYPE_MUSIC` + `USAGE_MEDIA`. Seeks back to position 0 every 30s to prevent stream teardown (loop=true tears down the audio stream and loses the session).
3. **Recovery:** 60s interval restarts audio if paused unexpectedly.

### Build & Deploy
```bash
# Build (requires ~/vega/bin/vega)
PATH="$HOME/vega/bin:$PATH" npm run build:release

# Install + launch
vega device install-app --device GT533M06509615M0 --packagePath build/armv7-release/taptriviatv_armv7.vpkg
vega device launch-app --device GT533M06509615M0 --appName "tv.taptrivia.firestick.main"

# Or all-in-one:
bash scripts/setup-firestick.sh
```

### Debugging
```bash
bash scripts/tail-logs.sh          # Stream to /tmp/taptrivia-firestick.log
tail -f /tmp/taptrivia-firestick.log
grep KEEPALIVE /tmp/taptrivia-firestick.log

# On-device commands (via adb shell)
vlcm list                          # App lifecycle state (VISIBLE/NOT_VISIBLE)
loggingctl log -v tv.taptrivia.firestick -f   # App-filtered log stream
```

### Known Issues
- `PlayerSession.create()` undefined on Fire TV Stick hardware — must patch
- `TimeoutManager` returns "Feature not supported on this platform"
- `UserInputManager` has no key injection capability
- Display session flickers engaged/not-engaged on each seek-back (sub-second, doesn't trigger screensaver)
- Won't survive reboot — must re-install/launch after power cycle

### Manifest Services Required
`webview.renderer_service`, `inputmethod.service`, `media.server`, `audio.control`, `audio.stream`, `audio.system`, `mediametrics.service`, `mediabuffer.service`, `mediatransform.service`, `media.playersession.service`, `inputd.service`, `gipc.uuid.*`

---

## 2. Legacy Fire TV (Fire OS / Android) — `firestick/`

**Tech:** React Native 0.74.1-tvos fork, react-native-webview, TypeScript
**OS:** Fire OS (Android-based), covers Fire TV Stick Lite/3rd Gen/4K/4K Max/Cube

### Architecture
React Native WebView loads `https://tv.taptrivia.tv?platform=firestickclassic`. Back button intercepted to prevent accidental exit. Viewport meta tag injection forces 1920x1080 rendering.

### Key Files
- `App.tsx` — WebView with back button handler, viewport injection, error retry
- `android/` — Standard Gradle build

### Keepalive
- `android:keepScreenOn="true"` in manifest
- `mediaPlaybackRequiresUserGesture=false` on WebView
- Relies on Android OS native behavior (simpler than Vega)

### Build & Deploy
```bash
cd android && ./gradlew assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n tv.taptrivia.firestick/.MainActivity
```

### Setup Instructions (shown to users)
1. Settings → Preferences → Data Usage Monitoring → Still Watching → **Off**
2. Settings → Display & Sounds → Screensaver → Start Time → **Never**

---

## 3. Roku — `roku/`

**Tech:** BrightScript + SceneGraph XML, pre-rendered PNG assets (no JavaScript, no WebView)

### Architecture
100% native BrightScript implementation mirroring the web app pixel-for-pixel. State machine polls `get-tv-state` API every 2-5 seconds. 10 screens with cross-dissolve animations. Pre-rendered assets via Node.js (@napi-rs/canvas) because Roku can't render emojis or SVGs.

### Key Files
- `source/main.brs` — Entry point (scene setup)
- `components/TapTriviaScene.brs` — Root scene, state machine, polling, screen management (~37KB)
- `components/screens/` — 10 screens: Setup, Idle, Lobby, GetReady, Category, Playing, Reveal, Between, Leaderboard, Results
- `components/widgets/` — AnswerCard, TimerRing, Avatar, Podium, LeaderRow, QRBadge, SignagePanel, ProgressBar, Logo
- `components/tasks/ApiTask.brs` — Network API calls
- `components/tasks/KeepAwakeTask.brs` — In-app bandwidth saver prevention
- `components/utils/` — Colors.brs, Utils.brs, FontFix.brs
- `scripts/build.sh` — Package ZIP + deploy via ECP
- `scripts/generate-assets.js` — Pre-render emojis, timer rings, gradients to PNG
- `scripts/roku-watchdog.sh` — External keepalive daemon
- `images/` — Pre-rendered timer-ring frames, gradients, orbs, emoji badges
- `fonts/` — Fredoka, Outfit, DM Mono TTF

### Keepalive
- **External watchdog** (`roku-watchdog.sh`): Runs on Mac/server. Every 30s checks app state, relaunches if crashed. Every 90 min sends ECP keypress to reset Bandwidth Saver 4-hour timer.
- **In-app**: KeepAwakeTask with animated background video signals media playback.

### Build & Deploy
```bash
bash scripts/build.sh                          # Build ZIP only
bash scripts/build.sh 192.168.1.100 rokudev   # Build + deploy to Roku IP
```

### Asset Generation
```bash
cd scripts && npm install && npm run generate  # Pre-render emojis, timer rings, gradients
```

### Key Constraints
- No WebView, no HTML/CSS — pure SceneGraph XML + BrightScript
- No z-index — render order by XML declaration order
- No SVG — all visual assets pre-rendered to PNG
- Emoji rendered to PNG at build time (176px large, 48px small for pills)
- Timer ring: pre-rendered frames `timer-ring-{tier}-{seconds}.png`
- Registry persistence: `roRegistrySection "TapTrivia"` (barCode, barName, tvDeviceId)
- Back button returns to Setup screen (clears saved bar code)

### Setup Instructions (shown to users)
1. Settings → Network → Bandwidth Saver → **Off**
2. Settings → Theme → Screensaver → **Disabled**
3. Settings → System → Power → Auto Power Savings → **Off**

---

## 4. Apple TV (tvOS) — `tvos/`

**Tech:** React Native 0.76.9-tvos fork, native Swift/Obj-C bridge, TypeScript

### Architecture
Native React Native screens (no WebView). 10 screens rendered directly with React Native components. TVStateContext holds game state, polls API. SilentAudioPlayer native bridge for keepalive. Cross-dissolve animations between rotation screens.

### Key Files
- `src/App.tsx` — Navigation + SilentAudioPlayer init
- `src/contexts/TVStateContext.tsx` — Game state management + polling
- `src/screens/` — 10 native screens matching web app design
- `src/SilentAudioPlayer.ts` — Native bridge TypeScript interface
- `ios/TapTrivia-tvOS/SilentAudioPlayerBridge.m` — Obj-C native implementation (AVAudioSession)
- `ios/TapTrivia-tvOS/SilentAudioPlayerModule.swift` — Swift native module
- `ios/TapTrivia-tvOS/AppDelegate.swift` — App lifecycle
- `TESTING.md` — Comprehensive testing guide

### Keepalive
- `SilentAudioPlayer` native bridge using AVAudioSession + silent audio
- Responds to AppState changes (active/background)
- react-native-video for silent media playback fallback

### Build & Deploy
```bash
npm install
cd ios && pod install && cd ..
npx react-native run-ios --scheme TapTrivia-tvOS --device "Apple TV Name"
```

### Known Issues
- Requires Apple Developer account + physical Apple TV pairing
- `react-native-reanimated` v4.x crashes tvOS — use built-in `Animated` API
- `newArchEnabled` conflicts with Expo Go — not enabled

---

## 5. Samsung Tizen — `samsung-tizen/`

**Tech:** Vanilla HTML/CSS/JavaScript + Tizen Web API, iframe wrapper

### Architecture
Minimal HTML page with fullscreen iframe loading `https://tv.taptrivia.tv`. JavaScript handles keepalive and error recovery. No build step.

### Key Files
- `index.html` — iframe wrapper (20 lines)
- `js/app.js` — Keepalive + error handling (122 lines)
- `config.xml` — Tizen app manifest (privileges: internet, power, product info)
- `css/style.css` — Fullscreen iframe styling

### Keepalive (4-layer)
1. `tizen.power.request('SCREEN', 'SCREEN_NORMAL')` — re-asserted every 5 min
2. `webapis.appcommon.setScreenSaver(SCREEN_SAVER_OFF)`
3. Wake Lock API (Chromium-based webOS)
4. Silent looping video (base64 H.264 MP4 embedded in JS)

### Deploy
Package directory as ZIP → upload via Tizen Studio or TV developer mode.

### Compatibility
Samsung TVs 2019+ (Tizen 4.0+). Prelaunch metadata enabled.

---

## 6. LG webOS — `lg-webos/`

**Tech:** Vanilla HTML/CSS/JavaScript + webOS Luna service API, iframe wrapper

### Architecture
Minimal HTML page with fullscreen iframe loading `https://tv.taptrivia.tv`. Luna service calls for display control. Includes webOSTVjs library.

### Key Files
- `index.html` — iframe wrapper (21 lines)
- `js/app.js` — Keepalive + Luna service calls (119 lines)
- `appinfo.json` — webOS manifest (`"keepAlive": true`, 1920x1080)
- `webOSTVjs/` — Luna service interaction library
- `css/style.css` — Fullscreen iframe styling

### Keepalive (3-layer)
1. Luna service: `luna://com.webos.service.tvpower` → `turnOnScreen`
2. Wake Lock API (fallback)
3. Silent looping video (base64 H.264 MP4 embedded in JS)

### Deploy
Package directory as ZIP → upload via TV's webOS Developer Mode.

### Compatibility
LG TVs 2018+ (webOS 4.0+). `keepAlive: true` in appinfo.json.

---

## Shared Web App — `tv-app/`

All platforms except Roku load the shared web app from `https://tv.taptrivia.tv`. The web app is vanilla JS with no build step, served from S3/CloudFront.

### Platform Detection
URL parameter `?platform=` determines platform-specific behavior:
- `firestickvega` — Fire TV Vega (native keepalive handles screensaver)
- `firestickclassic` — Legacy Fire TV
- No param — Samsung, LG, tvOS web fallback

### Key Files
- `index.html` — Entry point, screen sections
- `css/styles.css` — All TV styling (1920x1080, 2x scale from 960x540)
- `js/app.js` — State machine, screen renderers, signage, keepalive
- `js/config.js` — API_BASE, POLL_INTERVAL (2s)
- `js/api.js` — HTTP client
- `js/scoring.js` — Points calculation (shared with backend)
- `js/game-clock.js` — Game timing & phases (shared with backend)

### State Machine
`setup` → `idle` → `lobby` → `getready` → `category` → `playing` → `reveal` → `between` → `leaderboard` → `results` → (rotation)

### Signage
7 templates (specials, happyhour, event, brand, announcement, sports, custom) with full-screen and in-game panel renderers. Day-of-week filtering, configurable rotation speed.

### Web-Level Keepalive
- Wake Lock API: `navigator.wakeLock.request('screen')` with re-acquire on release
- Silent video: looping `silence.mp4` at 0.01 volume
- Both are fallbacks — native keepalive in each platform wrapper is the primary mechanism
