# TapTrivia Fire TV App (Legacy / Fire OS)

Wraps [tv.taptrivia.tv](https://tv.taptrivia.tv) in a fullscreen WebView for legacy Fire TV Sticks running Fire OS (Android-based).

## Device Coverage

**This app covers:**
- Fire TV Stick Lite
- Fire TV Stick (3rd Gen)
- Fire TV Stick 4K
- Fire TV Stick 4K Max
- Fire TV Cube

**Does NOT cover:**
- Fire TV Stick 4K Select (Vega OS) — see `../firestick-vega/`

## How It Works

The native app is a thin WebView wrapper. All trivia logic, UI, and game state lives in the web app at `tv.taptrivia.tv`. Web app changes deploy automatically via CloudFront — no app rebuild needed.

## Prerequisites

- Node.js 18+
- Android SDK (API 33)
- Java 17
- ADB (Android Debug Bridge)

## Setup

```bash
npm install
```

## Build

```bash
cd android && ./gradlew assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Install

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Launch

```bash
adb shell am start -n tv.taptrivia.firestick/.MainActivity
```

## Logs

```bash
adb logcat -s ReactNativeJS:V
```

## Notes

- Web app changes deploy automatically — no rebuild needed
- Back button is intercepted to prevent accidental app exit
- Screen stays awake via `android:keepScreenOn`
- Auto-retries on network errors every 10 seconds
