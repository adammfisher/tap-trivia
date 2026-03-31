# TapTrivia Automated Test Plan

**Script:** `bash scripts/test-simulators.sh [filter]`
**Filters:** `all` · `ios` · `android` · `api` · `code`
**Screenshots saved to:** `/tmp/taptrivia-test-YYYYMMDD-HHMMSS/`

---

## Prerequisites

| Requirement | Command |
|---|---|
| Metro bundler on port 8083 | `cd TapTrivia && node_modules/.bin/expo start --port 8083` |
| iOS Simulator booted (iPhone 16 Pro) | `xcrun simctl boot 6B2D9AA9-E19A-4CED-8771-23E0696F7A03` |
| Android Emulator running | `emulator-5554` visible in `adb devices` |
| ADB reverse port | `adb reverse tcp:8083 tcp:8083` (script does this automatically) |

**Note:** `code` and `api` filters run without any simulators.

---

## Automation Mechanism

| Platform | How it works |
|---|---|
| **iOS** | State injected via AsyncStorage file (`manifest.json`) → app launched via `xcrun simctl openurl` → taps via Quartz `CGEventPost` (hardware-level mouse events) → screenshot via `xcrun simctl io screenshot` |
| **Android** | Full UI via `adb shell input tap/text/keyevent` → data reset via `adb shell pm clear` → screenshot via `adb shell screencap` |
| **Code** | Static grep/pattern checks on source files — no simulator needed |
| **API** | Live `curl` calls to `https://api.taptrivia.tv` — no simulator needed |

---

## Test Suite

### CODE CHECKS — `bash scripts/test-simulators.sh code`
*Static analysis, no simulator. Runs in seconds.*

| ID | Test | What It Checks | Pass Criteria |
|---|---|---|---|
| **T18a** | Timer duration sync | `TapTrivia/src/utils/game-clock.ts` vs `backend/shared/game-clock.js` | `QUESTION_DURATION_MS` identical in both files |
| **T18b** | REVEAL phase sync | Same files as T18a | `REVEAL` start time identical in both files |
| **T18c** | SCORES phase sync | Same files as T18a | `SCORES` start time identical in both files |
| **T19a** | Scoring start sync | `TapTrivia/src/utils/scoring.ts` vs `backend/shared/scoring.js` | `ANSWER_START_MS` identical in both files |
| **T19b** | Scoring reveal sync | Same files as T19a | `REVEAL_START_MS` identical in both files |
| **T24a** | Score deferral field | `TapTrivia/src/contexts/GameContext.tsx` | `deferredTotalScore` field exists |
| **T24b** | Score deferral population | `GameContext.tsx` | `deferredTotalScore` is assigned from `totalGameScore` |
| **T24c** | Score deferral timing | `GameContext.tsx` | `deferredTotalScore` is applied during `scores` phase |
| **T25a** | Paywall gate — isPro check | `TapTrivia/src/screens/LobbyScreen.tsx` | `isPro` check exists — lobby can't be reached without subscription |
| **T25b** | Paywall gate — loading state | `LobbyScreen.tsx` | `subLoading` or `isLoading` guard present (no flash of unprotected lobby) |
| **T25c** | Paywall gate — navigation | `LobbyScreen.tsx` | Navigates to `SubscriptionScreen` for non-subscribers |
| **T26a** | Trial duration | `TapTrivia/src/services/trial.ts` | 7-day trial period defined |
| **T26b** | Trial status enum | `trial.ts` | `never_started`, `active`, `expired` states present |
| **T26c** | Keychain storage | `trial.ts` | Uses `SecureStore` (survives iOS reinstall) |
| **T27a** | Name collision response field | `backend/functions/join-bar/index.js` | Returns `nameCollision` boolean in response body |
| **T27b** | Name collision scan logic | `join-bar/index.js` | Scans DynamoDB players at same bar for matching name |
| **T28a** | Leaderboard dedup call | `backend/functions/get-leaderboard/index.js` | Calls `deduplicateNames` or `dedupMap` |
| **T28b** | Dedup function exported | `backend/shared/name-suffixes.js` | Exports `deduplicateNames` function |
| **T28c** | Dedup suffix logic | `name-suffixes.js` | `_2`/`_3` suffix generation logic present |
| **T29** | Feedback email address | `backend/functions/submit-feedback/index.js` | Routes to `adam.fisher@visudolabs.com` |

---

### API TESTS — `bash scripts/test-simulators.sh api`
*Live calls to production API. Runs in ~5 seconds.*

