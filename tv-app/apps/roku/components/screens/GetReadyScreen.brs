' GetReadyScreen — Game starting countdown (3, 2, 1)
' Matches app.js renderGetReady() behavior

sub init()
  ' ── Node refs ──
  m.barNameLabel = m.top.findNode("barNameLabel")
  m.countdownNum = m.top.findNode("countdownNum")
  m.infoLine = m.top.findNode("infoLine")
  m.pulseAnim = m.top.findNode("pulseAnim")
  m.lastCountdown = -1

  ' ── Widget refs ──
  m.logo = m.top.findNode("logo")
  m.logo.setField("logoSize", "getready")
  m.qrBadge = m.top.findNode("qrBadge")

  fixAllLabelFonts(m.top)
end sub

sub onGameStateChanged(event as Object)
  state = event.getData()
  if state = invalid then return

  ' Update bar name from interface field
  bName = m.top.getField("barName")
  if bName <> invalid and bName <> ""
    m.barNameLabel.text = bName
  end if

  ' Update bar code on QR badge
  bCode = m.top.getField("barCode")
  if bCode <> invalid and bCode <> ""
    m.qrBadge.setField("barCode", bCode)
  end if

  ' Update countdown number
  countdown = 3
  if state.countdown <> invalid
    if type(state.countdown) = "Integer" or type(state.countdown) = "roInteger" or type(state.countdown) = "roInt"
      countdown = state.countdown
    else if type(state.countdown) = "Float" or type(state.countdown) = "roFloat" or type(state.countdown) = "Double" or type(state.countdown) = "roDouble"
      countdown = Int(state.countdown)
    end if
  end if

  m.countdownNum.text = Str(countdown).trim()

  ' Trigger pulse animation when countdown changes
  if countdown <> m.lastCountdown
    m.lastCountdown = countdown
    m.pulseAnim.control = "start"
  end if

  ' Update info line with total questions
  totalQ = 15
  if state.totalQuestions <> invalid
    totalQ = state.totalQuestions
  end if
  m.infoLine.text = Str(totalQ).trim() + " questions " + chr(8211) + " Answer fast for more points"
end sub
