#!/bin/bash
# Runs Maestro E2E flows against Expo Go on a connected Android emulator/device.
# Android Expo Go uses package name host.exp.exponent (lowercase), so all YAML
# files are copied to a temp dir with the appId substituted before running.
# Usage:
#   ./maestro/run-maestro-android.sh                  # run all flows
#   ./maestro/run-maestro-android.sh 03-nickname*     # run a specific flow

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
JAVA_HOME_PATH="/opt/homebrew/Cellar/openjdk/25.0.2/libexec/openjdk.jdk/Contents/Home"
MAESTRO="$HOME/.maestro/bin/maestro"
ANDROID_SERIAL="emulator-5554"

export JAVA_HOME="$JAVA_HOME_PATH"
export PATH="$JAVA_HOME/bin:$PATH"

# ADB reverse: map 127.0.0.1:8082 on the emulator to the host's Expo dev server
echo "▶ Setting up ADB reverse port forwarding..."
adb -s "$ANDROID_SERIAL" reverse tcp:8082 tcp:8082

# Start Expo dev server only if not already running
EXPO_PID=""
if curl -s "http://127.0.0.1:8082/" -H "Expo-Platform: android" 2>/dev/null | grep -q "expoClient"; then
  echo "▶ Expo already running on port 8082 — skipping server start."
else
  echo "▶ Starting Expo dev server..."
  cd "$APP_DIR"
  npx expo start --localhost --port 8082 --non-interactive &
  EXPO_PID=$!

  echo "▶ Waiting for Expo to be ready..."
  for i in $(seq 1 45); do
    if curl -s "http://127.0.0.1:8082/" -H "Expo-Platform: android" 2>/dev/null | grep -q "expoClient"; then
      echo "  Expo ready!"
      break
    fi
    sleep 2
  done
fi

# Create temp dir and copy all YAML files with Android appId substituted
TMPDIR_FLOWS="$(mktemp -d)"
cleanup() {
  rm -rf "$TMPDIR_FLOWS"
  [ -n "$EXPO_PID" ] && kill "$EXPO_PID" 2>/dev/null || true
}
trap cleanup EXIT

for f in "$SCRIPT_DIR"/*.yaml; do
  sed 's/appId: host\.exp\.Exponent/appId: host.exp.exponent/g' "$f" > "$TMPDIR_FLOWS/$(basename "$f")"
done

# Run flows
echo "▶ Running Maestro flows on Android ($ANDROID_SERIAL)..."

if [ -n "$1" ]; then
  "$MAESTRO" --device "$ANDROID_SERIAL" test "$TMPDIR_FLOWS/$1"
else
  PASS=0
  FAIL=0
  for flow in "$TMPDIR_FLOWS"/0*.yaml; do
    echo ""
    echo "━━ Running: $(basename "$flow") ━━"
    if "$MAESTRO" --device "$ANDROID_SERIAL" test "$flow"; then
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
echo "✓ Maestro Android E2E complete."
