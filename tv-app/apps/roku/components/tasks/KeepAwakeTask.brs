' KeepAwakeTask — prevents Roku OS inactivity auto-home timer.
'
' Sends an ECP keypress to localhost every 2 minutes, which resets the OS
' inactivity timer. This is the most reliable method — it simulates real
' user input that the OS cannot ignore.
'
' Also calls UpdateLastKeyPressTime() as a belt-and-suspenders backup.

sub init()
  m.top.functionName = "taskLoop"
end sub

sub taskLoop()
  interval = 120  ' Every 2 minutes (in seconds)

  while true
    sleep(interval * 1000)

    ' Primary: ECP self-ping — sends a benign keypress via HTTP
    ecpPing()

    ' Backup: deprecated API (still works on some firmware)
    appMgr = CreateObject("roAppManager")
    if appMgr <> invalid
      appMgr.UpdateLastKeyPressTime()
    end if

    print ">>> keepAwake: ping sent"
  end while
end sub

sub ecpPing()
  ' Send a Lit_a keypress via ECP — resets the OS inactivity timer.
  ' Uses a fresh port per call so stale messages from timed-out responses
  ' can never accumulate and corrupt subsequent wait() calls.
  port = CreateObject("roMessagePort")
  url = CreateObject("roUrlTransfer")
  url.SetUrl("http://127.0.0.1:8060/keypress/Lit_a")
  url.SetPort(port)
  url.SetCertificatesFile("common:/certs/ca-bundle.crt")
  url.AsyncPostFromString("")

  msg = wait(2000, port)
  if msg = invalid
    ' Timeout — cancel the pending request so it doesn't linger
    url.AsyncCancel()
    print ">>> keepAwake: ECP ping timeout (non-fatal)"
  end if
  ' port and url go out of scope here — all resources released cleanly
end sub
