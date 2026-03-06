' LeaderRow — Single leaderboard/standings row
' Uses formatScore() from Utils.brs

sub init()
  m.rowBg = m.top.findNode("rowBg")
  m.rankLabel = m.top.findNode("rankLabel")
  m.nameLabel = m.top.findNode("nameLabel")
  m.scoreLabel = m.top.findNode("scoreLabel")
  m.playerAvatar = m.top.findNode("playerAvatar")
end sub

sub onDataChanged(event as Object)
  data = event.getData()
  if data = invalid then return

  name = ""
  if data.name <> invalid then name = data.name
  if name = "" and data.playerName <> invalid then name = data.playerName
  if name = "" then name = "Player"

  score = 0
  if data.score <> invalid then score = data.score

  m.nameLabel.text = name
  m.scoreLabel.text = formatScore(score)
  m.playerAvatar.setField("playerName", name)
  m.playerAvatar.setField("avatarSize", "sm")
end sub

sub onRankChanged(event as Object)
  rank = event.getData()
  m.rankLabel.text = Str(rank).trim()
  m.playerAvatar.setField("rank", rank)

  ' Gold color for top 3
  if rank <= 3
    m.rankLabel.color = "#ffd200"
  else
    m.rankLabel.color = "#ffffff40"
  end if
end sub
