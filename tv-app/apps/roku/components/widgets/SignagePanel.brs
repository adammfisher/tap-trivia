' SignagePanel — In-game signage panel (right side, 960px with 40px padding = 880px content)
' Renders rich template-specific layouts matching web tv-app panel specs

sub init()
  m.barInitial = m.top.findNode("barInitial")
  m.barLogoPoster = m.top.findNode("barLogoPoster")
  m.barNameLabel = m.top.findNode("barNameLabel")
  m.templateLabel = m.top.findNode("templateLabel")
  m.signageContent = m.top.findNode("signageContent")
  m.panelBarCode = m.top.findNode("panelBarCode")
  m.panelHeader = m.top.findNode("panelHeader")

  m.barNameVal = ""
  m.barCodeVal = ""
  m.slidesCache = []
  m.lastRenderedIndex = -1
  m.lastRenderedSlideCount = -1
  m.fontCache = {}  ' Cache Font nodes by "name:size" — reused across renders

  ' Wrapper Group: sole child of signageContent; swap by reference to reliably clear all content
  m.contentWrapper = CreateObject("roSGNode", "Group")
  m.signageContent.appendChild(m.contentWrapper)

  ' Timer coalesces double-fire from onSlidesChanged+onIndexChanged in same frame
  m.renderTimer = m.top.findNode("renderTimer")
  m.renderTimer.observeField("fire", "onRenderTimer")

  fixAllLabelFonts(m.top)
end sub

sub onBarNameChanged(event as Object)
  m.barNameVal = event.getData()
  m.barNameLabel.text = m.barNameVal
  m.barInitial.text = UCase(Left(m.barNameVal, 1))

  ' Update logo if URL is set
  logoUrl = m.top.getField("barLogoUrl")
  if logoUrl <> invalid and logoUrl <> ""
    m.barLogoPoster.uri = logoUrl
    m.barLogoPoster.visible = true
    m.barInitial.visible = false
  else
    m.barLogoPoster.visible = false
    m.barInitial.visible = true
  end if
end sub

sub onBarLogoUrlChanged(event as Object)
  logoUrl = event.getData()
  if logoUrl <> invalid and logoUrl <> ""
    m.barLogoPoster.uri = logoUrl
    m.barLogoPoster.visible = true
    m.barInitial.visible = false
  else
    m.barLogoPoster.visible = false
    m.barInitial.visible = true
  end if
end sub

sub onBarCodeChanged(event as Object)
  m.barCodeVal = event.getData()
  m.panelBarCode.text = m.barCodeVal
end sub

sub onSlidesChanged(event as Object)
  slides = event.getData()
  if slides = invalid then slides = []
  ' Skip re-render if count is same and we already rendered — prevents churn if called redundantly
  if slides.count() = m.lastRenderedSlideCount and slides.count() > 0
    m.slidesCache = slides
    return
  end if
  m.slidesCache = slides
  m.lastRenderedSlideCount = -1  ' force re-render
  #if DEBUG
  print ">>> SignagePanel: onSlidesChanged count=" + Str(m.slidesCache.count()).trim()
  #end if
  triggerRender()
end sub

sub onIndexChanged(event as Object)
  newIdx = event.getData()
  ' Skip re-render if index hasn't actually changed
  if newIdx = m.lastRenderedIndex then return
  #if DEBUG
  print ">>> SignagePanel: onIndexChanged idx=" + Str(newIdx).trim()
  #end if
  triggerRender()
end sub

' Coalesce rapid field updates — both observers reset this timer,
' so renderSlide fires exactly once after both fields are committed.
sub triggerRender()
  m.renderTimer.control = "stop"
  m.renderTimer.control = "start"
end sub

sub onRenderTimer()
  idx = m.top.getField("signageIndex")
  #if DEBUG
  print ">>> SignagePanel: onRenderTimer idx=" + Str(idx).trim()
  #end if
  renderSlide(idx)
  m.lastRenderedIndex = idx
  m.lastRenderedSlideCount = m.slidesCache.count()
end sub

