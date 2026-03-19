' BetweenPodiumScreen — Phase 1: Trophy + top 3 podium + ranks 4-10
' Data: betweenData.podium = { players: [{name, score, rank}], questionCount, playerCount }

sub init()
  m.leftCol = m.top.findNode("leftCol")
  m.rightCol = m.top.findNode("rightCol")
  m.headingLabel = m.top.findNode("headingLabel")
  m.statsLabel = m.top.findNode("statsLabel")
  m.podium = m.top.findNode("podium")
  m.qrBadge = m.top.findNode("qrBadge")
  m.countdownBar = m.top.findNode("countdownBar")
  m.trophyIcon = m.top.findNode("trophyIcon")

  ' Rank rows 4-10
  m.rankRows = []
  for i = 4 to 10
    row = m.top.findNode("rank" + Str(i).trim())
    m.rankRows.push(row)
  end for

  fixAllLabelFonts(m.top)
end sub

sub onEpochChanged(event as Object)
  m.countdownBar.setField("nextGameEpoch", event.getData())
end sub

' Reposition layout: centered full-width (no runners) vs two-column (with runners)
sub layoutForPlayers(playerCount as Integer)
  hasRunners = (playerCount > 3)
  m.rightCol.visible = hasRunners

  if hasRunners
    ' Two-column: left half for podium, right half for ranks 4-10
    m.leftCol.translation = [0, 80]
    m.trophyIcon.translation = [430, 10]
    m.headingLabel.width = 960
    m.statsLabel.width = 960
    m.podium.translation = [80, 220]
    ' QR bottom-right
    m.qrBadge.translation = [1520, 920]
  else
    ' Centered full-width layout matching web
    m.leftCol.translation = [0, 60]
    m.trophyIcon.translation = [910, 10]
    m.headingLabel.width = 1920
    m.statsLabel.width = 1920
    if playerCount = 2
      ' 2 players: only place1 (x=240,w=280) + place2 (x=0,w=200) visible
      ' Visual center ~260px into widget, shift right to center on screen
      m.podium.translation = [700, 220]
    else if playerCount = 1
      ' 1 player: only place1 (x=240,w=280), center of widget ~380px
      m.podium.translation = [580, 220]
    else
      ' 3 players: full 760px widget, (1920-760)/2 = 580
      m.podium.translation = [580, 220]
    end if
    ' QR badge 360px wide at bottom center: (1920-360)/2 = 780
    m.qrBadge.translation = [780, 880]
  end if
end sub

sub onDataChanged(event as Object)
  data = event.getData()
  if data = invalid then return

  barCode = m.top.getField("barCode")
  m.qrBadge.setField("barCode", barCode)

  podium = data.podium
  if podium = invalid then return

  ' Stats line
  qCount = 15
  if podium.questionCount <> invalid then qCount = podium.questionCount
  pCount = 0
  if podium.playerCount <> invalid then pCount = podium.playerCount
  m.statsLabel.text = Str(qCount).trim() + " questions · " + Str(pCount).trim() + " players"

  ' Build scores array for Podium widget
  players = []
  if podium.players <> invalid then players = podium.players

  if players.count() = 0
    m.statsLabel.text = Str(qCount).trim() + " questions"
    m.podium.visible = false
    layoutForPlayers(0)
    ' Show "No players" label
    emptyLabel = CreateObject("roSGNode", "Label")
    emptyLabel.translation = [0, 300]
    emptyLabel.width = 1920
    emptyLabel.horizAlign = "center"
    emptyLabel.color = "#ffffff80"
    emptyLabel.text = "No players this round"
    emptyLabel.font = makeFont("Outfit-Regular", 32)
    m.leftCol.appendChild(emptyLabel)
    return
  end if

  m.podium.visible = true
  m.podium.setField("scores", players)

  ' Ranks 4-10 in right column
  for i = 0 to 6
    idx = i + 3
    if idx < players.count()
      m.rankRows[i].setField("playerData", players[idx])
      m.rankRows[i].setField("playerRank", idx + 1)
      m.rankRows[i].visible = true
    else
      m.rankRows[i].visible = false
    end if
  end for

  layoutForPlayers(players.count())
end sub