| ID | Test | Endpoint | Pass Criteria |
|---|---|---|---|
| **T20a** | join-bar returns nameCollision | `POST /bar/join` | Response JSON includes `nameCollision` boolean |
| **T20b** | join-bar rejects missing barCode | `POST /bar/join` with empty body | Returns HTTP 400 |
| **T20c** | join-bar rejects missing Player-ID | `POST /bar/join` without header | Returns HTTP 400 |
| **T21a** | /game/current reachable | `GET /game/current?barCode=9CK6T` | Returns JSON with `status` field |
| **T21b** | Leaderboard returns data | `GET /game/{id}/leaderboard` | Returns `leaderboard` array (only runs if active game) |

---

### iOS TESTS — `bash scripts/test-simulators.sh ios`
*State injection + screenshot verification. Requires iOS Simulator + Metro.*

| ID | Test | Setup | What's Verified |
|---|---|---|---|
| **T01** | Fresh install — Welcome screen | Wipes AsyncStorage, launches clean | App shows Welcome screen; Settings gear tap navigates to Settings |
| **T02** | Returning user with active trial | Injects: deviceId, nickname `TestPlayer`, barCode `9CK6T`, trial started 1 day ago | Welcome shows saved bar "Connestee Social Club"; user has nickname |
| **T03** | Expired trial — Paywall | Injects: deviceId, nickname `ExpiredUser`, trial started 8 days ago | Paywall shows "Your free trial has ended"; no "Start Free Trial" button |
| **T04** | Name collision warning | Injects: deviceId, nickname `BarBuddy`, no barCode | Welcome renders correctly; collision warning appears on NicknameScreen if duplicate name exists at bar |
| **T05** | Settings screen | Injects: deviceId, nickname `SettingsUser` | Settings gear tap opens Settings; back arrow returns to Welcome |
| **T06** | New user sees empty Settings | Injects: deviceId only, no nickname | Settings shows blank nickname field for new user |
| **T23a** | Visual regression — Welcome with bar | Injects: deviceId, nickname `VisualUser`, barCode `9CK6T` | Welcome screen renders with saved bar card |
| **T23b** | Visual regression — Settings | Same state as T23a | Settings screen renders with saved nickname |

