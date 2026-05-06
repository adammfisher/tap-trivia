' BetweenScreen — Fun fact + standings (left) + signage panel (right)
' Left: Logo + bar name + fun fact card + "Standings" + 5 LeaderRows + countdown
' Right: SignagePanel (when signage data available)

sub init()
  ' ── Node refs ──
  m.leftCol = m.top.findNode("leftCol")
  m.barNameLabel = m.top.findNode("barNameLabel")
  m.standingsLabel = m.top.findNode("standingsLabel")
  m.countdownLabel = m.top.findNode("countdownLabel")

  ' Fun fact refs
  m.funFactBg = m.top.findNode("funFactBg")
  m.funFactLabel = m.top.findNode("funFactLabel")
  m.funFactText = m.top.findNode("funFactText")

  ' Widget refs
  m.logo = m.top.findNode("logo")
  m.logo.setField("logoSize", "md")

  m.qrBadge = m.top.findNode("qrBadge")
  m.signagePanel = m.top.findNode("signagePanel")

  ' Standings group + rows
  m.standingsList = m.top.findNode("standingsList")
  m.standingRows = []
  for i = 1 to 5
    row = m.top.findNode("standing" + Str(i).trim())
    m.standingRows.push(row)
  end for

  m.rightPanelBg = m.top.findNode("rightPanelBg")
  m.hasSignage = false

  ' ── Interpolation timer (1s countdown tick) ──
  m.lastApiMs = 0&
  m.lastNextIn = 0
  m.isFinalQuestion = false
  m.localTimer = CreateObject("roSGNode", "Timer")
  m.localTimer.repeat = true
  m.localTimer.duration = 1
  m.localTimer.observeField("fire", "onLocalTick")

  ' Stop timer when screen is hidden to prevent memory pressure over long uptimes
  m.top.observeField("visible", "onVisibleChanged")

  ' Wire signage panel once when slides change (not on every gameState poll)
  m.top.observeField("signageSlides", "onSignageSlidesChanged")

  fixAllLabelFonts(m.top)
end sub

' Called once when slides field is set (on screen show) — never on gameState updates
sub onSignageSlidesChanged(event as Object)
  slides = event.getData()
  if slides = invalid then slides = []
  ' Always show the signage panel — when the bar has no signage, the panel
  ' falls through to renderDefault() which shows TapTrivia branded content
  ' (matches web tv-app behavior).
  m.hasSignage = true
  barCode = m.top.getField("barCode")
  barName = m.top.getField("barName")
  m.signagePanel.setField("barCode", barCode)
  m.signagePanel.setField("barName", barName)
  m.signagePanel.setField("barLogoUrl", m.top.getField("barLogoUrl"))
  m.signagePanel.setField("signageSlides", slides)
  m.signagePanel.setField("signageIndex", m.top.getField("signageIndex"))
  m.signagePanel.visible = true
  m.rightPanelBg.visible = true
  m.qrBadge.visible = false
end sub

' ── Local interpolation tick (1s) ──
sub onLocalTick()
  if m.lastApiMs = 0& then return
  if m.isFinalQuestion then return

  dtSec = (getEpochMs() - m.lastApiMs) / 1000.0
  localNextIn = m.lastNextIn - dtSec
  if localNextIn < 1 then localNextIn = 1
  m.countdownLabel.text = "Next question in " + Str(Int(localNextIn)).trim() + "s..."
end sub

sub onVisibleChanged()
  if not m.top.visible
    m.localTimer.control = "stop"
  end if
  ' Timer restarts on next onGameStateChanged when screen becomes active again
end sub

