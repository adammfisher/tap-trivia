# Tap Trivia — 05: Testing & Deployment

---

## LOCAL DEVELOPMENT

### Prerequisites
- Node.js 20.x
- Terraform 1.5+
- AWS CLI v2 with credentials
- Docker (for DynamoDB Local)
- Modern browser (Chrome DevTools mobile emulation for player app, 1920×1080 for TV app)

### Backend Local Dev

```bash
# DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# Create all 6 tables
cd backend/
node scripts/create-tables-local.js

# Seed questions
node seed/seed-questions.js --local

# Test handlers individually
node scripts/test-handler.js register-bar --barName "Test Pub" --tvDeviceId "dev-tv-1"
node scripts/test-handler.js get-bar --barCode "K7M2X"
node scripts/test-handler.js join-bar --barCode "K7M2X" --playerId "test-uuid"
node scripts/test-handler.js reset-bar-code --barCode "K7M2X" --tvDeviceId "dev-tv-1"
node scripts/test-handler.js get-current-game
node scripts/test-handler.js get-question --gameId abc --questionNumber 3
node scripts/test-handler.js submit-answer --gameId abc --questionNumber 3 --answer "6"
node scripts/test-handler.js get-leaderboard --gameId abc --type bar --barCode K7M2X
node scripts/test-handler.js get-leaderboard --gameId abc --type global
node scripts/test-handler.js get-tv-state --barCode "K7M2X"
```

**Build `scripts/test-handler.js`**: imports handler, constructs mock API Gateway event, calls handler, prints response. Supports all 11 functions.

**Build `scripts/create-tables-local.js`**: creates all 6 DynamoDB tables + GSIs against localhost:8000. Bars table: no TTL.

**Build `seed/seed-questions.js`**:
- Reads `../../trivia_questions.json` from the project root (100 test questions)
- Batch-writes to Questions table (handles 25-item limit)
- Initializes QuestionUsage per category
- `--local` for DynamoDB Local, `--stage dev|prod` for AWS
- Prints summary: total loaded, per-category counts, **per-difficulty distribution**
- With 100 test questions, distribution won't match production targets — that's fine for testing

---

## PLAYER WEB APP LOCAL DEV

```bash
cd player-app/
npx serve .
# Open Chrome, toggle device toolbar (Ctrl+Shift+M)
# Select iPhone 12/13 Pro or similar
# Navigate to http://localhost:3000
```

**API base URL configuration:** Use a `config.js` file that sets the API endpoint:

```javascript
// player-app/js/config.js (and tv-app/js/config.js)
const CONFIG = {
  API_BASE: 'http://localhost:3001',  // Local: point to SAM local or mock
  // API_BASE: 'https://your-api-id.execute-api.us-east-1.amazonaws.com',  // Prod
  PLAYER_APP_URL: 'http://localhost:3000',  // Local
  // PLAYER_APP_URL: 'https://d1abc2def.cloudfront.net',  // Prod (TV uses this for QR code)
};
```

For local testing without a backend, add `?mock=true` URL parameter to use mock data.

### Mock Mode

When `?mock=true` is in the URL:
- Returns hardcoded responses simulating active game
- Questions include `eliminateOrder` so hint animations work in mock
- Mock bar join returns "Test Pub" with code "DEV2X"
- Mock scoring respects 2s read time
- Game starts immediately (no waiting for schedule)

---

## TV WEB APP LOCAL DEV

```bash
cd tv-app/
npx serve .
# Open Chrome at http://localhost:3000
# Set window to 1920×1080 to simulate TV
```

URL param: `http://localhost:3000?mock=true&barCode=DEV2X`
Returns simulated game state cycling through all phases including `read_time`.

---

## GAME CLOCK TESTING

**Build `scripts/simulate-game.js`**:
- Sets `gameStartTime` to 30s from now (or `--start-now`)
- Calls `getGameState()` every 500ms
- Prints: phase, question number, points available, hintsVisible, correctRevealed
- **Verifies read time**: points = 1000 from 5s to 7s, decay starts at 7s
- Simulates full 15-question game in real-time
- Support `--speed 2x` for accelerated testing

**This is the most important test.** If game-clock.js is correct, everything else is display logic.

