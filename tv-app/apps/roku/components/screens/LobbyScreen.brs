' LobbyScreen — Pre-game lobby: QR/code (left), players (center-right)
' Mirrors renderLobby() from web tv-app/js/app.js

sub init()
  ' ── Node references ──
  m.countdownLabel = m.top.findNode("countdownLabel")
  m.countdownValue = m.top.findNode("countdownValue")
  m.countdownGroup = m.top.findNode("countdownGroup")
  m.lobbyBarName = m.top.findNode("lobbyBarName")
  m.lobbyBarCode = m.top.findNode("lobbyBarCode")
  m.playerCountLabel = m.top.findNode("playerCountLabel")
  m.playerGrid = m.top.findNode("playerGrid")
  m.playerColumn = m.top.findNode("playerColumn")
  m.signagePanel = m.top.findNode("signagePanel")
  m.logo = m.top.findNode("logo")

  ' Configure Logo widget (xl = 80px, matches web .tt-logo--xl 88px)
  m.logo.setField("logoSize", "xl")

  ' ── State ──
  m.lastPlayerCount = 0
  m.lastCountdownText = ""
  m.gsCache = {}
  m.hasSignage = false

  ' ── Countdown timer (1s tick for live updates) ──
  m.countdownTimer = CreateObject("roSGNode", "Timer")
  m.countdownTimer.repeat = true
  m.countdownTimer.duration = 1
  m.countdownTimer.observeField("fire", "onCountdownTick")

  ' Stop timer when screen is hidden to prevent memory pressure over long uptimes
  m.top.observeField("visible", "onVisibleChanged")

  fixAllLabelFonts(m.top)
end sub

' ══════════════════════════════════════════════════════════════
' GAME STATE CHANGED — main entry, called by scene
' ══════════════════════════════════════════════════════════════

sub onGameStateChanged(event as Object)
  gameState = event.getData()
  if gameState = invalid then gameState = {}
  m.gsCache = gameState

  ' Update static fields
  barName = m.top.getField("barName")
  barCode = m.top.getField("barCode")
  m.lobbyBarName.text = barName
  m.lobbyBarCode.text = barCode

  ' Update player count
  players = []
  if gameState.players <> invalid then players = gameState.players
  count = 0
  if gameState.playerCount <> invalid
    count = gameState.playerCount
  else
    count = players.count()
  end if

  updatePlayerCount(count)
  updatePlayerGrid(players)
  updateCountdown()

  ' Wire signage panel
  slides = m.top.getField("signageSlides")
  if slides = invalid then slides = []
  m.hasSignage = (slides.count() > 0)

  if m.hasSignage
    m.signagePanel.setField("barCode", barCode)
    m.signagePanel.setField("barName", barName)
    m.signagePanel.setField("barLogoUrl", m.top.getField("barLogoUrl"))
    m.signagePanel.setField("signageSlides", slides)
    m.signagePanel.setField("signageIndex", m.top.getField("signageIndex"))
    m.signagePanel.visible = true
    m.playerColumn.visible = false
    ' Move countdown to top-left when signage active (matches web: top:40, left:48)
    m.countdownGroup.translation = [48, 30]
    m.countdownLabel.horizAlign = "left"
    m.countdownLabel.width = 300
    m.countdownLabel.translation = [0, 0]
    m.countdownValue.horizAlign = "left"
    m.countdownValue.width = 300
    m.countdownValue.translation = [0, 32]
  else
    m.signagePanel.visible = false
    m.playerColumn.visible = true
    ' Countdown top-center when no signage
    m.countdownGroup.translation = [960, 24]
    m.countdownLabel.horizAlign = "center"
    m.countdownLabel.width = 400
    m.countdownLabel.translation = [-200, 0]
    m.countdownValue.horizAlign = "center"
    m.countdownValue.width = 400
    m.countdownValue.translation = [-200, 32]
  end if

  ' Start countdown timer
  m.countdownTimer.control = "start"
end sub

' ══════════════════════════════════════════════════════════════
' PLAYER COUNT
' ══════════════════════════════════════════════════════════════

sub updatePlayerCount(count as Integer)
  if count = 1
    m.playerCountLabel.text = "1 PLAYER READY"
  else
    m.playerCountLabel.text = Str(count).trim() + " PLAYERS READY"
  end if
  m.lastPlayerCount = count
end sub

' ══════════════════════════════════════════════════════════════
' PLAYER GRID — Avatar widget + name label per player
' ══════════════════════════════════════════════════════════════

sub updatePlayerGrid(players as Object)
  if players = invalid then players = []

  ' Clear existing player chips
  m.playerGrid.removeChildrenIndex(m.playerGrid.getChildCount(), 0)

  ' Grid layout: 6 columns, each chip ~200px wide
  colWidth = 200
  rowHeight = 110
  maxCols = 6

  for i = 0 to players.count() - 1
    p = players[i]
    name = ""
    if p.name <> invalid then name = p.name
    if name = "" and p.playerName <> invalid then name = p.playerName
    if name = "" then name = "Player"

    col = i mod maxCols
    row = Int(i / maxCols)

    chip = createPlayerChip(name)
    chip.translation = [col * colWidth, row * rowHeight]
    m.playerGrid.appendChild(chip)
  end for
end sub

function createPlayerChip(name as String) as Object
  chip = CreateObject("roSGNode", "Group")

  ' Avatar widget (handles color derivation + initial letter internally)
  avatar = CreateObject("roSGNode", "Avatar")
  avatar.setField("avatarSize", "lg")
  avatar.setField("playerName", name)
  avatar.translation = [64, 0]
  chip.appendChild(avatar)

  ' Name label below avatar
  nameLabel = CreateObject("roSGNode", "Label")
  nameLabel.text = name
  nameFont = CreateObject("roSGNode", "Font")
  nameFont.uri = "pkg:/fonts/Outfit-Regular.ttf"
  nameFont.size = 18
  nameLabel.font = nameFont
  nameLabel.color = "#ffffffB0"
  nameLabel.horizAlign = "center"
  nameLabel.width = 200
  nameLabel.translation = [0, 78]
  nameLabel.maxLines = 1
  chip.appendChild(nameLabel)

  return chip
end function

' ══════════════════════════════════════════════════════════════
' COUNTDOWN — live update every second
' ══════════════════════════════════════════════════════════════

sub onCountdownTick()
  updateCountdown()
end sub

sub onVisibleChanged()
  if m.top.visible
    if m.gsCache <> invalid and m.gsCache.count() > 0
      m.countdownTimer.control = "start"
    end if
  else
    m.countdownTimer.control = "stop"
  end if
end sub

sub onSignageIndexChanged(event as Object)
  ' Propagate signage index change to the SignagePanel widget
  if m.hasSignage
    m.signagePanel.setField("signageIndex", event.getData())
  end if
end sub

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

  if nextEpoch > 0
    secsLeft = Int((nextEpoch - nowMs) / 1000)
    if secsLeft < 0 then secsLeft = 0

    text = formatCountdown(secsLeft)
    if text <> m.lastCountdownText
      m.countdownValue.text = text
      m.lastCountdownText = text
    end if
    m.countdownLabel.text = "NEXT GAME IN"
  else
    m.countdownValue.text = ""
    m.countdownLabel.text = ""
  end if
end sub

