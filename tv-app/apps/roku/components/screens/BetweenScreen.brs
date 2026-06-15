' BetweenScreen — Scores-phase TWO-SCREEN rotation (matches web tv-app).
'   Screen 1 (0:37–0:44): Did You Know | Standings
'   Screen 2 (0:44–0:52): Venue Ad     | Play TapTrivia QR
' Split derived from gameState.elapsedInQuestionMs via the shared game clock,
' interpolated locally between polls and latched (no Screen-1 flash at rollover).

' Web SCORES_SCREEN1_END_MS — Screen 1 shows 0:37-0:44, Screen 2 0:44-0:52.
function SCREEN1_END_MS() as LongInteger
  return 44000&
end function

sub init()
  ' Per-component font cache — makeFont() (FontFix.brs) reuses Font nodes instead
  ' of recreating them on every poll-driven standings re-render.
  m.fontCache = {}

  ' ── Screen containers ──
  m.screen1 = m.top.findNode("screen1")
  m.screen2 = m.top.findNode("screen2")

  ' Screen 1 left (fact / brand)
  m.s1FactGroup = m.top.findNode("s1FactGroup")
  m.s1FactKicker = m.top.findNode("s1FactKicker")
  m.s1FactText = m.top.findNode("s1FactText")
  m.s1BrandGroup = m.top.findNode("s1BrandGroup")
  m.s1BrandLogo = m.top.findNode("s1BrandLogo")
  m.s1BrandLogo.setField("logoSize", "lg")

  ' Screen 1 right (standings)
  m.s1Right = m.top.findNode("s1Right")
  m.s1Logo = m.top.findNode("s1Logo")
  m.s1Logo.setField("logoSize", "sm")
  m.s1Kicker = m.top.findNode("s1Kicker")
  m.s1Rows = m.top.findNode("s1Rows")
  m.s1Empty = m.top.findNode("s1Empty")

  ' Screen 2 left (signage / welcome)
  m.signagePanel = m.top.findNode("signagePanel")
  m.s2Welcome = m.top.findNode("s2Welcome")
  m.s2WelcomeName = m.top.findNode("s2WelcomeName")

  ' Screen 2 right (play QR card)
  m.s2Play = m.top.findNode("s2Play")
  m.playBrain = m.top.findNode("playBrain")
  m.playTitle = m.top.findNode("playTitle")
  m.playOffer = m.top.findNode("playOffer")
  m.playScan = m.top.findNode("playScan")
  m.playQRCard = m.top.findNode("playQRCard")
  m.playQR = m.top.findNode("playQR")
  m.playUrl = m.top.findNode("playUrl")
  m.playCodeKicker = m.top.findNode("playCodeKicker")
  m.playCode = m.top.findNode("playCode")

  m.hasSignage = false

  ' Build the (up to 7) standings rows once.
  m.rows = []
  for i = 0 to 6
    m.rows.push(buildStandingRow())
  end for

  ' Position the static Play-card column once (its layout never changes).
  layoutPlayCard()

  ' ── Two-screen toggle: interpolate elapsed between polls (4 Hz) ──
  m.scoresElapsedMs = 0&
  m.scoresCaptureMs = 0&
  m.screen2Latched = false
  m.toggleTimer = CreateObject("roSGNode", "Timer")
  m.toggleTimer.repeat = true
  m.toggleTimer.duration = 0.25
  m.toggleTimer.observeField("fire", "onToggleTick")

  m.top.observeField("visible", "onVisibleChanged")
  m.top.observeField("signageSlides", "onSignageSlidesChanged")

  fixAllLabelFonts(m.top)
end sub

' Create a single standings row as a Group of primitives (full control to match
' web: gold first-row highlight + top-3 gold ranks). Returns refs assocarray.
function buildStandingRow() as Object
  row = m.s1Rows.createChild("Group")

  ' Rounded row background (web alphas baked into the PNG). First-place row
  ' swaps to row2s-first.png (brighter fill + gold border) in layoutStandings.
  bg = row.createChild("Poster")
  bg.width = 864 : bg.height = 66
  bg.uri = "pkg:/images/row2s-bg.png"

  rank = row.createChild("Label")
  rank.translation = [23, 19] : rank.width = 28 : rank.horizAlign = "left"
  rank.color = "#ffffff4D" : rank.font = makeFont("Fredoka-Bold", 25)

  avatar = row.createChild("Avatar")
  avatar.setField("avatarSize", "sm")
  avatar.translation = [71, 13]

  nm = row.createChild("Label")
  nm.translation = [127, 18] : nm.width = 540
  nm.color = "#ffffffB3" : nm.font = makeFont("Outfit-SemiBold", 25)

  sc = row.createChild("Label")
  sc.translation = [691, 18] : sc.width = 150 : sc.horizAlign = "right"
  sc.color = "#ffd200" : sc.font = makeFont("Fredoka-Bold", 25)

  return { group: row, bg: bg, rank: rank, avatar: avatar, name: nm, score: sc }
