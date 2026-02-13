# Tap Trivia — Claude Code Setup Guide

## Prerequisites
- Claude Code installed (`npm install -g @anthropic-ai/claude-code`)
- AWS CLI configured (`aws configure` with your credentials)
- Terraform installed (`brew install terraform` or equivalent)
- Node.js 20+ installed

## Step 1: Create the project folder

```bash
mkdir tap-trivia && cd tap-trivia
mkdir docs
```

## Step 2: Copy files into the project

You need 9 files total. Copy them from wherever you downloaded them:

```bash
# The 7 spec docs go into docs/
cp ~/Downloads/01_MASTER_PROMPT.md docs/
cp ~/Downloads/02_BACKEND_ARCHITECTURE.md docs/
cp ~/Downloads/03_GAME_LOGIC.md docs/
cp ~/Downloads/04_PLAYER_TV_UI_UX.md docs/
cp ~/Downloads/05_TESTING_AND_DEPLOYMENT.md docs/
cp ~/Downloads/06_ADMIN_DASHBOARD.md docs/
cp ~/Downloads/README.md docs/

# The 2 JSON files go in the project root
cp ~/Downloads/trivia_questions.json .
cp ~/Downloads/topic_tree.json .
```

Your folder should look like this:
```
tap-trivia/
├── docs/
│   ├── 01_MASTER_PROMPT.md
│   ├── 02_BACKEND_ARCHITECTURE.md
│   ├── 03_GAME_LOGIC.md
│   ├── 04_PLAYER_TV_UI_UX.md
│   ├── 05_TESTING_AND_DEPLOYMENT.md
│   ├── 06_ADMIN_DASHBOARD.md
│   └── README.md
├── trivia_questions.json      (100 test questions)
└── topic_tree.json            (category tree)
```

Verify:
```bash
ls docs/        # should show 7 .md files
ls *.json       # should show trivia_questions.json and topic_tree.json
```

## Step 3: Launch Claude Code

```bash
cd tap-trivia
claude
```

## Step 4: Paste this prompt (copy everything between the lines)

-------------------------------------------------------------------
Read all documents in docs/ (01 through 06, plus the README). These are the complete
specification for Tap Trivia Phase 1 — a web-only bar trivia game. Read them ALL
before writing any code, then build in the order specified in document 05
(Build Order section).

Key facts:
- Phase 1 ONLY. Do NOT build Phase 1.5 (admin dashboard) yet — just note the geo
  fields in the Bars table schema are part of Phase 1.
- Two static web apps (vanilla HTML/CSS/JS, no framework) served from S3 via CloudFront.
- CloudFront distribution URLs only — no taptrivia.com domain yet.
- TV lobby uses a QR code pointing to the Player CloudFront URL (since the URL is
  too long to type). Use a CDN-hosted QR code library (qrcode-generator).
- AWS serverless backend: Lambda + DynamoDB + API Gateway + EventBridge.
- All infrastructure via Terraform.
- trivia_questions.json in the project root has 100 test questions to seed DynamoDB.
- The seed script (backend/seed/seed-questions.js) reads from ../../trivia_questions.json.
- The question selection algorithm must handle the small 100-question test pool
  gracefully (widen difficulty ±1 when category/difficulty combo is exhausted).
- register-bar Lambda must call ip-api.com to get city/state/country/lat/lon from
  the caller's IP address. Store these in the Bars table. If geolocation fails,
  store empty strings and continue — do NOT block registration.
- Bars table needs a state-index GSI (PK: state, SK: barCode) even though the admin
  dashboard isn't built yet — the index needs to exist when we add it.

Build order:
1. shared/game-clock.js + shared/scoring.js
2. Terraform — all infrastructure (6 DynamoDB tables + GameStats table for Phase 1.5,
   11 Lambdas, 2 S3 buckets, 2 CloudFront distros, API Gateway, EventBridge)
