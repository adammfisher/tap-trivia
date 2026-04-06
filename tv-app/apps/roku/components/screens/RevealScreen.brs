' RevealScreen — Answer reveal with correct/wrong states + percentage bars
' Matches app.js renderReveal() behavior
' Refactored to use Logo, AnswerCard, Avatar, and QRBadge widgets

sub init()
  ' ── Logo widget ──
  m.logo = m.top.findNode("logo")
  m.logo.setField("logoSize", "playing")

  ' ── Node refs: Header ──
  m.headerBarName = m.top.findNode("headerBarName")
  m.playersBadgeCount = m.top.findNode("playersBadgeCount")

  ' ── Node refs: Question column ──
  m.catPillBg = m.top.findNode("catPillBg")
  m.catIcon = m.top.findNode("catIcon")
  m.catName = m.top.findNode("catName")
  m.qNum = m.top.findNode("qNum")
  m.qSep = m.top.findNode("qSep")
  m.qCounter = m.top.findNode("qCounter")
  m.questionText = m.top.findNode("questionText")
  m.progressFill = m.top.findNode("progressFill")

  ' ── AnswerCard widgets ──
  m.cards = []
  for i = 0 to 3
    idx = Str(i).trim()
    card = m.top.findNode("card" + idx)
    card.setField("letterIndex", i)
    m.cards.push(card)
  end for

  ' ── Footer player refs (Avatar widgets + name/score labels) ──
  m.footerGroups = []
  m.fpAvatars = []
  m.fpNames = []
  m.fpScores = []
  for i = 0 to 4
    idx = Str(i).trim()
    m.footerGroups.push(m.top.findNode("footerPlayer" + idx))
    avatar = m.top.findNode("fpAvatar" + idx)
    avatar.setField("avatarSize", "xs")
    m.fpAvatars.push(avatar)
    m.fpNames.push(m.top.findNode("fpName" + idx))
    m.fpScores.push(m.top.findNode("fpScore" + idx))
  end for

  ' ── QRBadge widget ──
  m.qrBadge = m.top.findNode("qrBadge")

  fixAllLabelFonts(m.top)
end sub

sub onGameStateChanged(event as Object)
  gs = event.getData()
  if gs = invalid then return

  ' ── Header ──
  m.headerBarName.text = m.top.getField("barName")
  m.qrBadge.setField("barCode", m.top.getField("barCode"))

  ' Player count
  playerCount = 0
  if gs.playerCount <> invalid then playerCount = gs.playerCount
  m.playersBadgeCount.text = Str(playerCount).trim()

  ' ── Question info ──
  q = gs.question
  if q = invalid then q = {}

  category = ""
  if q.category <> invalid then category = q.category
  m.catIcon.uri = getCategoryIconSmallUri(category)
  m.catName.text = category

  ' Resize pill background + label to fit category text
  catLen = Len(category)
  if catLen > 38
    m.catName.font = makeFont("Outfit-SemiBold", 22)
    pillW = 48 + catLen * 12
  else
    m.catName.font = makeFont("Outfit-SemiBold", 28)
    pillW = 48 + catLen * 16
  end if
  if pillW < 160 then pillW = 160
  if pillW > 840 then pillW = 840
  m.catPillBg.width = pillW
  m.catName.width = pillW - 50

  num = 1
  if gs.questionNumber <> invalid then num = gs.questionNumber
  totalQ = 15
  if gs.totalQuestions <> invalid then totalQ = gs.totalQuestions
  m.qNum.text = "Q" + Str(num).trim()
  m.qSep.text = "/" + Str(totalQ).trim()

  ' Position counter after pill with 20px gap
  qCounterX = pillW + 20
  m.qCounter.translation = [qCounterX, 0]

  ' Question text
  qText = ""
  if q.text <> invalid then qText = q.text
  m.questionText.text = qText

  ' Progress bar
  if totalQ > 0
    pctWidth = Int(900 * num / totalQ)
    m.progressFill.width = pctWidth
  end if

  ' ── Answer cards with reveal states ──
  answers = []
  if q.answers <> invalid then answers = q.answers
  correctIdx = -1
  if gs.correctAnswerIndex <> invalid then correctIdx = gs.correctAnswerIndex
  answerPcts = []
  if gs.answerPercentages <> invalid then answerPcts = gs.answerPercentages

  for i = 0 to 3
    card = m.cards[i]
    if i < answers.count()
      ' Parse answer text
      ansText = ""
      ans = answers[i]
      if type(ans) = "roString" or type(ans) = "String"
        ansText = ans
      else if type(ans) = "roAssociativeArray"
        if ans.text <> invalid then ansText = ans.text
      end if

      card.visible = true
      card.setField("letterIndex", i)
      card.setField("answerText", ansText)

      ' Determine card state
      if i = correctIdx
        card.setField("cardState", "correct")
      else if correctIdx >= 0
        card.setField("cardState", "dimmed")
      else
        card.setField("cardState", "default")
      end if

      ' Percentage picked
      pct = 0
      if i < answerPcts.count() and answerPcts[i] <> invalid
        pct = answerPcts[i]
      end if
      card.setField("pctPicked", pct)
    else
      card.visible = false
    end if
  end for

  ' ── Footer: Top 5 players ──
  scores = []
  if gs.scores <> invalid then scores = gs.scores
  updateFooterPlayers(scores)
end sub

sub updateFooterPlayers(scores as Object)
  ' Right-align: compute start X so last player's right edge is at ~1860
  visibleCount = scores.count()
  if visibleCount > 5 then visibleCount = 5
  playerW = 80
  gap = 140  ' center-to-center spacing
  rightEdge = 1860
  totalW = 0
  if visibleCount > 0 then totalW = (visibleCount - 1) * gap + playerW
  startX = rightEdge - totalW

  visIdx = 0
  for i = 0 to 4
    if i < scores.count()
      p = scores[i]
      name = "Player"
      if p.name <> invalid then name = p.name
      if p.playerName <> invalid then name = p.playerName
      score = 0
      if p.score <> invalid then score = p.score

      m.footerGroups[i].visible = true
      m.footerGroups[i].translation = [startX + visIdx * gap, 0]

      ' Set avatar name (widget handles color + initial)
      m.fpAvatars[i].setField("playerName", name)

      ' Name and score labels
      m.fpNames[i].text = name
      m.fpScores[i].text = formatScore(score)

      ' Highlight correct players in green
      isCorrect = false
      if p.isCurrentCorrect <> invalid then isCorrect = p.isCurrentCorrect
      if isCorrect
        m.fpNames[i].color = "#00d4aa"
      else
        m.fpNames[i].color = "#f0f0f0"
      end if

      visIdx = visIdx + 1
    else
      m.footerGroups[i].visible = false
    end if
  end for
end sub
