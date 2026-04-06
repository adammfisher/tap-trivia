' TapTriviaScene — Root scene: state router, polling, screen management
' Mirrors the web TV app's app.js state machine

sub init()
  m.top.setFocus(true)
  m.top.backgroundURI = ""
  m.top.backgroundColor = "#0f0326"
  m.top.backExitsScene = false  ' Prevent accidental exit — all back handling is in onKeyEvent

  ' ── Constants ──
  m.API_BASE = "https://api.taptrivia.tv"
  m.POLL_INTERVAL_IDLE = 5    ' seconds
  m.POLL_INTERVAL_ACTIVE = 2  ' seconds
  m.MAX_ERRORS_BEFORE_OVERLAY = 3
  m.QUESTION_DURATION_MS = 52000
  m.TOTAL_QUESTIONS = 15

  ' ── State ──
  m.barCode = ""
  m.barName = ""
  m.tvDeviceId = ""
  m.currentScreen = ""
  m.consecutiveErrors = 0
  m.localGameStartEpoch = 0&
  m.clockOffset = 0&        ' server epoch ms - Roku epoch ms (corrects device clock drift)
  m.localQuestionNumber = 0
  m.signageSlides = []
  m.signageRotationSpeed = 60
  m.signageCurrentIndex = 0
  m.signageTimerRunning = false
  m.barLogoUrl = ""
  m.barLogoHash = ""

  ' Screen rotation state (cycles results/idle/lobby after game ends)
  m.rotationActive = false
  m.rotationScreens = []
  m.rotationIdx = 0
  m.cachedScreenData = {}
  m.ROTATION_DURATIONS = { results: 60, idle: 60, lobby: 60 }

  ' Between-game experience state
  m.betweenGameActive = false
  m.betweenGameData = invalid
  m.betweenGamePhases = []
  m.betweenGamePhaseIdx = 0
  m.betweenGameTotalDuration = 120000  ' 120s total
  m.betweenGameStartEpoch = 0&
  m.betweenGameLastGameId = ""
  m.betweenGameNextGameEpoch = 0&

  ' ── Node references ──
  m.screenNames = ["setupScreen", "idleScreen", "lobbyScreen", "getReadyScreen", "categoryScreen", "playingScreen", "revealScreen", "leaderboardScreen", "betweenScreen", "resultsScreen", "betweenPodiumScreen", "betweenStandingsScreen", "betweenNationalScreen", "betweenHypeScreen"]
  m.screens = {}
  for each name in m.screenNames
    m.screens[name] = m.top.findNode(name)
    if m.screens[name] = invalid
      print ">>> INIT ERROR: screen '" + name + "' NOT found (findNode returned invalid)"
    else
      print ">>> INIT OK: screen '" + name + "' loaded"
    end if
  end for
  m.errorOverlay = m.top.findNode("errorOverlay")

  ' ── API Tasks ──
  m.apiTask = m.top.findNode("apiTask")
  m.apiTask.observeField("response", "onApiResponse")

  ' Separate task for between-game data (avoids race with poll timer)
  m.betweenApiTask = m.top.findNode("betweenApiTask")
  m.betweenApiTask.observeField("response", "onBetweenApiResponse")

  ' ── Timers ──
  m.pollTimer = CreateObject("roSGNode", "Timer")
  m.pollTimer.repeat = true
  m.pollTimer.observeField("fire", "onPollTimer")

  m.rotationTimer = CreateObject("roSGNode", "Timer")
  m.rotationTimer.repeat = false
  m.rotationTimer.observeField("fire", "onRotationTimer")

  m.countdownTickTimer = CreateObject("roSGNode", "Timer")
  m.countdownTickTimer.repeat = true
  m.countdownTickTimer.duration = 1
  m.countdownTickTimer.observeField("fire", "onCountdownTick")

  m.signageTimer = CreateObject("roSGNode", "Timer")
  m.signageTimer.repeat = true
  m.signageTimer.observeField("fire", "onSignageRotation")

  m.betweenGamePhaseTimer = CreateObject("roSGNode", "Timer")
  m.betweenGamePhaseTimer.repeat = false
  m.betweenGamePhaseTimer.observeField("fire", "onBetweenGamePhaseTimer")

  ' ── Screen container ──
  m.screenContainer = m.top.findNode("screenContainer")

  ' ── Polling state ──
  m.currentPollRate = 0

  ' ── Start screensaver prevention ──
  startKeepAwake()

  ' ── Animated gradient background (also prevents screensaver) ──
  m.bgVideo = m.top.findNode("bgVideo")
  if m.bgVideo <> invalid
    m.bgVideo.content = CreateObject("roSGNode", "ContentNode")
    m.bgVideo.content.url = "pkg:/images/bg-gradient.mp4"
    m.bgVideo.content.streamFormat = "mp4"
    m.bgVideo.loop = true
    m.bgVideo.control = "play"
    m.bgVideo.enableUI = false
  end if

  ' ── Load config and initialize ──
  loadConfig()
  doInit()
end sub

' ══════════════════════════════════════════════════════════════
' INITIALIZATION
' ══════════════════════════════════════════════════════════════

sub doInit()
  if m.tvDeviceId = ""
    di = CreateObject("roDeviceInfo")
    m.tvDeviceId = di.GetChannelClientId()
    saveConfig()
  end if

  ' Always use hardcoded bar code for this deployment
  m.barCode = "9CK6T"
  verifyBarCode(m.barCode)
end sub

