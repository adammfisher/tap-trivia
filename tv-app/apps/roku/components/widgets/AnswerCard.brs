' AnswerCard — Single answer option card (Poster-based)
' States: default, correct, dimmed, eliminated

sub init()
  m.cardBg = m.top.findNode("cardBg")
  m.pctBar = m.top.findNode("pctBar")
  m.letterBadge = m.top.findNode("letterBadge")
  m.answerLabel = m.top.findNode("answerLabel")
  m.pctLabel = m.top.findNode("pctLabel")
  m.correctIcon = m.top.findNode("correctIcon")

  ' Badge URIs per letter index
  m.badgeUris = [
    "pkg:/images/badge-a.png",
    "pkg:/images/badge-b.png",
    "pkg:/images/badge-c.png",
    "pkg:/images/badge-d.png"
  ]

  ' Cache custom field values for cross-handler access
  m.letterIdx = 0
  m.state = "default"
end sub

sub onDataChanged(event as Object)
  field = event.getField()
  if field = "letterIndex"
    m.letterIdx = event.getData()
  else if field = "answerText"
    m.answerLabel.text = event.getData()
  end if

  ' Update letter badge PNG
  idx = m.letterIdx
  if idx >= 0 and idx <= 3
    m.letterBadge.uri = m.badgeUris[idx]
  end if
end sub

sub onStateChanged(event as Object)
  m.state = event.getData()
  state = m.state

  if state = "correct"
    m.cardBg.uri = "pkg:/images/answer-card-correct.png"
    m.letterBadge.uri = "pkg:/images/badge-check.png"
    m.answerLabel.color = "#ffffff"
    m.top.opacity = 1.0
    m.correctIcon.visible = true
  else if state = "dimmed" or state = "wrong"
    m.cardBg.uri = "pkg:/images/answer-card-dimmed.png"
    m.letterBadge.uri = "pkg:/images/badge-x.png"
    m.answerLabel.color = "#ffffff66"
    m.top.opacity = 0.45
    m.correctIcon.visible = false
  else if state = "eliminated"
    m.cardBg.uri = "pkg:/images/answer-card-eliminated.png"
    m.letterBadge.uri = "pkg:/images/badge-x.png"
    m.answerLabel.color = "#ffffff50"
    m.top.opacity = 0.45
    m.correctIcon.visible = false
  else
    ' default — white card with dark purple text
    idx = m.letterIdx
    if idx >= 0 and idx <= 3
      m.letterBadge.uri = m.badgeUris[idx]
    end if
    m.cardBg.uri = "pkg:/images/answer-card-default.png"
    m.answerLabel.color = "#1e0f4a"
    m.top.opacity = 1.0
    m.correctIcon.visible = false
  end if
end sub

sub onPctChanged(event as Object)
  pct = event.getData()
  if pct >= 0
    ' Clamp fill width to card bounds
    fillW = Int(780.0 * pct / 100)
    if fillW > 780 then fillW = 780
    if fillW < 0 then fillW = 0

    m.pctBar.visible = true
    m.pctBar.width = fillW
    m.pctLabel.visible = true
    m.pctLabel.text = Str(pct).trim() + "%"
    ' Hide correctIcon when percentage is showing (they overlap)
    m.correctIcon.visible = false

    ' Percentage label color based on state
    if m.state = "correct"
      m.pctLabel.color = "#ffffffE0"
    else
      m.pctLabel.color = "#ffffffB0"
    end if

    ' Color the fill bar (Rectangle color) based on cached state
    if m.state = "correct"
      m.pctBar.color = "#00d4aa50"
      m.pctBar.opacity = 0.6
    else if m.state = "default"
      m.pctBar.color = "#1e0f4a"
      m.pctBar.opacity = 0.08
    else
      m.pctBar.color = "#ffffff"
      m.pctBar.opacity = 0.08
    end if
  else
    m.pctBar.visible = false
    m.pctLabel.visible = false
  end if
end sub
