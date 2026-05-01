' KeepAwakeTask — prevents Roku OS inactivity auto-home timer.
'
' Strategy (all in-app, no external commands):
'   UpdateLastKeyPressTime every 30s — tells OS a key was pressed.
'   This is sufficient to prevent EXIT_IDLE_AUTO_EXIT on all firmware.
'
' Deliberately NO roAudioPlayer — audio pipeline init allocates significant
' heap on memory-constrained devices and can trigger EXIT_SYSTEM_KILL at boot.

sub init()
  m.top.functionName = "taskLoop"
end sub

sub taskLoop()
  appMgr = CreateObject("roAppManager")

  ' Log last exit on every startup — critical for diagnosing crashes.
  if appMgr <> invalid
    exitInfo = appMgr.GetLastExitInfo()
    if exitInfo <> invalid
      exitCode = exitInfo.exit_code
      if exitCode = invalid then exitCode = "unknown"
      print ">>> keepAwake: LAST EXIT code=" + exitCode
    else
      print ">>> keepAwake: LAST EXIT: none (clean start)"
    end if
  end if

  print ">>> keepAwake: task started (UpdateLastKeyPressTime only)"

  ' ── Heartbeat loop (every 30s) ───────────────────────────────
  port = CreateObject("roMessagePort")
  tickCount = 0
  while true
    wait(30000, port)

    tickCount = tickCount + 1
    m.top.pingCount = tickCount  ' Watchdog in TapTriviaScene reads this

    ' UpdateLastKeyPressTime — prevents EXIT_IDLE_AUTO_EXIT on all firmware
    if appMgr <> invalid then appMgr.UpdateLastKeyPressTime()

    print ">>> keepAwake: tick " + Str(tickCount).trim()

    ' Memory monitor every 10 ticks (~5 minutes)
    if tickCount mod 10 = 0
      memMon = CreateObject("roAppMemoryMonitor")
      if memMon <> invalid
        pct = memMon.GetMemoryLimitPercent()
        print ">>> memMonitor: " + Str(pct).trim() + "% of memory limit used"
        if pct >= 80
          print ">>> memMonitor: WARNING — high memory, GC pressure likely"
        end if
      end if
    end if
  end while
end sub