' ══════════════════════════════════════════════════════════════
' RENDER SLIDE
' ══════════════════════════════════════════════════════════════

sub renderSlide(index as Integer)
  ' Clear children of the existing wrapper rather than creating a new Group node.
  ' Creating+discarding a Group every 30s accumulates GC pressure over hours;
  ' removeChildren() reuses the same node and releases child memory immediately.
  kids = m.contentWrapper.getChildren(-1, 0)
  if kids.count() > 0 then m.contentWrapper.removeChildren(kids)
  m.signageContent.translation = [0, 150]

  slides = m.slidesCache
  if slides = invalid or slides.count() = 0
    renderDefault()
    return
  end if

  idx = index mod slides.count()
  slide = slides[idx]
  template = ""
  if slide.template <> invalid then template = slide.template
  data = {}
  if slide.data <> invalid then data = slide.data

  #if DEBUG
  print ">>> SignagePanel: renderSlide idx=" + Str(idx).trim() + " template=" + template
  #end if

  ' Show/hide header (brand has no header)
  m.panelHeader.visible = (template <> "brand")

  if template = "specials"
    renderSpecials(data)
  else if template = "happyhour"
    renderHappyHour(data)
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
  else
    renderDefault()
  end if
end sub

sub renderDefault()
  ' Note: wrapper already swapped by renderSlide before calling here
  m.templateLabel.visible = false
  m.panelHeader.visible = true

  headline = addLabel(m.contentWrapper, "Play TapTrivia!", 0, 0, 880)
  headline.font = makeFont("Fredoka-Bold", 48)
  headline.color = "#f0f0f0"

  body = addLabel(m.contentWrapper, "Live trivia every 15 minutes - play free on your phone!", 0, 60, 880)
  body.font = makeFont("Outfit-Regular", 28)
  body.color = "#ffffffE6"
  body.wrap = true
  body.maxLines = 4
end sub

' ══════════════════════════════════════════════════════════════
' SPECIALS — label + headline + subheadline + featured box + menu items
' ══════════════════════════════════════════════════════════════

