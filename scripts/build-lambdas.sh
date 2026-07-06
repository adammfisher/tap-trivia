#!/bin/bash
# Build script: stages shared modules + dependencies into each Lambda
# function directory. Run before `terraform apply`.
#
# Detection:
#   - Python Lambda → contains lambda_function.py
#   - Node Lambda   → contains index.js
# Mixed dirs are an error.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
SHARED_DIR="$BACKEND_DIR/shared"
PY_SHARED_DIR="$SHARED_DIR/python"
FUNCTIONS_DIR="$BACKEND_DIR/functions"

echo "Building Lambda functions..."
echo "Project: $PROJECT_DIR"
echo ""

# Node deps (only relevant if any Node functions exist)
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "Installing backend node dependencies..."
  cd "$BACKEND_DIR" && npm install
fi

DASHBOARD_FUNCTIONS="get-dashboard save-signage save-settings upload-logo"

for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name=$(basename "$func_dir")

  has_py=0; has_js=0
  [ -f "$func_dir/lambda_function.py" ] && has_py=1
  [ -f "$func_dir/index.js" ] && has_js=1

  if [ "$has_py" = "1" ] && [ "$has_js" = "1" ]; then
    echo "ERROR: $func_name has both lambda_function.py and index.js"
    exit 1
  fi

  if [ "$has_py" = "1" ]; then
    echo "Building $func_name (python)..."
    rm -rf "$func_dir/shared"
    mkdir -p "$func_dir/shared"
    # Copy shared/python/* (note: we drop the leading 'python/' dir so
    # the Lambda imports as `from shared.dynamo import ...`).
    cp "$PY_SHARED_DIR/__init__.py" "$func_dir/shared/"
    cp "$PY_SHARED_DIR/dynamo.py" "$func_dir/shared/"
    cp "$PY_SHARED_DIR/tv_status.py" "$func_dir/shared/"
    continue
  fi

  if [ "$has_js" = "1" ]; then
    echo "Building $func_name (node)..."
    mkdir -p "$func_dir/shared"
    cp "$SHARED_DIR/dynamo.js" "$func_dir/shared/"
    cp "$SHARED_DIR/scoring.js" "$func_dir/shared/"
    cp "$SHARED_DIR/game-clock.js" "$func_dir/shared/"
    cp "$SHARED_DIR/questions.js" "$func_dir/shared/"
    cp "$SHARED_DIR/name-suffixes.js" "$func_dir/shared/"
    cp "$SHARED_DIR/config.js" "$func_dir/shared/"
    cp "$SHARED_DIR/profanity.js" "$func_dir/shared/"
    cp "$SHARED_DIR/house-players.js" "$func_dir/shared/"

    for df in $DASHBOARD_FUNCTIONS; do
      if [ "$func_name" = "$df" ]; then
        cp "$SHARED_DIR/auth.js" "$func_dir/shared/"
      fi
    done

    if [ ! -d "$func_dir/node_modules" ]; then
      cp -r "$BACKEND_DIR/node_modules" "$func_dir/"
    fi
    continue
  fi

  echo "Skipping $func_name (no recognized handler)"
done

echo ""
echo "Build complete. Run: cd terraform && terraform apply"