sub verifyBarCode(code as String)
  makeApiCall("GET", "/bar/" + code, invalid, "verifyBar")
end sub

' ══════════════════════════════════════════════════════════════
' SCREEN SWITCHING
' ══════════════════════════════════════════════════════════════

sub switchScreen(screenName as String)
  if screenName = m.currentScreen then return  ' Already showing — no-op
  print ">>> switchScreen: " + m.currentScreen + " -> " + screenName
  oldScreen = m.currentScreen
  ' Show new screen FIRST (covers old screen — never a blank frame)
  if m.screens[screenName] <> invalid
    m.screens[screenName].visible = true
    m.screens[screenName].setFocus(true)
  else
    print ">>> switchScreen: target '" + screenName + "' is INVALID"
    return
  end if
  ' THEN hide old screen
  if oldScreen <> "" and oldScreen <> screenName
    if m.screens[oldScreen] <> invalid
      m.screens[oldScreen].visible = false
    end if
  end if
  m.currentScreen = screenName
end sub

' ══════════════════════════════════════════════════════════════
' STATE MACHINE — translates API response → screen
' ══════════════════════════════════════════════════════════════

sub processGameState(apiState as Object)
  if apiState = invalid then return
  ' Don't process game state if we've disconnected (e.g. user pressed Back to setup)
  if m.barCode = "" then return

  ' Capture signage configuration
  if apiState.signage <> invalid
    m.signageSlides = apiState.signage.slides
    if m.signageSlides = invalid then m.signageSlides = []
    speed = apiState.signage.rotationSpeed
    if speed <> invalid and speed > 0
      m.signageRotationSpeed = speed
    end if
  end if

  ' Update logo if hash changed
  if apiState.logoHash <> invalid and apiState.logoHash <> m.barLogoHash
    m.barLogoHash = apiState.logoHash
    if apiState.logoUrl <> invalid
      m.barLogoUrl = apiState.logoUrl
    end if
  end if

  ' Capture gameStartEpoch + server clock offset for accurate local timer
  if apiState.gameStartEpoch <> invalid
    m.localGameStartEpoch = apiState.gameStartEpoch
  end if
  if apiState.serverNow <> invalid
    m.clockOffset = apiState.serverNow - getEpochMs()
  end if

  gameState = translateApiState(apiState)
  cacheForRotation(gameState, apiState)

  ' State routing
  state = ""
  if apiState.state <> invalid then state = apiState.state

  if state = "break"
    setPollRate(m.POLL_INTERVAL_IDLE)
    exitRotationMode()
    exitBetweenGameMode()
    if m.currentScreen <> "idleScreen"
      showIdleScreen(gameState)
    else
      ' Update idle screen gameState for countdown refresh
      m.screens.idleScreen.setField("gameState", gameState)
    end if
    ensureSignageRotation()
    return
  end if

  if state = "game_over"
    setPollRate(m.POLL_INTERVAL_IDLE)

    ' Start between-game experience on first game_over for this game
    gameId = ""
    if apiState.gameId <> invalid then gameId = apiState.gameId
    if gameId <> "" and gameId <> m.betweenGameLastGameId and not m.betweenGameActive
      m.betweenGameLastGameId = gameId
      ' Capture next game epoch for countdown bar
      nextEpoch = 0&
      if gameState.nextGameStartEpoch <> invalid then nextEpoch = gameState.nextGameStartEpoch
      if nextEpoch <= 0
        SLOT_MS = 15& * 60 * 1000
        nowMs = getEpochMs()
        nextEpoch = nowMs + SLOT_MS - (nowMs mod SLOT_MS)
      end if
      m.betweenGameNextGameEpoch = nextEpoch
      fetchBetweenGameData(gameId)
    end if

    ' If between-game experience is active, don't start normal rotation
    if m.betweenGameActive then return

    handleScreenRotation(gameState)
    return
  end if

  ' Active game — fast polling
  setPollRate(m.POLL_INTERVAL_ACTIVE)
  exitRotationMode()
  exitBetweenGameMode()
  ' NOTE: signage rotation is managed per-screen (start for between/leaderboard, stop for playing/reveal)
  renderGameScreen(gameState)
end sub

