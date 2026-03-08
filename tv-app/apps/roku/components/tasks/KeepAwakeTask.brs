' KeepAwakeTask — prevents Roku OS inactivity auto-home timer.
'
' Uses roAppManager.UpdateLastKeyPressTime() every 2 minutes to reset
' the OS inactivity timer that would otherwise exit the app after ~4 hours.
' This API is deprecated but still works on sideloaded dev channels.

sub init()
  m.top.functionName = "taskLoop"
end sub

sub taskLoop()
  interval = 120  ' Every 2 minutes (in seconds)

  while true
    sleep(interval * 1000)
    resetIdleTimer()
  end while
end sub

sub resetIdleTimer()
  ' Try UpdateLastKeyPressTime first (resets the OS inactivity timer)
  appMgr = CreateObject("roAppManager")
  if appMgr <> invalid
    appMgr.UpdateLastKeyPressTime()
    print ">>> keepAwake: UpdateLastKeyPressTime OK"
  else
    print ">>> keepAwake: roAppManager unavailable"
  end if
end sub
