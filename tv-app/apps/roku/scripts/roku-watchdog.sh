#!/bin/bash
# roku-watchdog.sh — Keep TapTrivia running 24/7 on Roku.
#
# Two jobs:
# 1. Every 30s: check if app is running, relaunch if not
# 2. Every 90min: send an ECP keypress to reset the Roku OS
#    Bandwidth Saver 4-hour idle timer (can't be done from within the app)
#
# Usage:
#   ./roku-watchdog.sh                          # default Roku IP
#   ROKU_IP=192.168.1.100 ./roku-watchdog.sh    # custom IP
#
# Run in background:
#   nohup ./roku-watchdog.sh > /tmp/roku-watchdog.log 2>&1 &

ROKU_IP="${ROKU_IP:-192.168.40.16}"
CHECK_INTERVAL=30       # seconds between app-alive checks
KEEPALIVE_INTERVAL=5400 # seconds between ECP keypresses (90 min)
CHANNEL_ID="dev"

echo "$(date): Roku watchdog started — monitoring $ROKU_IP"
echo "  App check every ${CHECK_INTERVAL}s, ECP keepalive every ${KEEPALIVE_INTERVAL}s"

LAST_KEEPALIVE=0

while true; do
  NOW=$(date +%s)

  # ── Check if app is running ──
  ACTIVE=$(curl -s --max-time 5 "http://${ROKU_IP}:8060/query/active-app" 2>/dev/null)

  if [ -z "$ACTIVE" ]; then
    echo "$(date): Roku unreachable at $ROKU_IP"
  elif echo "$ACTIVE" | grep -q "id=\"${CHANNEL_ID}\""; then
    : # App is running
  else
    echo "$(date): TapTrivia not active, relaunching..."
    curl -s -d '' "http://${ROKU_IP}:8060/launch/${CHANNEL_ID}" 2>/dev/null
    sleep 5
  fi

  # ── Periodic ECP keypress to reset Bandwidth Saver timer ──
  ELAPSED=$((NOW - LAST_KEEPALIVE))
  if [ "$ELAPSED" -ge "$KEEPALIVE_INTERVAL" ]; then
    # Send Right then Left to cancel out any navigation, with a short gap
    curl -s -d '' "http://${ROKU_IP}:8060/keypress/Right" 2>/dev/null
    sleep 1
    curl -s -d '' "http://${ROKU_IP}:8060/keypress/Left" 2>/dev/null
    LAST_KEEPALIVE=$NOW
    echo "$(date): ECP keepalive sent (Right+Left)"
  fi

  sleep "$CHECK_INTERVAL"
done