function translateApiState(apiState as Object) as Object
  gs = {
    screen: "lobby",
    gameCode: m.barCode,
    playerCount: 0,
    players: [],
    scores: [],
    question: {},
    timer: { remaining: 0, total: 35 },
    questionNumber: 0,
    totalQuestions: 15,
    nextGameStartEpoch: 0&,
    nextQuestionIn: 5
  }

  if apiState.barLeaderboard <> invalid
    gs.playerCount = apiState.barLeaderboard.count()
  else if apiState.activePlayers <> invalid
    gs.playerCount = apiState.activePlayers
  end if

  if apiState.questionNumber <> invalid then gs.questionNumber = apiState.questionNumber
  if apiState.totalQuestions <> invalid then gs.totalQuestions = apiState.totalQuestions
  if apiState.nextGameStartEpoch <> invalid then gs.nextGameStartEpoch = apiState.nextGameStartEpoch

  state = ""
  if apiState.state <> invalid then state = apiState.state

  ' Break state → lobby
  if state = "break"
    gs.screen = "lobby"
    if apiState.activePlayers_list <> invalid
      gs.players = apiState.activePlayers_list
    end if
    return gs
  end if

  ' Active game
  if state = "active_game"
    phase = ""
    if apiState.phase <> invalid then phase = apiState.phase

    ' Build scores from leaderboard
    gs.scores = buildScoresFromLeaderboard(apiState)

    if phase = "category_splash"
      gs.screen = "category"
      gs.question = {
        category: safeStr(apiState.category),
        subcategory: safeStr(apiState.subcategory),
        categoryIcon: getCategoryIcon(safeStr(apiState.category)),
        difficulty: safeInt(apiState.difficulty, 3)
      }
    else if phase = "countdown" or phase = "get_ready"
      gs.screen = "getready"
      gs.countdown = safeInt(apiState.countdown, 3)
    else if phase = "between"
      gs.screen = "leaderboard"
    else if phase = "reveal"
      gs.screen = "reveal"
      gs.question = {
        text: safeStr(apiState.question),
        answers: safeArray(apiState.answers),
        category: safeStr(apiState.category),
        categoryIcon: getCategoryIcon(safeStr(apiState.category))
      }
      gs.correctAnswerIndex = safeInt(apiState.correctIndex, -1)
      gs.answerPercentages = safeArray(apiState.answerPercentages)
    else if phase = "scores"
      gs.screen = "between"
      if m.localGameStartEpoch > 0&
        qNum = safeInt(apiState.questionNumber, 1)
        questionStartMs = m.localGameStartEpoch + (qNum - 1) * 52000&
        adjNow = getEpochMs() + m.clockOffset
        elapsedMs = adjNow - questionStartMs
        if elapsedMs < 0& then elapsedMs = 0&
        if elapsedMs > 52000& then elapsedMs = 52000&
        elapsed = Int(elapsedMs / 1000)
      else
        elapsed = safeInt(apiState.elapsedSeconds, 45)
      end if
      gs.nextQuestionIn = maxInt(1, ceilInt(m.QUESTION_DURATION_MS / 1000 - elapsed))
      gs.funFact = safeStr(apiState.funFact)
    else
      ' Playing phase (read_time, answer_time, etc.)
      gs.screen = "playing"
      gs.question = {
        text: safeStr(apiState.question),
        answers: safeArray(apiState.answers),
        category: safeStr(apiState.category),
        categoryIcon: getCategoryIcon(safeStr(apiState.category))
      }
      ' Compute elapsed from server-adjusted local clock for accurate sync.
      ' Falls back to API elapsedSeconds if gameStartEpoch not yet captured.
      if m.localGameStartEpoch > 0&
        qNum = safeInt(apiState.questionNumber, 1)
        questionStartMs = m.localGameStartEpoch + (qNum - 1) * 52000&
        adjNow = getEpochMs() + m.clockOffset
        elapsedMs = adjNow - questionStartMs
        if elapsedMs < 0& then elapsedMs = 0&
        if elapsedMs > 52000& then elapsedMs = 52000&
        elapsed = Int(elapsedMs / 1000)
      else
        elapsed = safeInt(apiState.elapsedSeconds, 0)
      end if
      remaining = maxInt(0, 31 - elapsed)
      gs.timer = { remaining: remaining, total: 28 }
      gs.pointsAvailable = safeInt(apiState.currentPointsAvailable, 0)
      gs.maxPoints = 1000
      gs.elapsedSeconds = elapsed
      gs.eliminated = safeArray(apiState.eliminated)
    end if
    return gs
  end if

  ' Game over
  if state = "game_over"
    gs.screen = "results"
    gs.scores = buildScoresFromLeaderboard(apiState)
    return gs
  end if

  return gs
end function

function buildScoresFromLeaderboard(apiState as Object) as Object
  scores = []
  lb = apiState.barLeaderboard
  if lb = invalid then return scores
  for i = 0 to lb.count() - 1
    p = lb[i]
    entry = {
      name: safeStr(p.name),
      score: safeInt(p.score, 0),
      rank: i + 1
    }
    if p.playerName <> invalid then entry.name = p.playerName
    if p.isCurrentCorrect <> invalid then entry.isCurrentCorrect = p.isCurrentCorrect
    if p.movement <> invalid then entry.movement = p.movement
    if p.streak <> invalid then entry.streak = p.streak
    scores.push(entry)
  end for
  return scores
end function

sub renderGameScreen(gameState as Object)
  screen = gameState.screen
  qNum = safeInt(gameState.questionNumber, 0)
  questionChanged = (qNum <> m.localQuestionNumber)

  ' Same screen + same question: surgical update only
  if screen = m.currentScreenType and not questionChanged
    updateCurrentScreen(gameState)
    return
  end if

  m.currentScreenType = screen
  m.localQuestionNumber = qNum

  if screen = "idle"
    showIdleScreen(gameState)
  else if screen = "setup"
    switchScreen("setupScreen")
  else if screen = "lobby"
    showLobbyScreen(gameState)
  else if screen = "getready"
    showGetReadyScreen(gameState)
  else if screen = "category"
    showCategoryScreen(gameState)
  else if screen = "playing"
    showPlayingScreen(gameState)
  else if screen = "reveal"
    showRevealScreen(gameState)
  else if screen = "between"
    showBetweenScreen(gameState)
  else if screen = "leaderboard"
    showLeaderboardScreen(gameState)
  else if screen = "results"
    showResultsScreen(gameState)
  else
    showIdleScreen(gameState)
  end if
end sub

sub updateCurrentScreen(gameState as Object)
  ' Surgical updates for dynamic screens (timer, countdown, etc.)
  screen = m.currentScreenType
  if screen = "playing"
    m.screens.playingScreen.setField("gameState", gameState)
  else if screen = "reveal"
    m.screens.revealScreen.setField("gameState", gameState)
  else if screen = "lobby"
    m.screens.lobbyScreen.setField("gameState", gameState)
  else if screen = "between"
    m.screens.betweenScreen.setField("gameState", gameState)
  else if screen = "results"
    m.screens.resultsScreen.setField("gameState", gameState)
  end if
