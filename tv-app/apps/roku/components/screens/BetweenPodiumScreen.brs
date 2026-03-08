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

  ' Podium widget wants an array of {name, score}
  m.podium.setField("scores", players)

  ' Ranks 4-10 in right column
  for i = 0 to 6
    idx = i + 3  ' players[3] = rank 4, etc.
    if idx < players.count()
      m.rankRows[i].setField("playerData", players[idx])
      m.rankRows[i].setField("playerRank", idx + 1)
      m.rankRows[i].visible = true
    else
      m.rankRows[i].visible = false
    end if
  end for

  ' Show/hide right column based on whether there are runners up
  m.rightCol.visible = (players.count() > 3)
end sub
