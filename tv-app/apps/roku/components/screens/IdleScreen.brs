' IdleScreen — Full-screen signage rotation or default TapTrivia branding
' Mirrors renderIdle() + SIGNAGE_FS templates from web tv-app/js/app.js

sub init()
  ' ── Node references ──
  m.signageContainer = m.top.findNode("signageContainer")
  m.defaultContainer = m.top.findNode("defaultContainer")
  m.signageBg = m.top.findNode("signageBg")
  m.signageHeader = m.top.findNode("signageHeader")

  ' Header nodes
  m.headerLogo = m.top.findNode("headerLogo")
  m.headerLogo.setField("logoSize", "playing")
  m.headerLogoBg = m.top.findNode("headerLogoBg")
  m.headerLogoInitial = m.top.findNode("headerLogoInitial")
  m.headerLogoPoster = m.top.findNode("headerLogoPoster")
  m.headerBarName = m.top.findNode("headerBarName")
  m.headerCountdownLabel = m.top.findNode("headerCountdownLabel")
  m.headerCountdownValue = m.top.findNode("headerCountdownValue")

  ' Template containers
  m.tplSpecials = m.top.findNode("tplSpecials")
  m.tplHappyhour = m.top.findNode("tplHappyhour")
  m.tplEvent = m.top.findNode("tplEvent")
  m.tplBrand = m.top.findNode("tplBrand")
  m.tplAnnouncement = m.top.findNode("tplAnnouncement")
  m.tplSports = m.top.findNode("tplSports")
  m.tplCustom = m.top.findNode("tplCustom")
  m.tplDefaultQr = m.top.findNode("tplDefaultQr")

  ' Specials nodes
  m.specialsLabelEmoji = m.top.findNode("specialsLabelEmoji")
  m.specialsLabel = m.top.findNode("specialsLabel")
  m.specialsHeadline = m.top.findNode("specialsHeadline")
  m.specialsSubheadline = m.top.findNode("specialsSubheadline")
  m.specialsFeaturedName = m.top.findNode("specialsFeaturedName")
  m.specialsFeaturedDesc = m.top.findNode("specialsFeaturedDesc")
  m.specialsFeaturedPrice = m.top.findNode("specialsFeaturedPrice")
  m.specialsMenuItems = m.top.findNode("specialsMenuItems")

  ' Happy hour nodes
  m.happyhourEmoji = m.top.findNode("happyhourEmoji")
  m.happyhourLabel = m.top.findNode("happyhourLabel")
  m.happyhourTime = m.top.findNode("happyhourTime")
  m.happyhourFreq = m.top.findNode("happyhourFreq")
  m.happyhourDeals = m.top.findNode("happyhourDeals")

  ' Event nodes
  m.eventEmoji = m.top.findNode("eventEmoji")
  m.eventWhen = m.top.findNode("eventWhen")
  m.eventName = m.top.findNode("eventName")
  m.eventDetails = m.top.findNode("eventDetails")
  m.eventPrizes = m.top.findNode("eventPrizes")

  ' Brand nodes
  m.brandLogoBg = m.top.findNode("brandLogoBg")
  m.brandLogoInitial = m.top.findNode("brandLogoInitial")
  m.brandLogoPoster = m.top.findNode("brandLogoPoster")
  m.brandBarName = m.top.findNode("brandBarName")
  m.brandTagline = m.top.findNode("brandTagline")
  m.brandHours = m.top.findNode("brandHours")

  ' Announcement nodes
  m.announcementEmoji = m.top.findNode("announcementEmoji")
  m.announcementHeadline = m.top.findNode("announcementHeadline")
  m.announcementMessage = m.top.findNode("announcementMessage")
  m.announcementSubtext = m.top.findNode("announcementSubtext")

  ' Sports nodes
  m.sportsEmoji = m.top.findNode("sportsEmoji")
  m.sportsHeadline = m.top.findNode("sportsHeadline")
  m.sportsMatchup = m.top.findNode("sportsMatchup")
  m.sportsWhen = m.top.findNode("sportsWhen")
  m.sportsPromo = m.top.findNode("sportsPromo")
  m.sportsTagline = m.top.findNode("sportsTagline")
  m.sportsPromoGroup = m.top.findNode("sportsPromoGroup")

  ' Custom nodes
  m.customEmoji = m.top.findNode("customEmoji")
  m.customHeadline = m.top.findNode("customHeadline")
  m.customBody = m.top.findNode("customBody")
  m.customItems = m.top.findNode("customItems")

  ' Powered footer logos (both brand and QR templates)
  brandPoweredLogo = m.top.findNode("brandPoweredLogo")
  if brandPoweredLogo <> invalid then brandPoweredLogo.setField("logoSize", "playing")
  qrPoweredLogo = m.top.findNode("qrPoweredLogo")
  if qrPoweredLogo <> invalid then qrPoweredLogo.setField("logoSize", "playing")

  ' Default QR nodes
  m.defaultQrBarCode = m.top.findNode("defaultQrBarCode")

  ' Default container nodes
  m.defaultLogo = m.top.findNode("defaultLogo")
  m.defaultLogo.setField("logoSize", "xl")
  m.defaultBarName = m.top.findNode("defaultBarName")

  ' ── State ──
  m.activeSlides = []
  m.currentTemplateGroup = invalid
  m.gsCache = {}

  ' No countdown timer — countdown updated once when gameState arrives.
  ' Display shows "Xh Ym" or "Xm" format, no need for live ticking.

  fixAllLabelFonts(m.top)