end sub

' ── Screen show helpers ──

sub showIdleScreen(gameState as Object)
  m.localGameStartEpoch = 0&
  m.screens.idleScreen.setField("barCode", m.barCode)
  m.screens.idleScreen.setField("barName", m.barName)
  m.screens.idleScreen.setField("barLogoUrl", m.barLogoUrl)
  m.screens.idleScreen.setField("signageSlides", m.signageSlides)
  m.screens.idleScreen.setField("signageRotationSpeed", m.signageRotationSpeed)
  m.screens.idleScreen.setField("gameState", gameState)
  switchScreen("idleScreen")
  ensureSignageRotation()
end sub

sub showLobbyScreen(gameState as Object)
  m.screens.lobbyScreen.setField("barCode", m.barCode)
  m.screens.lobbyScreen.setField("barName", m.barName)
  m.screens.lobbyScreen.setField("barLogoUrl", m.barLogoUrl)
  m.screens.lobbyScreen.setField("signageSlides", m.signageSlides)
  m.screens.lobbyScreen.setField("signageIndex", m.signageCurrentIndex)
  m.screens.lobbyScreen.setField("gameState", gameState)
  switchScreen("lobbyScreen")
end sub

sub showGetReadyScreen(gameState as Object)
  stopSignageRotation()
  m.screens.getReadyScreen.setField("barName", m.barName)
  m.screens.getReadyScreen.setField("barCode", m.barCode)
  m.screens.getReadyScreen.setField("gameState", gameState)
  switchScreen("getReadyScreen")
end sub

sub showCategoryScreen(gameState as Object)
  stopSignageRotation()
  m.screens.categoryScreen.setField("barCode", m.barCode)
  m.screens.categoryScreen.setField("barName", m.barName)
  m.screens.categoryScreen.setField("gameState", gameState)
  switchScreen("categoryScreen")
end sub

sub showPlayingScreen(gameState as Object)
  stopSignageRotation()
  m.screens.playingScreen.setField("barCode", m.barCode)
  m.screens.playingScreen.setField("barName", m.barName)
  m.screens.playingScreen.setField("gameState", gameState)
  switchScreen("playingScreen")
end sub

sub showRevealScreen(gameState as Object)
  stopSignageRotation()
  m.screens.revealScreen.setField("barCode", m.barCode)
  m.screens.revealScreen.setField("barName", m.barName)
  m.screens.revealScreen.setField("gameState", gameState)
  switchScreen("revealScreen")
end sub

sub showLeaderboardScreen(gameState as Object)
  advanceSignageIndex()
  m.screens.leaderboardScreen.setField("barCode", m.barCode)
  m.screens.leaderboardScreen.setField("barName", m.barName)
  m.screens.leaderboardScreen.setField("barLogoUrl", m.barLogoUrl)
  m.screens.leaderboardScreen.setField("signageSlides", m.signageSlides)
  m.screens.leaderboardScreen.setField("signageIndex", m.signageCurrentIndex)
  m.screens.leaderboardScreen.setField("gameState", gameState)
  switchScreen("leaderboardScreen")
  ensureSignageRotation()
end sub

sub showBetweenScreen(gameState as Object)
  advanceSignageIndex()
  m.screens.betweenScreen.setField("barCode", m.barCode)
  m.screens.betweenScreen.setField("barName", m.barName)
  m.screens.betweenScreen.setField("barLogoUrl", m.barLogoUrl)
  m.screens.betweenScreen.setField("signageSlides", m.signageSlides)
  m.screens.betweenScreen.setField("signageIndex", m.signageCurrentIndex)
  m.screens.betweenScreen.setField("gameState", gameState)
  switchScreen("betweenScreen")
  ensureSignageRotation()
end sub

sub showResultsScreen(gameState as Object)
  advanceSignageIndex()
  m.screens.resultsScreen.setField("barCode", m.barCode)
  m.screens.resultsScreen.setField("barName", m.barName)
  m.screens.resultsScreen.setField("barLogoUrl", m.barLogoUrl)
  m.screens.resultsScreen.setField("signageSlides", m.signageSlides)
  m.screens.resultsScreen.setField("signageIndex", m.signageCurrentIndex)
  m.screens.resultsScreen.setField("gameState", gameState)
  switchScreen("resultsScreen")
end sub

' ══════════════════════════════════════════════════════════════
' SCREEN ROTATION (game_over: results → idle → lobby)
' ══════════════════════════════════════════════════════════════

sub cacheForRotation(gameState as Object, apiState as Object)
  screen = gameState.screen
  m.cachedScreenData[screen] = gameState

  ' nextGameStartEpoch is a LongInteger (ms) — don't use safeInt which truncates
  nextEpoch = 0&
  if apiState.nextGameStartEpoch <> invalid then nextEpoch = apiState.nextGameStartEpoch
  if nextEpoch = 0 and gameState.nextGameStartEpoch <> invalid then nextEpoch = gameState.nextGameStartEpoch

  ' Propagate nextGameStartEpoch to all cached states
  if nextEpoch > 0
    for each k in m.cachedScreenData
      if m.cachedScreenData[k] <> invalid
        m.cachedScreenData[k].nextGameStartEpoch = nextEpoch
      end if
    end for
  end if

  ' During game_over, ensure lobby state exists for rotation
  state = ""
  if apiState.state <> invalid then state = apiState.state
  if state = "game_over" and m.cachedScreenData.lobby = invalid
    m.cachedScreenData.lobby = {
      screen: "lobby",
      playerCount: safeInt(gameState.playerCount, 0),
      players: [],
      nextGameStartEpoch: nextEpoch
    }
  end if
