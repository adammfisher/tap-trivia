#!/bin/bash
# Starts Metro bundler then runs Detox E2E tests.
# Metro must be running so the debug build can load the JS bundle and
# respond to device.reloadReactNative() calls between tests.
#
# Usage:
#   ./run-detox.sh                          # all tests
#   ./run-detox.sh e2e/01-onboarding.test.ts  # one file
#   ./run-detox.sh --grep "WelcomeScreen"   # filter by name

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Boot simulator if not already running
SIM_UDID="A7BD8C7F-A3AF-40DA-94EB-AA7E07D36ECF"
echo "▶ Booting simulator..."
xcrun simctl boot "$SIM_UDID" 2>/dev/null || true
open -a Simulator 2>/dev/null || true

# Start Metro in background
echo "▶ Starting Metro bundler..."
cd "$SCRIPT_DIR"
npx expo start --local &
METRO_PID=$!

cleanup() {
  echo "▶ Stopping Metro..."
  kill "$METRO_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for Metro to be ready (max 60s)
echo "▶ Waiting for Metro to be ready..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:8081/status 2>/dev/null | grep -q "packager-status"; then
    echo "  Metro ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "  ERROR: Metro did not start in time"
    exit 1
  fi
  sleep 2
done

echo ""
echo "▶ Running Detox E2E tests..."
npx detox test --configuration ios.sim.debug "$@"

echo ""
echo "✓ Detox E2E complete."
