#!/bin/bash
# TapTrivia Roku monitor — checks both bar Rokus, relaunches if dead
# Run via /loop every 15 minutes
# Logs to /tmp/roku-monitor.log

ROKUS=("192.168.40.16" "192.168.40.80")
LOGFILE="/tmp/roku-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

for ROKU in "${ROKUS[@]}"; do
  # Check active app
  ACTIVE=$(curl -s --connect-timeout 5 "http://$ROKU:8060/query/active-app" 2>&1)
  APP_ID=$(echo "$ACTIVE" | grep -o 'id="[^"]*"' | head -1 | sed 's/id="//;s/"//')

  if [ -z "$APP_ID" ]; then
    echo "$TIMESTAMP [$ROKU] UNREACHABLE — cannot connect" >> "$LOGFILE"
    echo "[$ROKU] unreachable"
    continue
  fi

  if [ "$APP_ID" = "dev" ]; then
    echo "$TIMESTAMP [$ROKU] OK — TapTrivia running" >> "$LOGFILE"
    echo "[$ROKU] OK"
    continue
  fi

  # App is not running — relaunch
  echo "$TIMESTAMP [$ROKU] DEAD (active=$APP_ID) — launching TapTrivia" >> "$LOGFILE"
  curl -s --connect-timeout 5 -X POST "http://$ROKU:8060/launch/dev" > /dev/null
  sleep 8

  NEW_ACTIVE=$(curl -s --connect-timeout 5 "http://$ROKU:8060/query/active-app" 2>&1)
  NEW_ID=$(echo "$NEW_ACTIVE" | grep -o 'id="[^"]*"' | head -1 | sed 's/id="//;s/"//')
  if [ "$NEW_ID" = "dev" ]; then
    echo "$TIMESTAMP [$ROKU] RELAUNCHED OK" >> "$LOGFILE"
    echo "[$ROKU] relaunched OK"
  else
    echo "$TIMESTAMP [$ROKU] RELAUNCH FAILED — still $NEW_ID" >> "$LOGFILE"
    echo "[$ROKU] relaunch FAILED (still $NEW_ID)"
  fi
done
