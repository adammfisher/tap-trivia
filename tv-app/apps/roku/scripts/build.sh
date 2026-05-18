#!/bin/bash
# TapTrivia Roku App — Build & Deploy Script
# Usage: bash scripts/build.sh [ROKU_IP] [ROKU_PASSWORD]
#
# Packages the app into a ZIP and deploys to a Roku device.
# If no arguments provided, just builds the ZIP.

set -e
cd "$(dirname "$0")/.."

ROKU_IP="${1:-}"
ROKU_PWD="${2:-rokudev}"
ZIP_NAME="TapTrivia.zip"

echo "═══════════════════════════════════════"
echo "  TapTrivia Roku App — Build"
echo "═══════════════════════════════════════"

# Validate project structure
if [ ! -f "manifest" ]; then
  echo "ERROR: manifest not found. Run from the roku/ directory."
  exit 1
fi

# Check for required assets
MISSING=""
if [ ! -f "images/splash-screen-fhd.png" ]; then MISSING="$MISSING images/splash-screen-fhd.png"; fi
if [ ! -f "images/qr-play-120.png" ]; then MISSING="$MISSING images/qr-play-120.png"; fi
if [ ! -f "images/bg-gradient.png" ]; then MISSING="$MISSING images/bg-gradient.png"; fi

if [ -n "$MISSING" ]; then
  echo ""
  echo "⚠️  Missing assets:$MISSING"
  echo ""
  echo "Run: cd scripts && npm install && npm run generate"
  echo ""
  echo "Building anyway (app will start but may show missing images)..."
  echo ""
fi

# Clean previous build
rm -f "$ZIP_NAME"

# Create ZIP (manifest must be at root level)
echo "📦 Packaging..."
zip -r "$ZIP_NAME" \
  manifest \
  source/ \
  components/ \
  images/ \
  fonts/ \
  -x "*.DS_Store" \
  -x "*/.DS_Store" \
  -x "*/.git/*" \
  -x "*/.gitignore" \
  -x "*/node_modules/*" \
  -x "scripts/*" \
  -x "*.md" \
  -x "*.sh" \
  -x "*.zip" \
  -x "*.psd" \
  -x "*~" \
  -x "*.bak"

SIZE=$(du -h "$ZIP_NAME" | cut -f1)
echo "   → $ZIP_NAME ($SIZE)"

# Deploy to Roku device if IP provided
if [ -n "$ROKU_IP" ]; then
  echo ""
  echo "🚀 Deploying to Roku at $ROKU_IP..."

  # Delete existing sideloaded channel
  curl -s -o /dev/null \
    --user "rokudev:$ROKU_PWD" \
    --digest \
    -F "mysubmit=Delete" \
    -F "archive=" \
    "http://$ROKU_IP/plugin_install" 2>/dev/null || true

  # Upload new package
  RESULT=$(curl -s \
    --user "rokudev:$ROKU_PWD" \
    --digest \
    -F "mysubmit=Install" \
    -F "archive=@$ZIP_NAME" \
    "http://$ROKU_IP/plugin_install")

  if echo "$RESULT" | grep -q "Install Success"; then
    echo "   ✅ Deploy successful!"
  elif echo "$RESULT" | grep -q "Identical"; then
    echo "   ✅ Already up to date"
  else
    echo "   ❌ Deploy may have failed. Check http://$ROKU_IP"
    echo "   Response: $(echo "$RESULT" | grep -o 'Roku.Message = "[^"]*"' | head -1)"
  fi
else
  echo ""
  echo "💡 To deploy: bash scripts/build.sh ROKU_IP [PASSWORD]"
  echo "   Example:   bash scripts/build.sh 192.168.1.100 rokudev"
fi

echo ""
echo "Done!"
