#!/usr/bin/env bash
# Build the geoip-py Lambda layer.
#
# Source layout:
#   src/geoip_resolver/        — resolve_ip helper + zip_to_dma.json (committed)
#   build/                     — generated; copy of src + pip-installed deps
#   layer.zip                  — generated; what Terraform uploads
#
# pip --platform/--python-version flags ensure we ship a Linux wheel,
# not whatever the host machine happens to have. Run this before
# `terraform apply` whenever the resolver code or maxminddb pin changes.
set -euo pipefail

LAYER_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$LAYER_DIR/src"
BUILD_DIR="$LAYER_DIR/build"
PY_DIR="$BUILD_DIR/python"
ZIP_OUT="$LAYER_DIR/layer.zip"
PYTHON_VERSION="3.12"
PLATFORM="manylinux2014_x86_64"

rm -rf "$BUILD_DIR" "$ZIP_OUT"
mkdir -p "$PY_DIR"

# Copy committed source into the build tree.
cp -r "$SRC_DIR"/. "$PY_DIR"/

# Install maxminddb against the Lambda runtime's platform.
pip3 install \
  --platform "$PLATFORM" \
  --target "$PY_DIR" \
  --implementation cp \
  --python-version "$PYTHON_VERSION" \
  --only-binary=:all: \
  --upgrade \
  maxminddb

# Strip caches and tests to keep the layer small.
find "$PY_DIR" -type d -name '__pycache__' -prune -exec rm -rf {} +
find "$PY_DIR" -type d -name 'tests' -prune -exec rm -rf {} +

# Determinism: pin all mtimes and strip OS-specific extra fields so the
# resulting zip hashes the same across rebuilds.
find "$BUILD_DIR" -exec touch -t 197001010000.00 {} +
( cd "$BUILD_DIR" && zip -qrX "$ZIP_OUT" python )

echo "Built layer: $ZIP_OUT"
ls -lh "$ZIP_OUT"