end sub

' ══════════════════════════════════════════════════════════════
' GAME STATE CHANGED — main entry point when scene pushes data
' ══════════════════════════════════════════════════════════════

sub onGameStateChanged(event as Object)
  m.gsCache = event.getData()
  if m.gsCache = invalid then m.gsCache = {}

  m.activeSlides = getActiveSlides()
  if m.activeSlides.count() = 0 then m.activeSlides = getDefaultSignageSlides()

  updateHeader()
  updateCountdown()

  if m.activeSlides.count() > 0
    idx = m.top.getField("signageIndex") mod m.activeSlides.count()
    renderSignageSlide(m.activeSlides[idx])
  else
    renderDefaultSlides()
  end if
end sub

' ══════════════════════════════════════════════════════════════
' SIGNAGE SLIDES CHANGED
' ══════════════════════════════════════════════════════════════

sub onSignageSlidesChanged(event as Object)
  m.activeSlides = getActiveSlides()
  if m.activeSlides.count() = 0
    m.activeSlides = getDefaultSignageSlides()
  end if
end sub

' ══════════════════════════════════════════════════════════════
' SIGNAGE INDEX CHANGED — cycle to next slide
' ══════════════════════════════════════════════════════════════

sub onSignageIndexChanged(event as Object)
  if m.activeSlides.count() = 0
    m.activeSlides = getActiveSlides()
    if m.activeSlides.count() = 0
      m.activeSlides = getDefaultSignageSlides()
    end if
  end if

  if m.activeSlides.count() > 0
    idx = event.getData() mod m.activeSlides.count()
    renderSignageSlide(m.activeSlides[idx])
  else
    renderDefaultSlides()
  end if
end sub

' ══════════════════════════════════════════════════════════════
' COUNTDOWN
' ══════════════════════════════════════════════════════════════

sub updateCountdown()
  gameState = m.gsCache
  if gameState = invalid then gameState = {}

  nextEpoch = 0&
  if gameState.nextGameStartEpoch <> invalid
    nextEpoch = gameState.nextGameStartEpoch
  end if

  ' Ensure next game epoch is in the future; if stale, advance to next 15-min slot
  SLOT_MS = 15& * 60 * 1000
  nowMs = getEpochMs()
  if nextEpoch > 0
    while nextEpoch <= nowMs
      nextEpoch = nextEpoch + SLOT_MS
    end while
  end if

  newValue = ""
  newLabel = ""
  if nextEpoch > 0
    secsLeft = Int((nextEpoch - nowMs) / 1000)
    if secsLeft < 0 then secsLeft = 0

    totalMins = Int(secsLeft / 60)
    if totalMins < 1 then totalMins = 1
    hours = Int(totalMins / 60)
    mins = totalMins mod 60

    if hours > 0
      newValue = Str(hours).trim() + "h " + Str(mins).trim() + "m"
    else
      newValue = Str(mins).trim() + "m"
    end if
    newLabel = "TRIVIA STARTS IN"
  end if

  ' Only set label text when value actually changed (avoids unnecessary re-renders)
  if m.headerCountdownValue.text <> newValue
    m.headerCountdownValue.text = newValue
  end if
  if m.headerCountdownLabel.text <> newLabel
    m.headerCountdownLabel.text = newLabel
  end if
end sub

' ══════════════════════════════════════════════════════════════
' HEADER
' ══════════════════════════════════════════════════════════════

