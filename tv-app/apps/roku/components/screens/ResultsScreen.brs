' ResultsScreen — Game over screen with dual layout mode
' With signage: Left = centered countdown + trophy + Game Over + winner, Right = SignagePanel
' Without signage: Left = trophy + podium, Right = FINAL STANDINGS 1-10 + QR badge

sub init()
  ' ── Node refs (no-signage mode) ──
  m.countdownPre = m.top.findNode("countdownPre")
  m.countdownValue = m.top.findNode("countdownValue")
  m.statsLine = m.top.findNode("statsLine")
  m.leftCol = m.top.findNode("leftCol")

  ' ── Node refs (signage mode — centered game-over + winner) ──
  m.gameOverCenter = m.top.findNode("gameOverCenter")
  m.countdownValueCenter = m.top.findNode("countdownValueCenter")
  m.statsLineCenter = m.top.findNode("statsLineCenter")
  m.winnerAvatar = m.top.findNode("winnerAvatar")
  m.winnerName = m.top.findNode("winnerName")
  m.winnerScore = m.top.findNode("winnerScore")

  ' Widget refs
  m.podium = m.top.findNode("podium")
  m.qrBadge = m.top.findNode("qrBadge")
  m.signagePanel = m.top.findNode("signagePanel")
  m.rightCol = m.top.findNode("rightCol")
  m.runnerRows = m.top.findNode("runnerRows")

  ' Runner rows (4th/5th)
  m.runner4 = m.top.findNode("runner4")
  m.runner5 = m.top.findNode("runner5")

  ' Rank rows 1-10 (no-signage mode)
  m.rankRows = []
  for i = 1 to 10
    row = m.top.findNode("rank" + Str(i).trim())
    m.rankRows.push(row)
  end for

  ' ── Countdown timer ──
  m.nextGameEpoch = 0&
  m.countdownTimer = CreateObject("roSGNode", "Timer")
  m.countdownTimer.repeat = true
  m.countdownTimer.duration = 1
  m.countdownTimer.observeField("fire", "onCountdownTick")

  m.rightPanelBg = m.top.findNode("rightPanelBg")
  m.hasSignage = false

  ' Stop timer when screen is hidden to prevent memory pressure over long uptimes
  m.top.observeField("visible", "onVisibleChanged")

  fixAllLabelFonts(m.top)
end sub

sub onGameStateChanged(event as Object)
  gs = event.getData()
  if gs = invalid then return

  barName = m.top.getField("barName")
  barCode = m.top.getField("barCode")

  ' ── Bar code for QR badge ──
  m.qrBadge.setField("barCode", barCode)

  ' ── Stats line ──
  totalQ = 15
  if gs.totalQuestions <> invalid then totalQ = gs.totalQuestions
  scores = []
  if gs.scores <> invalid then scores = gs.scores
  playerCount = scores.count()
  if gs.playerCount <> invalid and gs.playerCount > playerCount
    playerCount = gs.playerCount
  end if
  statsText = Str(totalQ).trim() + " questions · " + Str(playerCount).trim() + " players"
  m.statsLine.text = statsText

  ' ── Podium (widget handles 1st/2nd/3rd internally) ──
  m.podium.setField("scores", scores)

  ' ── 4th/5th runners ──
  if scores.count() > 3
    m.runner4.setField("playerData", scores[3])
    m.runner4.setField("playerRank", 4)
  end if
  if scores.count() > 4
    m.runner5.setField("playerData", scores[4])
    m.runner5.setField("playerRank", 5)
  end if

  ' ── Signage check ──
  slides = m.top.getField("signageSlides")
  if slides = invalid then slides = []
  hasSignage = (slides.count() > 0)
  m.hasSignage = hasSignage

  if hasSignage
    ' ── SIGNAGE MODE: centered Game Over + winner left, signage right ──
    m.leftCol.visible = false
    m.rightCol.visible = false
    m.qrBadge.visible = false
    m.runnerRows.visible = false

    ' Show centered game-over with winner
    m.gameOverCenter.visible = true
    m.statsLineCenter.text = statsText

    ' Winner display (1st place)
    if scores.count() > 0
      p = scores[0]
      wName = "Player"
      if p.name <> invalid and p.name <> "" then wName = p.name
      if wName = "" or wName = "Player"
        if p.playerName <> invalid and p.playerName <> "" then wName = p.playerName
      end if
      m.winnerAvatar.setField("playerName", wName)
      m.winnerAvatar.setField("rank", 1)
      m.winnerAvatar.setField("avatarSize", "xl")
      m.winnerName.text = wName
      wScore = 0
      if p.score <> invalid then wScore = p.score
      m.winnerScore.text = formatScore(wScore)
      m.winnerAvatar.visible = true
      m.winnerName.visible = true
      m.winnerScore.visible = true
    else
      m.winnerAvatar.visible = false
      m.winnerName.visible = false
      m.winnerScore.visible = false
    end if

    ' Wire signage panel
    m.signagePanel.setField("barCode", barCode)
    m.signagePanel.setField("barName", barName)
    m.signagePanel.setField("barLogoUrl", m.top.getField("barLogoUrl"))
    m.signagePanel.setField("signageSlides", slides)
    m.signagePanel.setField("signageIndex", m.top.getField("signageIndex"))
    m.signagePanel.visible = true
    m.rightPanelBg.visible = true
  else
    ' ── NO-SIGNAGE MODE: podium left, FINAL STANDINGS right ──
    m.leftCol.visible = true
    m.gameOverCenter.visible = false
    m.rightCol.visible = true
    m.qrBadge.visible = true
    m.runnerRows.visible = false
    m.signagePanel.visible = false
    m.rightPanelBg.visible = false

    ' Ranks 1-10
    for i = 0 to 9
      if i < scores.count()
        m.rankRows[i].setField("playerData", scores[i])
        m.rankRows[i].setField("playerRank", i + 1)
        m.rankRows[i].visible = true
      else
        m.rankRows[i].visible = false
      end if
    end for
  end if

  ' ── Countdown to next game ──
  nextEpoch = 0&
  if gs.nextGameStartEpoch <> invalid then nextEpoch = gs.nextGameStartEpoch

  ' Ensure next game epoch is in the future
  SLOT_MS = 15& * 60 * 1000
  nowMs = getEpochMs()
  if nextEpoch <= nowMs
    nextEpoch = nowMs + SLOT_MS - (nowMs mod SLOT_MS)
  end if

  m.nextGameEpoch = nextEpoch
  updateCountdownDisplay()

  ' Start countdown timer for live updates
  m.countdownTimer.control = "start"
end sub

sub onCountdownTick()
  updateCountdownDisplay()
end sub

sub onVisibleChanged()
  if not m.top.visible
    m.countdownTimer.control = "stop"
  end if
  ' Timer restarts on next onGameStateChanged when screen becomes active again
end sub

sub onSignageIndexChanged(event as Object)
  ' Propagate signage index change to the SignagePanel widget
  if m.hasSignage
    m.signagePanel.setField("signageIndex", event.getData())
  end if
end sub

sub updateCountdownDisplay()
  if m.nextGameEpoch <= 0
    m.countdownValue.text = ""
    m.countdownValueCenter.text = ""
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

  cdText = formatCountdown(secsLeft)
  m.countdownValue.text = cdText
  m.countdownValueCenter.text = cdText
end sub