end sub

sub handleScreenRotation(gameState as Object)
  newList = buildRotationList()

  if not m.rotationActive
    m.rotationActive = true
    m.rotationScreens = newList
    idx = findInArray(newList, gameState.screen)
    m.rotationIdx = maxInt(0, idx)
    renderRotationScreen()
    startRotationTimer()
    startCountdownTick()
    ensureSignageRotation()
  else
    current = ""
    if m.rotationIdx < m.rotationScreens.count()
      current = m.rotationScreens[m.rotationIdx]
    end if
    m.rotationScreens = newList
    newIdx = findInArray(newList, current)
    if newIdx >= 0
      m.rotationIdx = newIdx
    else
      m.rotationIdx = 0
    end if
  end if
end sub

function buildRotationList() as Object
  screens = []
  if m.cachedScreenData.results <> invalid then screens.push("results")
  screens.push("idle")
  ' Only include lobby near game time (not during off-hours)
  if m.cachedScreenData.lobby <> invalid
    nextEpoch = 0&
    if m.cachedScreenData.lobby.nextGameStartEpoch <> invalid
      nextEpoch = m.cachedScreenData.lobby.nextGameStartEpoch
    end if
    nowMs = getEpochMs()
    secsUntil = 0
    if nextEpoch > nowMs then secsUntil = Int((nextEpoch - nowMs) / 1000)
    if secsUntil <= 900 then screens.push("lobby")  ' 15 minutes
  end if
  return screens
end function

sub renderRotationScreen()
  if m.rotationScreens.count() = 0 then return
  idx = m.rotationIdx mod m.rotationScreens.count()
  screenName = m.rotationScreens[idx]

  if screenName = "idle"
    ' Push all data to idle screen (barCode, barName, etc.) so header renders
    m.screens.idleScreen.setField("barCode", m.barCode)
    m.screens.idleScreen.setField("barName", m.barName)
    m.screens.idleScreen.setField("barLogoUrl", m.barLogoUrl)
    m.screens.idleScreen.setField("signageSlides", m.signageSlides)
    m.screens.idleScreen.setField("signageRotationSpeed", m.signageRotationSpeed)
    m.screens.idleScreen.setField("signageIndex", m.signageCurrentIndex)
    ' Pass cached gameState for countdown
    idleCached = m.cachedScreenData["idle"]
    if idleCached <> invalid
      m.screens.idleScreen.setField("gameState", idleCached)
    else if m.cachedScreenData.results <> invalid
      m.screens.idleScreen.setField("gameState", m.cachedScreenData.results)
    end if
    switchScreen("idleScreen")
    return
  end if

  cached = m.cachedScreenData[screenName]
  if cached = invalid then return
  m.currentScreenType = ""
  m.localQuestionNumber = 0
  renderGameScreen(cached)
end sub

sub startRotationTimer()
  m.rotationTimer.control = "stop"
  if m.rotationScreens.count() <= 1 then return
  idx = m.rotationIdx mod m.rotationScreens.count()
  screenName = m.rotationScreens[idx]
  duration = 30
  if m.ROTATION_DURATIONS[screenName] <> invalid
    duration = m.ROTATION_DURATIONS[screenName]
  end if
  m.rotationTimer.duration = duration
  m.rotationTimer.control = "start"
end sub

sub onRotationTimer()
  if not m.rotationActive then return
  m.rotationIdx = (m.rotationIdx + 1) mod m.rotationScreens.count()
  renderRotationScreen()
  startRotationTimer()
end sub

sub startCountdownTick()
  m.countdownTickTimer.control = "start"
end sub

sub onCountdownTick()
  if not m.rotationActive
    m.countdownTickTimer.control = "stop"
    return
  end if
  ' Update current rotated screen countdown
  ' Individual screens handle their own tick updates
end sub

sub exitRotationMode()
  if not m.rotationActive then return
  m.rotationActive = false
  m.rotationTimer.control = "stop"
  m.countdownTickTimer.control = "stop"
  m.rotationScreens = []
  m.rotationIdx = 0
end sub

' ══════════════════════════════════════════════════════════════
' POLLING
' ══════════════════════════════════════════════════════════════

sub startPolling()
  setPollRate(m.POLL_INTERVAL_IDLE)
  pollTvState()
end sub

sub setPollRate(seconds as Integer)
  if seconds = m.currentPollRate then return
  m.currentPollRate = seconds
  m.pollTimer.duration = seconds
  m.pollTimer.control = "start"
end sub

sub onPollTimer()
  pollTvState()
end sub

sub pollTvState()
  if m.barCode = "" then return
  makeApiCall("GET", "/game/tv-state?barCode=" + m.barCode, invalid, "tvState")
end sub

' ══════════════════════════════════════════════════════════════
' API CALLS
' ══════════════════════════════════════════════════════════════

sub makeApiCall(httpMethod as String, path as String, body as Object, callId as String)
  m.apiTask.setField("callId", callId)
  m.apiTask.setField("requestMethod", httpMethod)
  m.apiTask.setField("requestUrl", m.API_BASE + path)
  if body <> invalid
    m.apiTask.setField("requestBody", FormatJson(body))
  else
    m.apiTask.setField("requestBody", "")
  end if
  m.apiTask.control = "run"
