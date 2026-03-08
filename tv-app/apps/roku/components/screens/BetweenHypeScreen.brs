' BetweenHypeScreen — Phase 4: Logo + category pills + big QR code + bar code
' Data: betweenData.hype = { nextGameId, categories: [...], startsAt }

sub init()
  m.logo = m.top.findNode("logo")
  m.logo.setField("logoSize", "hero")
  m.pillContainer = m.top.findNode("pillContainer")
  m.bigCodeLabel = m.top.findNode("bigCodeLabel")
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
  m.bigCodeLabel.text = barCode

  hype = data.hype
  if hype = invalid then return

  ' Build category pills
  categories = []
  if hype.categories <> invalid then categories = hype.categories

  ' Clear existing pills
  m.pillContainer.removeChildrenIndex(m.pillContainer.getChildCount(), 0)

  if categories.count() = 0 then return

  ' Calculate pill layout — centered, wrapping rows
  pillW = 220
  pillH = 48
  pillGap = 12
  maxPerRow = 6
  totalW = 1920

  ' Split into rows
  rowCount = 0
  idx = 0
  rows = []
  while idx < categories.count()
    rowItems = []
    rowEnd = idx + maxPerRow
    if rowEnd > categories.count() then rowEnd = categories.count()
    while idx < rowEnd
      rowItems.push(categories[idx])
      idx = idx + 1
    end while
    rows.push(rowItems)
    rowCount = rowCount + 1
  end while

  ' Render each row centered
  for rowIdx = 0 to rows.count() - 1
    rowItems = rows[rowIdx]
    rowW = rowItems.count() * pillW + (rowItems.count() - 1) * pillGap
    startX = Int((totalW - rowW) / 2)
    yPos = rowIdx * (pillH + pillGap)

    for colIdx = 0 to rowItems.count() - 1
      cat = rowItems[colIdx]
      xPos = startX + colIdx * (pillW + pillGap)
      addCategoryPill(cat, xPos, yPos)
    end for
  end for
end sub

sub addCategoryPill(category as String, xPos as Integer, yPos as Integer)
  pill = CreateObject("roSGNode", "Group")
  pill.translation = [xPos, yPos]

  ' Glass background
  bg = CreateObject("roSGNode", "Rectangle")
  bg.width = 220
  bg.height = 48
  bg.color = "#ffffff"
  bg.opacity = 0.10
  pill.appendChild(bg)

  ' Category icon (small, 36px)
  icon = CreateObject("roSGNode", "Poster")
  icon.translation = [8, 6]
  icon.width = 36
  icon.height = 36
  icon.uri = getCategoryIconSmall(category)
  pill.appendChild(icon)

  ' Category name
  nameLabel = CreateObject("roSGNode", "Label")
  nameLabel.translation = [48, 12]
  nameLabel.width = 164
  nameLabel.font = makeFont("Outfit-SemiBold", 18)
  nameLabel.color = "#f0f0f0"
  nameLabel.text = category
  pill.appendChild(nameLabel)

  m.pillContainer.appendChild(pill)
end sub

' Small category icon for pills (48px versions)
function getCategoryIconSmall(category as String) as String
  uri = getCategoryIcon(category)
  return uri.Replace("cat-", "cat-sm-")
end function

' Category icon lookup (same as TapTriviaScene)
function getCategoryIcon(category as String) as String
  if category = "" then return "pkg:/images/cat-default.png"
  c = LCase(category)
  if Instr(1, c, "nhl") > 0 then return "pkg:/images/cat-nhl.png"
  if Instr(1, c, "nfl") > 0 then return "pkg:/images/cat-nfl.png"
  if Instr(1, c, "nba") > 0 then return "pkg:/images/cat-nba.png"
  if Instr(1, c, "mlb") > 0 then return "pkg:/images/cat-mlb.png"
  if Instr(1, c, "olympic") > 0 then return "pkg:/images/cat-olympics.png"
  if Instr(1, c, "disney") > 0 then return "pkg:/images/cat-disney.png"
  if Instr(1, c, "pop culture") > 0 then return "pkg:/images/cat-pop-culture.png"
  if Instr(1, c, "science") > 0 then return "pkg:/images/cat-science.png"
  if Instr(1, c, "history") > 0 then return "pkg:/images/cat-history.png"
  if Instr(1, c, "geography") > 0 then return "pkg:/images/cat-geography.png"
  if Instr(1, c, "soccer") > 0 then return "pkg:/images/cat-soccer.png"
  if Instr(1, c, "sport") > 0 then return "pkg:/images/cat-sports.png"
  if Instr(1, c, "entertain") > 0 then return "pkg:/images/cat-entertainment.png"
  if Instr(1, c, "music") > 0 then return "pkg:/images/cat-music.png"
  if Instr(1, c, "art") > 0 then return "pkg:/images/cat-art.png"
  if Instr(1, c, "literature") > 0 then return "pkg:/images/cat-literature.png"
  if Instr(1, c, "tech") > 0 then return "pkg:/images/cat-technology.png"
  if Instr(1, c, "nature") > 0 then return "pkg:/images/cat-nature.png"
  if Instr(1, c, "food") > 0 then return "pkg:/images/cat-food.png"
  if Instr(1, c, "movie") > 0 then return "pkg:/images/cat-movies.png"
  if Instr(1, c, "tv") > 0 or Instr(1, c, "television") > 0 then return "pkg:/images/cat-tv.png"
  if Instr(1, c, "gaming") > 0 or Instr(1, c, "video game") > 0 then return "pkg:/images/cat-gaming.png"
  if Instr(1, c, "animal") > 0 then return "pkg:/images/cat-animals.png"
  if Instr(1, c, "math") > 0 or Instr(1, c, "number") > 0 then return "pkg:/images/cat-math.png"
  if Instr(1, c, "politic") > 0 then return "pkg:/images/cat-politics.png"
  if Instr(1, c, "space") > 0 or Instr(1, c, "astrono") > 0 then return "pkg:/images/cat-space.png"
  if Instr(1, c, "myth") > 0 then return "pkg:/images/cat-mythology.png"
  if Instr(1, c, "language") > 0 then return "pkg:/images/cat-language.png"
  return "pkg:/images/cat-default.png"
end function
