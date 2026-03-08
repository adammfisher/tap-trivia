' BetweenNationalScreen — Phase 3: National top 25 players, platform stats, cutoff
' Data: betweenData.national = { top25: [{name,bar,city,score}], stats, cutoffScore, yourBarBest }

sub init()
  m.col1Rows = m.top.findNode("col1Rows")
  m.col2Rows = m.top.findNode("col2Rows")
  m.stat1Value = m.top.findNode("stat1Value")
  m.stat2Value = m.top.findNode("stat2Value")
  m.cutoffValue = m.top.findNode("cutoffValue")
  m.yourBarCard = m.top.findNode("yourBarCard")
  m.yourBarName = m.top.findNode("yourBarName")
  m.yourBarScore = m.top.findNode("yourBarScore")
  m.qrBadge = m.top.findNode("qrBadge")
  m.countdownBar = m.top.findNode("countdownBar")

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

  national = data.national
  if national = invalid then return

  ' Top 25 players — split into two columns
  top25 = []
  if national.top25 <> invalid then top25 = national.top25

  ' Clear existing dynamic rows
  m.col1Rows.removeChildrenIndex(m.col1Rows.getChildCount(), 0)
  m.col2Rows.removeChildrenIndex(m.col2Rows.getChildCount(), 0)

  ' Column 1: ranks 1-13
  for i = 0 to 12
    if i < top25.count()
      addNationalRow(m.col1Rows, top25[i], i + 1, i)
    end if
  end for

  ' Column 2: ranks 14-25
  for i = 13 to 24
    if i < top25.count()
      addNationalRow(m.col2Rows, top25[i], i + 1, i - 13)
    end if
  end for

  ' Platform stats
  stats = national.stats
  if stats <> invalid
    players = 0
    if stats.players <> invalid then players = stats.players
    bars = 0
    if stats.bars <> invalid then bars = stats.bars
    m.stat1Value.text = formatNumber(players)
    m.stat2Value.text = formatNumber(bars)
  end if

  ' Cutoff score
  cutoff = 0
  if national.cutoffScore <> invalid then cutoff = national.cutoffScore
  if cutoff > 0
    m.cutoffValue.text = formatScore(cutoff) + " pts"
  else
    m.cutoffValue.text = "—"
  end if

  ' Your bar's best
  if national.yourBarBest <> invalid
    m.yourBarCard.visible = true
    yName = "Anonymous"
    if national.yourBarBest.name <> invalid and national.yourBarBest.name <> ""
      yName = national.yourBarBest.name
    end if
    m.yourBarName.text = yName
    yScore = 0
    if national.yourBarBest.score <> invalid then yScore = national.yourBarBest.score
    m.yourBarScore.text = formatScore(yScore)
  else
    m.yourBarCard.visible = false
  end if
end sub

sub addNationalRow(parent as Object, player as Object, rank as Integer, yIdx as Integer)
  rowH = 68
  yPos = yIdx * 74

  row = CreateObject("roSGNode", "Group")
  row.translation = [0, yPos]

  ' Glass background
  bg = CreateObject("roSGNode", "Rectangle")
  bg.width = 440
  bg.height = rowH
  bg.color = "#ffffff"
  bg.opacity = 0.06
  row.appendChild(bg)

  ' Rank number
  rankLabel = CreateObject("roSGNode", "Label")
  rankLabel.translation = [8, 20]
  rankLabel.width = 44
  rankLabel.horizAlign = "center"
  rankLabel.font = makeFont("Fredoka-Bold", 22)
  if rank <= 3
    rankLabel.color = "#ffd200"
  else
    rankLabel.color = "#ffffff60"
  end if
  rankLabel.text = Str(rank).trim()
  row.appendChild(rankLabel)

  ' Player name
  nameLabel = CreateObject("roSGNode", "Label")
  nameLabel.translation = [56, 10]
  nameLabel.width = 240
  nameLabel.font = makeFont("Outfit-SemiBold", 20)
  nameLabel.color = "#f0f0f0"
  pName = "Anonymous"
  if player.name <> invalid and player.name <> "" then pName = player.name
  nameLabel.text = pName
  row.appendChild(nameLabel)

  ' Bar/city info
  infoLabel = CreateObject("roSGNode", "Label")
  infoLabel.translation = [56, 36]
  infoLabel.width = 240
  infoLabel.font = makeFont("Outfit-Regular", 16)
  infoLabel.color = "#ffffff60"
  info = ""
  if player.bar <> invalid and player.bar <> "" then info = player.bar
  if player.city <> invalid and player.city <> ""
    if info <> "" then info = info + " · "
    info = info + player.city
  end if
  infoLabel.text = info
  row.appendChild(infoLabel)

  ' Score
  scoreLabel = CreateObject("roSGNode", "Label")
  scoreLabel.translation = [300, 18]
  scoreLabel.width = 130
  scoreLabel.horizAlign = "right"
  scoreLabel.font = makeFont("Fredoka-Bold", 22)
  scoreLabel.color = "#ffd200"
  pScore = 0
  if player.score <> invalid then pScore = player.score
  scoreLabel.text = formatScore(pScore)
  row.appendChild(scoreLabel)

  parent.appendChild(row)
end sub

function formatNumber(n as Integer) as String
  if n >= 1000000
    return Str(Int(n / 1000000)).trim() + "." + Str(Int((n mod 1000000) / 100000)).trim() + "M"
  end if
  if n >= 1000
    return Str(Int(n / 1000)).trim() + "." + Str(Int((n mod 1000) / 100)).trim() + "K"
  end if
  return Str(n).trim()
end function