sub renderSpecials(data as Object)
  label = safeStr(data.label)
  if label = "" then label = "Tonight's Specials"
  emoji = safeStr(data.emoji)
  emojiUri = getEmojiUri(emoji, "xs")

  if emojiUri <> ""
    m.templateLabel.visible = false
    labelGroup = CreateObject("roSGNode", "Group")
    labelGroup.translation = [0, -34]

    ePoster = CreateObject("roSGNode", "Poster")
    ePoster.uri = emojiUri
    ePoster.width = 28
    ePoster.height = 28
    ePoster.translation = [310, -2]
    labelGroup.appendChild(ePoster)

    lbl = addLabel(labelGroup, UCase(label), 346, 0, 534)
    lbl.font = makeFont("Outfit-Bold", 22)
    lbl.color = "#f59e0b"
    m.contentWrapper.appendChild(labelGroup)
  else
    m.templateLabel.visible = true
    m.templateLabel.text = UCase(label)
    m.templateLabel.color = "#f59e0b"
  end if

  yPos = 0

  ' Headline — centered
  headline = safeStr(data.headline)
  if headline <> ""
    headlineL = addLabel(m.contentWrapper, headline, 0, yPos, 880)
    headlineL.font = makeFont("Fredoka-Bold", 48)
    headlineL.color = "#f0f0f0"
    headlineL.horizAlign = "center"
    yPos = yPos + 58
  end if

  ' Subheadline — centered
  subheadline = safeStr(data.subheadline)
  if subheadline <> ""
    subL = addLabel(m.contentWrapper, subheadline, 0, yPos, 880)
    subL.font = makeFont("Fredoka-Bold", 32)
    subL.color = "#00d4aa"
    subL.horizAlign = "center"
    yPos = yPos + 48
  end if

  ' Featured item box
  featuredName = safeStr(data.featuredName)
  if featuredName <> ""
    featuredGroup = CreateObject("roSGNode", "Group")
    featuredGroup.translation = [0, yPos]

    bg = CreateObject("roSGNode", "Poster")
    bg.uri = "pkg:/images/signage-panel-featured.png"
    bg.width = 880
    bg.height = 100
    featuredGroup.appendChild(bg)

    nameL = addLabel(featuredGroup, featuredName, 28, 10, 520)
    nameL.font = makeFont("Fredoka-Bold", 36)
    nameL.color = "#f0f0f0"

    descL = addLabel(featuredGroup, safeStr(data.featuredDesc), 28, 50, 520)
    descL.font = makeFont("Outfit-Regular", 20)
    descL.color = "#ffffff59"

    priceL = addLabel(featuredGroup, safeStr(data.featuredPrice), 580, 12, 280)
    priceL.font = makeFont("Fredoka-Bold", 52)
    priceL.color = "#00d4aa"
    priceL.horizAlign = "right"

    m.contentWrapper.appendChild(featuredGroup)
    yPos = yPos + 116
  end if

  ' Menu items — rows with emoji icon, name+desc, price
  menuItems = data.menuItems
  if menuItems <> invalid and type(menuItems) = "roArray"
    for i = 0 to menuItems.count() - 1
      item = menuItems[i]
      row = CreateObject("roSGNode", "Group")
      row.translation = [0, yPos]

      ' Emoji icon
      emojiUri = getEmojiUri(safeStr(item.icon), "xs")
      if emojiUri <> ""
        ePoster = CreateObject("roSGNode", "Poster")
        ePoster.uri = emojiUri
        ePoster.width = 36
        ePoster.height = 36
        ePoster.translation = [4, 8]
        row.appendChild(ePoster)
      end if

      nameL = addLabel(row, safeStr(item.name), 52, 0, 520)
      nameL.font = makeFont("Outfit-Bold", 28)
      nameL.color = "#f0f0f0"

      desc = safeStr(item.desc)
      if desc <> ""
        descL = addLabel(row, desc, 52, 32, 520)
        descL.font = makeFont("Outfit-Regular", 18)
        descL.color = "#ffffff4D"
      end if

      priceL = addLabel(row, safeStr(item.price), 620, 4, 240)
      priceL.font = makeFont("Fredoka-Bold", 32)
      priceL.color = "#00d4aa"
      priceL.horizAlign = "right"

      m.contentWrapper.appendChild(row)
      yPos = yPos + 60
    end for
  end if
end sub

' ══════════════════════════════════════════════════════════════
' HAPPY HOUR — star label + time + frequency + 2-col deal cards
' ══════════════════════════════════════════════════════════════

