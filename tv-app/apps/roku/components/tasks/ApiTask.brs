' ApiTask — Network requests in background thread (required by Roku)
' All HTTP calls must happen in Task nodes, never on the render thread.

sub init()
  m.top.functionName = "doRequest"
end sub

sub doRequest()
  reqUrl = m.top.getField("requestUrl")
  method = m.top.getField("requestMethod")
  body = m.top.getField("requestBody")

  print ">>> ApiTask: " + method + " " + reqUrl
  if body <> "" then print ">>> ApiTask: body=" + body

  port = CreateObject("roMessagePort")
  url = CreateObject("roUrlTransfer")
  url.SetMessagePort(port)
  url.SetUrl(reqUrl)
  url.SetCertificatesFile("common:/certs/ca-bundle.crt")
  url.InitClientCertificates()
  url.AddHeader("Content-Type", "application/json")
  url.AddHeader("Accept", "application/json")

  started = false
  if method = "POST"
    ' AsyncPostFromString implies POST — do NOT call SetRequest
    started = url.AsyncPostFromString(body)
  else if method = "PUT"
    url.SetRequest("PUT")
    started = url.AsyncPostFromString(body)
  else
    started = url.AsyncGetToString()
  end if

  if not started
    print ">>> ApiTask: failed to start request"
    m.top.setField("response", { error: "NETWORK_ERROR", message: "Failed to start request" })
    return
  end if

  ' Wait up to 15 seconds for response
  msg = wait(15000, port)
  if msg = invalid
    print ">>> ApiTask: timeout"
    url.AsyncCancel()
    m.top.setField("response", { error: "TIMEOUT", message: "Request timed out" })
    return
  end if

  code = msg.GetResponseCode()
  responseStr = msg.GetString()

  print ">>> ApiTask: code=" + Str(code).trim() + " len=" + Str(Len(responseStr)).trim()
  if Len(responseStr) > 0 and Len(responseStr) < 500
    print ">>> ApiTask: body=" + responseStr
  end if

  if code < 0
    print ">>> ApiTask: transfer error " + Str(code).trim() + " " + msg.GetFailureReason()
    m.top.setField("response", { error: "NETWORK_ERROR", message: msg.GetFailureReason() })
    return
  end if

  if responseStr = invalid or responseStr = ""
    ' Some endpoints (e.g. /tv-heartbeat) intentionally return 200 with
    ' an empty body. For 2xx, surface that as a no-op success rather
    ' than a faux error so callers can distinguish empty-OK from real
    ' failures (which still come through as code >= 400).
    if code >= 200 and code < 300
      print ">>> ApiTask: empty body (HTTP " + Str(code).trim() + " — ok)"
      m.top.setField("response", { _statusCode: code, _empty: true })
      return
    end if
    print ">>> ApiTask: empty response"
    m.top.setField("response", { error: "EMPTY_RESPONSE", message: "Empty response (HTTP " + Str(code).trim() + ")" })
    return
  end if

  parsed = ParseJson(responseStr)
  if parsed = invalid
    print ">>> ApiTask: parse error, raw=" + Left(responseStr, 200)
    m.top.setField("response", { error: "PARSE_ERROR", message: "Invalid JSON" })
    return
  end if

  if code >= 400
    parsed._statusCode = code
    if parsed.error = invalid then parsed.error = "HTTP_ERROR"
  end if

  print ">>> ApiTask: success"
  m.top.setField("response", parsed)
end sub
