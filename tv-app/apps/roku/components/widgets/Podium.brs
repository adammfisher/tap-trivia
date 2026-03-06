' Podium — 3-place podium display (2nd | 1st | 3rd)
' Matches web app's podiumHTML() function
' Uses formatScore() from Utils.brs

sub init()
  m.avatar1 = m.top.findNode("avatar1")
  m.avatar2 = m.top.findNode("avatar2")
  m.avatar3 = m.top.findNode("avatar3")
  m.name1 = m.top.findNode("name1")
  m.name2 = m.top.findNode("name2")
  m.name3 = m.top.findNode("name3")
  m.score1 = m.top.findNode("score1")
  m.score2 = m.top.findNode("score2")
  m.score3 = m.top.findNode("score3")
  m.place1 = m.top.findNode("place1")
  m.place2 = m.top.findNode("place2")
  m.place3 = m.top.findNode("place3")

  m.showScores = true
end sub

sub onShowScoreChanged(event as Object)
  m.showScores = event.getData()
end sub

sub onScoresChanged(event as Object)
  scores = event.getData()
  if scores = invalid then scores = []

  ' Display order: 2nd, 1st, 3rd (matching web app)
  ' Data order: scores[0]=1st, scores[1]=2nd, scores[2]=3rd

  ' 1st place
  if scores.count() > 0
    p = scores[0]
    name = getName(p)
    m.avatar1.setField("playerName", name)
    m.avatar1.setField("rank", 1)
    m.avatar1.setField("avatarSize", "xl")
    m.name1.text = name
    if m.showScores
      m.score1.text = formatScore(getScore(p))
    end if
    m.place1.visible = true
  else
    m.place1.visible = false
  end if

  ' 2nd place
  if scores.count() > 1
    p = scores[1]
    name = getName(p)
    m.avatar2.setField("playerName", name)
    m.avatar2.setField("rank", 2)
    m.avatar2.setField("avatarSize", "lg")
    m.name2.text = name
    if m.showScores
      m.score2.text = formatScore(getScore(p))
    end if
    m.place2.visible = true
  else
    m.place2.visible = false
  end if

  ' 3rd place
  if scores.count() > 2
    p = scores[2]
    name = getName(p)
    m.avatar3.setField("playerName", name)
    m.avatar3.setField("rank", 3)
    m.avatar3.setField("avatarSize", "lg")
    m.name3.text = name
    if m.showScores
      m.score3.text = formatScore(getScore(p))
    end if
    m.place3.visible = true
  else
    m.place3.visible = false
  end if
end sub

function getName(p as Object) as String
  if p.name <> invalid then return p.name
  if p.playerName <> invalid then return p.playerName
  return "Player"
end function

function getScore(p as Object) as Integer
  if p.score <> invalid then return p.score
  return 0
end function