sub renderHappyHour(data as Object)
  emoji = safeStr(data.emoji)
  emojiUri = getEmojiUri(emoji, "xs")

  if emojiUri <> ""
    m.templateLabel.visible = false
    labelGroup = CreateObject("roSGNode", "Group")
    labelGroup.translation = [0, -34]

    ePoster = CreateObject("roSGNode", "Poster")
    ePoster.uri = emojiUri
    ePoster.width = 28
    ePoster.height = 28
    ePoster.translation = [340, -2]
    labelGroup.appendChild(ePoster)

    lbl = addLabel(labelGroup, "HAPPY HOUR", 376, 0, 504)
    lbl.font = makeFont("Outfit-Bold", 22)
    lbl.color = "#e879f9"
    m.contentWrapper.appendChild(labelGroup)
  else
    m.templateLabel.visible = true
    m.templateLabel.text = "HAPPY HOUR"
    m.templateLabel.color = "#e879f9"
  end if

  yPos = 0

  headline = addLabel(m.contentWrapper, safeStr(data.timeRange), 0, yPos, 880)
  headline.font = makeFont("Fredoka-Bold", 54)
  headline.color = "#f0f0f0"
  headline.horizAlign = "center"
  yPos = yPos + 66

  freq = addLabel(m.contentWrapper, safeStr(data.frequency), 0, yPos, 880)
  freq.font = makeFont("Outfit-Regular", 28)
  freq.color = "#ffffffE6"
  freq.horizAlign = "center"
  yPos = yPos + 52

  ' Deal cards in 2-column grid
  deals = data.deals
  if deals <> invalid and type(deals) = "roArray"
    cardW = 420
    cardH = 110
    gap = 24
    col = 0
    for i = 0 to deals.count() - 1
      deal = deals[i]

      isLastOdd = (i = deals.count() - 1) and (i mod 2 = 0)
      if isLastOdd
        xPos = (880 - cardW) / 2
      else
        xPos = col * (cardW + gap)
      end if

      card = CreateObject("roSGNode", "Group")
      card.translation = [xPos, yPos]

      cardBg = CreateObject("roSGNode", "Poster")
      cardBg.uri = "pkg:/images/signage-panel-deal.png"
      cardBg.width = cardW
      cardBg.height = cardH
      card.appendChild(cardBg)

      dealColor = "#00d4aa"
      if deal.color <> invalid and deal.color <> "" then dealColor = deal.color

      valL = addLabel(card, safeStr(deal.deal), 0, 12, cardW)
      valL.font = makeFont("Fredoka-Bold", 44)
      valL.color = dealColor
      valL.horizAlign = "center"

      itemL = addLabel(card, safeStr(deal.item), 0, 66, cardW)
      itemL.font = makeFont("Outfit-SemiBold", 24)
      itemL.color = "#ffffffE6"
      itemL.horizAlign = "center"

      m.contentWrapper.appendChild(card)

      col = col + 1
      if col >= 2 or isLastOdd
        col = 0
        yPos = yPos + cardH + 16
      end if
    end for
  end if
end sub

' ══════════════════════════════════════════════════════════════
' EVENT — centered emoji + when label + event name + details
' ══════════════════════════════════════════════════════════════

sub renderEvent(data as Object)
  m.templateLabel.visible = false

  yPos = 0

  ' Large emoji centered
  emojiUri = getEmojiUri(safeStr(data.emoji), "lg")
  if emojiUri <> ""
    ePoster = CreateObject("roSGNode", "Poster")
    ePoster.uri = emojiUri
    ePoster.width = 100
    ePoster.height = 100
    ePoster.translation = [390, yPos]
    m.contentWrapper.appendChild(ePoster)
    yPos = yPos + 120
  end if

  whenText = safeStr(data.when)
  if whenText <> ""
    whenL = addLabel(m.contentWrapper, UCase(whenText), 0, yPos, 880)
    whenL.font = makeFont("Outfit-Bold", 22)
    whenL.color = "#667eea"
    whenL.horizAlign = "center"
    yPos = yPos + 38
  end if

  nameL = addLabel(m.contentWrapper, safeStr(data.eventName), 0, yPos, 880)
  nameL.font = makeFont("Fredoka-Bold", 48)
  nameL.color = "#f0f0f0"
  nameL.horizAlign = "center"
  nameL.wrap = true
  nameL.maxLines = 2
  yPos = yPos + 64

  details = safeStr(data.details)
  if details <> ""
    detailsL = addLabel(m.contentWrapper, details, 0, yPos, 880)
    detailsL.font = makeFont("Outfit-Regular", 28)
    detailsL.color = "#ffffff59"
    detailsL.horizAlign = "center"
    detailsL.wrap = true
    detailsL.maxLines = 2
    yPos = yPos + 68
  end if

  ' Prize rows
  prizes = data.prizes
  if prizes <> invalid and type(prizes) = "roArray"
    yPos = yPos + 8
    for i = 0 to prizes.count() - 1
      p = prizes[i]
      row = CreateObject("roSGNode", "Group")
      row.translation = [60, yPos]

      rowBg = CreateObject("roSGNode", "Poster")
      rowBg.uri = "pkg:/images/signage-panel-prize.png"
      rowBg.width = 760
      rowBg.height = 56
      row.appendChild(rowBg)

      pEmojiUri = getEmojiUri(safeStr(p.emoji), "xs")
      if pEmojiUri <> ""
        pEmoji = CreateObject("roSGNode", "Poster")
        pEmoji.uri = pEmojiUri
        pEmoji.width = 32
        pEmoji.height = 32
        pEmoji.translation = [16, 12]
        row.appendChild(pEmoji)
      end if

      placeL = addLabel(row, safeStr(p.place), 56, 10, 260)
      placeL.font = makeFont("Outfit-Bold", 26)
      placeL.color = "#ffd200"

      prizeL = addLabel(row, safeStr(p.prize), 340, 12, 400)
      prizeL.font = makeFont("Outfit-Regular", 22)
      prizeL.color = "#ffffff59"

      m.contentWrapper.appendChild(row)
      yPos = yPos + 66
    end for
  end if