end function

sub onGameStateChanged(event as Object)
  gs = event.getData()
  if gs = invalid then return

  barName = m.top.getField("barName")
  barCode = m.top.getField("barCode")

  ' ── Screen 1 LEFT: Did You Know (fact) or brand fallback ──
  funFact = ""
  if gs.funFact <> invalid then funFact = gs.funFact
  if Left(funFact, 30) = "This is a fun fact placeholder" then funFact = ""
  hasFunFact = (Len(funFact) > 0)

  m.s1FactGroup.visible = hasFunFact
  m.s1BrandGroup.visible = not hasFunFact
  if hasFunFact
    m.s1FactText.text = funFact
    layoutFact(funFact)
  end if

  ' ── Screen 1 RIGHT: standings ──
  scores = []
  if gs.scores <> invalid then scores = gs.scores
  num = 1
  if gs.questionNumber <> invalid then num = gs.questionNumber
  totalQ = 15
  if gs.totalQuestions <> invalid then totalQ = gs.totalQuestions
  m.s1Kicker.text = "STANDINGS  " + Chr(183) + "  Q" + Str(num).trim() + " OF " + Str(totalQ).trim()
  layoutStandings(scores)

  ' ── Screen 2 LEFT: venue ad (signage) or welcome fallback ──
  m.s2WelcomeName.text = barName
  ' (signage panel wired in onSignageSlidesChanged; welcome shown when none)

  ' ── Screen 2 RIGHT: play QR card ──
  m.playCode.text = barCode
  layoutCodeRow(barCode)

  ' ── Capture elapsed for the two-screen split + interpolation ──
  if gs.elapsedInQuestionMs <> invalid
    m.scoresElapsedMs = gs.elapsedInQuestionMs
  else
    m.scoresElapsedMs = 37000&
  end if
  m.scoresCaptureMs = getEpochMs()
  ' Fresh question's scores phase (< Screen-2 boundary) → drop the latch.
  if m.scoresElapsedMs < SCREEN1_END_MS() then m.screen2Latched = false

  updateScreenToggle()
  if m.top.visible then m.toggleTimer.control = "start"
end sub

' ── Local interpolation tick: recompute elapsed, flip Screen 1 ↔ 2 ──
sub onToggleTick()
  updateScreenToggle()
end sub

sub updateScreenToggle()
  cur = m.scoresElapsedMs + (getEpochMs() - m.scoresCaptureMs)
  if cur >= SCREEN1_END_MS()
    m.screen2Latched = true
  end if
  showScreen2 = m.screen2Latched
  m.screen1.visible = not showScreen2
  m.screen2.visible = showScreen2
end sub

' ── Screen 1 LEFT: vertically-center the fact block (kicker + wrapped text) ──
sub layoutFact(fact as String)
  ' Estimate wrapped line count (~37 chars/line at 42px Outfit in 820px).
  lines = Int(Len(fact) / 37) + 1
  if lines > 6 then lines = 6
  textH = lines * 58
  blockH = 22 + 32 + textH
  topY = Int((1080 - blockH) / 2)
  if topY < 120 then topY = 120
  m.s1FactKicker.translation = [0, topY]
  m.s1FactText.translation = [70, topY + 22 + 32]
end sub

