sub init()
  m.standingsLabel = m.top.findNode("standingsLabel")
  m.rowsGroup = m.top.findNode("rowsGroup")
  fixAllLabelFonts(m.top)
end sub

sub onBarNameChanged()
  m.standingsLabel.text = "FINAL STANDINGS · " + m.top.barName
end sub

sub onStandingsChanged()
  kids = m.rowsGroup.getChildren(-1, 0)
  if kids.count() > 0 then m.rowsGroup.removeChildren(kids)

  rows = m.top.standings
  if rows = invalid then return
  count = rows.count()
  if count > 5 then count = 5

  for i = 0 to count - 1
    p = rows[i]
    name = ""
    if p.name <> invalid then name = p.name else if p.playerName <> invalid then name = p.playerName
    score = 0
    if p.score <> invalid then score = p.score
    first = (i = 0)
    rowTop = 380 + i * 95

    cell = CreateObject("roSGNode", "Group")
    cell.translation = [0, rowTop]

    bg = cell.createChild("Rectangle")
    bg.width = 980
    bg.height = 84
    bg.translation = [470, 0]
    if first then bg.color = "#ffd200" else bg.color = "#ffffff0D"

    ' Rank — crown for #1, number otherwise
    if first
      crown = cell.createChild("Poster")
      crown.uri = "pkg:/images/emoji-md-1f451.png"
      crown.width = 44
      crown.height = 44
      crown.translation = [496, 14]
    else
      rankLbl = cell.createChild("Label")
      rankLbl.translation = [490, 12]
      rankLbl.width = 40
      rankLbl.horizAlign = "center"
      if i < 3 then rankLbl.color = "#ffd200" else rankLbl.color = "#ffffff4D"
      rankLbl.font = makeRowFont("Fredoka-Bold", 33)
      rankLbl.text = Str(i + 1).trim()
    end if

    ' Avatar
    av = cell.createChild("Avatar")
    av.setField("playerName", name)
    av.setField("rank", 0)
    av.setField("avatarSize", "md")
    av.translation = [561, 7]

    ' Name
    nameLbl = cell.createChild("Label")
    nameLbl.translation = [636, 18]
    nameLbl.width = 580
    if first
      nameLbl.color = "#1e0f4a"
      nameLbl.font = makeRowFont("Outfit-Bold", 28)
    else
      nameLbl.color = "#ffffffCC"
      nameLbl.font = makeRowFont("Outfit-SemiBold", 28)
    end if
    nameLbl.text = name

    ' Score (right-aligned, block ends at x≈1420)
    scoreLbl = cell.createChild("Label")
    scoreLbl.translation = [1240, 18]
    scoreLbl.width = 180
    scoreLbl.horizAlign = "right"
    if first then scoreLbl.color = "#1e0f4a" else scoreLbl.color = "#ffd200"
    scoreLbl.font = makeRowFont("Fredoka-Bold", 28)
    scoreLbl.text = formatScore(score)

    m.rowsGroup.appendChild(cell)
  end for
end sub

function makeRowFont(name as String, size as Integer) as Object
  f = CreateObject("roSGNode", "Font")
  f.uri = "pkg:/fonts/" + name + ".ttf"
  f.size = size
  return f
end function

function formatScore(n as Dynamic) as String
  v = 0
  if n <> invalid then v = Int(n)
  s = Str(v).trim()
  ' thousands separator
  neg = false
  if Left(s, 1) = "-" then neg = true : s = Mid(s, 2)
  out = ""
  c = 0
  for i = Len(s) to 1 step -1
    out = Mid(s, i, 1) + out
    c = c + 1
    if c mod 3 = 0 and i > 1 then out = "," + out
  end for
  if neg then out = "-" + out
  return out
end function