sub updateHeader()
  barName = m.top.getField("barName")
  logoUrl = m.top.getField("barLogoUrl")

  m.headerBarName.text = barName

  ' Logo: show poster if URL available, otherwise show initial letter
  if logoUrl <> invalid and logoUrl <> ""
    m.headerLogoPoster.uri = logoUrl
    m.headerLogoPoster.blendColor = "#ffffff"
    m.headerLogoPoster.visible = true
    m.headerLogoInitial.visible = false
  else
    m.headerLogoPoster.visible = false
    m.headerLogoInitial.visible = true
    if barName <> ""
      m.headerLogoInitial.text = Left(UCase(barName), 1)
    else
      m.headerLogoInitial.text = "T"
    end if
  end if
end sub

' ══════════════════════════════════════════════════════════════
' GET ACTIVE SLIDES (filtered by day-of-week)
' ══════════════════════════════════════════════════════════════

function getActiveSlides() as Object
  slides = m.top.getField("signageSlides")
  if slides = invalid then return []

  days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  dt = CreateObject("roDateTime")
  today = days[dt.GetDayOfWeek()]

  active = []
  for each s in slides
    if s.enabled = invalid or s.enabled = false then goto skipSlide
    sDays = invalid
    if s.schedule <> invalid and s.schedule.days <> invalid
      sDays = s.schedule.days
    end if
    if sDays <> invalid and sDays.count() > 0
      found = false
      for each d in sDays
        if d = today then found = true
      end for
      if not found then goto skipSlide
    end if
    active.push(s)
    skipSlide:
  end for
  return active
end function

' ══════════════════════════════════════════════════════════════
' DEFAULT SIGNAGE SLIDES (built-in fallback)
' ══════════════════════════════════════════════════════════════

function getDefaultSignageSlides() as Object
  barCode = m.top.getField("barCode")
  return [
    {
      template: "_defaultQr",
      enabled: true,
      data: {}
    },
    {
      template: "announcement",
      enabled: true,
      data: {
        headline: "Play TapTrivia!",
        message: "Live trivia every 15 minutes - play free on your phone!",
        subtext: "Scan the QR code or visit play.taptrivia.tv"
      }
    },
    {
      template: "custom",
      enabled: true,
      data: {
        headline: "How to Play",
        items: [
          { text: "Scan the QR code or visit play.taptrivia.tv" },
          { text: "Enter your code: " + barCode },
          { text: "Answer fast for more points!" },
          { text: "Top the leaderboard, win bragging rights" }
        ]
      }
    },
  ]
end function

' ══════════════════════════════════════════════════════════════
' RENDER SIGNAGE SLIDE — dispatches to per-template renderer
' ══════════════════════════════════════════════════════════════

sub renderSignageSlide(slide as Object)
  if slide = invalid then
    renderDefaultSlides()
    return
  end if

  template = ""
  if slide.template <> invalid then template = slide.template

  data = {}
  if slide.data <> invalid then data = slide.data

  ' Show signage container, hide default
  m.signageContainer.visible = true
  m.defaultContainer.visible = false

  ' signageBg uses fixed URI from XML (signage-announcement.png).
  ' Never changed at runtime — Roku Poster URI changes are async and
  ' cause 300-500ms transparent flash during PNG decompression.

  m.signageHeader.visible = (template <> "brand")

  ' Render new template (sets it visible)
  if template = "specials"
    renderSpecials(data)
  else if template = "happyhour"
    renderHappyhour(data)
  else if template = "event"
    renderEvent(data)
  else if template = "brand"
    renderBrand(data)
  else if template = "announcement"
    renderAnnouncement(data)
  else if template = "sports"
    renderSports(data)
  else if template = "custom"
    renderCustom(data)
  else if template = "_defaultQr"
    renderDefaultQr(data)
  else
    renderDefaultSlides()
    return
  end if

  ' Hide ONLY the previous template (not all — avoids blank frame)
  if m.currentTemplateGroup <> invalid and m.currentTemplateGroup <> template
    tplNode = getTemplateNode(m.currentTemplateGroup)
    if tplNode <> invalid then tplNode.visible = false
  end if
  m.currentTemplateGroup = template
end sub

function getTemplateNode(tpl as String) as Object
  if tpl = "specials" then return m.tplSpecials
  if tpl = "happyhour" then return m.tplHappyhour
  if tpl = "event" then return m.tplEvent
  if tpl = "brand" then return m.tplBrand
  if tpl = "announcement" then return m.tplAnnouncement
  if tpl = "sports" then return m.tplSports
  if tpl = "custom" then return m.tplCustom
  if tpl = "_defaultQr" then return m.tplDefaultQr
  return invalid
end function


' ══════════════════════════════════════════════════════════════
' EMOJI HELPER — converts emoji string to pre-rendered PNG URI
' ══════════════════════════════════════════════════════════════

