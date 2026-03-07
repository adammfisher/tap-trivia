#!/bin/bash
# TapTrivia Fire TV Stick Setup Script
# Run this on a Mac/PC connected to the Fire TV Stick via USB
#
# Prerequisites:
#   - Vega SDK installed (~/vega/bin/vega)
#   - Fire TV Stick connected via ADB
#   - TapTrivia vpkg built (run: npm run build-vega)
#
# Usage: bash scripts/setup-firestick.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VPKG_PATH="$PROJECT_DIR/build/armv7-release/taptriviatv_armv7.vpkg"
VEGA="$HOME/vega/bin/vega"
ADB="$(which adb 2>/dev/null || echo "$HOME/Library/Android/sdk/platform-tools/adb")"

APP_ID="tv.taptrivia.firestick"
APP_MAIN="tv.taptrivia.firestick.main"

echo "=== TapTrivia Fire TV Setup ==="
echo ""

# Check prerequisites
if [ ! -f "$VEGA" ]; then
  echo "ERROR: Vega SDK not found at $VEGA"
  echo "Install from: https://developer.amazon.com/apps-and-games/vega"
  exit 1
fi

if ! "$ADB" devices 2>/dev/null | grep -q "device$"; then
  echo "ERROR: No Fire TV Stick connected via ADB"
  echo "Enable Developer Options on the Fire TV Stick and connect via USB"
  exit 1
fi

DEVICE=$("$ADB" devices 2>/dev/null | grep "device$" | head -1 | awk '{print $1}')
echo "Device: $DEVICE"

# Build if needed
if [ ! -f "$VPKG_PATH" ]; then
  echo ""
  echo "Building app..."
  cd "$PROJECT_DIR"
  PATH="/usr/local/bin:/usr/bin:/bin:$HOME/vega/bin:$PATH" ./node_modules/.bin/react-native build-vega --build-type Release
fi

# Install
echo ""
echo "Installing TapTrivia TV..."
"$VEGA" device install-app --device "$DEVICE" --packagePath "$VPKG_PATH"

# Launch app
echo ""
echo "Launching TapTrivia TV..."
"$VEGA" device launch-app --device "$DEVICE" --appName "$APP_MAIN"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "TapTrivia TV is now running on your Fire TV Stick."
echo ""
echo "The app uses in-app keepalive (PlayerSession + silent video) to prevent"
echo "the idle manager from killing the display."
