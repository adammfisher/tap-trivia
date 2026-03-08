#!/bin/bash
# Stream TapTrivia Fire TV logs to a file
# Usage: bash scripts/tail-logs.sh
# Then:  tail -f /tmp/taptrivia-firestick.log

DEVICE="${1:-GT533M06509615M0}"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
LOG_FILE="/tmp/taptrivia-firestick.log"

echo "Streaming logs to $LOG_FILE ..."
echo "Use: tail -f $LOG_FILE"
echo "Or:  grep KEEPALIVE $LOG_FILE"
echo ""

# Rotate if over 10MB
if [ -f "$LOG_FILE" ] && [ "$(stat -f%z "$LOG_FILE" 2>/dev/null || echo 0)" -gt 10485760 ]; then
  mv "$LOG_FILE" "${LOG_FILE}.old"
fi

echo "=== Log stream started $(date) ===" >> "$LOG_FILE"

# Auto-reconnect loop — ADB shell can drop
while true; do
  "$ADB" -s "$DEVICE" shell "loggingctl log -v tv.taptrivia.firestick -f" >> "$LOG_FILE" 2>&1
  echo "=== Stream disconnected $(date), reconnecting in 3s ===" >> "$LOG_FILE"
  sleep 3
done