end sub

sub onApiResponse()
  response = m.apiTask.getField("response")
  callId = m.apiTask.getField("callId")

  if response = invalid or (response.error <> invalid and response.error <> "")
    m.consecutiveErrors = m.consecutiveErrors + 1
    if m.consecutiveErrors >= m.MAX_ERRORS_BEFORE_OVERLAY
      m.errorOverlay.visible = true
    end if
    return
  end if

  m.consecutiveErrors = 0
  if m.errorOverlay.visible then m.errorOverlay.visible = false

  if callId = "tvState"
    processGameState(response)
  else if callId = "verifyBar"
    onVerifyBarResponse(response)
  else if callId = "registerBar"
    onRegisterBarResponse(response)
  else if callId = "activateTV"
    onActivateTVResponse(response)
  end if
end sub

sub onVerifyBarResponse(response as Object)
  status = ""
  if response.status <> invalid then status = response.status

  if status = "active"
    if response.barName <> invalid then m.barName = response.barName
    saveConfig()
    startPolling()
  else
    ' Invalid code — clear and show setup
    m.barCode = ""
    m.barName = ""
    saveConfig()
    switchScreen("setupScreen")
  end if
end sub

sub onRegisterBarResponse(response as Object)
  if response.barCode <> invalid
    m.barCode = response.barCode
    if response.barName <> invalid then m.barName = response.barName
    saveConfig()
    ' Notify setup screen of success
    m.screens.setupScreen.setField("registerResult", response)
  else
    m.screens.setupScreen.setField("registerResult", { error: "Registration failed" })
  end if
end sub

sub onActivateTVResponse(response as Object)
  if response.barCode <> invalid
    m.barCode = response.barCode
    if response.barName <> invalid then m.barName = response.barName
    saveConfig()
    m.screens.setupScreen.setField("activateResult", response)
    ' After 3 seconds, switch to lobby and start polling
    activateTimer = CreateObject("roSGNode", "Timer")
    activateTimer.duration = 3
    activateTimer.repeat = false
    activateTimer.observeField("fire", "onActivateComplete")
    activateTimer.control = "start"
    m.activateTimer = activateTimer
  else
    m.screens.setupScreen.setField("activateResult", { error: "Activation failed" })
  end if
end sub

sub onActivateComplete()
  startPolling()
end sub

' ══════════════════════════════════════════════════════════════
' BETWEEN-GAME EXPERIENCE (4-phase sequence after game ends)
' ══════════════════════════════════════════════════════════════

sub fetchBetweenGameData(gameId as String)
  print ">>> betweenGame: fetching data for gameId=" + gameId
  ' Use separate API task to avoid race condition with poll timer
  m.betweenApiTask.setField("callId", "betweenGameData")
  m.betweenApiTask.setField("requestMethod", "GET")
  m.betweenApiTask.setField("requestUrl", m.API_BASE + "/game/between?barCode=" + m.barCode + "&gameId=" + gameId)
  m.betweenApiTask.setField("requestBody", "")
  m.betweenApiTask.control = "run"
end sub

sub onBetweenApiResponse()
  response = m.betweenApiTask.getField("response")
  if response = invalid or (response.error <> invalid and response.error <> "")
    print ">>> betweenGame: API error"
    return
  end if
  onBetweenGameDataResponse(response)
end sub

sub onBetweenGameDataResponse(response as Object)
  if response = invalid then return
  if response.error <> invalid then return

  m.betweenGameData = response

  ' Build phase list — skip null phases
  phases = []
  if response.podium <> invalid then phases.push("podium")
  if response.barStandings <> invalid then phases.push("standings")
  if response.national <> invalid then phases.push("national")
  if response.hype <> invalid then phases.push("hype")

  if phases.count() = 0
    print ">>> betweenGame: no phases available, skipping"
    return
  end if

  print ">>> betweenGame: starting with " + Str(phases.count()).trim() + " phases"
  m.betweenGamePhases = phases
  m.betweenGamePhaseIdx = 0
  m.betweenGameActive = true
  m.betweenGameStartEpoch = getEpochMs()
  exitRotationMode()
  stopSignageRotation()

  renderBetweenGamePhase()
  startBetweenGamePhaseTimer()
end sub

sub renderBetweenGamePhase()
  if m.betweenGamePhases.count() = 0 then return
  if m.betweenGamePhaseIdx >= m.betweenGamePhases.count() then return

  phase = m.betweenGamePhases[m.betweenGamePhaseIdx]
  print ">>> betweenGame: rendering phase " + Str(m.betweenGamePhaseIdx + 1).trim() + "/" + Str(m.betweenGamePhases.count()).trim() + " = " + phase

  if phase = "podium"
    showBetweenPodiumScreen()
  else if phase = "standings"
    showBetweenStandingsScreen()
  else if phase = "national"
    showBetweenNationalScreen()
  else if phase = "hype"
    showBetweenHypeScreen()
  end if
end sub

sub showBetweenPodiumScreen()
  m.screens.betweenPodiumScreen.setField("barCode", m.barCode)
  m.screens.betweenPodiumScreen.setField("barName", m.barName)
  m.screens.betweenPodiumScreen.setField("nextGameEpoch", m.betweenGameNextGameEpoch)
  m.screens.betweenPodiumScreen.setField("betweenData", m.betweenGameData)
  switchScreen("betweenPodiumScreen")
end sub