' ── Screen 1 RIGHT: logo + kicker + up to 7 rows, vertically centered ──
sub layoutStandings(scores as Object)
  n = scores.count()
  if n > 7 then n = 7

  ' Logo sm ≈ 123px wide → center in 960px half.
  headH = 28 + 8 + 18           ' logo + gap + kicker
  rowsH = 0
  if n > 0 then rowsH = n * 66 + (n - 1) * 12
  gapHeadRows = 24
  totalH = headH + gapHeadRows + rowsH
  if n = 0 then totalH = headH + 80
  topY = Int((1080 - totalH) / 2)
  if topY < 70 then topY = 70

  m.s1Logo.translation = [418, topY]
  m.s1Kicker.translation = [0, topY + 36]

  rowsY = topY + headH + gapHeadRows
  m.s1Rows.translation = [48, rowsY]

  m.s1Empty.visible = (n = 0)
  if n = 0 then m.s1Empty.translation = [0, rowsY + 10]

  for i = 0 to 6
    r = m.rows[i]
    if i < n
      p = scores[i]
      nm = "Player"
      if p.name <> invalid then nm = p.name
      if p.playerName <> invalid then nm = p.playerName
      sc = 0
      if p.score <> invalid then sc = p.score

      r.group.visible = true
      r.group.translation = [0, i * 78]
      r.rank.text = Str(i + 1).trim()
      r.name.text = nm
      r.score.text = btwThousands(sc)
      r.avatar.setField("playerName", nm)

      ' top-3 rank gold; first row highlighted (gold border + brighter bg + bold name)
      if i < 3 then r.rank.color = "#ffd200" else r.rank.color = "#ffffff4D"
      if i = 0
        r.bg.uri = "pkg:/images/row2s-first.png"
        r.name.color = "#f5f5f5"
        r.name.font = makeFont("Outfit-Bold", 25)
      else
        r.bg.uri = "pkg:/images/row2s-bg.png"
        r.name.color = "#ffffffB3"
        r.name.font = makeFont("Outfit-SemiBold", 25)
      end if
    else
      r.group.visible = false
    end if
  end for
end sub

' ── Screen 2 RIGHT: static Play-card column, vertically centered in 960 half ──
sub layoutPlayCard()
  ' Heights: brain72 + title55 + offer36 + scan21 + card268 + url21 + code49
  totalH = 72 + 12 + 55 + 8 + 36 + 6 + 21 + 28 + 268 + 20 + 21 + 16 + 49
  y = Int((1080 - totalH) / 2)
  if y < 40 then y = 40

  m.playBrain.translation = [480 - 36, y] : y = y + 72 + 12
  m.playTitle.translation = [0, y]        : y = y + 55 + 8
  m.playOffer.translation = [0, y]        : y = y + 36 + 6
  m.playScan.translation = [0, y]         : y = y + 21 + 28
  m.playQRCard.translation = [480 - 134, y]
  m.playQR.translation = [480 - 122, y + 12] : y = y + 268 + 20
  m.playUrl.translation = [0, y]          : y = y + 21 + 16
  m.codeRowY = y                          ' code row laid out per barCode
end sub

' Center the "CODE  XXXXX" pair under the URL.
sub layoutCodeRow(barCode as String)
  if m.codeRowY = invalid then return
  ' "CODE" ≈ 58px (DMMono 20); code ≈ 36px/char (Fredoka 49 + tracking)
  codeW = Len(barCode) * 36
  pairW = 58 + 14 + codeW
  startX = Int(480 - pairW / 2)
  m.playCodeKicker.translation = [startX, m.codeRowY + 20]
  m.playCode.translation = [startX + 58 + 14, m.codeRowY]
end sub

' ── Signage panel (Screen 2 left half) ──
sub onSignageSlidesChanged(event as Object)
  slides = event.getData()
  if slides = invalid then slides = []
  m.hasSignage = (slides.count() > 0)

  if m.hasSignage
    ' Venue ad fills the left half (web Screen 2 left = venue signage slide).
    m.signagePanel.setField("barCode", m.top.getField("barCode"))
    m.signagePanel.setField("barName", m.top.getField("barName"))
    m.signagePanel.setField("barLogoUrl", m.top.getField("barLogoUrl"))
    m.signagePanel.setField("signageSlides", slides)
    m.signagePanel.setField("signageIndex", m.top.getField("signageIndex"))
    m.signagePanel.visible = true
    m.s2Welcome.visible = false
  else
    ' No signage → clean WELCOME card (web Screen 2 left fallback).
    m.signagePanel.visible = false
    m.s2Welcome.visible = true
  end if
end sub

sub onSignageIndexChanged(event as Object)
  if m.hasSignage
    m.signagePanel.setField("signageIndex", event.getData())
  end if
end sub

sub onVisibleChanged()
  if not m.top.visible
    m.toggleTimer.control = "stop"
  end if
end sub

' Thousands separator (web toLocaleString): 6619 → "6,619"
function btwThousands(n as Integer) as String
  s = Str(n).trim()
  neg = false
  if Left(s, 1) = "-"
    neg = true
    s = Mid(s, 2)
  end if
  out = ""
  count = 0
  for i = Len(s) to 1 step -1
    out = Mid(s, i, 1) + out
    count = count + 1
    if count = 3 and i > 1
      out = "," + out
      count = 0
    end if
  end for
  if neg then out = "-" + out
  return out
end function
