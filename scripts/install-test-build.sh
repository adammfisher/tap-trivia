#!/bin/bash
# Download and install the latest EAS test build on simulators/emulators
# Usage: bash scripts/install-test-build.sh [ios|android|all]

set -e
PLATFORM="${1:-all}"

cd "$(dirname "$0")/../TapTrivia"

if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
  echo "Installing iOS test build on simulator..."
  npx eas-cli build:run --profile test --platform ios
fi

if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
  echo "Installing Android test build on emulator..."
  npx eas-cli build:run --profile test --platform android
fi