3. seed/seed-questions.js — load 100 test questions from root trivia_questions.json
4. All 11 Lambda functions (register-bar with IP geolocation, get-bar, join-bar,
   reset-bar-code, get-current-game, get-question, submit-answer, get-leaderboard,
   get-tv-state, generate-games, get-player)
5. TV web app — bar setup, lobby with QR code, game display, hints, leaderboards
6. Player web app — welcome, home, join bar, question screen with hints, results, profile
7. Integration testing

After Terraform deploys, update config.js in both web apps with the real API Gateway
URL and Player CloudFront URL, then deploy web apps to S3.

Start with game-clock.js now.
-------------------------------------------------------------------

## Step 5: Let Claude Code build

Claude Code will work through the build order. It takes a while. If it stops or
hits the message limit, just say "continue" or "keep going from where you left off."

## Step 6: Deploy infrastructure

Once Claude Code has written the Terraform files:

```bash
cd terraform
terraform init
terraform plan      # review what it's creating
terraform apply     # type "yes" to confirm
```

Terraform will output 3 values you need:
```
api_url          = "https://abc123.execute-api.us-east-1.amazonaws.com"
player_cf_domain = "d1abc2def.cloudfront.net"
tv_cf_domain     = "d9xyz456.cloudfront.net"
```

## Step 7: Update config files with real URLs

Edit player-app/js/config.js:
```javascript
const CONFIG = {
  API_BASE: 'https://abc123.execute-api.us-east-1.amazonaws.com',  // from terraform output
  PLAYER_APP_URL: 'https://d1abc2def.cloudfront.net',              // from terraform output
};
```

Edit tv-app/js/config.js:
```javascript
const CONFIG = {
  API_BASE: 'https://abc123.execute-api.us-east-1.amazonaws.com',  // same API
  PLAYER_APP_URL: 'https://d1abc2def.cloudfront.net',              // for QR code generation
};
```

## Step 8: Seed the questions

```bash
cd backend/seed
node seed-questions.js
```

This loads the 100 test questions from trivia_questions.json into DynamoDB.

## Step 9: Deploy web apps

```bash
# Player app
aws s3 sync player-app/ s3://tap-trivia-player-app --delete
aws cloudfront create-invalidation --distribution-id $PLAYER_CF_ID --paths "/*"

# TV app
aws s3 sync tv-app/ s3://tap-trivia-tv-app --delete
aws cloudfront create-invalidation --distribution-id $TV_CF_ID --paths "/*"
```

(Get the distribution IDs from `terraform output` or the AWS console.)

## Step 10: Test it

1. Open TV URL in a browser → you should see the bar registration screen
2. Enter a bar name → you get a 5-character code + QR code on the lobby screen
3. Scan the QR code with your phone (or open the Player URL manually)
4. Pick a display name → enter the bar code → you're in
5. Wait for the next game slot or add ?mock=true to test immediately
6. Play!

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Terraform fails | Check AWS credentials: `aws sts get-caller-identity` |
| Seed script fails | Make sure DynamoDB tables exist: `aws dynamodb list-tables` |
| CORS errors in browser | Check API Gateway CORS config allows `*` origin |
| QR code not showing | Check PLAYER_APP_URL in tv-app config.js has `https://` prefix |
| No games available | Run generate-games manually: `aws lambda invoke --function-name TapTrivia-generate-games out.json` |
| Geolocation empty | Normal if testing locally — ip-api.com may return localhost info |

## Later: Phase 1.5 (Admin Dashboard)

Once Phase 1 is working, come back to Claude Code and say:

```
Read docs/06_ADMIN_DASHBOARD.md and the Phase 1.5 sections of
docs/02_BACKEND_ARCHITECTURE.md. Build the admin dashboard now.
The GameStats table and state-index GSI should already exist from Phase 1 Terraform.
Add the 3 admin Lambda functions, 2 API Gateway routes, admin S3 bucket,
admin CloudFront distribution, and the admin-app web app.
```
