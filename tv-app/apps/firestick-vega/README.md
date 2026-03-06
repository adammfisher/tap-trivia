# TapTrivia TV — Fire TV Stick 4K Select (Vega OS)

Wraps [tv.taptrivia.tv](https://tv.taptrivia.tv) in a fullscreen WebView for the Amazon Fire TV Stick 4K Select running Vega OS.

The web app handles all trivia logic, game state, polling, and rendering. This native wrapper just loads the URL, stays fullscreen, and keeps the screen awake. Changes to the web app are picked up automatically — no rebuild needed.

## Prerequisites

- **Vega SDK 0.22** — [Install guide](https://developer.amazon.com/docs/vega/0.22/install-vega-sdk.html)
- **Node.js 18+**

## Setup

```bash
cd tv-app/apps/firestick-vega
npm install
```

## Build

```bash
# Build for Fire TV Stick (armv7)
vega build -t armv7

# Build for Virtual Device (aarch64, M-series Mac)
vega build -t aarch64
```

Produces `.vpkg` files in `build/`.

## Run on Vega Virtual Device

```bash
vega virtual-device start
vega run-app build/aarch64-release/*.vpkg tv.taptrivia.firestick.main -d VirtualDevice
```

## Deploy to Fire TV Stick 4K Select

1. Register device DSN at [developer.amazon.com](https://developer.amazon.com)
2. Enable Developer Mode: Settings > My Fire TV > About > click device name 7 times > Developer Options > Developer Mode
3. Connect device via USB
4. Install and launch:

```bash
vega device install-app --packagePath build/armv7-release/*.vpkg
vega device launch-app --appName tv.taptrivia.firestick.main
```

## View Logs

```bash
vega device shell
```

## Reference

- [Vega WebView docs](https://developer.amazon.com/docs/vega/0.22/overview-of-webview.html)
- [Vega SDK overview](https://developer.amazon.com/docs/vega/0.22/overview-of-vega-sdk.html)
- [Run apps on devices](https://developer.amazon.com/docs/vega/0.22/run-apps.html)
