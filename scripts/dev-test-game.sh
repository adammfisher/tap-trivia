#!/bin/bash
# Start/stop/status a test game in the dev environment
# Usage: bash scripts/dev-test-game.sh [start|stop|status]

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/dev-env.sh"

node scripts/start-test-game.js "${1:-start}"