end sub

' ══════════════════════════════════════════════════════════════
' BRAND — centered logo + name + tagline + divider + hours
' ══════════════════════════════════════════════════════════════

sub renderBrand(data as Object)
  m.templateLabel.visible = false
  m.signageContent.translation = [0, 100]

  yPos = 0

  ' Large brand logo — centered in 880px
  logoBg = CreateObject("roSGNode", "Poster")
  logoBg.uri = "pkg:/images/signage-panel-brand-logo-bg.png"
  logoBg.width = 160
  logoBg.height = 160
  logoBg.translation = [360, yPos]
  m.contentWrapper.appendChild(logoBg)

  logoUrl = m.top.getField("barLogoUrl")
  if logoUrl <> invalid and logoUrl <> ""
    logoPoster = CreateObject("roSGNode", "Poster")
    logoPoster.uri = logoUrl
    logoPoster.width = 148
    logoPoster.height = 148
    logoPoster.translation = [366, yPos + 6]
    m.contentWrapper.appendChild(logoPoster)
  else
    initialL = addLabel(m.contentWrapper, UCase(Left(m.barNameVal, 1)), 360, yPos + 40, 160)
    initialL.font = makeFont("Fredoka-Bold", 52)
    initialL.color = "#ffd200"
    initialL.horizAlign = "center"
  end if
  yPos = yPos + 188

  headline = addLabel(m.contentWrapper, m.barNameVal, 0, yPos, 880)
  headline.font = makeFont("Fredoka-Bold", 48)
  headline.color = "#f0f0f0"
  headline.horizAlign = "center"
  headline.wrap = true
  headline.maxLines = 2
  yPos = yPos + 64

  tagline = safeStr(data.tagline)
  if tagline <> ""
    taglineL = addLabel(m.contentWrapper, UCase(tagline), 0, yPos, 880)
    taglineL.font = makeFont("Outfit-SemiBold", 24)
    taglineL.color = "#ffffff59"
    taglineL.horizAlign = "center"
    yPos = yPos + 44
  end if

  ' Gold divider — centered in 880px
  divider = CreateObject("roSGNode", "Poster")
  divider.uri = "pkg:/images/signage-gold-divider.png"
  divider.width = 80
  divider.height = 4
  divider.translation = [400, yPos]
  m.contentWrapper.appendChild(divider)
  yPos = yPos + 32

  ' Hours rows
  hours = data.hours
  if hours <> invalid and type(hours) = "roArray"
    for i = 0 to hours.count() - 1
      h = hours[i]
      row = CreateObject("roSGNode", "Group")
      row.translation = [0, yPos]

      dayL = addLabel(row, safeStr(h.label), 180, 0, 260)
      dayL.font = makeFont("Outfit-SemiBold", 28)
      dayL.color = "#ffffffE6"

      hoursL = addLabel(row, safeStr(h.hours), 480, 0, 220)
      hoursL.font = makeFont("Outfit-SemiBold", 28)
      hoursL.color = "#ffd200"
      hoursL.horizAlign = "right"

      m.contentWrapper.appendChild(row)
      yPos = yPos + 40
    end for
  end if
end sub

' ══════════════════════════════════════════════════════════════
' ANNOUNCEMENT — centered emoji + headline + message + subtext
' ══════════════════════════════════════════════════════════════

