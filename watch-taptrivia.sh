#!/bin/bash
# TapTrivia Fire Stick watcher — checks every 5 min, logs crash cause, relaunches if dead
# Usage: ./watch-taptrivia.sh [device-serial]
# Stops the existing watcher if already running: kill $(cat /tmp/taptrivia-watcher.pid)

DEVICE="${1:-G4N1EL1741441A4M}"
CHECK_INTERVAL=300  # seconds

# Both package IDs (installed vs source build)
PACKAGES=("tv.taptrivia.firestick" "tv.taptrivia.mobile")

LOG_DIR="$(dirname "$0")/logs/watcher"
mkdir -p "$LOG_DIR"

WATCHER_LOG="$LOG_DIR/watcher.log"
echo $$ > /tmp/taptrivia-watcher.pid

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$WATCHER_LOG"; }
err() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$WATCHER_LOG" >&2; }

find_running_package() {
  for pkg in "${PACKAGES[@]}"; do
    pid=$(adb -s "$DEVICE" shell pidof "$pkg" 2>/dev/null | tr -d '[:space:]')
    if [[ -n "$pid" ]]; then
      echo "$pkg"
      return 0
    fi
  done
  return 1
}

find_installed_package() {
  for pkg in "${PACKAGES[@]}"; do
    result=$(adb -s "$DEVICE" shell pm list packages 2>/dev/null | grep "$pkg")
    if [[ -n "$result" ]]; then
      echo "$pkg"
      return 0
    fi
  done
  return 1
}

analyze_crash() {
  local logfile="$1"
  local cause="unknown"

  if grep -q "OutOfMemoryError\|Low on memory\|Killing.*memory" "$logfile" 2>/dev/null; then
    cause="OOM (out of memory)"
  elif grep -q "ANR in\|Application Not Responding" "$logfile" 2>/dev/null; then
    cause="ANR (app not responding)"
  elif grep -q "FATAL EXCEPTION" "$logfile" 2>/dev/null; then
    exc=$(grep -A2 "FATAL EXCEPTION" "$logfile" | grep "Exception\|Error" | head -1 | sed 's/.*: //')
    cause="FATAL EXCEPTION: ${exc:-see log}"
  elif grep -q "Process.*killed\|Killing.*adj" "$logfile" 2>/dev/null; then
    cause="killed by OS (low memory / process reclaim)"
  elif grep -q "Force finishing activity" "$logfile" 2>/dev/null; then
    cause="force-finished by system"
  fi

  echo "$cause"
}

launch_app() {
  local pkg="$1"
  local activity
  activity=$(adb -s "$DEVICE" shell cmd package resolve-activity --brief "$pkg" 2>/dev/null | tail -1)
  if [[ -z "$activity" || "$activity" == *"No activity"* ]]; then
    activity="${pkg}/.MainActivity"
  fi
  adb -s "$DEVICE" shell am start -n "$activity" \
    --activity-brought-to-front 2>&1
}

log "=== TapTrivia watcher started (device: $DEVICE, interval: ${CHECK_INTERVAL}s) ==="

# Check device is reachable
if ! adb -s "$DEVICE" shell echo ok &>/dev/null; then
  err "Device $DEVICE not reachable. Check ADB connection."
  exit 1
fi

INSTALLED_PKG=$(find_installed_package)
if [[ -z "$INSTALLED_PKG" ]]; then
  err "TapTrivia not installed on $DEVICE"
  exit 1
fi
log "Monitoring package: $INSTALLED_PKG"

consecutive_fails=0

while true; do
  sleep "$CHECK_INTERVAL"

  # Verify device still connected
  if ! adb -s "$DEVICE" shell echo ok &>/dev/null; then
    err "Device disconnected — skipping check"
    continue
  fi

  RUNNING_PKG=$(find_running_package)

  if [[ -n "$RUNNING_PKG" ]]; then
    consecutive_fails=0
    log "OK — $RUNNING_PKG is running (pid: $(adb -s "$DEVICE" shell pidof "$RUNNING_PKG" 2>/dev/null | tr -d '[:space:]'))"
    continue
  fi

  ((consecutive_fails++))
  TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
  CRASH_LOG="$LOG_DIR/crash_${TIMESTAMP}.log"

  log "DEAD — $INSTALLED_PKG not running (failure #$consecutive_fails) — collecting logs..."

  # Dump last 1000 lines of logcat to crash file
  adb -s "$DEVICE" shell logcat -d -t 1000 \
    --pid="$(adb -s "$DEVICE" shell pidof "$INSTALLED_PKG" 2>/dev/null)" \
    2>/dev/null > "$CRASH_LOG" || true

  # Fallback: grab all recent logs filtered by package
  if [[ ! -s "$CRASH_LOG" ]]; then
    adb -s "$DEVICE" shell logcat -d -t 500 2>/dev/null | \
      grep -E "$INSTALLED_PKG|FATAL|ANR|killed|LowMemory|OutOfMemory" \
      > "$CRASH_LOG" || true
  fi

  CAUSE=$(analyze_crash "$CRASH_LOG")
  log "Crash cause: $CAUSE"
  log "Log saved: $CRASH_LOG"

  # Check if it's a crash we can't self-fix (ANR or OOM warrant investigation)
  if [[ "$CAUSE" == *"ANR"* ]]; then
    log "ANR detected — will relaunch (check $CRASH_LOG for slow operations)"
  elif [[ "$CAUSE" == *"OOM"* ]]; then
    log "OOM detected — relaunching (consider reducing image cache or memory usage)"
  fi

  log "Relaunching $INSTALLED_PKG..."
  LAUNCH_OUT=$(launch_app "$INSTALLED_PKG")
  log "Launch result: $LAUNCH_OUT"

  # Wait a bit and verify it came up
  sleep 10
  if find_running_package &>/dev/null; then
    log "Relaunch successful"
    consecutive_fails=0
  else
    err "Relaunch FAILED — app still not running after 10s"
  fi
done
