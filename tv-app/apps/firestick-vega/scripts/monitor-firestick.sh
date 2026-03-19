#!/bin/bash
# Monitor Fire TV Stick and relaunch TapTrivia if it's not running.
# Runs from Mac, checks via ADB every 5 minutes.
#
# Strategy:
# 1. Check vlcm FIRST (before any input events) — retry up to 5x on empty.
# 2. If VISIBLE: send mouse_move to reset the 20-min idle timer, then exit.
# 3. If NOT_VISIBLE (backgrounded, e.g. profile picker in front): send vmsgr
#    to push app to foreground without killing a healthy instance first.
# 4. If ABSENT (not in vlcm at all after 5 retries): wake device + relaunch.
#
# WHY multiple retries for vlcm:
# vlcm list can return empty transiently (ADB first-connect, brief lifecycle
# transitions). A single false-empty caused the monitor to call vmsgr send
# which KILLS the running app. 5 retries with 2s gaps means we wait up to
# 10s before declaring the app truly gone.
#
# WHY mouse_move instead of KEY_WAKEUP for idle reset:
# KEY_WAKEUP = power button. Sent to an already-awake device, it triggers
# a screensaver/sleep cycle that kills the foreground app within ~2 minutes.
# mouse_move = benign input event that resets idle-manager timer without
# any sleep/wake lifecycle transitions.
#
# Usage: ./scripts/monitor-firestick.sh
# launchd: ~/Library/LaunchAgents/tv.taptrivia.firestick.monitor.plist (StartInterval=120)

export PATH="/Users/adamfisher/Library/Android/sdk/platform-tools:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
DEVICE="GT533M06509615M0"
PKG="tv.taptrivia.firestick.main"

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }

# Check device reachable
if ! adb -s "$DEVICE" get-state >/dev/null 2>&1; then
  echo "[$(timestamp)] Device $DEVICE not reachable via ADB"
  exit 1
fi

# CHECK FIRST: vlcm status before any input event.
# Retry up to 5 times with 2s gap — vlcm can return empty transiently.
# A false empty caused by transient ADB state would make us kill a healthy app.
get_vlcm_status() {
  for attempt in 1 2 3 4 5; do
    STATUS=$(adb -s "$DEVICE" shell "vlcm list" 2>/dev/null | grep "$PKG")
    if [ -n "$STATUS" ]; then
      echo "$STATUS"
      return 0
    fi
    [ $attempt -lt 5 ] && sleep 2
  done
  echo ""
  return 1
}

STATUS=$(get_vlcm_status)

if echo "$STATUS" | grep -q "VISIBLE"; then
  # App is healthy — send touch event to reset the 20-min idle timer.
  # touch (finger tap) is registered by idle-manager as user input and resets
  # the screensaver timer. mouse_move does NOT appear to reset the timer.
  # KEY_WAKEUP (power button) sent to an already-awake device triggers a
  # screensaver cycle — must not be sent when app is VISIBLE.
  adb -s "$DEVICE" shell "inputd-cli touch 960 540" >/dev/null 2>&1
  echo "[$(timestamp)] OK — app is VISIBLE (idle timer reset via touch)"
  MEM=$(adb -s "$DEVICE" shell "free" 2>/dev/null | grep Mem | awk '{print "used=" $3 " free=" $4 " avail=" $7}')
  LOAD=$(adb -s "$DEVICE" shell "uptime" 2>/dev/null | grep -o 'load average:.*')
  echo "[$(timestamp)] $MEM | $LOAD"
  exit 0
fi

# App exists in vlcm but not VISIBLE (e.g. NOT_VISIBLE/READY — profile picker in front)
if [ -n "$STATUS" ]; then
  echo "[$(timestamp)] APP NOT_VISIBLE — pushing to foreground (profile picker?)"
  echo "[$(timestamp)] Current status: $STATUS"
  # vmsgr send will bring our app to foreground.
  # Note: this kills the existing instance and starts fresh. That's acceptable
  # since the app is already NOT rendering (not VISIBLE).
  adb -s "$DEVICE" shell "vmsgr send \"pkg://$PKG\"" 2>/dev/null
  sleep 6
  # Verify it came up VISIBLE
  NEWSTATUS=$(get_vlcm_status)
  if echo "$NEWSTATUS" | grep -q "VISIBLE"; then
    adb -s "$DEVICE" shell "inputd-cli touch 960 540" >/dev/null 2>&1
    echo "[$(timestamp)] FOREGROUND SUCCESS — app is now VISIBLE (idle timer reset)"
  else
    echo "[$(timestamp)] Still not VISIBLE after push: $NEWSTATUS"
  fi
  exit 0
fi

# App is completely absent from vlcm (TERMINATED) — full relaunch
echo "[$(timestamp)] APP DOWN — relaunching..."
echo "[$(timestamp)] Last vlcm status: $STATUS"

MEM=$(adb -s "$DEVICE" shell "free" 2>/dev/null | grep Mem | awk '{print "used=" $3 " free=" $4 " avail=" $7}')
LOAD=$(adb -s "$DEVICE" shell "uptime" 2>/dev/null | grep -o 'load average:.*')
echo "[$(timestamp)] Pre-relaunch: $MEM | $LOAD"

# Wake device (KEY_WAKEUP is correct here — device may be sleeping), then launch app.
adb -s "$DEVICE" shell "inputd-cli button_press KEY_WAKEUP" >/dev/null 2>&1
sleep 3
adb -s "$DEVICE" shell "vmsgr send \"pkg://$PKG\"" 2>/dev/null
sleep 6

# If profile picker is blocking (app is NOT_VISIBLE), push again
CHECKSTATUS=$(get_vlcm_status)
if ! echo "$CHECKSTATUS" | grep -q "VISIBLE"; then
  echo "[$(timestamp)] Not VISIBLE yet (profile picker?), sending vmsgr again..."
  adb -s "$DEVICE" shell "vmsgr send \"pkg://$PKG\"" 2>/dev/null
  sleep 6
fi

# Verify it came up
NEWSTATUS=$(get_vlcm_status)
if echo "$NEWSTATUS" | grep -q "VISIBLE"; then
  adb -s "$DEVICE" shell "inputd-cli touch 960 540" >/dev/null 2>&1
  echo "[$(timestamp)] RELAUNCH SUCCESS — app is VISIBLE (idle timer reset)"
else
  echo "[$(timestamp)] RELAUNCH FAILED — status: $NEWSTATUS"
fi
