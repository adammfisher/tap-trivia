' ProgressBar — Simple horizontal progress indicator

sub init()
  m.track = m.top.findNode("track")
  m.fill = m.top.findNode("fill")

  ' Cache values for cross-handler access
  m.currentVal = 0
  m.totalVal = 15
  m.barW = 520
end sub

sub onValueChanged(event as Object)
  field = event.getField()
  if field = "currentValue"
    m.currentVal = event.getData()
  else if field = "totalValue"
    m.totalVal = event.getData()
  end if
  updateBar()
end sub

sub onSizeChanged(event as Object)
  m.barW = event.getData()
  m.track.width = m.barW
  updateBar()
end sub

sub updateBar()
  total = m.totalVal
  if total <= 0 then total = 1
  pct = m.currentVal * 1.0 / total
  m.fill.width = Int(m.barW * pct)
end sub