function getEmojiUri(emoji as String, size as String) as String
  if emoji = "" then return ""
  ' Build codepoint filename
  cp = ""
  ba = CreateObject("roByteArray")
  ba.fromAsciiString(emoji)
  ' Use a simple approach: get codepoints from first characters
  chars = []
  i = 0
  while i < Len(emoji)
    code = Asc(Mid(emoji, i + 1, 1))
    if code >= &hD800 and code <= &hDBFF and i + 1 < Len(emoji)
      ' Surrogate pair
      low = Asc(Mid(emoji, i + 2, 1))
      codePoint = (code - &hD800) * &h400 + (low - &hDC00) + &h10000
      chars.push(codePoint)
      i = i + 2
    else if code = &hFE0F
      ' Variation selector — include in filename
      chars.push(code)
      i = i + 1
    else if code <> &h200D
      ' Skip zero-width joiner but include other chars
      chars.push(code)
      i = i + 1
    else
      i = i + 1
    end if
  end while

  ' Build hex filename
  parts = []
  for each c in chars
    hex = ""
    val = c
    while val > 0
      digit = val mod 16
      if digit < 10
        hex = Chr(48 + digit) + hex
      else
        hex = Chr(87 + digit) + hex
      end if
      val = Int(val / 16)
    end while
    if hex = "" then hex = "0"
    parts.push(hex)
  end for

  if parts.count() = 0 then return ""
  filename = "emoji-" + size + "-"
  for i = 0 to parts.count() - 1
    if i > 0 then filename = filename + "-"
    filename = filename + parts[i]
  end for
  return "pkg:/images/" + filename + ".png"
end function

' ══════════════════════════════════════════════════════════════
' DYNAMIC CENTERING HELPER — flexbox-like vertical centering
' ══════════════════════════════════════════════════════════════

' Vertically center a list of elements around y=0 (relative to center group).
' Each element: {node: roSGNode, xOff: int, h: int, gap: int}
' Set h = -1 to auto-measure via boundingRect(), or > 0 to use fixed height.
' gap = margin below this element (ignored for last element).
sub centerElementsVertically(elements as Object)
  ' Measure auto-height elements
  for i = 0 to elements.count() - 1
    el = elements[i]
    if el.h < 0
      rect = el.node.boundingRect()
      if rect <> invalid and rect.height > 0
        el.h = Int(rect.height)
      else
        el.h = 40
      end if
      elements[i] = el
    end if
  end for

  ' Calculate total content height
  totalH = 0
  for i = 0 to elements.count() - 1
    totalH = totalH + elements[i].h
    if i < elements.count() - 1
      totalH = totalH + elements[i].gap
    end if
  end for

  ' Position each element from top, centered around y=0
  currentY = -Int(totalH / 2)
  for i = 0 to elements.count() - 1
    el = elements[i]
    el.node.translation = [el.xOff, currentY]
    currentY = currentY + el.h
    if i < elements.count() - 1
      currentY = currentY + el.gap
    end if
  end for
end sub

' ══════════════════════════════════════════════════════════════
' TEMPLATE RENDERERS — one per signage type
' ══════════════════════════════════════════════════════════════