sub renderAnnouncement(data as Object)
  m.templateLabel.visible = false

  yPos = 0

  ' Large emoji centered in 880px
  emojiUri = getEmojiUri(safeStr(data.emoji), "lg")
  if emojiUri <> ""
    ePoster = CreateObject("roSGNode", "Poster")
    ePoster.uri = emojiUri
    ePoster.width = 100
    ePoster.height = 100
    ePoster.translation = [390, yPos]
    m.contentWrapper.appendChild(ePoster)
    yPos = yPos + 120
  end if

  headline = addLabel(m.contentWrapper, safeStr(data.headline), 0, yPos, 880)
  headline.font = makeFont("Fredoka-Bold", 48)
  headline.color = "#f0f0f0"
  headline.horizAlign = "center"
  headline.wrap = true
  headline.maxLines = 2
  yPos = yPos + 68

  body = addLabel(m.contentWrapper, safeStr(data.message), 40, yPos, 800)
  body.font = makeFont("Outfit-Regular", 28)
  body.color = "#ffffffE6"
  body.horizAlign = "center"
  body.wrap = true
  body.maxLines = 6
  yPos = yPos + 200

  subtext = safeStr(data.subtext)
  if subtext <> ""
    subtextL = addLabel(m.contentWrapper, subtext, 40, yPos, 800)
    subtextL.font = makeFont("Outfit-Regular", 24)
    subtextL.color = "#ffffff4D"
    subtextL.horizAlign = "center"
  end if
end sub

' ══════════════════════════════════════════════════════════════
' SPORTS — centered emoji + headline label + matchup + when + promo + tagline
' ══════════════════════════════════════════════════════════════

sub renderSports(data as Object)
  m.templateLabel.visible = false

  yPos = 0

  ' Large emoji centered in 880px
  emojiUri = getEmojiUri(safeStr(data.emoji), "lg")
  if emojiUri <> ""
    ePoster = CreateObject("roSGNode", "Poster")
    ePoster.uri = emojiUri
    ePoster.width = 100
    ePoster.height = 100
    ePoster.translation = [390, yPos]
    m.contentWrapper.appendChild(ePoster)
    yPos = yPos + 120
  end if

  headline = safeStr(data.headline)
  if headline = "" then headline = "Game Day"
  headlineL = addLabel(m.contentWrapper, UCase(headline), 0, yPos, 880)
  headlineL.font = makeFont("Outfit-Bold", 22)
  headlineL.color = "#ff4757"
  headlineL.horizAlign = "center"
  yPos = yPos + 38

  matchup = addLabel(m.contentWrapper, safeStr(data.matchup), 0, yPos, 880)
  matchup.font = makeFont("Fredoka-Bold", 48)
  matchup.color = "#f0f0f0"
  matchup.horizAlign = "center"
  matchup.wrap = true
  matchup.maxLines = 2
  yPos = yPos + 64

  whenText = safeStr(data.when)
  if whenText <> ""
    whenL = addLabel(m.contentWrapper, whenText, 0, yPos, 880)
    whenL.font = makeFont("Outfit-Regular", 26)
    whenL.color = "#ffffff59"
    whenL.horizAlign = "center"
    yPos = yPos + 48
  end if

  promo = safeStr(data.promo)
  if promo <> ""
    promoGroup = CreateObject("roSGNode", "Group")
    promoGroup.translation = [20, yPos]

    promoBg = CreateObject("roSGNode", "Poster")
    promoBg.uri = "pkg:/images/signage-panel-promo.png"
    promoBg.width = 840
    promoBg.height = 76
    promoGroup.appendChild(promoBg)

    promoL = addLabel(promoGroup, promo, 0, 12, 840)
    promoL.font = makeFont("Outfit-Bold", 28)
    promoL.color = "#ffd200"
    promoL.horizAlign = "center"

    m.contentWrapper.appendChild(promoGroup)
    yPos = yPos + 92
  end if

  tagline = safeStr(data.tagline)
  if tagline <> ""
    taglineL = addLabel(m.contentWrapper, tagline, 40, yPos, 800)
    taglineL.font = makeFont("Outfit-Regular", 24)
    taglineL.color = "#ffffff4D"
    taglineL.horizAlign = "center"
    taglineL.wrap = true
    taglineL.maxLines = 2
  end if
