#!/usr/bin/env bash
# Build the analytics-py Lambda layer.
#
# Contents (pip-installed for the Lambda runtime):
#   PyJWT       — App Store ES256 + Google service-account RS256 JWT signing
#   cryptography — required by both
#   google-auth  — service-account OAuth2 flow for Google Play / BigQuery
set -euo pipefail

LAYER_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$LAYER_DIR/build"
PY_DIR="$BUILD_DIR/python"
ZIP_OUT="$LAYER_DIR/layer.zip"
PYTHON_VERSION="3.12"
PLATFORM="manylinux2014_x86_64"

rm -rf "$BUILD_DIR" "$ZIP_OUT"
mkdir -p "$PY_DIR"

pip3 install \
  --platform "$PLATFORM" \
  --target "$PY_DIR" \
  --implementation cp \
  --python-version "$PYTHON_VERSION" \
  --only-binary=:all: \
  --upgrade \
  "PyJWT>=2.8" "cryptography>=42" "google-auth>=2.23" "requests>=2.31"

find "$PY_DIR" -type d -name '__pycache__' -prune -exec rm -rf {} +
find "$PY_DIR" -type d -name 'tests' -prune -exec rm -rf {} +
find "$BUILD_DIR" -exec touch -t 197001010000.00 {} +

( cd "$BUILD_DIR" && zip -qrX "$ZIP_OUT" python )

echo "Built layer: $ZIP_OUT"
ls -lh "$ZIP_OUT"