sub renderSpecials(data as Object)
  m.tplSpecials.visible = true

  ' Emoji before label (web: ${d.emoji || ''} ${d.label})
  emojiUri = getEmojiUri(safeField(data, "emoji"), "sm")
  if emojiUri <> ""
    m.specialsLabelEmoji.uri = emojiUri
    m.specialsLabelEmoji.visible = true
    m.specialsLabel.translation = [40, 0]
  else
    m.specialsLabelEmoji.visible = false
    m.specialsLabel.translation = [0, 0]
  end if

  label = safeField(data, "label")
  if label = "" then label = "Today's Specials"
  m.specialsLabel.text = UCase(label)
  m.specialsHeadline.text = safeField(data, "headline")
  m.specialsSubheadline.text = safeField(data, "subheadline")
  m.specialsFeaturedName.text = safeField(data, "featuredName")
  m.specialsFeaturedDesc.text = safeField(data, "featuredDesc")
  m.specialsFeaturedPrice.text = safeField(data, "featuredPrice")

  ' Build menu items dynamically
  m.specialsMenuItems.removeChildrenIndex(m.specialsMenuItems.getChildCount(), 0)
  menuItems = []
  if data.menuItems <> invalid then menuItems = data.menuItems
  yPos = 0
  for i = 0 to menuItems.count() - 1
    item = menuItems[i]
    row = CreateObject("roSGNode", "Group")
    row.translation = [0, yPos]

    ' Glass background (matches web: padding 28px 36px, border-radius 28px, ~792px wide)
    rowBg = CreateObject("roSGNode", "Poster")
    rowBg.uri = "pkg:/images/signage-menu-item-bg.png"
    rowBg.width = 790
    rowBg.height = 112
    row.appendChild(rowBg)

    ' Emoji icon (web: 56px, gap 32px from left padding 36px)
    emojiUri = getEmojiUri(safeField(item, "icon"), "sm")
    if emojiUri <> ""
      emojiPoster = CreateObject("roSGNode", "Poster")
      emojiPoster.uri = emojiUri
      emojiPoster.width = 56
      emojiPoster.height = 56
      emojiPoster.translation = [36, 28]
      row.appendChild(emojiPoster)
    end if

    ' Name label (web: 36+56+32=124 from left)
    nameLabel = CreateObject("roSGNode", "Label")
    nameLabel.text = safeField(item, "name")
    nameLabel.translation = [124, 24]
    nameLabel.font = makeFont("Outfit-Bold", 32)
    nameLabel.color = "#f0f0f0"
    nameLabel.width = 470
    row.appendChild(nameLabel)

    descLabel = CreateObject("roSGNode", "Label")
    descLabel.text = safeField(item, "desc")
    descLabel.translation = [124, 62]
    descLabel.font = makeFont("Outfit-Regular", 24)
    descLabel.color = "#ffffff66"
    descLabel.width = 470
    row.appendChild(descLabel)

    ' Price (web: margin-left auto, right side with 36px padding)
    priceLabel = CreateObject("roSGNode", "Label")
    priceLabel.text = safeField(item, "price")
    priceLabel.translation = [594, 28]
    priceLabel.font = makeFont("Fredoka-Bold", 44)
    priceLabel.color = "#00d4aa"
    priceLabel.horizAlign = "right"
    priceLabel.width = 160
    row.appendChild(priceLabel)

    m.specialsMenuItems.appendChild(row)
    yPos = yPos + 136
  end for

  ' Center columns vertically in content area (header ends ~140, screen 1080)
  contentAreaCenter = 610  ' midpoint of 140–1080
  if menuItems.count() > 0
    rightColHeight = menuItems.count() * 136 - 24
    rightStartY = contentAreaCenter - Int(rightColHeight / 2)
    m.specialsMenuItems.translation = [1056, rightStartY]
  end if

  leftColHeight = 378  ' label + headline + subheadline + featured
  leftStartY = contentAreaCenter - Int(leftColHeight / 2)
  m.specialsLeft = m.top.findNode("specialsLeft")
  m.specialsLeft.translation = [80, leftStartY]
end sub

sub renderHappyhour(data as Object)
  m.tplHappyhour.visible = true

  ' Emoji before label (web: ${d.emoji || ''} Happy Hour)
  emojiUri = getEmojiUri(safeField(data, "emoji"), "sm")
  if emojiUri <> ""
    m.happyhourEmoji.uri = emojiUri
    m.happyhourEmoji.visible = true
  else
    m.happyhourEmoji.visible = false
  end if

  label = "HAPPY HOUR"
  m.happyhourLabel.text = label
  m.happyhourTime.text = safeField(data, "timeRange")
  m.happyhourFreq.text = safeField(data, "frequency")

  ' Build deal cards as horizontal row
  m.happyhourDeals.removeChildrenIndex(m.happyhourDeals.getChildCount(), 0)
  deals = []
  if data.deals <> invalid then deals = data.deals

  ' Center the deal cards horizontally
  totalWidth = deals.count() * 320 + (deals.count() - 1) * 40
  startX = Int((1200 - totalWidth) / 2)
  xPos = startX

  for i = 0 to deals.count() - 1
    deal = deals[i]
    card = CreateObject("roSGNode", "Group")
    card.translation = [xPos, 0]

    ' Glass card background
    cardBg = CreateObject("roSGNode", "Poster")
    cardBg.uri = "pkg:/images/signage-deal-card.png"
    cardBg.width = 320
    cardBg.height = 200
    card.appendChild(cardBg)

    dealColor = "#f59e0b"
    if deal.color <> invalid and deal.color <> "" then dealColor = deal.color

    valueLabel = CreateObject("roSGNode", "Label")
    valueLabel.text = safeField(deal, "deal")
    valueLabel.font = makeFont("Fredoka-Bold", 64)
    valueLabel.color = dealColor
    valueLabel.horizAlign = "center"
    valueLabel.width = 320
    valueLabel.translation = [0, 40]
    card.appendChild(valueLabel)

    itemLabel = CreateObject("roSGNode", "Label")
    itemLabel.text = safeField(deal, "item")
    itemLabel.translation = [0, 120]
    itemLabel.font = makeFont("Outfit-SemiBold", 28)
    itemLabel.color = "#ffffff99"
    itemLabel.horizAlign = "center"
    itemLabel.width = 320
    card.appendChild(itemLabel)

    m.happyhourDeals.appendChild(card)
    xPos = xPos + 360
  end for

  ' Dynamic vertical centering (CSS margins: label mb24, headline mb16, subtitle mb48)
  elements = []
  elements.push({node: m.happyhourLabel, xOff: -600, h: -1, gap: 24})
  elements.push({node: m.happyhourTime, xOff: -600, h: -1, gap: 16})
  elements.push({node: m.happyhourFreq, xOff: -600, h: -1, gap: 48})
  elements.push({node: m.happyhourDeals, xOff: -600, h: 200, gap: 0})
  centerElementsVertically(elements)

  ' Reposition emoji next to label
  if m.happyhourEmoji.visible
    labelPos = m.happyhourLabel.translation
    m.happyhourEmoji.translation = [-140, labelPos[1] - 3]
  end if
