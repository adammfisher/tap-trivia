' KeepAwakeTask — memory monitor + heartbeat + inactivity-timer keepalive.
'
' Memory: spec-compliant for Roku cert (Oct 2026):
'   GetChannelAvailableMemory() / GetChannelMemoryLimit() for periodic stats,
'   EnableLowGeneralMemoryEvent(true) for reactive low-memory handling.
'   On any low-memory event, RunGarbageCollector frees unreferenced bitmaps/buffers.
'
' Inactivity: roAppManager.UpdateLastKeyPressTime() called every 30s. This is
' the Roku-documented method to defer the OS inactivity auto-home (~2h timer
' added in OS 9.4). The ECP loopback approach was tried previously but Roku
' OS 12.0+ blocks 127.0.0.1:8060 from inside the channel (HTTP 403), so the
' self-ping never actually registers as a keypress on modern firmware.
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
    catch err
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
      ' 30s timeout — heartbeat for TapTriviaScene watchdog + keepalive
      tickCount = tickCount + 1
      m.top.pingCount = tickCount

      ' Defer Roku OS inactivity auto-home (the 2h-idle timer added in OS 9.4).
      ' This is the Roku-documented method per roAppManager docs.
      if appMgr <> invalid then appMgr.UpdateLastKeyPressTime()

      #if DEBUG
        print ">>> keepAwake: tick " + Str(tickCount).trim()
        ' Periodic memory stats (every 10 ticks ≈ 5 min). API return types vary
        ' across firmware (Integer on some, roAssociativeArray on others) — only
        ' print when both are Integers to avoid Type Mismatch crashing the task.
        if tickCount mod 10 = 0 and memMon <> invalid
          available = memMon.GetChannelAvailableMemory()
          limit = memMon.GetChannelMemoryLimit()
          if type(available) = "Integer" and type(limit) = "Integer"
            print ">>> memMon: " + Str(available).trim() + " KB available of " + Str(limit).trim() + " KB limit"
          end if
        end if
      #end if
    end if
  end while
end sub