sub showBetweenStandingsScreen()
  m.screens.betweenStandingsScreen.setField("barCode", m.barCode)
  m.screens.betweenStandingsScreen.setField("barName", m.barName)
  m.screens.betweenStandingsScreen.setField("nextGameEpoch", m.betweenGameNextGameEpoch)
  m.screens.betweenStandingsScreen.setField("betweenData", m.betweenGameData)
  switchScreen("betweenStandingsScreen")
end sub

sub showBetweenNationalScreen()
  m.screens.betweenNationalScreen.setField("barCode", m.barCode)
  m.screens.betweenNationalScreen.setField("barName", m.barName)
  m.screens.betweenNationalScreen.setField("nextGameEpoch", m.betweenGameNextGameEpoch)
  m.screens.betweenNationalScreen.setField("betweenData", m.betweenGameData)
  switchScreen("betweenNationalScreen")
end sub

sub showBetweenHypeScreen()
  m.screens.betweenHypeScreen.setField("barCode", m.barCode)
  m.screens.betweenHypeScreen.setField("barName", m.barName)
  m.screens.betweenHypeScreen.setField("nextGameEpoch", m.betweenGameNextGameEpoch)
  m.screens.betweenHypeScreen.setField("betweenData", m.betweenGameData)
  switchScreen("betweenHypeScreen")
end sub

sub startBetweenGamePhaseTimer()
  m.betweenGamePhaseTimer.control = "stop"
  phaseCount = m.betweenGamePhases.count()
  if phaseCount = 0 then return
  ' Distribute 120s evenly across available phases
  phaseDuration = Int(m.betweenGameTotalDuration / 1000 / phaseCount)
  m.betweenGamePhaseTimer.duration = phaseDuration
  m.betweenGamePhaseTimer.control = "start"
end sub

sub onBetweenGamePhaseTimer()
  if not m.betweenGameActive then return
  m.betweenGamePhaseIdx = m.betweenGamePhaseIdx + 1

  if m.betweenGamePhaseIdx >= m.betweenGamePhases.count()
    ' All phases complete — exit to normal rotation
    exitBetweenGameMode()
    ' Trigger normal game_over rotation with cached data
    if m.cachedScreenData.results <> invalid
      handleScreenRotation(m.cachedScreenData.results)
    end if
    return
  end if

  renderBetweenGamePhase()
  startBetweenGamePhaseTimer()
end sub

sub exitBetweenGameMode()
  if not m.betweenGameActive then return
  print ">>> betweenGame: exiting"
  m.betweenGameActive = false
  m.betweenGamePhaseTimer.control = "stop"
  m.betweenGamePhases = []
  m.betweenGamePhaseIdx = 0
  m.betweenGameData = invalid
end sub

' ══════════════════════════════════════════════════════════════
' REGISTRY (persistent storage)
' ══════════════════════════════════════════════════════════════

sub loadConfig()
  sec = CreateObject("roRegistrySection", "TapTrivia")
  if sec.Exists("barCode")
    m.barCode = sec.Read("barCode")
  end if
  if sec.Exists("barName")
    m.barName = sec.Read("barName")
  end if
  if sec.Exists("tvDeviceId")
    m.tvDeviceId = sec.Read("tvDeviceId")
  end if
end sub

sub saveConfig()
  sec = CreateObject("roRegistrySection", "TapTrivia")
  sec.Write("barCode", m.barCode)
  sec.Write("barName", m.barName)
  sec.Write("tvDeviceId", m.tvDeviceId)
  sec.Flush()
end sub

sub clearConfig()
  m.barCode = ""
  m.barName = ""
  saveConfig()
end sub

' ══════════════════════════════════════════════════════════════
' SCREENSAVER PREVENTION
' ══════════════════════════════════════════════════════════════

sub startKeepAwake()
  ' Screensaver prevention via ECP self-ping every 2 min.
  ' (Silent video approach removed — an active Video node forces the Roku
  ' render pipeline to re-composite every frame at ~60fps, causing constant
  ' re-renders across all screens even when nothing is changing.)
  m.keepAwakeTask = m.top.findNode("keepAwakeTask")
  m.keepAwakeTask.control = "run"
  print ">>> keepAwake: ECP ping task started"
end sub

' ══════════════════════════════════════════════════════════════
' KEY HANDLING
' ══════════════════════════════════════════════════════════════

function onKeyEvent(key as String, press as Boolean) as Boolean
  ' Ignore stray literal character keypresses, keep-awake pings, and
  ' external ECP keepalive keypresses (Right+Left sent by watchdog)
  if Left(key, 4) = "Lit_" then return true
  if key = "info" then return true
  if key = "right" or key = "left" or key = "up" or key = "down" then return true

  if press
    print ">>> Scene.onKeyEvent: key=" + key + " press=true"
  end if
  if not press then return false

  ' Back button behavior:
  ' - Setup screen: let Roku handle exit (go to home)
  ' - Idle screen: clear code and go to setup (intentional "change location")
  ' - Any other screen (gameplay): go to idle, keep code saved
  if key = "back"
    if m.currentScreen = "setupScreen"
      ' Exit the app explicitly since backExitsScene=false
      m.top.close = true
      return true
    else if m.currentScreen = "idleScreen"
      ' User intentionally wants to change location
      m.pollTimer.control = "stop"
      exitRotationMode()
      stopSignageRotation()
      m.barCode = ""
      m.barName = ""
      saveConfig()
      m.screens.setupScreen.resetToInput = true
      switchScreen("setupScreen")
      return true
    else
      ' During gameplay — go back to idle, keep code saved
      exitRotationMode()
      switchScreen("idleScreen")
      return true
    end if
  end if

  return false
