' KeepAwakeTask — prevents Roku screensaver via ECP self-ping.
'
' Two mechanisms:
' 1. Every 2 minutes: POST to ECP localhost to simulate a keypress,
'    which resets the Roku OS idle/screensaver timer.
' 2. Every 30 seconds: log video node state for debugging.

sub init()
  m.top.functionName = "taskLoop"
end sub

sub taskLoop()
  ecpInterval = 120  ' ECP ping every 2 minutes (in seconds)

  while true
    sleep(ecpInterval * 1000)
    sendEcpKeypress()
  end while
end sub

' Send an ECP keypress to localhost to reset the Roku OS screensaver timer.
' Uses "Info" key which is explicitly ignored by our onKeyEvent handler.
sub sendEcpKeypress()
  request = CreateObject("roUrlTransfer")
  request.SetCertificatesFile("common:/certs/ca-bundle.crt")
  port = CreateObject("roMessagePort")
  request.SetMessagePort(port)
  request.SetUrl("http://127.0.0.1:8060/keypress/Info")

  if request.AsyncPostFromString("") then
    msg = wait(5000, port)
    if msg <> invalid
      code = msg.GetResponseCode()
      print ">>> keepAwake ECP ping: response=" + Str(code).trim()
    else
      print ">>> keepAwake ECP ping: timeout (no response in 5s)"
    end if
  else
    print ">>> keepAwake ECP ping: failed to send"
  end if
end sub
