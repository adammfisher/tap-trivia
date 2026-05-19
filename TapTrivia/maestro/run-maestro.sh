#!/bin/bash
# Starts Expo dev server (if not already running) and runs Maestro E2E flows
# against Expo Go in the iOS 18.3 simulator.
# Usage:
#   ./maestro/run-maestro.sh                  # run all flows
#   ./maestro/run-maestro.sh 03-nickname*     # run a specific flow

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
JAVA_HOME_PATH="/opt/homebrew/Cellar/openjdk/25.0.2/libexec/openjdk.jdk/Contents/Home"
MAESTRO="$HOME/.maestro/bin/maestro"
SIM_UDID="A7BD8C7F-A3AF-40DA-94EB-AA7E07D36ECF"  # iPhone 16 (iOS 26.5)

export JAVA_HOME="$JAVA_HOME_PATH"
export PATH="$JAVA_HOME/bin:$PATH"

# Boot simulator
echo "▶ Booting simulator..."
xcrun simctl boot "$SIM_UDID" 2>/dev/null || true
open -a Simulator 2>/dev/null || true

# Start Expo dev server only if not already running on port 8082
EXPO_PID=""
if curl -s "http://127.0.0.1:8082/" -H "Expo-Platform: ios" 2>/dev/null | grep -q "expoClient"; then
  echo "▶ Expo already running on port 8082 — skipping server start."
else
  echo "▶ Starting Expo dev server..."
  cd "$APP_DIR"
  npx expo start --localhost --port 8082 --non-interactive &
  EXPO_PID=$!

  cleanup() {
    echo "▶ Stopping Expo..."
    kill "$EXPO_PID" 2>/dev/null || true
  }
  trap cleanup EXIT

  # Wait for Expo dev server to be ready
  echo "▶ Waiting for Expo to be ready..."
  for i in $(seq 1 45); do
    if curl -s "http://127.0.0.1:8082/" -H "Expo-Platform: ios" 2>/dev/null | grep -q "expoClient"; then
      echo "  Expo ready!"
      break
    fi
    sleep 2
  done
fi

# Run flows
FLOW="${1:-$SCRIPT_DIR/*.yaml}"
echo "▶ Running Maestro flows: $FLOW"

if [ -n "$1" ]; then
  "$MAESTRO" --device "$SIM_UDID" test "$SCRIPT_DIR/$1"
else
  PASS=0
  FAIL=0
  for flow in "$SCRIPT_DIR"/0*.yaml; do
    echo ""
    echo "━━ Running: $(basename "$flow") ━━"
    if "$MAESTRO" --device "$SIM_UDID" test "$flow"; then
      PASS=$((PASS + 1))
    else
      FAIL=$((FAIL + 1))
    fi
  done
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Results: $PASS passed, $FAIL failed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  [ "$FAIL" -eq 0 ]
fi

echo ""
echo "✓ Maestro E2E complete."