---

## SCORING ENGINE TESTS

```javascript
// Read time tests
assert(calculatePoints(5000) === 1000);     // Answers just appeared = max
assert(calculatePoints(6000) === 1000);     // 1s into read time = still max
assert(calculatePoints(6999) === 1000);     // Last ms of read time = still max

// Decay starts at 7s
assert(calculatePoints(7000) === 1000);     // Boundary: decay just starts
assert(calculatePoints(7001) < 1000);       // First ms of decay < 1000
assert(calculatePoints(8000) >= 800);       // 1s into decay

// Tier boundaries
assert(calculatePoints(15000) === 500);     // Tier 1 floor
assert(calculatePoints(30000) === 250);     // Tier 2 floor
assert(calculatePoints(45000) === 0);       // Revealed = 0

// Edge cases
assert(calculatePoints(4999) === 0);        // Before answers visible
assert(calculatePoints(50001) === 0);       // After window closes

// Front-weighting verification
const first_half = calculatePoints(7000) - calculatePoints(11000);
const second_half = calculatePoints(11000) - calculatePoints(15000);
assert(first_half > second_half);           // More points lost early in tier
```

---

## QUESTION SELECTION TESTS

**Build `scripts/test-question-selection.js`**:
1. Run selection for 1 game → validate:
   - Q1–4 are L1, Q5–9 are L2, Q10–12 are L3, Q13–14 are L4, Q15 is L5
   - At least 8 different categories
   - No more than 2 from any category
   - At least 1 from each super-category
2. Run for 40 games (1 night) → verify no question repeats, all 60 categories represented
3. Run for 120 games (3 nights) → verify category exhaustion handling works
4. Report: unique questions used, distribution by level, remaining per level per category

---

## BAR CODE TESTS

1. Register bar → receive 5-char code, verify format (no 0/O/1/I/L chars)
2. Register same tvDeviceId again → returns same existing bar, `isNew: false`
3. Register 100 different bars → no code collisions
4. Join bar with valid code → success, activePlayers incremented
5. Join bar with invalid code → 404 `INVALID_BAR_CODE`
6. Get bar → returns bar info + updates lastPollAt
7. Reset bar code → old code returns 404, new code works
8. Reset bar code with wrong tvDeviceId → 403 `UNAUTHORIZED_TV`
9. TV reopens → reads stored code → `GET /bar/{code}` → resumes (no re-registration)

---

## PLAYER WEB APP TESTING

### Test Game Script
**Build `scripts/create-test-game.js`**:
- Creates a game starting 1 min from now (or `--start-now`)
- Registers a test bar "Dev Pub" with code "DEV2X"
- Seeds 15 questions with correct difficulty ramp
- Prints game ID, bar code, start time

### Critical Scenarios

1. **Happy path:** Visit player CloudFront URL → pick name → join bar with 5-char code → play 15 questions → see bar results → see global results
2. **Mid-game join:** Open browser at question 7. Jump to current question. Hints already visible if past 15s/30s.
3. **No bar code (solo):** Play without entering code. See only global results after game. No bar leaderboard.
4. **Invalid bar code:** Enter "XXXXX" → shake animation → "That code doesn't match any active bar."
5. **Change bar mid-game:** Leave one bar, join another. Next answer tagged with new bar.
6. **Browser backgrounded:** Return during Q5 after leaving at Q3 → shows current Q5 with correct hint state.
7. **Slow network:** "Submitting..." state on answer button.
8. **Answer during read time (5–7s):** Full 1000 points awarded.
9. **Answer at 7.1s:** Slightly less than 1000 (decay just started).
10. **Answer at 49.9s:** Accepted. At 50.1s: rejected.
11. **Hint verification:** At 20s, first hint visible on phone. At 35s, both hints visible. Compare to TV.
12. **localStorage cleared:** Player gets new UUID, must pick new name. Previous stats lost (acceptable for Phase 1).
13. **Multiple tabs:** Same UUID in both — second tab's answers rejected as duplicates (correct behavior).
14. **iOS Safari quirks:** Test CSS animations, `position: fixed` bottom nav, prevent pull-to-refresh.

---

## TV WEB APP TESTING

