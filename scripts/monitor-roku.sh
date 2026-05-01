#!/bin/bash
# Roku health check + auto-relaunch
ROKU="192.168.40.16"
LOGFILE="/tmp/roku-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check active app
ACTIVE=$(curl -s --connect-timeout 5 "http://$ROKU:8060/query/active-app" 2>&1)
APP_ID=$(echo "$ACTIVE" | grep -o 'id="[^"]*"' | head -1 | sed 's/id="//;s/"//')

# Check for error-time-out
UI=$(curl -s --connect-timeout 5 "http://$ROKU:8060/query/app-ui" 2>&1)
HAS_TIMEOUT=$(echo "$UI" | grep -c "error-time-out")
HAS_SCENE=$(echo "$UI" | grep -c "TapTriviaScene")

if [ "$APP_ID" != "dev" ] || [ "$HAS_SCENE" -eq 0 ]; then
  # Not running — relaunch
  curl -s -X POST "http://$ROKU:8060/keypress/Home" > /dev/null
  sleep 3
  curl -s -X POST "http://$ROKU:8060/launch/dev" > /dev/null
  sleep 6
  NEW_ACTIVE=$(curl -s "http://$ROKU:8060/query/active-app" 2>&1)
  NEW_ID=$(echo "$NEW_ACTIVE" | grep -o 'id="[^"]*"' | head -1 | sed 's/id="//;s/"//')
  echo "$TIMESTAMP [RELAUNCHED] was app_id=$APP_ID → new_id=$NEW_ID" >> "$LOGFILE"
  echo "{\"status\":\"relaunched\",\"old_app_id\":\"$APP_ID\",\"new_app_id\":\"$NEW_ID\"}"
  exit 0
fi

if [ "$HAS_TIMEOUT" -gt 0 ]; then
  # Timed out — relaunch
  curl -s -X POST "http://$ROKU:8060/keypress/Home" > /dev/null
  sleep 3
  curl -s -X POST "http://$ROKU:8060/launch/dev" > /dev/null
  sleep 6
  NEW_UI=$(curl -s "http://$ROKU:8060/query/app-ui" 2>&1)
  NEW_TIMEOUT=$(echo "$NEW_UI" | grep -c "error-time-out")
  echo "$TIMESTAMP [RESTARTED] error-time-out detected, relaunched, still_frozen=$NEW_TIMEOUT" >> "$LOGFILE"
  echo "{\"status\":\"restarted\",\"still_frozen\":$NEW_TIMEOUT}"
  exit 0
fi

echo "$TIMESTAMP [OK] TapTriviaScene running, no timeouts" >> "$LOGFILE"
echo "{\"status\":\"ok\",\"app_id\":\"$APP_ID\"}"
