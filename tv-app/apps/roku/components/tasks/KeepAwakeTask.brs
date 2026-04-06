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
  port = CreateObject("roMessagePort")

  while true
    sleep(interval * 1000)

    ' Primary: ECP self-ping — sends a benign keypress via HTTP
    ecpPing(port)

    ' Backup: deprecated API (still works on some firmware)
    appMgr = CreateObject("roAppManager")
    if appMgr <> invalid
      appMgr.UpdateLastKeyPressTime()
    end if

    print ">>> keepAwake: ping sent"
  end while
end sub

sub ecpPing(port as Object)
  ' Send a Lit_ keypress via ECP — resets inactivity timer
  ' Lit_a sends a literal 'a' character — ignored by our display-only app
  ' (avoids null byte %00 which some firmware mishandles as navigation)
  url = CreateObject("roUrlTransfer")
  url.SetUrl("http://127.0.0.1:8060/keypress/Lit_a")
  url.SetPort(port)
  url.SetCertificatesFile("common:/certs/ca-bundle.crt")
  url.AsyncPostFromString("")

  ' Wait briefly for response (non-blocking, 2s timeout)
  msg = wait(2000, port)
  ' Response doesn't matter — the keypress was sent
end sub
