' BetweenStandingsScreen — Phase 2: Bar score index, state rankings, national rank
' Data: betweenData.barStandings = { yourBar: {name,city,state,rank,index,...}, stateRanking: [...], stateName }

sub init()
  m.leftCol = m.top.findNode("leftCol")
  m.rightCol = m.top.findNode("rightCol")
  m.barNameCallout = m.top.findNode("barNameCallout")
  m.barCityState = m.top.findNode("barCityState")
  m.scoreIndexValue = m.top.findNode("scoreIndexValue")
  m.stateLabel = m.top.findNode("stateLabel")
  m.nationalRankValue = m.top.findNode("nationalRankValue")
  m.qrBadge = m.top.findNode("qrBadge")
  m.countdownBar = m.top.findNode("countdownBar")

  ' State ranking rows
  m.stateRows = []
  for i = 1 to 5
    row = m.top.findNode("stateRow" + Str(i).trim())
    m.stateRows.push(row)
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

  standings = data.barStandings
  if standings = invalid then return

  ' Your bar callout
  yourBar = standings.yourBar
  if yourBar <> invalid
    barName = "Unknown"
    if yourBar.name <> invalid and yourBar.name <> "" then barName = yourBar.name
    m.barNameCallout.text = barName

    cityState = ""
    if yourBar.city <> invalid and yourBar.city <> "" then cityState = yourBar.city
    if yourBar.state <> invalid and yourBar.state <> ""
      if cityState <> "" then cityState = cityState + ", "
      cityState = cityState + yourBar.state
    end if
    m.barCityState.text = cityState

    idx = 0
    if yourBar.index <> invalid then idx = yourBar.index
    m.scoreIndexValue.text = formatScore(idx)

    ' National rank
    natRank = 0
    if yourBar.nationalRank <> invalid then natRank = yourBar.nationalRank
    totalBars = 0
    if yourBar.totalBars <> invalid then totalBars = yourBar.totalBars
    if natRank > 0 and totalBars > 0
      m.nationalRankValue.text = "#" + Str(natRank).trim() + " of " + Str(totalBars).trim() + " bars"
    else if natRank > 0
      m.nationalRankValue.text = "#" + Str(natRank).trim()
    else
      m.nationalRankValue.text = "-"
    end if
  end if

  ' State name heading
  stateName = ""
  if standings.stateName <> invalid then stateName = standings.stateName
  m.stateLabel.text = stateName + " Rankings"

  ' State ranking rows — use LeaderRow but pass bar data as playerData
  stateRanking = []
  if standings.stateRanking <> invalid then stateRanking = standings.stateRanking

  myBarCode = m.top.getField("barCode")

  for i = 0 to 4
    if i < stateRanking.count()
      bar = stateRanking[i]
      ' Build player-like data for LeaderRow widget
      rowData = {
        name: safeStr(bar.name),
        score: safeInt(bar.index, 0)
      }
      rank = safeInt(bar.rank, i + 1)
      m.stateRows[i].setField("playerData", rowData)
      m.stateRows[i].setField("playerRank", rank)
      m.stateRows[i].visible = true
    else
      m.stateRows[i].visible = false
    end if
  end for
end sub

function safeStr(val as Dynamic) as String
  if val = invalid then return ""
  return val.toStr()
end function