end sub

sub renderEvent(data as Object)
  m.tplEvent.visible = true

  ' Emoji
  emojiUri = getEmojiUri(safeField(data, "emoji"), "lg")
  if emojiUri <> ""
    m.eventEmoji.uri = emojiUri
    m.eventEmoji.visible = true
  else
    m.eventEmoji.visible = false
  end if

  m.eventWhen.text = UCase(safeField(data, "when"))
  m.eventName.text = safeField(data, "eventName")
  m.eventDetails.text = safeField(data, "details")

  ' Build prize cards as horizontal row
  m.eventPrizes.removeChildrenIndex(m.eventPrizes.getChildCount(), 0)
  prizes = []
  if data.prizes <> invalid then prizes = data.prizes

  totalWidth = prizes.count() * 280 + (prizes.count() - 1) * 32
  startX = Int((800 - totalWidth) / 2)
  xPos = startX

  for i = 0 to prizes.count() - 1
    p = prizes[i]
    card = CreateObject("roSGNode", "Group")
    card.translation = [xPos, 0]

    cardBg = CreateObject("roSGNode", "Poster")
    cardBg.uri = "pkg:/images/signage-prize-card.png"
    cardBg.width = 280
    cardBg.height = 200
    card.appendChild(cardBg)

    ' Prize emoji
    pEmojiUri = getEmojiUri(safeField(p, "emoji"), "sm")
    if pEmojiUri <> ""
      pEmoji = CreateObject("roSGNode", "Poster")
      pEmoji.uri = pEmojiUri
      pEmoji.width = 56
      pEmoji.height = 56
      pEmoji.translation = [112, 32]
      card.appendChild(pEmoji)
    end if

    placeLabel = CreateObject("roSGNode", "Label")
    placeLabel.text = safeField(p, "place")
    placeLabel.translation = [0, 96]
    placeLabel.font = makeFont("Fredoka-Bold", 32)
    placeLabel.color = "#ffd200"
    placeLabel.horizAlign = "center"
    placeLabel.width = 280
    card.appendChild(placeLabel)

    nameLabel = CreateObject("roSGNode", "Label")
    nameLabel.text = safeField(p, "prize")
    nameLabel.translation = [0, 138]
    nameLabel.font = makeFont("Outfit-Regular", 24)
    nameLabel.color = "#ffffff80"
    nameLabel.horizAlign = "center"
    nameLabel.width = 280
    card.appendChild(nameLabel)

    m.eventPrizes.appendChild(card)
    xPos = xPos + 312
  end for

  ' Dynamic vertical centering (CSS: emoji mb40, label mb24, headline mb16, subtitle mb48)
  elements = []
  if m.eventEmoji.visible
    elements.push({node: m.eventEmoji, xOff: -64, h: 128, gap: 40})
  end if
  elements.push({node: m.eventWhen, xOff: -600, h: -1, gap: 24})
  elements.push({node: m.eventName, xOff: -600, h: -1, gap: 16})
  detailsText = safeField(data, "details")
  if detailsText <> ""
    elements.push({node: m.eventDetails, xOff: -600, h: -1, gap: 48})
  end if
  if prizes.count() > 0
    elements.push({node: m.eventPrizes, xOff: -400, h: 200, gap: 0})
  end if
  centerElementsVertically(elements)
end sub

