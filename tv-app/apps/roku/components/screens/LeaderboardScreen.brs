' LeaderboardScreen — Post-question podium with dual layout mode
' With signage: Left = podium + 4th/5th runners + countdown, Right = SignagePanel
' Without signage: Left = podium, Right = TOP 10 list + QR badge

sub init()
  ' ── Node refs ──
  m.barNameLabel = m.top.findNode("barNameLabel")
  m.afterLabel = m.top.findNode("afterLabel")
  m.nextLabel = m.top.findNode("nextLabel")

  ' Widget refs
  m.logo = m.top.findNode("logo")
  m.logo.setField("logoSize", "md")

  m.podium = m.top.findNode("podium")
  m.qrBadge = m.top.findNode("qrBadge")
  m.signagePanel = m.top.findNode("signagePanel")
  m.rightCol = m.top.findNode("rightCol")
  m.runnerRows = m.top.findNode("runnerRows")

  ' Runner rows (4th/5th)
  m.runner4 = m.top.findNode("runner4")
  m.runner5 = m.top.findNode("runner5")

  ' Rank rows 4-10 (no-signage mode)
  m.rankRows = []
  for i = 4 to 10
    row = m.top.findNode("rank" + Str(i).trim())
    m.rankRows.push(row)
  end for

  m.rightPanelBg = m.top.findNode("rightPanelBg")
  m.hasSignage = false

  ' ── Interpolation timer (1s countdown tick) ──
  m.lastApiMs = 0&
  m.lastNextIn = 5
  m.localTimer = CreateObject("roSGNode", "Timer")
  m.localTimer.repeat = true
  m.localTimer.duration = 1
  m.localTimer.observeField("fire", "onLocalTick")

  ' Stop timer when screen is hidden to prevent memory pressure over long uptimes
  m.top.observeField("visible", "onVisibleChanged")

  fixAllLabelFonts(m.top)
end sub

' ── Local interpolation tick (1s) ──
sub onLocalTick()
  if m.lastApiMs = 0& then return
  dtSec = (getEpochMs() - m.lastApiMs) / 1000.0
  localNextIn = m.lastNextIn - dtSec
  if localNextIn < 1 then localNextIn = 1
  m.nextLabel.text = "Next question in " + Str(Int(localNextIn)).trim() + "s..."
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

  ' ── After Question N label ──
  num = 1
  if gs.questionNumber <> invalid then num = gs.questionNumber
  m.afterLabel.text = "AFTER QUESTION " + Str(num).trim()

  ' ── Scores / Podium ──
  scores = []
  if gs.scores <> invalid then scores = gs.scores

  ' Set podium scores (Podium widget handles 1st/2nd/3rd internally)
  m.podium.setField("scores", scores)

  ' ── Signage check ──
  slides = m.top.getField("signageSlides")
  if slides = invalid then slides = []
  hasSignage = (slides.count() > 0)

  m.hasSignage = hasSignage

  if hasSignage
    ' ── SIGNAGE MODE: podium + runners left, signage right ──
    m.rightCol.visible = false
    m.qrBadge.visible = false
    m.runnerRows.visible = true

    ' 4th/5th runner rows
    if 3 < scores.count()
      m.runner4.setField("playerData", scores[3])
      m.runner4.setField("playerRank", 4)
      m.runner4.visible = true
    else
      m.runner4.visible = false
    end if
    if 4 < scores.count()
      m.runner5.setField("playerData", scores[4])
      m.runner5.setField("playerRank", 5)
      m.runner5.visible = true
    else
      m.runner5.visible = false
    end if

    ' Move countdown below runners
    m.nextLabel.translation = [100, 790]

    ' Wire signage panel
    m.signagePanel.setField("barCode", barCode)
    m.signagePanel.setField("barName", barName)
    m.signagePanel.setField("barLogoUrl", m.top.getField("barLogoUrl"))
    m.signagePanel.setField("signageSlides", slides)
    m.signagePanel.setField("signageIndex", m.top.getField("signageIndex"))
    m.signagePanel.visible = true
    m.rightPanelBg.visible = true
  else
    ' ── NO-SIGNAGE MODE: podium left, TOP 10 right ──
    m.rightCol.visible = true
    m.qrBadge.visible = true
    m.runnerRows.visible = false
    m.signagePanel.visible = false
    m.rightPanelBg.visible = false
    m.nextLabel.translation = [100, 680]

    ' Ranks 4-10 in right column
    for i = 0 to 6
      rankIdx = i + 3  ' scores[3] = rank 4, scores[4] = rank 5, etc.
      if rankIdx < scores.count()
        m.rankRows[i].setField("playerData", scores[rankIdx])
        m.rankRows[i].setField("playerRank", rankIdx + 1)
        m.rankRows[i].visible = true
      else
        m.rankRows[i].visible = false
      end if
    end for
  end if

  ' ── Next question label ──
  m.lastApiMs = getEpochMs()
  m.lastNextIn = 5
  m.nextLabel.text = "Next question in 5s..."
  m.localTimer.control = "start"
end sub

sub onSignageIndexChanged(event as Object)
  if m.hasSignage
    m.signagePanel.setField("signageIndex", event.getData())
  end if
end sub
