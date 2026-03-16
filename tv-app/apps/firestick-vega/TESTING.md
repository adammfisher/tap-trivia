# Fire TV Vega Native App — Testing Guide

## What Changed
The Fire TV app was completely rebuilt from a WebView wrapper (loading `tv.taptrivia.tv`) into a **full native app** — identical architecture to the tvOS and Roku apps. This solves the overnight idle manager kill problem because the video background registers a proper `VIDEO_PLAYBACK` media session.

## How It Works Now
- **Video background** (`bg-gradient.mp4`) plays via Kepler's `Video` component — this is what keeps the app alive (same strategy as tvOS)
- **PlayerSession keepalive** sends `setPlaybackState(PLAYING)` every 10 seconds as a belt-and-suspenders backup
- All 14 screens render natively (Setup, Idle, Lobby, GetReady, Category, Playing, Reveal, Between×4, Leaderboard, Results)
- Signage renders natively (all 7 templates, full-screen and panel)
- Polls the same API as tvOS/Roku (`GET /game/tv-state`)

## Dependencies That Were Shimmed
Since Kepler (Vega's RN 0.72 fork) doesn't have the same npm ecosystem:

| tvOS Package | Vega Replacement |
|---|---|
| `react-native-linear-gradient` | Solid color View (uses first gradient color) |
| `react-native-svg` (TimerRing) | Circular View with border + opacity |
| `react-native-qrcode-svg` | Static PNG (Roku's pre-rendered QR) |
| `react-native-video` | `@amazon-devices/react-native-w3cmedia` Video |
| `@react-native-async-storage/async-storage` | RN built-in AsyncStorage |
| `SilentAudioPlayer` (native module) | Kepler IPlayerSession TurboModule |

## Known Visual Differences vs tvOS
- **No gradients** on answer cards, avatars, progress bars — they'll be solid colors (first color of the gradient). Functional but less polished.
- **Timer ring** is a simple colored circle border with opacity fade instead of an SVG arc. Number and color changes still work.
- **QR code** is static (always `play.taptrivia.tv`) — same for all bars, which is correct.

---

## Step-by-Step Testing

### 1. Connect the Fire TV Stick
The device is probably in screensaver/dead state. Unplug and replug the USB power if needed, then:
```bash
adb connect <device-ip>:5555
# Verify:
adb devices
# Should show the device (serial GT533M06509615M0)
```

### 2. Kill the old app if running
```bash
adb shell vmsgr send "pkg://tv.taptrivia.firestick.main" --action stop 2>/dev/null
# Or just let the install replace it
```

### 3. Install the new native build
The vpkg is already built at `tv-app/apps/firestick-vega/build/armv7-release/taptriviatv_armv7.vpkg`.
```bash
cd ~/DEVELOP/tap-trivia/tv-app/apps/firestick-vega
PATH="$HOME/vega/bin:$HOME/Library/Android/sdk/platform-tools:/usr/local/bin:$PATH" \
  vega device install-app --packagePath build/armv7-release/taptriviatv_armv7.vpkg
```

### 4. Launch
```bash
PATH="$HOME/vega/bin:$HOME/Library/Android/sdk/platform-tools:/usr/local/bin:$PATH" \
  vega device launch-app --appName tv.taptrivia.firestick.main
```

### 5. What to expect on first launch
- **Setup screen** should appear — two-column layout (Register left, Activate right)
- Enter bar code with the remote (e.g. `9CK6T` for Connestee Social Club)
- After activation it should go to Idle/Lobby depending on time of day

### 6. What to verify
- [ ] **Setup screen renders** — logo, text inputs, buttons visible
- [ ] **Bar code entry works** — remote/keyboard types into the input
- [ ] **Activation succeeds** — transitions to idle or lobby
- [ ] **Video background plays** — animated purple gradient behind everything (not just solid dark purple)
- [ ] **Signage rotates** — if outside game hours, idle screen should cycle through signage slides
- [ ] **QR badge shows** — static QR code image with bar code text
- [ ] **Fonts look right** — Fredoka for headings, Outfit for body
- [ ] **If during game hours** — watch a full game cycle: lobby → getready → category → playing → reveal → between → leaderboard → results
- [ ] **Answer cards** — solid white cards with letter badges (no gradient but functional)
- [ ] **Timer ring** — colored circle with countdown number, changes green→gold→red
- [ ] **App survives overnight** — the main test! Leave it running and check in the morning

### 7. If something goes wrong

**App crashes on launch:**
```bash
adb shell loggingctl log --last 200 2>&1 | grep -i "trivia\|kepler\|crash\|error"
```

**Black screen / no video:**
The video background might fail on this hardware. The app should still work (solid `#0f0326` dark purple background). Check logs:
```bash
adb shell loggingctl log --last 100 2>&1 | grep "BG-VIDEO"
```

**App gets killed overnight (same old problem):**
Check if the video playback session registered:
```bash
adb shell loggingctl log --last 500 2>&1 | grep -i "playback\|keepalive\|idle\|screensaver"
```

**Need to rebuild:**
```bash
cd ~/DEVELOP/tap-trivia/tv-app/apps/firestick-vega
PATH="$HOME/vega/bin:/usr/local/bin:/bin:/usr/bin:$PATH" npm run build:release
```

### 8. Fallback to old WebView app
If the native app is broken and you need the old version back tonight:
```bash
cd ~/DEVELOP/tap-trivia/tv-app/apps/firestick-vega
cp src/App.tsx src/App.tsx.native-bak
cp src/App.tsx.webview-bak src/App.tsx
PATH="$HOME/vega/bin:/usr/local/bin:/bin:/usr/bin:$PATH" npm run build:release
# Then install + launch as above
```

### 9. On-device watchdog (if still needed)
If the native video keepalive doesn't prevent idle kill, the old watchdog script can still help:
```bash
bash scripts/setup-firestick.sh
```
But ideally the native app's `VIDEO_PLAYBACK` session should make this unnecessary.