end sub

' ══════════════════════════════════════════════════════════════
' CUSTOM — centered emoji + headline + body + item cards
' ══════════════════════════════════════════════════════════════

sub renderCustom(data as Object)
  m.templateLabel.visible = false

  yPos = 0

  ' Large emoji centered in 880px
  emojiUri = getEmojiUri(safeStr(data.emoji), "lg")
  if emojiUri <> ""
    ePoster = CreateObject("roSGNode", "Poster")
    ePoster.uri = emojiUri
    ePoster.width = 100
    ePoster.height = 100
    ePoster.translation = [390, yPos]
    m.contentWrapper.appendChild(ePoster)
    yPos = yPos + 120
  end if

  headline = addLabel(m.contentWrapper, safeStr(data.headline), 0, yPos, 880)
  headline.font = makeFont("Fredoka-Bold", 48)
  headline.color = "#f0f0f0"
  headline.horizAlign = "center"
  headline.wrap = true
  headline.maxLines = 2
  yPos = yPos + 64

  body = safeStr(data.body)
  if body <> ""
    bodyL = addLabel(m.contentWrapper, body, 40, yPos, 800)
    bodyL.font = makeFont("Outfit-Regular", 28)
    bodyL.color = "#ffffffE6"
    bodyL.horizAlign = "center"
    bodyL.wrap = true
    bodyL.maxLines = 4
    yPos = yPos + 140
  end if

  ' Item rows with glass card bg
  items = data.items
  if items <> invalid and type(items) = "roArray"
    for i = 0 to items.count() - 1
      item = items[i]
      row = CreateObject("roSGNode", "Group")
      row.translation = [60, yPos]

      rowBg = CreateObject("roSGNode", "Poster")
      rowBg.uri = "pkg:/images/signage-panel-custom-item.png"
      rowBg.width = 760
      rowBg.height = 52
      row.appendChild(rowBg)

      iEmojiUri = getEmojiUri(safeStr(item.emoji), "xs")
      if iEmojiUri <> ""
        iEmoji = CreateObject("roSGNode", "Poster")
        iEmoji.uri = iEmojiUri
        iEmoji.width = 28
        iEmoji.height = 28
        iEmoji.translation = [16, 12]
        row.appendChild(iEmoji)
      end if

      textL = addLabel(row, safeStr(item.text), 52, 8, 690)
      textL.font = makeFont("Outfit-SemiBold", 26)
      textL.color = "#ffffffE6"

      m.contentWrapper.appendChild(row)
      yPos = yPos + 62
    end for
  end if
end sub

' ══════════════════════════════════════════════════════════════
' HELPERS
' ══════════════════════════════════════════════════════════════

function addLabel(parent as Object, text as String, x as Integer, y as Integer, w as Integer) as Object
  lbl = CreateObject("roSGNode", "Label")
  lbl.text = text
  lbl.translation = [x, y]
  lbl.width = w
  parent.appendChild(lbl)
  return lbl
end function

function getEmojiUri(emoji as String, size as String) as String
  if emoji = "" then return ""
  ' Build codepoint filename from emoji characters
  chars = []
  i = 0
  while i < Len(emoji)
    code = Asc(Mid(emoji, i + 1, 1))
    if code >= &hD800 and code <= &hDBFF and i + 1 < Len(emoji)
      low = Asc(Mid(emoji, i + 2, 1))
      codePoint = (code - &hD800) * &h400 + (low - &hDC00) + &h10000
      chars.push(codePoint)
      i = i + 2
    else if code = &hFE0F
      chars.push(code)
      i = i + 1
    else if code <> &h200D
      chars.push(code)
      i = i + 1
    else
      i = i + 1
    end if
  end while

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

function safeStr(val as Dynamic) as String
  if val = invalid then return ""
  if type(val) = "String" or type(val) = "roString" then return val
  return val.toStr()
end function
