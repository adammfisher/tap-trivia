#!/bin/bash
# Fire TV Vega — health check + auto-relaunch
# Returns JSON: { "status": "ok|crashed|relaunched|error", "pid": N, "log_tail": "..." }

ADB="$HOME/Library/Android/sdk/platform-tools/adb"
DEVICE="GT533M06509615M0"
LOGFILE="/tmp/firestick-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

adb_shell() { $ADB -s "$DEVICE" shell "$1" 2>&1; }

# Check app state
VLCM=$(adb_shell "vlcm list" 2>&1)
APP_LINE=$(echo "$VLCM" | grep "tv.taptrivia.firestick.main")
STATE=$(echo "$APP_LINE" | awk '{print $5}')
PID=$(echo "$APP_LINE" | awk '{print $3}')
INST=$(echo "$APP_LINE" | awk '{print $4}')

# Get recent error logs (last 2 min)
RECENT_LOGS=$(adb_shell "loggingctl log -v tv.taptrivia.firestick -S '2 minutes ago'" 2>&1 \
  | grep -E "(ERROR|CRASH|crash|OOM|killed|exception|FATAL|AudioStreamPlayback.*stop|ended.*ENDED)" \
  | grep -v "KCP\|kcp\|chromium.*Color\|chromium.*shared_image\|chromium.*MediaTransform\|mediabuffer\|mediametrics" \
  | tail -10)

# Check for WebView reload (flash indicator)
WEBVIEW_RELOADS=$(adb_shell "loggingctl log -v tv.taptrivia.firestick -S '2 minutes ago'" 2>&1 \
  | grep -c "watchdog reload\|loadStart" 2>/dev/null || echo 0)

if [ -z "$STATE" ]; then
  STATUS="crashed"
  adb_shell "vmsgr send 'pkg://tv.taptrivia.firestick.main'" > /dev/null
  sleep 5
  NEW_LINE=$(adb_shell "vlcm list" 2>&1 | grep "tv.taptrivia.firestick.main")
  NEW_PID=$(echo "$NEW_LINE" | awk '{print $3}')
  echo "$TIMESTAMP [RELAUNCHED] was missing, relaunched PID=$NEW_PID" >> "$LOGFILE"
  echo "{\"status\":\"relaunched\",\"old_pid\":\"$PID\",\"new_pid\":\"$NEW_PID\",\"errors\":\"$RECENT_LOGS\"}"
  exit 0
fi

if [ "$STATE" != "VISIBLE" ]; then
  STATUS="crashed"
  adb_shell "vlcm terminate-app --pkg-id tv.taptrivia.firestick.main --force" > /dev/null
  sleep 2
  adb_shell "vmsgr send 'pkg://tv.taptrivia.firestick.main'" > /dev/null
  sleep 5
  NEW_LINE=$(adb_shell "vlcm list" 2>&1 | grep "tv.taptrivia.firestick.main")
  NEW_PID=$(echo "$NEW_LINE" | awk '{print $3}')
  echo "$TIMESTAMP [RELAUNCHED] state=$STATE pid=$PID → new pid=$NEW_PID" >> "$LOGFILE"
  echo "{\"status\":\"relaunched\",\"old_state\":\"$STATE\",\"old_pid\":\"$PID\",\"new_pid\":\"$NEW_PID\",\"errors\":\"$RECENT_LOGS\"}"
  exit 0
fi

echo "$TIMESTAMP [OK] pid=$PID state=$STATE webview_reloads=$WEBVIEW_RELOADS" >> "$LOGFILE"
echo "{\"status\":\"ok\",\"pid\":\"$PID\",\"state\":\"$STATE\",\"webview_reloads\":$WEBVIEW_RELOADS,\"recent_errors\":\"$RECENT_LOGS\"}"