### Testing Flow
1. Open TV web app → enter bar name → get 5-char code
2. Close and reopen → verify it remembers bar code (localStorage), skips setup
3. Open player app → enter bar code → confirm joined
4. Wait for game → verify TV and phone show same question at same time
5. **Verify read time:** "1000 POINTS" stays frozen on TV for first 2 seconds, then starts decaying
6. **Verify hints:** at 15s both phone and TV cross out the SAME answer. At 30s, same second answer.
7. Verify bar leaderboard shows on TV during scores phase (50–60s)
8. Verify global leaderboard shows ONLY after game ends, on both TV and phone
9. Test "Reset Bar Code" from TV settings → verify old code stops working, new code issued
10. Test on actual smart TV browser (Samsung TV browser, LG browser) — verify layout at 1920×1080

---

## TERRAFORM DEPLOYMENT

### First-Time Setup
```bash
aws s3 mb s3://tap-trivia-terraform-state --region us-east-1
aws dynamodb create-table \
  --table-name tap-trivia-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Deploy
```bash
cd terraform/
terraform init
terraform plan -var="stage=prod"
terraform apply -var="stage=prod"
```

**Outputs:** API URL, Player App CloudFront distribution URL, TV App CloudFront distribution URL, Lambda ARNs, table names, EventBridge rule ARN. **After deploy, update `config.js` in both web apps with the API URL and Player CloudFront URL, then re-deploy the web apps.**

### Seed
```bash
cd backend/
node seed/seed-questions.js --stage prod
# Loads 100 test questions from ../../trivia_questions.json
# Verify output: questions loaded per category and difficulty
```

### Smoke Test
```bash
API=https://your-api.execute-api.us-east-1.amazonaws.com

curl $API/game/current

curl -X POST $API/bar/register \
  -H "Content-Type: application/json" \
  -d '{"barName":"Smoke Test Bar","tvDeviceId":"smoke-tv-1"}'

curl -X POST $API/bar/join \
  -H "Content-Type: application/json" \
  -H "X-Player-ID: smoke-uuid-1" \
  -d '{"barCode":"XXXXX"}'

curl "$API/game/tv-state?barCode=XXXXX"
curl "$API/game/{gameId}/leaderboard?type=bar&barCode=XXXXX"
```

---

## WEB APP DEPLOYMENT

### Deploy Player App
```bash
# Sync files to S3
aws s3 sync player-app/ s3://tap-trivia-player-app \
  --delete \
  --cache-control "max-age=31536000" \
  --exclude "index.html" \
  --exclude "js/config.js"

# index.html with short cache (for fast updates)
aws s3 cp player-app/index.html s3://tap-trivia-player-app/index.html \
  --cache-control "max-age=60"

# config.js with short cache (contains API URL)
aws s3 cp player-app/js/config.js s3://tap-trivia-player-app/js/config.js \
  --cache-control "max-age=60"

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id $PLAYER_CF_DIST_ID \
  --paths "/index.html" "/js/config.js"
```

### Deploy TV App
```bash
aws s3 sync tv-app/ s3://tap-trivia-tv-app \
  --delete \
  --cache-control "max-age=31536000" \
  --exclude "index.html" \
  --exclude "js/config.js"

aws s3 cp tv-app/index.html s3://tap-trivia-tv-app/index.html \
  --cache-control "max-age=60"

aws s3 cp tv-app/js/config.js s3://tap-trivia-tv-app/js/config.js \
  --cache-control "max-age=60"

aws cloudfront create-invalidation \
  --distribution-id $TV_CF_DIST_ID \
  --paths "/index.html" "/js/config.js"
```

### Deploy Script
**Build `scripts/deploy.sh`** to automate both:
```bash
#!/bin/bash
STAGE=${1:-prod}

echo "Deploying player app..."
aws s3 sync player-app/ s3://tap-trivia-player-app --delete --cache-control "max-age=31536000" --exclude "index.html" --exclude "js/config.js"
aws s3 cp player-app/index.html s3://tap-trivia-player-app/index.html --cache-control "max-age=60"
aws s3 cp player-app/js/config.js s3://tap-trivia-player-app/js/config.js --cache-control "max-age=60"

