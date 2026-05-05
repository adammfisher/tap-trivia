' KeepAwakeTask — memory monitor + heartbeat for the watchdog in TapTriviaScene.
'
' Memory: spec-compliant for Roku cert (Oct 2026):
'   GetChannelAvailableMemory() / GetChannelMemoryLimit() for periodic stats,
'   EnableLowGeneralMemoryEvent(true) for reactive low-memory handling.
'   On any low-memory event, RunGarbageCollector frees unreferenced bitmaps/buffers.
'
' Note: roAppManager.UpdateLastKeyPressTime() is no longer permitted (cert).
' Roku now requires real user activity or media playback to defer the
' inactivity timer; we don't fake it. Continuous polling + screen updates
' during business hours keep the device active naturally.
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
      #if DEBUG
        print ">>> keepAwake: LAST EXIT code=" + exitCode
      #end if
    else
      #if DEBUG
        print ">>> keepAwake: LAST EXIT: none (clean start)"
      #end if
    end if
  end if

  #if DEBUG
    print ">>> keepAwake: task started (memory monitor + heartbeat)"
  #end if

  port = CreateObject("roMessagePort")

  ' Reactive low-memory monitor — required for cert (Oct 2026).
  ' Roku OS 15.2+ exposes EnableLowGeneralMemoryEvent; older firmware only has
  ' the legacy EnableMemoryWarningEvent. Fall back at runtime so this works on
  ' both, while the new-API call stays visible to static analysis.
  memMon = CreateObject("roAppMemoryMonitor")
  if memMon <> invalid
    memMon.SetMessagePort(port)
    try
      memMon.EnableLowGeneralMemoryEvent(true)
    catch e
      memMon.EnableMemoryWarningEvent(true)
    end try
  end if

  tickCount = 0
  while true
    msg = wait(30000, port)

    if msg <> invalid
      ' Low-memory event arrived — free what we can immediately.
      RunGarbageCollector()
      #if DEBUG
        print ">>> memMon: low-memory event — ran GC"
      #end if
    else
      ' 30s timeout — heartbeat for TapTriviaScene watchdog
      tickCount = tickCount + 1
      m.top.pingCount = tickCount

      #if DEBUG
        print ">>> keepAwake: tick " + Str(tickCount).trim()
        ' Periodic memory stats (every 10 ticks ≈ 5 min)
        if tickCount mod 10 = 0 and memMon <> invalid
          available = memMon.GetChannelAvailableMemory()
          limit = memMon.GetChannelMemoryLimit()
          print ">>> memMon: " + Str(available).trim() + " KB available of " + Str(limit).trim() + " KB limit"
        end if
      #end if
    end if
  end while
end sub