end function

' ══════════════════════════════════════════════════════════════
' SIGNAGE ROTATION
' ══════════════════════════════════════════════════════════════

sub ensureSignageRotation()
  if m.signageTimerRunning then return
  startSignageRotation()
end sub

sub startSignageRotation()
  print ">>> signage: startRotation speed=" + Str(m.signageRotationSpeed).trim() + " slides=" + Str(m.signageSlides.count()).trim() + " idx=" + Str(m.signageCurrentIndex).trim()
  m.signageTimer.duration = m.signageRotationSpeed
  m.signageTimer.control = "start"
  m.signageTimerRunning = true
end sub

sub stopSignageRotation()
  print ">>> signage: stopRotation"
  m.signageTimer.control = "stop"
  m.signageTimerRunning = false
end sub

sub onSignageRotation()
  m.signageCurrentIndex = m.signageCurrentIndex + 1
  print ">>> signage: onRotation newIdx=" + Str(m.signageCurrentIndex).trim() + " screen=" + m.currentScreen
  ' Push new slide index to whichever screen is currently showing
  if m.currentScreen = "idleScreen"
    m.screens.idleScreen.setField("signageIndex", m.signageCurrentIndex)
    return
  end if
  if m.currentScreen = "resultsScreen"
    m.screens.resultsScreen.setField("signageIndex", m.signageCurrentIndex)
  else if m.currentScreen = "lobbyScreen"
    m.screens.lobbyScreen.setField("signageIndex", m.signageCurrentIndex)
  else if m.currentScreen = "betweenScreen"
    m.screens.betweenScreen.setField("signageIndex", m.signageCurrentIndex)
  else if m.currentScreen = "leaderboardScreen"
    m.screens.leaderboardScreen.setField("signageIndex", m.signageCurrentIndex)
  end if
end sub

sub advanceSignageIndex()
  ' Advance signage index by 1 per screen render (matches web behavior)
  if m.signageSlides.count() > 0
    m.signageCurrentIndex = m.signageCurrentIndex + 1
    print ">>> signage: advanceIndex newIdx=" + Str(m.signageCurrentIndex).trim()
  end if
end sub

' ══════════════════════════════════════════════════════════════
' UTILITY FUNCTIONS
' ══════════════════════════════════════════════════════════════

function getEpochMs() as LongInteger
  dt = CreateObject("roDateTime")
  return dt.AsSeconds() * 1000&
end function

function safeStr(val as Dynamic) as String
  if val = invalid then return ""
  return val.toStr()
end function

function safeInt(val as Dynamic, fallback as Integer) as Integer
  if val = invalid then return fallback
  if type(val) = "Integer" or type(val) = "roInteger" or type(val) = "roInt" then return val
  if type(val) = "Float" or type(val) = "roFloat" or type(val) = "Double" or type(val) = "roDouble" then return Int(val)
  if type(val) = "String" or type(val) = "roString"
    result = val.toInt()
    if result <> 0 or val = "0" then return result
  end if
  return fallback
end function

function safeArray(val as Dynamic) as Object
  if val = invalid then return []
  if type(val) = "roArray" then return val
  return []
end function

function maxInt(a as Integer, b as Integer) as Integer
  if a > b then return a
  return b
end function

function minInt(a as Integer, b as Integer) as Integer
  if a < b then return a
  return b
end function

function ceilInt(f as Float) as Integer
  i = Int(f)
  if f > i then return i + 1
  return i
end function

function findInArray(arr as Object, val as String) as Integer
  for i = 0 to arr.count() - 1
    if arr[i] = val then return i
  end for
  return -1
end function

function getCategoryIcon(category as String) as String
  ' Returns PNG filename for category icon (rendered from emojis)
  if category = "" then return "pkg:/images/cat-default.png"
  c = LCase(category)
  ' Check keywords in order (most specific first)
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

' Small category icon for pills (48px versions)
function getCategoryIconSmall(category as String) as String
  uri = getCategoryIcon(category)
  return uri.Replace("cat-", "cat-sm-")
end function

' Calculate name hue (deterministic from name string, matches web app)
function nameHue(name as String) as Integer
  h = 0
  for i = 0 to Len(name) - 1
    h = h + Asc(Mid(name, i + 1, 1))
  end for
  return h mod 360
end function

' Format seconds into human-readable countdown (e.g., "10h 5m", "3m 22s", "15s")
function formatCountdown(secsLeft as Integer) as String
  hours = Int(secsLeft / 3600)
  mins = Int((secsLeft mod 3600) / 60)
  secs = secsLeft mod 60
  if hours > 0
    return Str(hours).trim() + "h " + Str(mins).trim() + "m"
  end if
  if mins > 0
    return Str(mins).trim() + "m " + Str(secs).trim() + "s"
  end if
  return Str(secs).trim() + "s"
end function

function rightJustify(s as String, width as Integer, pad as String) as String
  while Len(s) < width
    s = pad + s
  end while
  return s
end function

' Points color tier based on percentage (matches web app)
function pointsTier(pct as Float) as String
  if pct > 0.6 then return "safe"
  if pct > 0.3 then return "warning"
  return "danger"
end function

function pointsColor(tier as String) as String
  if tier = "safe" then return "#00d4aa"
  if tier = "warning" then return "#ffd200"
  if tier = "danger" then return "#ff4757"
  return "#ffd200"
end function
