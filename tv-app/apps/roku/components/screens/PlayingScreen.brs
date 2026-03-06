' PlayingScreen — Active question screen with timer, answers, points
' Matches app.js renderPlaying() behavior
' Uses safeInt, formatScore, pointsTier, pointsColor from Utils.brs

sub init()
  ' ── Header refs ──
  m.headerBarName = m.top.findNode("headerBarName")
  m.pointsValue = m.top.findNode("pointsValue")
  m.pointsLabel = m.top.findNode("pointsLabel")
  m.playersCount = m.top.findNode("playersCount")

  ' ── Question column refs ──
  m.pillIcon = m.top.findNode("pillIcon")
  m.pillText = m.top.findNode("pillText")
  m.pillBg = m.top.findNode("pillBg")
  m.qCounter = m.top.findNode("qCounter")
  m.qCounterSep = m.top.findNode("qCounterSep")
  m.questionText = m.top.findNode("questionText")

  ' ── Footer refs (avatar + name per player, no scores during play) ──
  m.footerPlayers = []
  m.fpAvatars = []
  m.fpNames = []
  for i = 0 to 4
    idx = Str(i).trim()
    m.footerPlayers.push(m.top.findNode("footerPlayer" + idx))
    avatar = m.top.findNode("fpAvatar" + idx)
    avatar.setField("avatarSize", "md")
    avatar.setField("showRing", true)
    m.fpAvatars.push(avatar)
    m.fpNames.push(m.top.findNode("fpName" + idx))
  end for

  ' ── Widget refs ──
  m.logo = m.top.findNode("logo")
  m.logo.setField("logoSize", "playing")

  m.timerRing = m.top.findNode("timerRing")
  m.timerRing.setField("totalSeconds", 35)

  m.progressBar = m.top.findNode("progressBar")
  m.progressBar.setField("barWidth", 900)
  m.progressBar.setField("totalValue", 15)

  m.qrBadge = m.top.findNode("qrBadge")

  ' ── Answer card widgets ──
  m.cards = []
  for i = 0 to 3
    card = m.top.findNode("card" + Str(i).trim())
    card.setField("letterIndex", i)
    m.cards.push(card)
  end for

  ' ── Timer ring interpolation (1s tick for smooth countdown) ──
  m.lastApiMs = 0&
  m.apiRemaining = 0
  m.localTimer = CreateObject("roSGNode", "Timer")
  m.localTimer.repeat = true
  m.localTimer.duration = 1
  m.localTimer.observeField("fire", "onLocalTick")

  fixAllLabelFonts(m.top)
end sub

' ── Local interpolation tick (250ms) ──
sub onLocalTick()
  updatePointsAndTimer()
end sub

' ── Timer tick: only interpolate the timer ring (seconds), not points ──
sub updatePointsAndTimer()
  if m.lastApiMs = 0& then return
  dtSec = (getEpochMs() - m.lastApiMs) / 1000.0

  ' Timer ring: remaining seconds from API minus local elapsed
  remaining = m.apiRemaining - Int(dtSec)
  if remaining < 0 then remaining = 0
  m.timerRing.setField("seconds", remaining)
end sub

' ── Set points display directly from API value (no local interpolation) ──
sub updatePointsDisplay(pts as Integer)
  if pts < 0 then pts = 0
  ptsPct = 0.0
  if pts > 0 then ptsPct = pts / 1000.0
  tier = pointsTier(ptsPct)
  ptsColor = pointsColor(tier)
  m.pointsValue.text = Str(pts).trim()
  m.pointsValue.color = ptsColor
end sub