sub onGameStateChanged(event as Object)
  gs = event.getData()
  if gs = invalid then return

  barName = m.top.getField("barName")
  barCode = m.top.getField("barCode")

  ' ── Bar name + code ──
  m.barNameLabel.text = barName
  m.qrBadge.setField("barCode", barCode)

  ' ── Fun fact ──
  funFact = ""
  if gs.funFact <> invalid then funFact = gs.funFact
  if Left(funFact, 30) = "This is a fun fact placeholder" then funFact = ""
  hasFunFact = (Len(funFact) > 0)

  m.funFactBg.visible = hasFunFact
  m.funFactLabel.visible = hasFunFact
  m.funFactText.visible = hasFunFact

  if hasFunFact
    m.funFactText.text = funFact
    ' Size the card background to fit text (32px font, ~16px/char)
    lineH = 42
    charPerLine = Int(780 / 16)
    numLines = Int(Len(funFact) / charPerLine) + 1
    if numLines > 4 then numLines = 4
    textH = numLines * lineH
    m.funFactBg.height = 56 + textH + 24
  end if

  ' ── Standings label ──
  m.standingsLabel.text = "Standings"

  ' ── Scores → standings rows 1-5 ──
  scores = []
  if gs.scores <> invalid then scores = gs.scores

  visibleRows = 0
  for i = 0 to 4
    if i < scores.count()
      m.standingRows[i].setField("playerData", scores[i])
      m.standingRows[i].setField("playerRank", i + 1)
      m.standingRows[i].visible = true
      visibleRows = visibleRows + 1
    else
      m.standingRows[i].visible = false
    end if
  end for

  ' ── Countdown text ──
  totalQ = 15
  if gs.totalQuestions <> invalid then totalQ = gs.totalQuestions
  num = 1
  if gs.questionNumber <> invalid then num = gs.questionNumber
  nextIn = 5
  if gs.nextQuestionIn <> invalid then nextIn = gs.nextQuestionIn

  ' Capture state for interpolation
  m.lastApiMs = getEpochMs()
  m.lastNextIn = nextIn
  m.isFinalQuestion = (num >= totalQ)

  if m.isFinalQuestion
    m.countdownLabel.text = "Final results coming..."
  else
    m.countdownLabel.text = "Next question in " + Str(nextIn).trim() + "s..."
    m.localTimer.control = "start"
  end if

  ' Handle rotation mode countdown (next game)
  if gs.nextGameStartEpoch <> invalid and gs.nextGameStartEpoch > 0
    nowEpoch = getEpochMs()
    nextEpoch = gs.nextGameStartEpoch
    SLOT_MS = 15& * 60 * 1000
    while nextEpoch <= nowEpoch
      nextEpoch = nextEpoch + SLOT_MS
    end while
    secsLeft = Int((nextEpoch - nowEpoch) / 1000)
    if secsLeft > 0 and secsLeft < 3600
      m.countdownLabel.text = "Next game in " + formatCountdown(secsLeft)
    end if
  end if

  ' ── Vertical centering ──
  ' Layout order: [fun fact] → logo → barName → standings → countdown
  funFactH = 0
  if hasFunFact
    funFactH = m.funFactBg.height + 16
  end if
  ' logo(58) + gap(8) + barName(28) + gap(16) = 110
  baseH = 110
  ' standingsLabel(44) + gap(12) = 56
  labelH = 56
  rowsH = 0
  if visibleRows > 0
    rowsH = (visibleRows - 1) * 80 + 68
  end if
  countdownGap = 24
  countdownH = 28
  ' Fun fact pinned to top of screen
  m.leftCol.translation = [0, 0]

  ' Fun fact card at top
  if hasFunFact
    m.funFactBg.translation = [30, 30]
    m.funFactLabel.translation = [30, 48]
    m.funFactText.translation = [60, 82]
  end if

  ' Calculate height of logo+bar+standings+countdown block
  blockH = baseH + labelH + rowsH + countdownGap + countdownH
  ' Center this block in the space below the fun fact card
  topOfBlock = 40 + funFactH
  availableH = 1080 - topOfBlock
  blockY = topOfBlock + Int((availableH - blockH) / 2)

  ' Logo + bar name
  curY = blockY
  m.logo.translation = [374, curY]
  m.barNameLabel.translation = [0, curY + 66]
  curY = curY + 110

  ' Standings label
  m.standingsLabel.translation = [0, curY]
  curY = curY + 56

  ' Standings list
  m.standingsList.translation = [50, curY]

  ' Countdown after last visible row
  if visibleRows > 0
    countdownY = curY + (visibleRows - 1) * 80 + 68 + countdownGap
  else
    countdownY = curY
  end if
  m.countdownLabel.translation = [0, countdownY]
  ' Signage panel wired via onSignageSlidesChanged (fires once on screen show, not every poll)
end sub

sub onSignageIndexChanged(event as Object)
  if m.hasSignage
    m.signagePanel.setField("signageIndex", event.getData())
  end if
end sub