**iOS automation notes:**
- AsyncStorage lives at `$DATA_DIR/Documents/ExponentExperienceData/@adamm733/TapTrivia/RCTAsyncLocalStorage/manifest.json`
- Taps use Quartz `CGEventPost(kCGHIDEventTap)` — hardware-level, works reliably
- Keychain is NOT wiped (would reset Expo Go's own state, breaking dev menu behavior)
- Every launch dismisses the Expo developer menu by tapping the X button at logical (360, 115)
- Settings gear is at logical (361, 74) → screen (-196 + 361×1.134, -1316 + 74×1.112) = **(213, -1234)**

---

### ANDROID TESTS — `bash scripts/test-simulators.sh android`
*Full UI automation via ADB. Requires Android Emulator + Metro.*

| ID | Test | What It Does | What's Verified |
|---|---|---|---|
| **T10** | Fresh install — Welcome | `pm clear` full data reset + launch | Welcome screen renders in off-hours mode (countdown) |
| **T11** | New user — Settings tap | Fresh state + tap settings gear area | App is interactive; off-hours mode correctly hides Join button |
| **T12** | Paywall dev bypass | Fresh state + navigate toward subscription screen | App state is new-user (no nickname), paywall accessible |
| **T13a** | Off-hours settings accessible | `adb tap` to Settings gear | Settings screen opens from Welcome |
| **T13b** | Off-hours welcome content | Screenshot after back | Off-hours countdown + "Did you know?" banner visible |
| **T14** | Game-hours simulation | Override device time to 8 PM ET → relaunch | If time change works: Join/Create/Solo buttons appear; score/join flow unlocked |
| **T15** | Deep link to Join screen | `am start` with exp:// deep link | Join screen with bar code input field |
| **T16** | Nickname entry | `adb input text "TestPlayer"` + submit tap | Text appears in field; submit advances screen |
| **T17** | Score deferral (live game) | Screenshot during active game | Score does NOT update on Correct/Wrong — only updates at Between screen | *(SKIP if off-hours)* |
| **T18** | Timer phase sync | Code check (same as above) | See CODE CHECKS T18 |
| **T19** | Scoring constants sync | Code check (same as above) | See CODE CHECKS T19 |
| **T22a** | Visual regression — Welcome | Relaunch + screenshot | Welcome screen renders correctly |
| **T22b** | Visual regression — Settings | Tap gear + screenshot | Settings screen renders correctly |

---

## Score Deferral — What We're Testing

The game design requires that a player's **total score does not change visually** while on the `CorrectScreen` or `WrongScreen` (reveal phase). The score only advances when the `BetweenScreen` (scores phase) appears.

**T24 checks the code implementation:**
1. `deferredTotalScore` field exists in `GameContext` state
2. It is populated when an answer is submitted (during reveal)
3. It is applied to `totalGameScore` only when `questionPhase === 'scores'`

**T17 checks it live** (requires active game during game hours).

---

## Name Deduplication — What We're Testing

If two players at the same bar both have the nickname `Alex`, the leaderboard would show duplicate entries that are indistinguishable.

**T27** verifies the `join-bar` Lambda detects the collision at join time and returns `nameCollision: true` in the response — the mobile app then prompts the player to change their name.

**T28** verifies the `get-leaderboard` Lambda deduplicates names in the response with `_2`, `_3` suffixes as a last-resort fallback.

**T20a** tests the live API returns the `nameCollision` field.

---

## Subscription / Trial — What We're Testing

| Scenario | Expected behavior |
|---|---|
| Never installed before | Paywall with "Start 7-Day Free Trial" button |
| Trial active (< 7 days since first launch) | Full access — Welcome, Lobby, gameplay all accessible |
| Trial expired (≥ 7 days, not subscribed) | Paywall with "Subscribe" only — no trial button |
| Active RevenueCat subscriber | Full access |
| Dev bypass | 5-tap crown on paywall → "Skip (Dev)" button appears |

**T03** injects the expired-trial state and captures the paywall screen.
**T25** verifies the code-level gate: LobbyScreen checks `isPro` and handles `subLoading` before rendering.
**T26** verifies the trial service: 7-day window, correct status enum, and Keychain storage (so trial survives iOS reinstall/reinstall of the app on same device — Keychain persists across uninstalls on iOS).

---

## What Happens When Tests Run

```
╔══════════════════════════════════════════════════╗
║     TapTrivia Simulator Test Suite                ║
║     2026-03-27 21:00:00                           ║
╚══════════════════════════════════════════════════╝
  Screenshots: /tmp/taptrivia-test-20260327-210000/

══ PREFLIGHT CHECKS ══
  ✓ PASS: iOS Simulator booted (iPhone 16 Pro)
  ✓ PASS: Android Emulator connected (emulator-5554)
  ✓ PASS: Metro bundler running on port 8083
  ✓ PASS: ADB reverse port forwarding set (tcp:8083)
  ✓ PASS: iOS data dir found: ~/Library/.../host.exp.Exponent/Data
  ✓ PASS: Backend API reachable (https://api.taptrivia.tv)

══ T18 [Android] Timer Phase Constants Match Backend ══
  ✓ PASS: QUESTION_DURATION_MS matches (52000 ms)
  ✓ PASS: REVEAL start phase matches (31000 ms)
  ✓ PASS: SCORES start phase matches (37000 ms)
... (continues for all tests) ...

╔══════════════════════════════════════════════════╗
║  TEST RESULTS                                     ║
╠══════════════════════════════════════════════════╣
  PASS: 28
  FAIL: 0
  SKIP: 2
```

All screenshots are saved to `/tmp/taptrivia-test-YYYYMMDD-HHMMSS/` for manual visual review after the run.

---

## Known Limitations

| Limitation | Why | Workaround |
|---|---|---|
| iOS tap accuracy depends on Simulator window position | Quartz uses absolute screen coords | Re-detect window: `osascript -e 'tell app "System Events" to tell process "Simulator" to return (position of window 1) & (size of window 1)'` — update `IOS_WIN_X`/`IOS_WIN_Y` in script config |
| T17 (score deferral live) skips off-hours | No active game outside 10 AM–9 PM ET | Run `bash scripts/test-simulators.sh android` during game hours |
| T14 (game-hours simulation via time override) may not work | Android emulator may reject time changes if auto_time can't be disabled | Visual inspection of T14 screenshot tells you if it worked |
| Android AsyncStorage can't be directly injected | Production build, no `adb root` | Tests use `pm clear` (full reset) + UI navigation |
| iOS trial state (Keychain/SecureStore) can't be injected | SecureStore is encrypted, simulator Keychain is locked | T03 tests via AsyncStorage key as fallback; full trial flow needs real device for Keychain path |
| T21b (leaderboard dedup) skips if no active game | Off-hours = no game running | Run during 10 AM–9 PM ET |