sub renderBrand(data as Object)
  m.tplBrand.visible = true

  barName = m.top.getField("barName")
  logoUrl = m.top.getField("barLogoUrl")

  m.brandBarName.text = barName
  m.brandTagline.text = UCase(safeField(data, "tagline"))

  ' Logo
  if logoUrl <> invalid and logoUrl <> ""
    m.brandLogoPoster.uri = logoUrl
    m.brandLogoPoster.blendColor = "#ffffff"
    m.brandLogoPoster.visible = true
    m.brandLogoInitial.visible = false
  else
    m.brandLogoPoster.visible = false
    m.brandLogoInitial.visible = true
    if barName <> ""
      m.brandLogoInitial.text = Left(UCase(barName), 1)
    else
      m.brandLogoInitial.text = "T"
    end if
  end if

  ' Build hours as horizontal row (wider columns to prevent truncation)
  m.brandHours.removeChildrenIndex(m.brandHours.getChildCount(), 0)
  hours = []
  if data.hours <> invalid then hours = data.hours

  totalWidth = hours.count() * 240 + (hours.count() - 1) * 64
  startX = Int((1000 - totalWidth) / 2)
  xPos = startX

  for i = 0 to hours.count() - 1
    h = hours[i]
    col = CreateObject("roSGNode", "Group")
    col.translation = [xPos, 0]

    dayLabel = CreateObject("roSGNode", "Label")
    dayLabel.text = safeField(h, "label")
    dayLabel.font = makeFont("Outfit-Bold", 26)
    dayLabel.color = "#ffffff80"
    dayLabel.horizAlign = "center"
    dayLabel.width = 240
    col.appendChild(dayLabel)

    hoursLabel = CreateObject("roSGNode", "Label")
    hoursLabel.text = safeField(h, "hours")
    hoursLabel.translation = [0, 36]
    hoursLabel.font = makeFont("Outfit-SemiBold", 30)
    hoursLabel.color = "#ffd200"
    hoursLabel.horizAlign = "center"
    hoursLabel.width = 240
    col.appendChild(hoursLabel)

    m.brandHours.appendChild(col)
    xPos = xPos + 304
  end for
end sub

sub renderAnnouncement(data as Object)
  m.tplAnnouncement.visible = true

  ' Emoji
  emojiUri = getEmojiUri(safeField(data, "emoji"), "lg")
  if emojiUri <> ""
    m.announcementEmoji.uri = emojiUri
    m.announcementEmoji.visible = true
  else
    m.announcementEmoji.visible = false
  end if

  m.announcementHeadline.text = safeField(data, "headline")
  m.announcementMessage.text = safeField(data, "message")

  subtext = safeField(data, "subtext")
  m.announcementSubtext.text = subtext
  m.announcementSubtext.visible = (subtext <> "")

  ' Dynamic vertical centering (CSS: emoji mb40, headline mb16, body mb40, subtext)
  elements = []
  if m.announcementEmoji.visible
    elements.push({node: m.announcementEmoji, xOff: -64, h: 128, gap: 40})
  end if
  elements.push({node: m.announcementHeadline, xOff: -700, h: -1, gap: 16})
  msgText = safeField(data, "message")
  if msgText <> ""
    elements.push({node: m.announcementMessage, xOff: -600, h: -1, gap: 40})
  end if
  if subtext <> ""
    elements.push({node: m.announcementSubtext, xOff: -500, h: -1, gap: 0})
  end if
  centerElementsVertically(elements)
end sub

sub renderSports(data as Object)
  m.tplSports.visible = true

  ' Emoji
  emojiUri = getEmojiUri(safeField(data, "emoji"), "lg")
  if emojiUri <> ""
    m.sportsEmoji.uri = emojiUri
    m.sportsEmoji.visible = true
  else
    m.sportsEmoji.visible = false
  end if

  headline = safeField(data, "headline")
  if headline = "" then headline = "GAME DAY"
  m.sportsHeadline.text = UCase(headline)
  m.sportsMatchup.text = safeField(data, "matchup")
  m.sportsWhen.text = safeField(data, "when")

  promo = safeField(data, "promo")
  m.sportsPromo.text = promo
  m.sportsPromoGroup.visible = (promo <> "")

  tagline = safeField(data, "tagline")
  m.sportsTagline.text = tagline
  m.sportsTagline.visible = (tagline <> "")

  ' Dynamic vertical centering (CSS: emoji mb40, label mb24, headline mb16, subtitle mb48, promo mb32, tagline)
  elements = []
  if m.sportsEmoji.visible
    elements.push({node: m.sportsEmoji, xOff: -64, h: 128, gap: 40})
  end if
  elements.push({node: m.sportsHeadline, xOff: -600, h: -1, gap: 16})
  matchup = safeField(data, "matchup")
  if matchup <> ""
    elements.push({node: m.sportsMatchup, xOff: -700, h: -1, gap: 24})
  end if
  whenText = safeField(data, "when")
  if whenText <> ""
    elements.push({node: m.sportsWhen, xOff: -600, h: -1, gap: 48})
  end if
  if promo <> ""
    elements.push({node: m.sportsPromoGroup, xOff: -350, h: 100, gap: 32})
  end if
  if tagline <> ""
    elements.push({node: m.sportsTagline, xOff: -600, h: -1, gap: 0})
  end if
  centerElementsVertically(elements)
