' TimerRing — Countdown timer ring display using pre-rendered ring frame PNGs
' Shows seconds remaining with color-coded ring (green->gold->red)
' Uses pre-rendered images: timer-ring-{tier}-{seconds}.png

sub init()
  m.ringPoster = m.top.findNode("ringPoster")
  m.numLabel = m.top.findNode("numLabel")

  ' Cache values for cross-handler access
  m.totalSec = 35
end sub

sub onTotalChanged(event as Object)
  m.totalSec = event.getData()
end sub

sub onSecondsChanged(event as Object)
  sec = event.getData()
  total = m.totalSec
  if total = 0 then total = 35

  pct = 0.0
  if total > 0 then pct = sec * 1.0 / total

  ' Update number
  m.numLabel.text = Str(sec).trim()

  ' Color tier (matches web app: >60% green, >30% gold, else red)
  if pct > 0.6
    tier = "safe"
    numColor = "#ffffff"
  else if pct > 0.3
    tier = "warning"
    numColor = "#ffd200"
  else
    tier = "danger"
    numColor = "#ff4757"
  end if

  m.numLabel.color = numColor

  ' Select pre-rendered ring image
  ' Clamp seconds to 0-35 range for image lookup
  imgSec = sec
  if imgSec < 0 then imgSec = 0
  if imgSec > 35 then imgSec = 35
  m.ringPoster.uri = "pkg:/images/timer-ring-" + tier + "-" + Str(imgSec).trim() + ".png"
end sub

sub onSizeChanged(event as Object)
  size = event.getData()
  m.ringPoster.width = size
  m.ringPoster.height = size

  ' Center the number label within the ring
  m.numLabel.translation = [0, Int(size * 0.31)]
  m.numLabel.width = size
  numFont = CreateObject("roSGNode", "Font")
  numFont.uri = "pkg:/fonts/Fredoka-Bold.ttf"
  numFont.size = Int(size * 0.32)
  m.numLabel.font = numFont
end sub
