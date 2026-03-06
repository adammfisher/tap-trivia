' BetweenScreen — Standings rows between questions + signage panel
' Left: Logo + bar name + "Standings" + 5 LeaderRows + countdown (vertically centered)
' Right: SignagePanel (when signage data available)

sub init()
  ' ── Node refs ──
  m.leftCol = m.top.findNode("leftCol")
  m.barNameLabel = m.top.findNode("barNameLabel")
  m.standingsLabel = m.top.findNode("standingsLabel")
  m.countdownLabel = m.top.findNode("countdownLabel")

  ' Widget refs
  m.logo = m.top.findNode("logo")
  m.logo.setField("logoSize", "md")

  m.qrBadge = m.top.findNode("qrBadge")
  m.signagePanel = m.top.findNode("signagePanel")

  ' Standing rows 1-5
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

  fixAllLabelFonts(m.top)
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

sub onGameStateChanged(event as Object)
  gs = event.getData()
  if gs = invalid then return

  barName = m.top.getField("barName")
  barCode = m.top.getField("barCode")

  ' ── Bar name + code ──
  m.barNameLabel.text = barName
  m.qrBadge.setField("barCode", barCode)

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
    secsLeft = Int((gs.nextGameStartEpoch - nowEpoch) / 1000)
    if secsLeft > 0 and secsLeft < 3600
      m.countdownLabel.text = "Next game in " + formatCountdown(secsLeft)
    end if
  end if

  ' ── Vertical centering ──
  ' Content: logo(58px) + gap(8) + barName(28) + gap(16) + standingsLabel(44) + gap(12) = 166px
  ' Then: visible rows at 80px spacing (68px row height)
  ' Then: gap(24) + countdown(28)
  baseH = 166
  rowsH = 0
  if visibleRows > 0
    rowsH = (visibleRows - 1) * 80 + 68
  end if
  countdownGap = 24
  countdownH = 28
  totalH = baseH + rowsH + countdownGap + countdownH
  offsetY = Int((1080 - totalH) / 2)
  m.leftCol.translation = [0, offsetY]

  ' Position countdown after last visible row
  if visibleRows > 0
    countdownY = 170 + (visibleRows - 1) * 80 + 68 + countdownGap
  else
    countdownY = 170
  end if
  m.countdownLabel.translation = [0, countdownY]

  ' ── Signage panel ──
  slides = m.top.getField("signageSlides")
  if slides = invalid then slides = []
  hasSignage = (slides.count() > 0)
  m.hasSignage = hasSignage

  if hasSignage
    m.signagePanel.setField("barCode", barCode)
    m.signagePanel.setField("barName", barName)
    m.signagePanel.setField("barLogoUrl", m.top.getField("barLogoUrl"))
    m.signagePanel.setField("signageSlides", slides)
    m.signagePanel.setField("signageIndex", m.top.getField("signageIndex"))
    m.signagePanel.visible = true
    m.rightPanelBg.visible = true
    m.qrBadge.visible = false
  else
    m.signagePanel.visible = false
    m.rightPanelBg.visible = false
    m.qrBadge.visible = true
  end if
end sub

sub onSignageIndexChanged(event as Object)
  if m.hasSignage
    m.signagePanel.setField("signageIndex", event.getData())
  end if
end sub