end sub

sub renderCustom(data as Object)
  m.tplCustom.visible = true

  ' Emoji
  emojiUri = getEmojiUri(safeField(data, "emoji"), "lg")
  if emojiUri <> ""
    m.customEmoji.uri = emojiUri
    m.customEmoji.visible = true
  else
    m.customEmoji.visible = false
  end if

  m.customHeadline.text = safeField(data, "headline")
  m.customBody.text = safeField(data, "body")

  ' Build custom items as wrapped horizontal row
  m.customItems.removeChildrenIndex(m.customItems.getChildCount(), 0)
  items = []
  if data.items <> invalid then items = data.items

  xPos = 0
  yPos = 0
  maxRowWidth = 1200
  for i = 0 to items.count() - 1
    item = items[i]
    itemText = safeField(item, "text")
    ' Estimate item width: ~18px per char + padding
    itemW = 80 + Len(itemText) * 16
    if itemW < 200 then itemW = 200
    if itemW > 600 then itemW = 600

    ' Wrap to next line if needed
    if xPos + itemW > maxRowWidth and xPos > 0
      xPos = 0
      yPos = yPos + 90
    end if

    card = CreateObject("roSGNode", "Group")
    card.translation = [xPos, yPos]

    cardBg = CreateObject("roSGNode", "Poster")
    cardBg.uri = "pkg:/images/signage-custom-item.png"
    cardBg.width = itemW
    cardBg.height = 80
    card.appendChild(cardBg)

    ' Emoji icon
    iEmojiUri = getEmojiUri(safeField(item, "emoji"), "sm")
    if iEmojiUri <> ""
      iEmoji = CreateObject("roSGNode", "Poster")
      iEmoji.uri = iEmojiUri
      iEmoji.width = 48
      iEmoji.height = 48
      iEmoji.translation = [16, 16]
      card.appendChild(iEmoji)
    end if

    textLabel = CreateObject("roSGNode", "Label")
    textLabel.text = itemText
    textLabel.translation = [76, 22]
    textLabel.font = makeFont("Outfit-SemiBold", 30)
    textLabel.color = "#ffffffB3"
    textLabel.width = itemW - 96
    textLabel.maxLines = 1
    card.appendChild(textLabel)

    m.customItems.appendChild(card)
    xPos = xPos + itemW + 28
  end for

  ' Calculate items container height based on wrapping
  itemsHeight = yPos + 80
  if items.count() = 0 then itemsHeight = 0

  ' Dynamic vertical centering (CSS: emoji mb40, headline mb16, body mb56, items)
  elements = []
  if m.customEmoji.visible
    elements.push({node: m.customEmoji, xOff: -64, h: 128, gap: 40})
  end if
  elements.push({node: m.customHeadline, xOff: -700, h: -1, gap: 16})
  bodyText = safeField(data, "body")
  if bodyText <> ""
    elements.push({node: m.customBody, xOff: -600, h: -1, gap: 56})
  end if
  if items.count() > 0
    elements.push({node: m.customItems, xOff: -600, h: itemsHeight, gap: 0})
  end if
  centerElementsVertically(elements)
end sub

sub renderDefaultQr(data as Object)
  m.tplDefaultQr.visible = true
  m.defaultQrBarCode.text = m.top.getField("barCode")
end sub

' ══════════════════════════════════════════════════════════════
' DEFAULT FALLBACK — TapTrivia branding when no slides at all
' ══════════════════════════════════════════════════════════════

sub renderDefaultSlides()
  m.signageContainer.visible = false
  m.defaultContainer.visible = true
  barName = m.top.getField("barName")
  if barName <> invalid and barName <> ""
    m.defaultBarName.text = "Welcome to " + barName + "!"
  else
    m.defaultBarName.text = "Welcome to TapTrivia!"
  end if
end sub

' ══════════════════════════════════════════════════════════════
' UTILITY
' ══════════════════════════════════════════════════════════════

function safeField(obj as Object, key as String) as String
  if obj = invalid then return ""
  val = obj[key]
  if val = invalid then return ""
  if type(val) = "String" or type(val) = "roString" then return val
  return val.toStr()
end function
