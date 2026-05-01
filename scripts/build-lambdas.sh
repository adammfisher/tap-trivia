#!/bin/bash
# Build script: copies shared modules + node_modules into each Lambda function directory
# Run this before terraform apply to ensure Lambda zips include all dependencies

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
SHARED_DIR="$BACKEND_DIR/shared"
FUNCTIONS_DIR="$BACKEND_DIR/functions"

echo "Building Lambda functions..."
echo "Project: $PROJECT_DIR"
echo "Shared: $SHARED_DIR"
echo ""

# Install dependencies in backend if needed
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "Installing backend dependencies..."
  cd "$BACKEND_DIR" && npm install
fi

# Dashboard functions that need auth.js
DASHBOARD_FUNCTIONS="get-dashboard save-signage upload-logo"

# For each Lambda function directory
for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name=$(basename "$func_dir")
  echo "Building $func_name..."

  # Create shared directory inside function
  mkdir -p "$func_dir/shared"

  # Copy shared modules (all functions get dynamo.js)
  cp "$SHARED_DIR/dynamo.js" "$func_dir/shared/"
  cp "$SHARED_DIR/scoring.js" "$func_dir/shared/"
  cp "$SHARED_DIR/game-clock.js" "$func_dir/shared/"
  cp "$SHARED_DIR/questions.js" "$func_dir/shared/"
  cp "$SHARED_DIR/name-suffixes.js" "$func_dir/shared/"
  cp "$SHARED_DIR/config.js" "$func_dir/shared/"

  # Copy auth.js to dashboard functions that need it
  for df in $DASHBOARD_FUNCTIONS; do
    if [ "$func_name" = "$df" ]; then
      cp "$SHARED_DIR/auth.js" "$func_dir/shared/"
      echo "  + auth.js"
    fi
  done

  # Copy node_modules (AWS SDK for DynamoDB)
  if [ ! -d "$func_dir/node_modules" ]; then
    cp -r "$BACKEND_DIR/node_modules" "$func_dir/"
  fi
done

echo ""
echo "Build complete! All Lambda functions now include shared modules and dependencies."
echo "You can now run: cd terraform && terraform apply"
