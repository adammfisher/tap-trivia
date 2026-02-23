# TapTrivia React Native Mobile App

## Build Progress

### Phase 1 — Expo Go (Steps 1-11)

- [x] **Step 1: Scaffold** — Expo TypeScript project created, all deps installed, folder structure, fonts loaded, theme files, design tokens
- [x] **Step 2: Components** — All 14 reusable components built (AnswerCard, TimerRing, Avatar, Logo, PointsDisplay, ProgressBar, CategoryBadge, DifficultyDots, LeaderboardRow, SavedBarCard, StatBox, Confetti, GradientBackground, LoadingDots)
- [x] **Step 3: Navigation** — RootNavigator with NativeStackNavigator, 14 screens, Game stack has gestureEnabled: false, modals for Subscription/Settings
- [x] **Step 4: Welcome + Join** — Full implementation with 5-char code input, auto-uppercase, validate via API, shake on error, saved bars list
- [x] **Step 5: Mock game state** — useGameState hook with mock data, timer countdown, answer submission
- [x] **Step 6: Playing + LockedIn + Correct + Wrong** — Full gameplay screens wired to mock hook with haptic feedback
- [x] **Step 7: Lobby + Countdown + Category** — Pre-game screens with animations, phase-driven navigation
- [x] **Step 8: Between + Results** — Leaderboard, stats, confetti, Play Again flow
- [x] **Step 9: Nickname + Settings** — AsyncStorage hooks (usePlayerIdentity, useSavedBars), full Settings screen
- [x] **Step 10: Subscription UI** — Visual mock with RevenueCat placeholder hook (always grants access)
- [x] **Step 11: Real API** — GameContext with 250ms tick loop, real API polling, all 11 screens wired to backend

### Phase 2 — Dev Build (Steps 12-13)
- [x] **Step 12: RevenueCat** — Real subscription integration (react-native-purchases, service/hook/paywall, soft paywall after game ends)
- [ ] **Step 13: Polish** — Haptics refinement, animation polish, edge cases

### Phase 3 — Ship (Steps 14-15)
- [ ] **Step 14: Preview** — TestFlight + Android Internal Testing
- [ ] **Step 15: Production** — App Store + Google Play submission

## Architecture

- **Entry:** App.tsx — Font loading, SafeAreaProvider, NavigationContainer
- **Navigation:** src/navigation/RootNavigator.tsx — NativeStackNavigator with 14 screens, wrapped in GameProvider
- **Game Loop:** src/contexts/GameContext.tsx — Shared context with 250ms setInterval tick, real API calls
- **Hooks:** useGameState (thin wrapper on GameContext), usePlayerIdentity (AsyncStorage), useSavedBars (AsyncStorage)
- **Storage:** AsyncStorage with @taptrivia: prefix
- **API:** src/services/api.ts — fetch-based, X-Player-ID header, typed responses
- **Clock:** src/utils/game-clock.ts — TypeScript port of backend/shared/game-clock.js (MUST stay in sync)
- **Scoring:** src/utils/scoring.ts — TypeScript port of backend/shared/scoring.js (MUST stay in sync)
- **Design:** src/theme/ — colors, typography, spacing tokens ported from v4 mockup

## Game Loop Architecture

GameContext.tsx is the core of the mobile app. It:
1. Runs a 250ms `setInterval` tick that calls `game-clock.ts` → computes current phase from `startTimeEpoch`
2. Fetches questions via `GET /game/{id}/question/{num}` when a new question is detected
3. Submits answers via `POST /game/{id}/answer` with immediate local feedback (locked-in points)
4. Fetches leaderboard via `GET /game/{id}/leaderboard` during the 'scores' phase
5. Tracks player stats (correct/wrong/timeout/streak) locally
6. Calculates hint eliminations from `eliminateOrder` data

**Phase mapping** (game-clock → mobile GamePhase):
- `category_splash` → `'category'` (CategoryScreen)
- `read_time / all_answers / hint_1 / hint_2` → `'question'` (PlayingScreen)
- `reveal` → `'reveal'` (CorrectScreen or WrongScreen)
- `scores` → `'leaderboard'` (BetweenScreen)
- `pre_game` → `'waiting'` (LobbyScreen)
- `post_game` → `'finished'` (ResultsScreen)

**Screen flow:** Welcome → Join (POST /bar/join) → Nickname (local save) → Lobby (polls GET /game/current every 5s) → Category → Playing → LockedIn → Correct/Wrong → Between → (loop) → Results

## API Endpoints Used

| Method | Endpoint | Screen |
|--------|----------|--------|
| POST | `/bar/join` | JoinScreen, WelcomeScreen (saved bars) |
| GET | `/game/current?barCode=X` | LobbyScreen (5s polling) |
| GET | `/game/{id}/question/{num}` | GameContext (on new question) |
| POST | `/game/{id}/answer` | GameContext (on answer submit) |
| GET | `/game/{id}/leaderboard?scope=bar&barCode=X` | GameContext (during scores phase) |

All requests include `X-Player-ID` header with device UUID.

## Key Decisions

1. **Logo gradient text**: Using solid gold (#ffd200) for "Trivia" instead of CSS gradient (simpler for RN, looks nearly identical)
2. **Subscription gate**: Mock always-subscribed for Phase 1, RevenueCat in Phase 2
3. **Game state**: Single GameContext (250ms tick) drives all phase transitions; screens read from shared state via useGameState
4. **Navigation within Game**: Server-driven via gamePhase field (useEffect in each screen), not user-initiated. Back gesture disabled.
5. **No WebSockets**: Same as web apps — clock-sync + REST polling only
6. **Mutable refs for game loop**: GameContext uses `useRef` for mutable state to avoid stale closures in the setInterval callback

## TypeScript

- Strict mode enabled, zero `any` types
- Full type coverage: RootStackParamList, GameState, QuestionData, AnswerResult, LeaderboardEntry, ClockState, QuestionPhase, etc.
- 0 TypeScript errors as of last build
