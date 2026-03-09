' CountdownBar — Persistent "Next Game In Xm XXs" overlay for between-game phases
' Positioned at top center, ticks every 1s, turns gold + pulses at ≤15s

sub init()
  m.barBg = m.top.findNode("barBg")
  m.preLabel = m.top.findNode("preLabel")
  m.valueLabel = m.top.findNode("valueLabel")
  m.nextGameEpoch = 0&

  ' 1-second tick timer
  m.tickTimer = CreateObject("roSGNode", "Timer")
  m.tickTimer.repeat = true
  m.tickTimer.duration = 1
  m.tickTimer.observeField("fire", "onTick")

  fixAllLabelFonts(m.top)
end sub

sub onEpochChanged(event as Object)
  m.nextGameEpoch = event.getData()
  updateDisplay()
  if m.nextGameEpoch > 0
    m.tickTimer.control = "start"
  else
    m.tickTimer.control = "stop"
  end if
end sub

sub onTick()
  updateDisplay()
end sub

sub updateDisplay()
  if m.nextGameEpoch <= 0
    m.valueLabel.text = ""
    return
  end if

  nowMs = getEpochMs()

  ' Ensure epoch is in the future; if stale, advance to next 15-min slot
  epoch = m.nextGameEpoch
  SLOT_MS = 15& * 60 * 1000
  while epoch <= nowMs
    epoch = epoch + SLOT_MS
  end while
  if epoch <> m.nextGameEpoch then m.nextGameEpoch = epoch

  secsLeft = Int((epoch - nowMs) / 1000)
  if secsLeft < 0 then secsLeft = 0

  m.valueLabel.text = " " + formatCountdown(secsLeft)

  ' Gold + bright when ≤ 15 seconds
  if secsLeft <= 15
    m.valueLabel.color = "#ffd200"
    m.preLabel.color = "#ffd200CC"
    m.barBg.color = "#3d1866"
    m.barBg.opacity = 0.8
  else
    m.valueLabel.color = "#ffd200"
    m.preLabel.color = "#ffffff80"
    m.barBg.color = "#0f0326"
    m.barBg.opacity = 0.6
  end if
end sub

function getEpochMs() as LongInteger
  dt = CreateObject("roDateTime")
  return dt.AsSeconds() * 1000&
end function

function formatCountdown(secsLeft as Integer) as String
  hours = Int(secsLeft / 3600)
  mins = Int((secsLeft mod 3600) / 60)
  secs = secsLeft mod 60
  if hours > 0
    return Str(hours).trim() + "h " + Str(mins).trim() + "m"
  end if
  if mins > 0
    return Str(mins).trim() + "m " + rightPad(Str(secs).trim(), 2, "0") + "s"
  end if
  return Str(secs).trim() + "s"
end function

function rightPad(s as String, width as Integer, pad as String) as String
  while Len(s) < width
    s = pad + s
  end while
  return s
end function