echo "Deploying TV app..."
aws s3 sync tv-app/ s3://tap-trivia-tv-app --delete --cache-control "max-age=31536000" --exclude "index.html" --exclude "js/config.js"
aws s3 cp tv-app/index.html s3://tap-trivia-tv-app/index.html --cache-control "max-age=60"
aws s3 cp tv-app/js/config.js s3://tap-trivia-tv-app/js/config.js --cache-control "max-age=60"

echo "Invalidating CloudFront..."
aws cloudfront create-invalidation --distribution-id $PLAYER_CF_DIST_ID --paths "/index.html" "/js/config.js"
aws cloudfront create-invalidation --distribution-id $TV_CF_DIST_ID --paths "/index.html" "/js/config.js"

echo "Done!"
```

---

## MONITORING

### CloudWatch Alarms (in Terraform)
- Lambda error rate > 5%
- API Gateway 5xx > 1%
- `generate-games` failure (CRITICAL — no games if this fails)

### CloudWatch Dashboard Metrics
- API latency p50/p95/p99
- Questions remaining per level per category
- CloudFront request counts + cache hit ratio for both distributions
- Lambda invocation counts and error rates

### Admin Dashboard (Phase 1.5 — see doc 06)
The admin dashboard provides business-level metrics that CloudWatch doesn't cover:
- **Real-time:** Active bars, current player counts, geographic distribution
- **Historical:** Total players over time, breakdown by bar, breakdown by state, games played per day
- Standalone web app with basic auth (`admin`/`admin` for Phase 1.5)
- Powered by 3 dedicated admin Lambda endpoints + GameStats DynamoDB table
- Full spec in `06_ADMIN_DASHBOARD.md`

---

## COST ESTIMATE

### At Rest (Daytime): ~$0/month

### Active (500 players/night):
| Service | Nightly | Monthly |
|---------|---------|---------|
| Lambda | $0.20 | $6 |
| DynamoDB | $2.50 | $75 |
| API Gateway | $1.00 | $30 |
| S3 + CloudFront (2 apps) | — | $8 |
| **Total** | **$3.70** | **~$119** |

**Phase 1 is free-to-play.** Revenue begins in Phase 2 with native app subscriptions.

---

## BUILD ORDER (Phase 1)

1. `shared/game-clock.js` (with read_time phase) + `scripts/simulate-game.js`
2. `shared/scoring.js` (with 2s read time) + unit tests
3. Terraform — all infrastructure deployed (6 tables, 11 Lambdas, 2 S3 buckets, 2 CloudFront distributions)
4. `seed/seed-questions.js` — load 100 test questions from `trivia_questions.json` in project root, verify per-difficulty distribution
5. `register-bar` + `get-bar` + `reset-bar-code` + `join-bar` Lambdas
6. `generate-games` Lambda (uses difficulty ramp 4/5/3/2/1) + test
7. `get-current-game` Lambda
8. `get-question` Lambda (returns `eliminateOrder`)
9. `submit-answer` Lambda (scores all players — no subscription check in Phase 1)
10. `get-leaderboard` Lambda (bar anytime, global post-game only)
11. `get-tv-state` Lambda (includes `read_time` phase)
12. TV web app — bar setup + lobby + game display + hints + leaderboards
13. Player web app — welcome + name entry + home screen with countdown
14. Player web app — 5-char bar code join
15. Player web app — question screen with hint eliminations + read time (perfect this)
16. Player web app — results + leaderboards (bar during, global after)
17. Player web app — profile screen
18. Integration testing — TV + player app + backend end-to-end
19. Polish — CSS animations, sounds, edge cases, mobile Safari testing
20. Deploy to S3 + CloudFront, smoke test on real devices

### Phase 2 additions (not in scope):
- React Native mobile app (iOS + Android) via Expo
- App Store / Google Play in-app subscriptions ($2.99/mo)
- `validate-receipt` Lambda function
- Player table subscription fields

### Phase 3 additions (not in scope):
- Samsung Tizen app (web wrapper)
- Fire TV app (Android WebView wrapper)
- Google TV app (same APK as Fire TV)
- Roku channel (native BrightScript rewrite)
- Apple TV app (TVML or SwiftUI)
