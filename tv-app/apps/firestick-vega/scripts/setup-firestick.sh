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

# Disable app timeout via vlcm debug (prevents LCM from evicting after idle)
echo ""
echo "Disabling app timeout..."
"$ADB" -s "$DEVICE" shell "vlcm debug $APP_MAIN --disable-app-timeout 2>/dev/null" || true

# Deploy self-healing watchdog
# Two jobs: (1) keep screen awake via KEY_WAKEUP every 2 min
#           (2) auto-relaunch app if LCM kills it (checks every 30s)
echo ""
echo "Setting up watchdog (keep-awake + auto-relaunch)..."
"$ADB" -s "$DEVICE" shell "
  # Kill any existing watchdog processes
  if [ -f /tmp/.taptrivia-keepawake-pid ]; then
    OLD_PID=\$(cat /tmp/.taptrivia-keepawake-pid 2>/dev/null)
    kill \$OLD_PID 2>/dev/null || true
    rm -f /tmp/.taptrivia-keepawake-pid
  fi
  for p in \$(ps -o pid,args 2>/dev/null | grep 'taptrivia-keepawake' | grep -v grep | awk '{print \$1}'); do
    kill \$p 2>/dev/null || true
  done

  # Write the watchdog script
  cat > /tmp/taptrivia-keepawake.sh << 'WATCHDOG'
#!/bin/sh
# TapTrivia watchdog v3 — auto-relaunches if backgrounded OR killed
APP_MAIN=tv.taptrivia.firestick.main
echo \$\$ > /tmp/.taptrivia-keepawake-pid
TICK=0
RELAUNCH_COUNT=0
while true; do
  sleep 15
  TICK=\$((TICK + 1))
  date +%s > /tmp/.taptrivia-keepawake-heartbeat 2>/dev/null

  # Check app state — field 5 in vlcm list output
  APP_LINE=\$(vlcm list 2>/dev/null | grep \"\$APP_MAIN\" | head -1)
  APP_STATE=\$(echo \"\$APP_LINE\" | awk '{print \$5}')

  # Relaunch if: missing, NOT_VISIBLE, STOPPED, TERMINATED, or anything other than VISIBLE
  if [ -z \"\$APP_STATE\" ] || [ \"\$APP_STATE\" != \"VISIBLE\" ]; then
    RELAUNCH_COUNT=\$((RELAUNCH_COUNT + 1))
    echo \"\$(date): #\$RELAUNCH_COUNT App state=[\$APP_STATE], relaunching...\" >> /tmp/taptrivia-watchdog.log
    vmsgr send \"pkg://\$APP_MAIN\" >/dev/null 2>&1
    sleep 5
    vlcm debug \"\$APP_MAIN\" --disable-app-timeout >/dev/null 2>&1
  fi

  # Every 2 min (8 ticks of 15s): send KEY_WAKEUP to prevent screensaver
  if [ \$((TICK % 8)) -eq 0 ]; then
    inputd-cli button_press KEY_WAKEUP >/dev/null 2>&1
  fi
done
WATCHDOG
  chmod +x /tmp/taptrivia-keepawake.sh

  # Launch detached from ADB session
  nohup sh /tmp/taptrivia-keepawake.sh >/dev/null 2>&1 &
  sleep 1
  if [ -f /tmp/.taptrivia-keepawake-pid ]; then
    echo 'Watchdog started (PID: '\$(cat /tmp/.taptrivia-keepawake-pid)')'
  else
    echo 'Watchdog started'
  fi
"

# Launch app
echo ""
echo "Launching TapTrivia TV..."
"$VEGA" device launch-app --device "$DEVICE" --appName "$APP_MAIN"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "TapTrivia TV is now running on your Fire TV Stick."
echo ""
echo "Watchdog checks every 15s and auto-relaunches if the app loses foreground."
echo "Keep-awake sends KEY_WAKEUP every 2 min to prevent screensaver."
echo ""
echo "To check watchdog status:"
echo "  adb shell cat /tmp/.taptrivia-keepawake-heartbeat"
echo "  adb shell cat /tmp/taptrivia-watchdog.log"
echo ""
echo "NOTE: The watchdog won't survive a device reboot."
echo "After rebooting, run this script again."