sub onGameStateChanged(event as Object)
  state = event.getData()
  if state = invalid then return

  ' ── Bar name + bar code ──
  bName = m.top.getField("barName")
  if bName <> invalid and bName <> ""
    m.headerBarName.text = bName
  end if
  bCode = m.top.getField("barCode")
  if bCode <> invalid and bCode <> ""
    m.qrBadge.setField("barCode", bCode)
  end if

  ' ── Capture API state for timer ring interpolation ──
  m.lastApiMs = getEpochMs()
  timerRemaining = 0
  timer = state.timer
  if timer <> invalid and timer.remaining <> invalid
    timerRemaining = safeInt(timer.remaining, 0)
  end if
  m.apiRemaining = timerRemaining
  m.localTimer.control = "start"

  ' ── Timer total (only changes per question, not per tick) ──
  total = 35
  if timer <> invalid and timer.total <> invalid
    total = safeInt(timer.total, 35)
  end if
  m.timerRing.setField("totalSeconds", total)

  ' ── Points: display API value directly (updated every 2s poll) ──
  updatePointsDisplay(safeInt(state.pointsAvailable, 0))

  ' ── Timer ring: immediate update ──
  updatePointsAndTimer()

  ' ── Player count ──
  playerCount = 0
  if state.playerCount <> invalid then playerCount = safeInt(state.playerCount, 0)
  m.playersCount.text = Str(playerCount).trim()

  ' ── Question data ──
  q = state.question
  if q = invalid then q = {}

  ' Category pill
  category = "Trivia"
  if q.category <> invalid and q.category <> "" then category = q.category
  m.pillIcon.uri = getCategoryIconSmallUri(category)
  m.pillText.text = category

  ' Resize pill background to fit category text (28px font ~14px/char)
  pillW = 48 + Len(category) * 14
  if pillW < 160 then pillW = 160
  if pillW > 600 then pillW = 600
  m.pillBg.width = pillW

  ' Question counter — position after pill with 20px gap
  num = safeInt(state.questionNumber, 1)
  totalQ = safeInt(state.totalQuestions, 15)
  m.qCounter.text = "Q" + Str(num).trim()
  m.qCounterSep.text = "/" + Str(totalQ).trim()
  qCounterX = pillW + 20
  m.qCounter.translation = [qCounterX, 8]
  qCounterWidth = 30 + Len(Str(num).trim()) * 18
  m.qCounterSep.translation = [qCounterX + qCounterWidth, 8]

  ' Question text
  qText = ""
  if q.text <> invalid then qText = q.text
  m.questionText.text = qText

  ' Progress bar (via ProgressBar widget)
  m.progressBar.setField("totalValue", totalQ)
  m.progressBar.setField("currentValue", num)

  ' ── Answers (via AnswerCard widgets) ──
  answers = []
  if q.answers <> invalid and type(q.answers) = "roArray"
    answers = q.answers
  end if

  ' Eliminated answers — API sends array of {index, answer, display} objects
  eliminated = []
  if state.eliminated <> invalid and type(state.eliminated) = "roArray"
    eliminated = state.eliminated
  end if

  ' Build set of eliminated indices
  elimSet = {}
  for each elim in eliminated
    if type(elim) = "roAssociativeArray" and elim.index <> invalid
      elimSet[Str(safeInt(elim.index, -1)).trim()] = true
    else
      ' Fallback: treat as plain integer
      elimSet[Str(safeInt(elim, -1)).trim()] = true
    end if
  end for

  for i = 0 to 3
    if i < answers.count()
      m.cards[i].visible = true

      ' Extract answer text
      ansText = ""
      a = answers[i]
      if type(a) = "roString" or type(a) = "String"
        ansText = a
      else if type(a) = "roAssociativeArray"
        if a.text <> invalid then ansText = a.text
      end if
      m.cards[i].setField("answerText", ansText)

      ' Check if this answer is eliminated
      isEliminated = (elimSet[Str(i).trim()] = true)

      if isEliminated
        m.cards[i].setField("cardState", "eliminated")
      else
        m.cards[i].setField("cardState", "default")
      end if
    else
      m.cards[i].visible = false
    end if
  end for

  ' ── Footer: top 5 players (right-aligned, avatar + name only) ──
  scores = []
  if state.scores <> invalid and type(state.scores) = "roArray"
    scores = state.scores
  end if

  visibleCount = scores.count()
  if visibleCount > 5 then visibleCount = 5

  ' Right-align: compute start X so last player's right edge is at ~1860
  playerW = 160  ' avatar (48px) + gap + name
  gap = 180      ' center-to-center spacing
  rightEdge = 1860
  totalW = 0
  if visibleCount > 0 then totalW = (visibleCount - 1) * gap + playerW
  startX = rightEdge - totalW

  visIdx = 0
  for i = 0 to 4
    if i < scores.count() and i < 5
      p = scores[i]
      pName = "Player"
      if p.name <> invalid and p.name <> ""
        pName = p.name
      else if p.playerName <> invalid and p.playerName <> ""
        pName = p.playerName
      end if
      m.fpAvatars[i].setField("playerName", pName)
      m.fpNames[i].text = pName

      m.footerPlayers[i].translation = [startX + visIdx * gap, 0]
      m.footerPlayers[i].visible = true
      visIdx = visIdx + 1
    else
      m.footerPlayers[i].visible = false
    end if
  end for
end sub
