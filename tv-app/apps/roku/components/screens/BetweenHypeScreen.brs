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
  if categories.count() > 5 then
    trimmed = []
    for ti = 0 to 4
      trimmed.push(categories[ti])
    end for
    categories = trimmed
  end if

  ' Clear existing pills
  m.pillContainer.removeChildren(m.pillContainer.getChildren(-1, 0))

  if categories.count() = 0 then return

  ' Calculate pill widths based on text length (web: padding 18px 36px, icon 52+14 gap)
  pillH = 72
  pillGap = 20
  totalW = 1920
  iconW = 52
  iconGap = 14
  padH = 36  ' horizontal padding each side

  ' Measure pill widths
  pillWidths = []
  for i = 0 to categories.count() - 1
    ' ~16px per char at 28px Outfit-SemiBold
    textW = Len(categories[i]) * 16
    pw = padH + iconW + iconGap + textW + padH
    if pw < 200 then pw = 200
    pillWidths.push(pw)
  end for

  ' Layout rows: fill rows until width exceeds screen, then wrap
  rows = []
  rowWidths = []
  curRow = []
  curRowW = 0
  maxRowW = 1700
  for i = 0 to categories.count() - 1
    pw = pillWidths[i]
    needed = pw
    if curRow.count() > 0 then needed = needed + pillGap
    if curRowW + needed > maxRowW and curRow.count() > 0
      rows.push(curRow)
      rowWidths.push(curRowW)
      curRow = []
      curRowW = 0
      needed = pw
    end if
    curRow.push(i)
    curRowW = curRowW + needed
  end for
  if curRow.count() > 0
    rows.push(curRow)
    rowWidths.push(curRowW)
  end if

  ' Render each row centered
  for rowIdx = 0 to rows.count() - 1
    rowItems = rows[rowIdx]
    rowW = rowWidths[rowIdx]
    startX = Int((totalW - rowW) / 2)
    yPos = rowIdx * (pillH + pillGap)
    xPos = startX

    for colIdx = 0 to rowItems.count() - 1
      catIdx = rowItems[colIdx]
      addCategoryPill(categories[catIdx], xPos, yPos, pillWidths[catIdx])
      xPos = xPos + pillWidths[catIdx] + pillGap
    end for
  end for
end sub

sub addCategoryPill(category as String, xPos as Integer, yPos as Integer, pillW as Integer)
  pill = CreateObject("roSGNode", "Group")
  pill.translation = [xPos, yPos]

  ' Glass background with pill shape (cornerRadius requires Roku OS 12.5+)
  bg = CreateObject("roSGNode", "Rectangle")
  bg.width = pillW
  bg.height = 72
  bg.color = "#ffffff"
  bg.opacity = 0.10
  if bg.hasField("cornerRadius") then bg.cornerRadius = 36.0
  pill.appendChild(bg)

  ' Category icon (small, 52px)
  icon = CreateObject("roSGNode", "Poster")
  icon.translation = [14, 10]
  icon.width = 52
  icon.height = 52
  icon.uri = getCategoryIconSmall(category)
  pill.appendChild(icon)

  ' Category name (full width, no truncation)
  nameLabel = CreateObject("roSGNode", "Label")
  nameLabel.translation = [80, 18]
  nameLabel.width = pillW - 80 - 36
  nameLabel.font = makeFont("Outfit-SemiBold", 28)
  nameLabel.color = "#f0f0f0"
  nameLabel.text = category
  pill.appendChild(nameLabel)

  m.pillContainer.appendChild(pill)
end sub

' Small category icon for pills (48px versions) — uses getCategoryIconUri from Utils.brs
function getCategoryIconSmall(category as String) as String
  uri = getCategoryIconUri(category)
  return uri.Replace("cat-", "cat-sm-")
end function
