sub init()
  m.codeLabel = m.top.findNode("codeLabel")
  m.catGrid = m.top.findNode("catGrid")
  fixAllLabelFonts(m.top)
end sub

sub onBarCodeChanged()
  m.codeLabel.text = m.top.barCode
end sub

sub onCategoriesChanged()
  ' Clear existing cells
  kids = m.catGrid.getChildren(-1, 0)
  if kids.count() > 0 then m.catGrid.removeChildren(kids)

  cats = m.top.categories
  if cats = invalid then return
  count = cats.count()
  if count > 8 then count = 8

  ' 2-column grid: col x = 1076 / 1450, row pitch 100, cell 358x84
  for i = 0 to count - 1
    col = i mod 2
    row = Int(i / 2)
    x = 1076 + col * 374
    y = 470 + row * 100

    cell = CreateObject("roSGNode", "Group")
    cell.translation = [x, y]

    bg = cell.createChild("Rectangle")
    bg.width = 358
    bg.height = 84
    bg.color = "#ffffff12"

    emojiUri = getEmojiUri(getCategoryEmoji(cats[i]), "sm")
    if emojiUri <> ""
      icon = cell.createChild("Poster")
      icon.uri = emojiUri
      icon.width = 36
      icon.height = 36
      icon.translation = [19, 24]
    end if

    lbl = cell.createChild("Label")
    lbl.translation = [63, 0]
    lbl.width = 278
    lbl.height = 84
    lbl.vertAlign = "center"
    lbl.wrap = true
    lbl.maxLines = 2
    lbl.color = "#ffffffD9"
    fnt = CreateObject("roSGNode", "Font")
    fnt.uri = "pkg:/fonts/Outfit-SemiBold.ttf"
    fnt.size = 21
    lbl.font = fnt
    lbl.text = cats[i]

    m.catGrid.appendChild(cell)
  end for
end sub

' Map a category name to its emoji (ported from web app.js getCategoryIcon — order matters).
function getCategoryEmoji(category as Dynamic) as String
  if category = invalid or category = "" then return "🧠"
  c = LCase(category)
  pairs = [
    ["nhl","🏒"],["nfl","🏈"],["nba","🏀"],["mlb","⚾"],["ncaa","🎓"],["nascar","🏁"],["olympic","🏅"],["soccer","⚽"],
    ["disney","🏰"],["pop culture","🌟"],["true crime","🔍"],["social media","📱"],["road trip","🚗"],["national park","🏕️"],
    ["board game","🎮"],["video game","🎮"],["human body","🧬"],["planet earth","🌎"],["world record","🤯"],
    ["broadway","🎭"],["theater","🎭"],["performing","🎭"],["movie","🎬"],["hollywood","🎬"],["blockbuster","🎬"],
    ["president","🏛️"],["government","⚖️"],["constitution","⚖️"],["beer","🍺"],["wine","🍺"],["cocktail","🍺"],
    ["biology","🧬"],["chemistry","⚗️"],["physics","⚗️"],["brand","📢"],["advertising","📢"],["building","🏗️"],["architecture","🏗️"],
    ["fashion","👗"],["holiday","🎄"],["tradition","🎄"],["decade","📻"],["nostalgia","📻"],["medicine","🩺"],["health","🩺"],
    ["river","🏔️"],["mountain","🏔️"],["ocean","🌊"],["bible","📖"],["religion","📖"],["celebrity","🌟"],["wrestling","🥊"],["combat","🥊"],
    ["crime","🔍"],["infamous","🔍"],["weird","🤯"],["travel","✈️"],["famous cities","✈️"],["business","💼"],["entrepreneur","💼"],
    ["invention","💡"],["environment","🌎"],["weather","🌦️"],["geology","🌋"],["streaming","📺"],["television","📺"],
    ["song","🎵"],["lyric","🎵"],["album","🎵"],["computer","💻"],["internet","💻"],["landmark","📍"],["flag","🗺️"],
    ["science","🔬"],["history","📜"],["geography","🌍"],["sport","⚽"],["entertainment","🎭"],["music","🎵"],
    ["art","🎨"],["literature","📚"],["technology","💻"],["tech","💻"],["nature","🌿"],["food","🍕"],["dining","🍕"],
    ["tv","📺"],["gaming","🎮"],["animal","🐾"],["wildlife","🐾"],["math","🔢"],["number","🔢"],["logic","🔢"],
    ["politic","🏛️"],["space","🚀"],["astrono","🚀"],["myth","⚡"],["folklore","⚡"],["language","💬"],["word","💬"],["phrase","💬"]
  ]
  for each p in pairs
    if Instr(1, c, p[0]) > 0 then return p[1]
  end for
  return "🧠"
end function

' Emoji char → pkg:/images/emoji-{size}-{codepoints}.png (matches generate-assets naming).
function getEmojiUri(emoji as String, size as String) as String
  if emoji = "" then return ""
  parts = []
  i = 0
  while i < Len(emoji)
    code = Asc(Mid(emoji, i + 1, 1))
    if code >= &hD800 and code <= &hDBFF and i + 1 < Len(emoji)
      low = Asc(Mid(emoji, i + 2, 1))
      cp = (code - &hD800) * &h400 + (low - &hDC00) + &h10000
      parts.push(toHex(cp))
      i = i + 2
    else if code = &hFE0F
      parts.push("fe0f")
      i = i + 1
    else if code <> &h200D
      parts.push(toHex(code))
      i = i + 1
    else
      i = i + 1
    end if
  end while
  if parts.count() = 0 then return ""
  name = "emoji-" + size + "-"
  for j = 0 to parts.count() - 1
    if j > 0 then name = name + "-"
    name = name + parts[j]
  end for
  return "pkg:/images/" + name + ".png"
end function

function toHex(val as Integer) as String
  if val = 0 then return "0"
  digits = "0123456789abcdef"
  s = ""
  v = val
  while v > 0
    s = Mid(digits, (v mod 16) + 1, 1) + s
    v = Int(v / 16)
  end while
  return s
end function
