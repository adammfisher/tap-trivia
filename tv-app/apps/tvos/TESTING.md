# TapTrivia tvOS App — Testing on Apple TV

## Prerequisites

- **Mac** with Xcode 15+ installed (download from Mac App Store)
- **Apple TV 4K** (or Apple TV HD) on the same WiFi network as your Mac
- **Apple Developer account** — free account works for device testing, paid ($99/yr) needed for App Store
- **Node.js 18+** and npm/yarn

## One-Time Xcode Setup

### 1. Install Xcode Command Line Tools

```bash
xcode-select --install
```

### 2. Sign in to your Apple Developer account in Xcode

- Open Xcode → Settings → Accounts
- Click `+` → Apple ID → sign in
- Xcode will create a "Personal Team" signing certificate automatically

## One-Time Apple TV Setup

### 1. Pair your Apple TV with Xcode

Your Mac and Apple TV must be on the same WiFi network.

**On Apple TV:**
1. Go to **Settings → Remotes and Devices → Remote App and Devices**
2. The Apple TV will appear as available for pairing

**On your Mac:**
1. Open Xcode → Window → Devices and Simulators
2. Your Apple TV should appear in the left sidebar under "Discovered"
3. Click on it → click "Pair"
4. A 6-digit code will appear on the Apple TV screen
5. Enter it in Xcode

Once paired, your Apple TV will show as "Connected" in Xcode.

### 2. Enable Developer Mode on Apple TV

On Apple TV:
1. Go to **Settings → Privacy & Security → Developer Mode**
2. Toggle it **ON**
3. Apple TV will restart

> If you don't see Developer Mode, pair with Xcode first (step above) — it appears after pairing.

## Build & Run

### 1. Install dependencies

```bash
cd tv-app/apps/tvos
npm install
```

### 2. Install CocoaPods (first time only)

```bash
cd ios
pod install
cd ..
```

> If `pod` is not found: `sudo gem install cocoapods`

### 3. Run on Apple TV

```bash
# List available devices to find your Apple TV's name
xcrun xctrace list devices

# Run on your Apple TV
npx react-native run-ios --scheme TapTrivia-tvOS --device "Your Apple TV Name"
```

Or from Xcode:
1. Open `ios/TapTrivia.xcworkspace` in Xcode
2. Select the **TapTrivia-tvOS** scheme in the top toolbar
3. Select your Apple TV from the device dropdown (next to the scheme)
4. Click the **Run** button (or Cmd+R)

### 4. Run on tvOS Simulator (no Apple TV needed)

```bash
npx react-native run-ios --scheme TapTrivia-tvOS --simulator "Apple TV 4K (3rd generation)"
```

## Testing Checklist

### Basic Functionality
- [ ] App launches and shows WebView loading tv.taptrivia.tv
- [ ] Setup screen renders correctly at 1920x1080
- [ ] Apple TV remote swipe navigates between fields (location, email, code)
- [ ] Clicking the center button opens the on-screen keyboard
- [ ] Can type and submit the activation code
- [ ] After activation, idle screen signage displays and rotates

### Remote Control
- [ ] Swipe up/down/left/right moves focus on setup screen
- [ ] Center click = Enter/OK (opens keyboard, submits forms)
- [ ] Menu button = Back (standard tvOS behavior)
- [ ] Play/Pause button has no unexpected behavior

### Screensaver Suppression
- [ ] Leave app running for 15+ minutes — screensaver should NOT activate
- [ ] If you go to tvOS home and come back, app resumes correctly
- [ ] Signage rotation continues after extended idle time

### Gameplay (during trivia hours 5PM-2AM ET)
- [ ] Lobby screen shows countdown and player count
- [ ] Question screen renders with answers
- [ ] Leaderboard displays between questions
- [ ] Results screen shows at end of game
- [ ] Returns to signage after game ends

### Edge Cases
- [ ] Kill and relaunch app — should remember activation (web localStorage persists in WebView)
- [ ] Disconnect WiFi briefly then reconnect — app recovers via polling
- [ ] Leave running overnight — still functional in the morning

## Troubleshooting

### "Untrusted Developer" error on Apple TV
- On Apple TV: Settings → Privacy & Security → Developer Mode → Trust your certificate

### Apple TV not showing in Xcode
- Ensure both devices are on the same WiFi network
- Restart Apple TV: Settings → System → Restart
- In Xcode: Window → Devices and Simulators → check for your device

### Build fails with signing error
- In Xcode, select the tvOS target → Signing & Capabilities
- Check "Automatically manage signing"
- Select your Personal Team
- Change the Bundle Identifier to something unique (e.g., `com.yourname.taptrivia.tv`)

### WebView is blank
- Check that the Apple TV has internet access
- Try loading `tv.taptrivia.tv` in Safari on your Mac to verify the site is up
- Check Xcode console for network errors

### Remote input not working in WebView
- Check Xcode console for key event logs
- The app includes a native gesture-to-keypress bridge — verify it's active in logs

## Useful Commands

```bash
# List available tvOS simulators
xcrun simctl list devices available | grep -i tv

# View app logs from Apple TV (while connected to Xcode)
# Use Xcode → Window → Devices and Simulators → select Apple TV → Open Console

# Clean build (if things get weird)
cd ios && rm -rf build Pods && pod install && cd ..
npx react-native start --reset-cache
```
