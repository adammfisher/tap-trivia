# TapTrivia — Dashboard, Auth & Signage Implementation Prompt

> **THIS IS YOUR COMPLETE IMPLEMENTATION SPEC. Follow it exactly. Every file path, every field name, every status code is intentional. Do not improvise — ask if something is unclear.**

---

## HOUSEKEEPING RULES — READ FIRST

### Conversation Compaction
- **Compact the conversation every 3-4 major tasks.** Do not wait until you hit context limits.
- Before compacting, update `CLAUDE.md` with what was completed and what's next.
- After compacting, re-read `CLAUDE.md` to pick up where you left off.

### CLAUDE.md Tracking
- Maintain a `CLAUDE.md` file in the project root at all times.
- This file is your living changelog and task tracker.
- Structure it exactly like this:

```markdown
# TapTrivia — Implementation Progress

## Completed
- [ ] Task description — date completed
- [ ] ...

## In Progress
- Current task and status

## Next Up
- Ordered list of remaining work

## Architecture Decisions
- Any decisions made during implementation

## File Changes Log
- `path/to/file` — what changed and why
```

- Update `CLAUDE.md` BEFORE every compaction.
- Update `CLAUDE.md` after completing each major section.
- If you're resuming after a compaction, read `CLAUDE.md` first.

### General Rules
- **Do not modify any existing Lambda function logic unless this spec explicitly says to.** You are extending the system, not rewriting it.
- **Match existing code patterns exactly.** Look at existing Lambdas before writing new ones. Match the response format, error handling, CORS headers, and logging style.
- **Node.js 20.x, CommonJS (`require`/`module.exports`), no TypeScript, no frameworks.**
- **Test each Lambda locally before moving on.** Use the existing `scripts/start-test-game.js` pattern for test scripts.
- All DynamoDB tables use `PAY_PER_REQUEST` billing. No provisioned capacity. Ever.
- All Lambda functions: 128 MB memory, 10s timeout, unless explicitly stated otherwise.
- Every API response must include CORS headers matching the existing pattern.

---

## PROJECT OVERVIEW

You are adding three capabilities to the existing TapTrivia platform:

1. **Bar Owner Authentication** — Passwordless email OTP system for dashboard access
2. **Dashboard Web App** — Bar owners manage digital signage slides, upload logos, view analytics
3. **TV App Signage Rendering** — TV app displays bar owner's signage during break periods and as in-game side panels

The existing system has 11 Lambda functions, 7 DynamoDB tables, and serves a player app + TV app. You are adding 6 new Lambda functions, 1 new DynamoDB table, extending 1 existing table, and creating 1 new web app. You are also modifying 2 existing Lambda functions and the TV app.

---

## PHASE 1: BACKEND INFRASTRUCTURE

### 1.1 — Extend `backend/shared/dynamo.js`

Add one new table constant to the existing `TABLE` object:

```javascript
// ADD THIS to the existing TABLE object — do NOT remove or rename anything
TABLE = {
  GAMES: 'TapTrivia-Games',
  QUESTIONS: 'TapTrivia-Questions',
  QUESTION_USAGE: 'TapTrivia-QuestionUsage',
  ANSWERS: 'TapTrivia-Answers',
  PLAYERS: 'TapTrivia-Players',
  BARS: 'TapTrivia-Bars',
  GAME_STATS: 'TapTrivia-GameStats',
  SESSIONS: 'TapTrivia-Sessions'  // ← NEW
}
```

That's it. One line added. Do not touch anything else in this file.

---

### 1.2 — New Shared Module: `backend/shared/auth.js`

Create a new shared module for dashboard authentication. This gets copied to every dashboard Lambda by `build-lambdas.sh` (which you'll update later).

**File:** `backend/shared/auth.js`

```javascript
'use strict';

const { get, TABLE } = require('./dynamo');

/**
 * Validates a session token from the Authorization header.
 * Returns the bar record if valid, or null if invalid/expired.
 *
 * Usage in any dashboard Lambda:
 *   const { authenticate } = require('./shared/auth');
 *   const bar = await authenticate(event);
 *   if (!bar) return { statusCode: 401, ... };
 */
async function authenticate(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) return null;

  try {
    const session = await get({
      TableName: TABLE.SESSIONS,
      Key: { PK: `SESSION#${token}` }
    });

    if (!session?.Item) return null;

    // Check if session has expired (belt + suspenders with DynamoDB TTL)
    const now = Math.floor(Date.now() / 1000);
    if (session.Item.ttl && session.Item.ttl < now) return null;

    // Fetch the bar record
    const bar = await get({
      TableName: TABLE.BARS,
      Key: { PK: `BAR#${session.Item.barCode}` }
    });

    if (!bar?.Item) return null;

    return bar.Item;
  } catch (err) {
    console.error('Auth error:', err);
    return null;
  }
}

/**
 * Standard 401 response matching existing API patterns
 */
function unauthorized() {
  return {
    statusCode: 401,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Player-ID',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify({ error: 'Unauthorized' })
  };
}

module.exports = { authenticate, unauthorized };
```

**CRITICAL:** Look at how existing shared modules export things (e.g., `dynamo.js`, `game-clock.js`). Match that exact pattern. If they use `module.exports = { ... }`, you use that. If they attach to a global for UMD, check if auth.js needs that (it doesn't — backend only).

---

### 1.3 — New DynamoDB Table: `TapTrivia-Sessions`

**Purpose:** Stores dashboard session tokens. Separate from Bars table because sessions have their own TTL lifecycle and you don't want expired session cleanup to trigger writes on bar records.

**Schema:**

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `PK` | String | Partition Key | `SESSION#{uuid}` — the session token |
| `barCode` | String | — | Which bar this session belongs to |
| `ownerEmail` | String | — | Email that authenticated |
| `trusted` | Boolean | — | Whether "Trust this computer" was selected |
| `createdAt` | String | — | ISO 8601 timestamp |
| `ttl` | Number | — | Unix epoch seconds for DynamoDB TTL auto-deletion |

**TTL values:**
- Trusted session (`trusted: true`): 60 days from creation
- Untrusted session (`trusted: false`): 24 hours from creation

**No GSIs needed.** Sessions are only ever looked up by their token (PK).

**Terraform:** Add to `dynamodb.tf` (or wherever existing tables are defined). Match the exact pattern of existing table definitions. PAY_PER_REQUEST. TTL enabled on the `ttl` attribute.

```hcl
resource "aws_dynamodb_table" "sessions" {
  name         = "TapTrivia-Sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Project = "TapTrivia"
  }
}
```

---

### 1.4 — Extend TapTrivia-Bars Table Schema

You are NOT changing the table's key schema or GSIs. You are adding new attributes to bar records. DynamoDB is schemaless — this requires zero table modifications. The changes happen in the Lambda functions that write to this table.

**New attributes added to bar items:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `ownerEmail` | String | Bar owner's email, set during registration |
| `emailVerified` | Boolean | True once TV activation code is entered (proves email works) |
| `pendingOtp` | String | 6-digit numeric OTP, overwritten each request |
| `otpExpiresAt` | Number | Unix epoch ms when OTP expires (10 minutes from creation) |
| `otpAttempts` | Number | Failed OTP attempts since last generation (lockout after 5) |
| `signage` | Map (JSON) | Full signage configuration blob — see Section 2.3 for schema |
| `logoUrl` | String | S3 key path: `logos/{barCode}.png` |
| `logoHash` | String | MD5 hash of the logo file, used by TV for cache invalidation |

**These attributes are added incrementally by the new Lambda functions.** Existing bar records that don't have these attributes yet will simply have them as `undefined`, which is fine. All new code must handle the case where these fields don't exist on older bar records.

---

### 1.5 — AWS SES Setup

**Purpose:** Send OTP emails and welcome emails. No idle cost. No servers.

**Terraform resources needed:**

1. **SES Domain Identity** for `taptrivia.tv`:

```hcl
resource "aws_ses_domain_identity" "taptrivia" {
  domain = "taptrivia.tv"
}

resource "aws_ses_domain_dkim" "taptrivia" {
  domain = aws_ses_domain_identity.taptrivia.domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = data.aws_route53_zone.taptrivia.zone_id  # reference existing zone
  name    = "${aws_ses_domain_dkim.taptrivia.dkim_tokens[count.index]}._domainkey.taptrivia.tv"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.taptrivia.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_ses_domain_mail_from" "taptrivia" {
  domain           = aws_ses_domain_identity.taptrivia.domain
  mail_from_domain = "mail.taptrivia.tv"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = data.aws_route53_zone.taptrivia.zone_id
  name    = "mail.taptrivia.tv"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.us-east-1.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  zone_id = data.aws_route53_zone.taptrivia.zone_id
  name    = "mail.taptrivia.tv"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}
```

2. **IAM permissions** — add to the existing Lambda execution role:

```json
{
  "Effect": "Allow",
  "Action": [
    "ses:SendEmail",
    "ses:SendRawEmail"
  ],
  "Resource": "arn:aws:ses:us-east-1:*:identity/taptrivia.tv"
}
```

**IMPORTANT:** Look at how the existing IAM role is defined in Terraform. Add SES permissions to that same role. Do NOT create a new role. The existing role already has DynamoDB and CloudWatch permissions — you're just expanding it.

**Sender address:** `noreply@taptrivia.tv`

**SES Sandbox Note:** SES starts in sandbox mode (can only send to verified emails). This is fine for development and testing. Moving to production requires an AWS support request — document this in `CLAUDE.md` as a manual step for later.

---

### 1.6 — S3 Logo Bucket

**Purpose:** Store processed bar logo images (transparent PNGs after Bedrock background removal).

**Terraform:**

```hcl
resource "aws_s3_bucket" "logos" {
  bucket = "taptrivia-logos"
  
  tags = {
    Project = "TapTrivia"
  }
}

resource "aws_s3_bucket_public_access_block" "logos" {
  bucket = aws_s3_bucket.logos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

**Access pattern:** Logos are served through CloudFront (add an origin to the existing TV CloudFront distribution or create a new behavior). The TV app fetches logos via `https://tv.taptrivia.tv/logos/{barCode}.png` or similar. The upload-logo Lambda writes directly to S3.

**IAM additions** to the existing Lambda role:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject",
    "s3:DeleteObject"
  ],
  "Resource": "arn:aws:s3:::taptrivia-logos/*"
}
```

**Bedrock permissions** (for Titan Image Generator):

```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel"
  ],
  "Resource": "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-image-generator-v2:0"
}
```

---

### 1.7 — Dashboard Web App Hosting

**Purpose:** New S3 bucket + CloudFront distribution for the dashboard SPA at `https://dashboard.taptrivia.tv`.

**Follow the EXACT same pattern as the existing player-app and tv-app hosting:**
- S3 bucket with all public access blocked
- CloudFront distribution with OAC (Origin Access Control)
- SPA routing: 404 errors → `/index.html` with 200 status
- ACM wildcard cert already covers `*.taptrivia.tv`
- Route 53 A record (alias) pointing to CloudFront

**Terraform:** Look at the existing player-app or tv-app S3+CloudFront definitions. Copy that pattern exactly. Change only the bucket name and domain name.

- Bucket: `taptrivia-dashboard`
- CloudFront domain: `dashboard.taptrivia.tv`
- Route 53 record: `dashboard.taptrivia.tv` → CloudFront alias

---

### 1.8 — API Gateway Route Additions

Add these routes to the existing API Gateway HTTP API. Look at how existing routes are defined in Terraform and match that pattern exactly.

| Route | Method | Lambda Function | Auth Required |
|-------|--------|----------------|---------------|
| `POST /dashboard/auth/otp` | POST | `send-otp` | No |
| `POST /dashboard/auth/verify` | POST | `verify-otp` | No |
| `GET /dashboard/data` | GET | `get-dashboard` | Yes (Bearer token) |
| `PUT /dashboard/signage` | PUT | `save-signage` | Yes (Bearer token) |
| `POST /dashboard/logo` | POST | `upload-logo` | Yes (Bearer token) |
| `OPTIONS /dashboard/{proxy+}` | OPTIONS | (CORS preflight) | No |

**CORS:** The existing API Gateway already handles CORS for `*` origin with `X-Player-ID`. You need to also allow the `Authorization` header. Check the existing CORS config and add `Authorization` to `Access-Control-Allow-Headers` if it's not already there.

---

### 1.9 — Update `scripts/build-lambdas.sh`

The existing script copies shared modules into each Lambda function directory. You need to:

1. Add the 5 new Lambda function directories to the copy loop
2. Add `auth.js` to the list of shared modules that get copied

**Look at the existing script structure.** It probably loops through function directories and copies shared files. Add the new functions to that loop. The new functions that need `auth.js` are: `get-dashboard`, `save-signage`, `upload-logo`. The auth functions (`send-otp`, `verify-otp`) need `dynamo.js` but NOT `auth.js` (they create sessions, they don't validate them).

All 5 new functions need: `dynamo.js`
3 dashboard functions additionally need: `auth.js`
None of the new functions need: `game-clock.js`, `scoring.js`, `questions.js`

**Do NOT change which shared files get copied to existing Lambda functions.** Only add to the loop for new functions.

---

## PHASE 2: LAMBDA FUNCTIONS

### IMPORTANT: Before writing ANY Lambda, do this:
1. Open an existing Lambda function (e.g., `backend/register-bar/index.js`)
2. Study the exact patterns: how it parses the event, how it returns responses, how it handles errors, CORS headers, logging
3. Every new Lambda MUST match these patterns exactly

### Standard Response Format (match existing)

Every Lambda response must look like this:

```javascript
return {
  statusCode: 200,  // or 400, 401, 403, 404, 500
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Player-ID',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  },
  body: JSON.stringify({ /* response data */ })
};
```

Check the existing Lambdas for the exact CORS headers being used and match them. If they use a helper function for this, use the same helper.

---

### 2.1 — Modify `register-bar` Lambda

**File:** `backend/register-bar/index.js`

**Current behavior:** Accepts `{ barName, tvDeviceId }`, generates bar code, geo-locates via IP, writes to Bars table.

**Changes needed:**

1. Accept an additional optional field `ownerEmail` in the request body
2. If `ownerEmail` is provided:
   - Validate it looks like an email (basic regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
   - Store it on the bar record as `ownerEmail`
   - Set `emailVerified: false` on the bar record
   - Send a welcome email via SES containing:
     - The bar code
     - The bar name
     - A link to the dashboard: `https://dashboard.taptrivia.tv`
     - Brief instructions
3. If `ownerEmail` is NOT provided, behavior is identical to current (backward compatible)

**SES email sending code:**

```javascript
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const ses = new SESClient({ region: 'us-east-1' });

async function sendWelcomeEmail(email, barName, barCode) {
  const params = {
    Source: 'TapTrivia <noreply@taptrivia.tv>',
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: `Welcome to TapTrivia — Your bar code is ${barCode}` },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #764ba2;">Welcome to TapTrivia! 🍺</h1>
              <p>Hi there! <strong>${barName}</strong> is now registered on TapTrivia.</p>
              <div style="background: #f5f0ff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #666;">Your permanent bar code:</p>
                <h2 style="font-size: 48px; letter-spacing: 12px; color: #764ba2; margin: 0;">${barCode}</h2>
              </div>
              <p>Enter this code in the TV app to activate your display.</p>
              <h3>Set Up Your Dashboard</h3>
              <p>Manage your digital signage, upload your logo, and view analytics:</p>
              <p><a href="https://dashboard.taptrivia.tv" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open Dashboard</a></p>
              <p style="color: #999; font-size: 12px; margin-top: 32px;">You'll use this email and bar code to log in. No password needed — we'll send you a one-time code each time.</p>
            </div>
          `
        },
        Text: {
          Data: `Welcome to TapTrivia!\n\n${barName} is registered. Your bar code: ${barCode}\n\nEnter this code in the TV app to activate.\n\nDashboard: https://dashboard.taptrivia.tv\nLog in with this email + your bar code.\n`
        }
      }
    }
  };

  await ses.send(new SendEmailCommand(params));
}
```

**Add `@aws-sdk/client-ses` as a dependency.** Check how existing Lambdas handle SDK dependencies — if they use a bundled `node_modules/` that gets copied by the build script, add it there. If they rely on the Lambda runtime's built-in SDK, check if SES is available in the Node.js 20.x runtime (it is in AWS SDK v3 which is bundled with Node 20.x Lambda runtime — but verify this by checking how existing code imports DynamoDB).

**CRITICAL:** The `@aws-sdk/client-ses` module is included in the Node.js 20.x Lambda runtime. If existing code does `require('@aws-sdk/client-dynamodb')` without a local `node_modules`, then SES will work the same way. If existing code has a local `node_modules` with the SDK, add `@aws-sdk/client-ses` there too.

**Do NOT change the existing response format.** Just add `ownerEmail` to the response if it was provided:

```javascript
// Existing response + ownerEmail
{ barCode, barName, city, state, isNew, ownerEmail: ownerEmail || undefined }
```

---

### 2.2 — Modify `get-tv-state` Lambda

**File:** `backend/get-tv-state/index.js`

**Current behavior:** Returns full game display state for TV polling. Updates `lastPollAt`.

**Changes needed:** When the response `state` is `break` (no active game), include the bar's signage configuration and logo info in the response so the TV can render signage slides.

Add these fields to the `break` state response:

```javascript
// ONLY in break state — do NOT add to active_game or game_over responses
{
  state: 'break',
  barCode: '...',
  barName: '...',
  // ... existing fields ...
  
  // NEW — signage data for TV rendering
  signage: barRecord.signage || null,    // The full signage JSON blob, or null if not configured
  logoUrl: barRecord.logoUrl || null,     // S3 path for logo, or null
  logoHash: barRecord.logoHash || null    // Hash for cache invalidation, or null
}
```

**Also add signage to `active_game` state** for in-game panel rendering (right sidebar):

```javascript
{
  state: 'active_game',
  // ... all existing fields unchanged ...
  
  // NEW — for in-game panel signage
  signage: barRecord.signage || null,
  logoUrl: barRecord.logoUrl || null,
  logoHash: barRecord.logoHash || null
}
```

**The bar record is already being fetched in this Lambda** (it needs it for `barName`, `activePlayers`, etc.). You're just including additional fields from the same record. This adds zero extra DynamoDB reads.

**Do NOT change any other behavior of this Lambda.** Same polling interval, same `lastPollAt` update, same game state logic.

---

### 2.3 — New Lambda: `send-otp`

**Directory:** `backend/send-otp/index.js`

**Route:** `POST /dashboard/auth/otp`

**Purpose:** Validates email + bar code pair, generates 6-digit OTP, stores it on the bar record, sends it via SES.

**Input body:**
```json
{
  "email": "owner@example.com",
  "barCode": "BR7X4"
}
```

**Logic:**

1. Parse and validate input:
   - `email` required, must be a string, basic format validation
   - `barCode` required, must be a string, 3-6 chars, uppercase alphanumeric
2. Normalize: `email = email.trim().toLowerCase()`, `barCode = barCode.trim().toUpperCase()`
3. Look up bar record: `get({ TableName: TABLE.BARS, Key: { PK: 'BAR#' + barCode } })`
4. If bar doesn't exist → `404 { error: 'Bar not found' }`
5. If bar exists but `ownerEmail` doesn't match → `403 { error: 'Invalid credentials' }`
   - **SECURITY: Do NOT distinguish between "bar not found" and "email doesn't match" in production.** Return the same generic message for both to prevent enumeration. Use: `403 { error: 'Invalid email or bar code' }` for both cases.
   - Actually, return `200 { message: 'If this email and code match our records, a code has been sent.' }` for ALL cases (success and failure). This prevents timing attacks and enumeration. Log the actual reason server-side.
6. If match is valid:
   - Generate 6-digit OTP: `String(Math.floor(100000 + Math.random() * 900000))`
   - Store on bar record via update:
     ```javascript
     await update({
       TableName: TABLE.BARS,
       Key: { PK: `BAR#${barCode}` },
       UpdateExpression: 'SET pendingOtp = :otp, otpExpiresAt = :exp, otpAttempts = :zero',
       ExpressionAttributeValues: {
         ':otp': otp,
         ':exp': Date.now() + (10 * 60 * 1000),  // 10 minutes from now
         ':zero': 0
       }
     });
     ```
   - Send OTP email via SES:
     ```
     Subject: "Your TapTrivia login code: 847291"
     Body: "Your one-time login code for {barName} is: 847291
            This code expires in 10 minutes.
            If you didn't request this, you can safely ignore this email."
     ```

**Response (ALWAYS the same, success or failure):**
```json
{
  "message": "If this email and code match our records, a code has been sent."
}
```

**Rate limiting consideration:** Check `otpExpiresAt` — if an OTP was generated less than 60 seconds ago, don't generate a new one. Return the same success message but don't send a new email. This prevents spam. Log it: `console.log('OTP rate limited for', barCode);`

---

### 2.4 — New Lambda: `verify-otp`

**Directory:** `backend/verify-otp/index.js`

**Route:** `POST /dashboard/auth/verify`

**Purpose:** Validates the OTP, creates a session token, returns it.

**Input body:**
```json
{
  "email": "owner@example.com",
  "barCode": "BR7X4",
  "otp": "847291",
  "trust": true
}
```

**Logic:**

1. Parse and validate input:
   - All four fields required
   - `otp` must be a 6-digit string
   - `trust` must be a boolean
2. Normalize email and barCode (same as send-otp)
3. Look up bar record
4. Validate:
   - Bar exists and email matches → else `401 { error: 'Invalid credentials' }`
   - `otpAttempts < 5` → else `429 { error: 'Too many attempts. Request a new code.' }`
   - `pendingOtp` matches provided `otp` → else increment `otpAttempts` and return `401 { error: 'Invalid code' }`
   - `otpExpiresAt > Date.now()` → else `401 { error: 'Code expired. Request a new one.' }`
5. OTP is valid. Clear it from the bar record:
   ```javascript
   await update({
     TableName: TABLE.BARS,
     Key: { PK: `BAR#${barCode}` },
     UpdateExpression: 'REMOVE pendingOtp, otpExpiresAt, otpAttempts SET emailVerified = :t',
     ExpressionAttributeValues: { ':t': true }
   });
   ```
6. Generate session token: `const crypto = require('crypto'); const token = crypto.randomUUID();`
7. Calculate TTL:
   ```javascript
   const now = Math.floor(Date.now() / 1000);
   const ttl = trust
     ? now + (60 * 24 * 60 * 60)   // 60 days for trusted
     : now + (24 * 60 * 60);        // 24 hours for untrusted
   ```
8. Write session to Sessions table:
   ```javascript
   await put({
     TableName: TABLE.SESSIONS,
     Item: {
       PK: `SESSION#${token}`,
       barCode: barCode,
       ownerEmail: email,
       trusted: trust,
       createdAt: new Date().toISOString(),
       ttl: ttl
     }
   });
   ```
9. Return:
   ```json
   {
     "token": "uuid-session-token",
     "barCode": "BR7X4",
     "barName": "The Rusty Tap",
     "trusted": true,
     "expiresAt": 1740000000
   }
   ```

---

### 2.5 — New Lambda: `get-dashboard`

**Directory:** `backend/get-dashboard/index.js`

**Route:** `GET /dashboard/data`

**Purpose:** Returns everything the dashboard needs in one call. Authenticated.

**Logic:**

1. Authenticate using shared `auth.js`:
   ```javascript
   const { authenticate, unauthorized } = require('./shared/auth');
   const bar = await authenticate(event);
   if (!bar) return unauthorized();
   ```
2. Gather analytics data. Query the Answers table for this bar's recent activity:
   - Total games played (count distinct gameIds in answers where barCode matches)
   - Total unique players (count distinct playerIds)
   - Average players per game
   - This data requires querying the `game-bar-index` GSI on the Answers table
   - **Keep it simple for v1:** Just return basic counts. Don't over-engineer analytics yet.
3. For v1, the analytics can be computed from the bar record itself plus a simple scan:
   ```javascript
   // Simple approach: count recent answers for this bar
   // The game-bar-index GSI has gameIdBarCode as partition key
   // Format: {gameId}#{barCode}
   // This is expensive to scan all games — defer complex analytics to Phase 4
   ```
   
   **Actually, for v1 just return the bar profile and signage config. Analytics comes later.**

**Response:**
```json
{
  "bar": {
    "barCode": "BR7X4",
    "barName": "The Rusty Tap",
    "city": "Brevard",
    "state": "NC",
    "ownerEmail": "owner@example.com",
    "emailVerified": true,
    "logoUrl": "logos/BR7X4.png",
    "logoHash": "abc123"
  },
  "signage": {
    "slides": [...],
    "rotationSpeed": 15,
    "enabled": true
  },
  "analytics": {
    "totalGamesHosted": 0,
    "totalUniquePlayers": 0,
    "avgPlayersPerGame": 0,
    "lastGameAt": null
  }
}
```

For v1 analytics, set all to 0/null. Add a `// TODO: Phase 4 — query Answers table for real analytics` comment.

---

### 2.6 — New Lambda: `save-signage`

**Directory:** `backend/save-signage/index.js`

**Route:** `PUT /dashboard/signage`

**Purpose:** Saves the bar's signage configuration. Authenticated.

**Input body:**
```json
{
  "signage": {
    "slides": [
      {
        "id": "slide-uuid-1",
        "template": "specials",
        "enabled": true,
        "data": {
          "emoji": "🍺",
          "title": "Tonight's Specials",
          "subtitle": "$5 drafts all night",
          "menuItems": [
            { "emoji": "🍔", "name": "Classic Burger", "price": "$12" },
            { "emoji": "🌮", "name": "Taco Tuesday", "price": "$3 each" }
          ]
        },
        "schedule": {
          "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
          "allDay": true
        }
      }
    ],
    "rotationSpeed": 15,
    "enabled": true
  }
}
```

**Signage Schema — IMPORTANT. This is the canonical schema for signage data:**

```javascript
const VALID_TEMPLATES = ['specials', 'happy_hour', 'event', 'brand', 'announcement', 'sports', 'custom'];
const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MAX_SLIDES = 10;
const MAX_MENU_ITEMS = 8;
const MAX_ITEMS = 6;
```

**Template data schemas:**

```javascript
// template: "specials"
data: {
  emoji: "🍺",           // Hero emoji
  title: "string",        // e.g., "Tonight's Specials"
  subtitle: "string",     // e.g., "$5 drafts"
  menuItems: [            // max 8
    { emoji: "🍔", name: "string", price: "string" }
  ]
}

// template: "happy_hour"
data: {
  emoji: "🍹",
  title: "string",        // e.g., "Happy Hour"
  subtitle: "string",     // e.g., "4-7pm Daily"
  deals: [                // max 8
    { emoji: "🍺", text: "string" }
  ]
}

// template: "event"
data: {
  emoji: "🎧",
  title: "string",        // e.g., "DJ Night"
  subtitle: "string",     // e.g., "This Saturday"
  description: "string",
  time: "string",         // e.g., "9 PM"
  prizes: [               // max 6
    { emoji: "🏆", text: "string" }
  ]
}

// template: "brand"
data: {
  tagline: "string",      // e.g., "Your neighborhood bar since 2005"
  subtitle: "string"
}
// Note: brand template uses the bar's uploaded logo, no emoji field

// template: "announcement"
data: {
  emoji: "📢",
  title: "string",
  body: "string",         // Multi-line text
  highlight: "string"     // Optional highlighted text
}

// template: "sports"
data: {
  emoji: "🏈",
  title: "string",        // e.g., "Game Day"
  subtitle: "string",     // e.g., "Every Sunday"
  body: "string",
  highlight: "string"
}

// template: "custom"
data: {
  emoji: "✨",
  headline: "string",
  body: "string",
  items: [                // max 6
    { emoji: "🎯", text: "string" }
  ]
}
```

**Validation logic:**

1. Authenticate via `auth.js`
2. Parse `signage` from body
3. Validate:
   - `signage.slides` is an array with length 0-10
   - Each slide has: `id` (string), `template` (one of VALID_TEMPLATES), `enabled` (boolean), `data` (object), `schedule` (object)
   - `schedule.days` is an array of VALID_DAYS values
   - `signage.rotationSpeed` is a number between 5 and 60
   - `signage.enabled` is a boolean
4. Do NOT deeply validate template-specific data schemas — just ensure `data` is an object and not absurdly large (< 50KB total signage blob). The dashboard app handles structured editing; the backend just stores and returns it.
5. Write to Bars table:
   ```javascript
   await update({
     TableName: TABLE.BARS,
     Key: { PK: `BAR#${bar.barCode}` },
     UpdateExpression: 'SET signage = :s, signageUpdatedAt = :t',
     ExpressionAttributeValues: {
       ':s': signage,
       ':t': new Date().toISOString()
     }
   });
   ```

**Response:**
```json
{
  "success": true,
  "slideCount": 3,
  "updatedAt": "2026-02-15T..."
}
```

---

### 2.7 — New Lambda: `upload-logo`

**Directory:** `backend/upload-logo/index.js`

**Route:** `POST /dashboard/logo`

**Purpose:** Receives a logo image, removes the background via Bedrock Titan, stores the result in S3. Authenticated.

**IMPORTANT: This Lambda needs 256 MB memory and 30s timeout** (image processing is heavier than typical API calls). Set this in Terraform.

**Input body:**
```json
{
  "image": "base64-encoded-image-data",
  "contentType": "image/png"
}
```

**Accepted content types:** `image/png`, `image/jpeg`

**Logic:**

1. Authenticate via `auth.js`
2. Parse body, validate:
   - `image` is a non-empty string (base64)
   - `contentType` is `image/png` or `image/jpeg`
   - Decoded image size < 5MB
3. Call Bedrock Titan for background removal:
   ```javascript
   const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
   const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

   const command = new InvokeModelCommand({
     modelId: 'amazon.titan-image-generator-v2:0',
     contentType: 'application/json',
     accept: 'application/json',
     body: JSON.stringify({
       taskType: 'BACKGROUND_REMOVAL',
       backgroundRemovalParams: {
         image: {
           source: {
             bytes: imageBase64  // raw base64, no data:uri prefix
           }
         }
       }
     })
   });

   const response = await bedrock.send(command);
   const result = JSON.parse(new TextDecoder().decode(response.body));
   const processedImageBase64 = result.images[0];
   ```
4. Resize to 512x512 using sharp (or skip resize for v1 — Titan output is usually reasonable):
   - **For v1: Skip resize. Just use the Titan output directly.** Add a `// TODO: resize to 512x512 with sharp` comment.
   - If you do add sharp, it needs to be included as a Lambda layer (it has native binaries).
5. Upload to S3:
   ```javascript
   const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
   const crypto = require('crypto');
   const s3 = new S3Client({ region: 'us-east-1' });

   const imageBuffer = Buffer.from(processedImageBase64, 'base64');
   const logoHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
   const key = `logos/${bar.barCode}.png`;

   await s3.send(new PutObjectCommand({
     Bucket: 'taptrivia-logos',
     Key: key,
     Body: imageBuffer,
     ContentType: 'image/png',
     CacheControl: 'public, max-age=86400'
   }));
   ```
6. Update bar record:
   ```javascript
   await update({
     TableName: TABLE.BARS,
     Key: { PK: `BAR#${bar.barCode}` },
     UpdateExpression: 'SET logoUrl = :url, logoHash = :hash, logoUpdatedAt = :t',
     ExpressionAttributeValues: {
       ':url': key,
       ':hash': logoHash,
       ':t': new Date().toISOString()
     }
   });
   ```

**Response:**
```json
{
  "success": true,
  "logoUrl": "logos/BR7X4.png",
  "logoHash": "abc123def456"
}
```

**Error handling:** Bedrock calls can fail. Wrap in try/catch and return `500 { error: 'Logo processing failed. Try a different image.' }` The most common failure is an image that Titan can't process (too small, corrupt, etc.).

---

## PHASE 3: DASHBOARD WEB APP

### 3.1 — Architecture

**Location:** `dashboard-app/` in the project root (same level as `player-app/` and `tv-app/`)

**Stack:** Vanilla JS SPA. No React. No frameworks. No build step. Match the exact approach of the player-app and tv-app.

**File structure:**

```
dashboard-app/
├── index.html          # Entry point, all screens as hidden divs
├── css/
│   └── styles.css      # All styling
├── js/
│   ├── app.js          # SPA router, screen management
│   ├── config.js       # API_BASE URL
│   ├── api.js          # HTTP client with Bearer token
│   ├── auth.js         # Auth state (token in localStorage)
│   └── screens/
│       ├── login.js        # Email + barCode + OTP flow
│       ├── dashboard.js    # Main dashboard (signage list, analytics)
│       ├── signage-editor.js   # Create/edit signage slides
│       └── logo-upload.js  # Logo upload + preview
└── assets/
    └── (any static assets)
```

### 3.2 — Design System

The dashboard uses the SAME design system as the rest of TapTrivia:

**Fonts:** Fredoka (display), Outfit (body), DM Mono (monospace)
- Load from Google Fonts in `index.html`

**Colors:**
```css
--bg-grad: linear-gradient(150deg, #0f0326, #1e0f4a, #3d1866, #6b2358, #a8334a);
--green: #00d4aa;
--red: #ff4757;
--gold: #ffd200;
--blue: #667eea;
--purple: #764ba2;
--glass-bg: rgba(255, 255, 255, 0.06);
--glass-border: rgba(255, 255, 255, 0.1);
--text-primary: rgba(255, 255, 255, 0.95);
--text-secondary: rgba(255, 255, 255, 0.5);
--text-muted: rgba(255, 255, 255, 0.25);
```

**Surfaces:** Glass morphism with `backdrop-filter: blur(12px)`, white overlays at 6-10% opacity.

**This is a desktop-first interface** (bar owners use laptops/desktops, not phones). Design for 1200px+ viewport width. Basic responsiveness down to 768px is nice-to-have but not critical.

### 3.3 — Auth Flow (login.js)

**Screen 1: Email + Bar Code Entry**

```
┌─────────────────────────────────────┐
│         🍺 TapTrivia                │
│         Dashboard Login             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Email address               │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Bar code (e.g., BR7X4)     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Send Login Code         │   │
│  └─────────────────────────────┘   │
│                                     │
│  Don't have an account?            │
│  Set up TapTrivia on your bar's TV │
└─────────────────────────────────────┘
```

- On submit: `POST /dashboard/auth/otp` with `{ email, barCode }`
- Always shows success message (API returns same response regardless)
- Transitions to OTP entry screen

**Screen 2: OTP Entry**

```
┌─────────────────────────────────────┐
│         Check your email            │
│  We sent a 6-digit code to         │
│  ow***@example.com                  │
│                                     │
│       ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│       │  │ │  │ │  │ │  │ │  │ │  │ │
│       └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │
│                                     │
│  Auto-submits when 6 digits entered │
│                                     │
│  Didn't get it? Resend code         │
└─────────────────────────────────────┘
```

- 6 individual digit inputs, auto-advance on each digit (same UX pattern as the bar code entry in the player app — look at `player-app/js/screens/join-bar.js` for the auto-advance input pattern)
- Auto-submit when all 6 digits are entered
- Calls `POST /dashboard/auth/verify` with `{ email, barCode, otp, trust: false }` (trust comes next)
- On error: show error message, clear inputs, allow retry
- On success: transition to trust screen

**Screen 3: Trust This Computer**

```
┌─────────────────────────────────────┐
│         ✓ You're in!                │
│                                     │
│  Trust this computer?               │
│                                     │
│  If you trust this device, we'll    │
│  keep you logged in for 60 days.    │
│                                     │
│  ┌──────────┐  ┌──────────────────┐│
│  │  Yes      │  │  No, just once   ││
│  └──────────┘  └──────────────────┘│
│                                     │
│  Skip on shared devices like the   │
│  one behind the bar.               │
└─────────────────────────────────────┘
```

- If "Yes": store token in `localStorage.setItem('taptrivia_dashboard_token', token)`
- If "No": store token in `sessionStorage.setItem('taptrivia_dashboard_token', token)` (cleared when browser closes)
- **Wait — the verify-otp Lambda already ran with `trust: false`.** If they click "Yes", we need to either:
  - Option A: Call verify-otp again with `trust: true` — but the OTP is already cleared. Bad.
  - **Option B (do this):** Initially call verify-otp with `trust: true`. Then the trust screen just controls client-side storage: `localStorage` vs `sessionStorage`. The server always creates a 60-day session. The "No, just once" option just means the token is only stored in sessionStorage and disappears when the browser closes. The server session still exists for 60 days but the client won't have it after closing the browser.
  
  **Actually simplest approach:** Always create a 60-day server session. The trust question is purely client-side: localStorage (persists) vs sessionStorage (cleared on close). Change the verify-otp Lambda to always use 60-day TTL. Remove the `trust` field from the API. The trust decision happens only in the browser.

**Updated verify-otp:** Remove `trust` from input. Always create 60-day session. Response unchanged. The `trusted` field on the session record is no longer needed either — simplify to just:

```javascript
const ttl = now + (60 * 24 * 60 * 60);  // Always 60 days
```

**On app load:** Check `localStorage` then `sessionStorage` for `taptrivia_dashboard_token`. If found, call `GET /dashboard/data` to validate it still works. If 401, clear the token and show login. If 200, show dashboard.

### 3.4 — Dashboard Main Screen (dashboard.js)

This is the home screen after login. Two sections: signage management and (future) analytics.

```
┌───────────────────────────────────────────────────────────────────┐
│  🍺 TapTrivia Dashboard          The Rusty Tap (BR7X4)  [Logout] │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📺 Digital Signage                               [+ New Slide]  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🍺 Tonight's Specials    │ Mon-Sun │ ✓ Active │ [Edit][Del] │ │
│  │ 🍹 Happy Hour            │ Mon-Fri │ ✓ Active │ [Edit][Del] │ │
│  │ 🎧 DJ Night              │ Fri-Sat │ ✓ Active │ [Edit][Del] │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Rotation speed: [15 seconds ▾]         Signage: [✓ Enabled]    │
│                                                                   │
│  ── Preview ──────────────────────────────────────────────────── │
│  │                                                             │ │
│  │  (Live preview of selected slide — 960x540 scaled down)    │ │
│  │                                                             │ │
│  ──────────────────────────────────────────────────────────────── │
│                                                                   │
│  🖼️ Bar Logo                                                     │
│  ┌────────────────────────────────────────┐                      │
│  │  [Current logo preview]  [Upload New]  │                      │
│  └────────────────────────────────────────┘                      │
│                                                                   │
│  📊 Analytics (Coming Soon)                                      │
│  ┌────────────────────────────────────────┐                      │
│  │  Games hosted: --  │  Players: --      │                      │
│  └────────────────────────────────────────┘                      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 3.5 — Signage Editor (signage-editor.js)

This is the most complex screen. When a user clicks "New Slide" or "Edit" on an existing slide.

**Step 1: Template Selection** (only shown for new slides)

Display a grid of 7 template cards. Each card shows the template name, icon, and a brief description:

| Template | Icon | Description |
|----------|------|-------------|
| Specials | 🍺 | Food & drink specials with prices |
| Happy Hour | 🍹 | Deals and happy hour times |
| Event | 🎧 | Upcoming events and entertainment |
| Brand | 🏪 | Your logo and tagline |
| Announcement | 📢 | Important messages and news |
| Sports | 🏈 | Game day schedules and sports |
| Custom | ✨ | Freeform — anything you want |

**Step 2: Slide Editor**

The editor shows:
- Left side: Form fields specific to the selected template
- Right side: Live preview of the slide (rendered in a 960×540 scaled container)

**Form fields vary by template.** See the template data schemas in Section 2.6 for exactly what fields each template has.

**Common fields across all templates:**
- Emoji picker (for selecting the hero emoji — NOT for Brand template)
- Schedule: day checkboxes (Mon-Sun), "All days" toggle
- Enable/disable toggle

**The emoji picker** should offer a categorized grid of emojis:
- Food & Drink: 🍺 🍻 🍸 🍹 🍷 🍾 🥃 🧊 ☕ 🍔 🍕 🌮 🌯 🍗 🥩 🍳 🥗 🍽️ 🧀 🥨 🍟 🥓
- Events & Music: 🎧 🎤 🎵 🎶 🎸 🎹 🎺 🎭 🪩 🎬 🎨 🎪 🎯 🃏 🎲 🎰
- Sports: 🏈 ⚽ 🏀 🏒 ⚾ 🏆 🥊 🎱 🏓 🎳 🏎️ 🥋 🏐 🎣
- Celebrate: 🎉 🎊 🥳 ✨ 🔥 💥 🌟 ⭐ 💫 🎁 🎀 🪅 🥂 🍀
- General: 📢 📣 🔔 💡 🏷️ ❤️ 👑 💎 ⚡ 🚀 💬 📌 🎗️ ℹ️ 🆕 🆓 💯 👍

**REFERENCE IMPLEMENTATION:** The file `reference-designs/dashboard-v3-prototype.jsx` contains a complete working React prototype of this editor with all emoji pickers, template editors, and dual-context preview (full-screen TV + in-game panel). The data structures, component hierarchy, and UX flow in that file are exactly what we want. You're rebuilding this in vanilla JS, but use it as your source of truth for:
- What fields each template editor has
- How emoji pickers work
- How the preview renders
- What the slide renderers look like for both full-screen and panel contexts

**The live preview** renders the slide exactly as it will appear on the TV. This means the preview container must match the TV's rendering approach:
- Full-screen (960×540 scaled in the editor — the TV renders at 1920×1080 which is 2x this)
- Use CSS `transform: scale()` to fit the preview in the available space

**Saving:** When the user clicks "Save", the entire signage config (all slides) is sent to `PUT /dashboard/signage`. Every save sends the complete state, not incremental updates.

### 3.6 — Logo Upload (logo-upload.js)

Simple flow:
1. Show current logo if one exists (fetch from S3 via CloudFront URL)
2. File input accepting PNG/JPEG, max 5MB
3. On file select: show local preview
4. "Upload" button sends base64 to `POST /dashboard/logo`
5. Show loading state while Bedrock processes (can take 3-10 seconds)
6. On success: show the processed transparent PNG result
7. On error: show error message, let user try again

### 3.7 — API Client (`js/api.js`)

```javascript
const API_BASE = 'https://api.taptrivia.tv';

function getToken() {
  return localStorage.getItem('taptrivia_dashboard_token')
    || sessionStorage.getItem('taptrivia_dashboard_token')
    || null;
}

async function apiCall(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (res.status === 401) {
    // Token expired or invalid — clear and redirect to login
    localStorage.removeItem('taptrivia_dashboard_token');
    sessionStorage.removeItem('taptrivia_dashboard_token');
    showScreen('login');
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
```

---

## PHASE 4: TV APP SIGNAGE RENDERING

### 4.1 — Overview

The TV app already polls `get-tv-state` every 2 seconds. The response now includes `signage`, `logoUrl`, and `logoHash` (from the changes in Section 2.2). The TV app needs to render signage in two contexts:

1. **Full-screen mode** — During `break` state (no active game), rotate through signage slides as full-screen content (1920×1080). This replaces or augments the existing idle/lobby screens.
2. **In-game panel mode** — During `active_game` state, render a compact version of signage slides in the right sidebar panel (~340px wide) alongside the game display.

### 4.2 — Full-Screen Signage Rendering

**When:** TV state is `break` AND `signage` is not null AND `signage.enabled` is true AND there's at least 1 enabled slide.

**Behavior:**
- Cycle through enabled slides at the configured `rotationSpeed` (seconds per slide)
- Only show slides whose `schedule.days` includes today's day of week
- If no slides are scheduled for today, fall back to the existing idle screen
- Smooth crossfade transitions between slides (600ms, matching TV animation guidelines)

**Each slide template has a full-screen renderer.** These renderers must match the TapTrivia design system:
- Dark cocktail lounge aesthetic
- Glass morphism surfaces
- Fredoka for display text, Outfit for body text
- No pure #000 or #FFF
- Minimum 28px font (10ft readability)
- Overscan-safe margins (48px horizontal, 27px vertical)

**REFERENCE:** The `reference-designs/dashboard-v3-prototype.jsx` file contains all 7 full-screen renderers as React components (TVSpecials, TVHappyHour, TVEvent, TVBrand, TVAnnouncement, TVSports, TVCustom). Port these to vanilla JS DOM rendering. The styling, layout, and proportions are exactly what we want.

**Logo in Brand template:** The Brand template renderer needs to fetch and display the bar's logo. Use the `logoUrl` from the tv-state response. Cache it: fetch once, store as a blob URL, only re-fetch when `logoHash` changes.

### 4.3 — In-Game Panel Signage Rendering

**When:** TV state is `active_game` AND signage exists AND is enabled.

**Where:** The right side panel of the game display, approximately 340px wide. This is the same area where the existing game shows supplementary content.

**Behavior:**
- Rotate through enabled slides (same rotation logic as full-screen)
- Each template has a COMPACT panel renderer (different from the full-screen version)
- Smaller text, tighter spacing, optimized for the narrow panel width

**REFERENCE:** The `reference-designs/dashboard-v3-prototype.jsx` file contains all 7 panel renderers (PanelSpecials, PanelHappyHour, etc.). Port these to vanilla JS.

### 4.4 — Integration with Existing TV App

**File to modify:** `tv-app/js/app.js`

**Do NOT refactor the existing app structure.** Add signage rendering alongside existing logic:

1. Add a signage state tracker:
   ```javascript
   let currentSignage = null;
   let currentSlideIndex = 0;
   let slideTimer = null;
   let cachedLogoUrl = null;
   let cachedLogoHash = null;
   ```

2. In the main poll response handler, when state is `break`:
   - Check if `signage` has changed (compare JSON or a hash)
   - If signage is present and enabled, start the slide rotation
   - If signage is null/disabled, show the existing idle screen

3. In the main poll response handler, when state is `active_game`:
   - Pass signage data to the panel renderer
   - The panel renderer handles its own rotation

4. Slide rotation logic:
   ```javascript
   function startSlideRotation(signage) {
     if (slideTimer) clearInterval(slideTimer);
     const enabledSlides = filterSlidesForToday(signage.slides);
     if (enabledSlides.length === 0) return showIdleScreen();
     
     currentSlideIndex = 0;
     renderFullScreenSlide(enabledSlides[0]);
     
     slideTimer = setInterval(() => {
       currentSlideIndex = (currentSlideIndex + 1) % enabledSlides.length;
       renderFullScreenSlide(enabledSlides[currentSlideIndex]);
     }, (signage.rotationSpeed || 15) * 1000);
   }
   
   function filterSlidesForToday(slides) {
     const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
     const today = dayNames[new Date().getDay()];
     return slides.filter(s => s.enabled && s.schedule?.days?.includes(today));
   }
   ```

---

## PHASE 5: TERRAFORM — COMPLETE ADDITIONS

### 5.1 — Checklist of All Terraform Changes

**New resources to add:**

- [ ] DynamoDB table: `TapTrivia-Sessions` (Section 1.3)
- [ ] SES domain identity + DKIM + mail-from (Section 1.5)
- [ ] Route 53 records for SES (DKIM CNAMEs, mail-from MX, SPF TXT) (Section 1.5)
- [ ] S3 bucket: `taptrivia-logos` (Section 1.6)
- [ ] S3 bucket: `taptrivia-dashboard` (Section 1.7)
- [ ] CloudFront distribution for dashboard (Section 1.7)
- [ ] Route 53 A record: `dashboard.taptrivia.tv` → CloudFront (Section 1.7)
- [ ] 5 new Lambda functions with their log groups (Section 2.3-2.7)
- [ ] 5 new API Gateway routes (Section 1.8)
- [ ] 5 new API Gateway integrations (Lambda → route)
- [ ] Lambda permission for API Gateway to invoke each new function

**Modified resources:**

- [ ] IAM Lambda role: add SES, S3 (logos bucket), Bedrock permissions
- [ ] API Gateway CORS: add `Authorization` to allowed headers if not already present
- [ ] `upload-logo` Lambda: 256 MB memory, 30s timeout (all others: 128 MB, 10s)

### 5.2 — Lambda Function Terraform Pattern

Look at how existing Lambda functions are defined. They probably follow a pattern like:

```hcl
resource "aws_lambda_function" "send_otp" {
  function_name = "taptrivia-send-otp"
  role          = aws_iam_role.lambda_role.arn  # SAME role as existing
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 10
  memory_size   = 128
  
  filename         = data.archive_file.send_otp.output_path
  source_code_hash = data.archive_file.send_otp.output_base64sha256
  
  tags = {
    Project = "TapTrivia"
  }
}
```

**Match the existing pattern exactly.** If existing Lambdas use `s3_bucket`/`s3_key` for deployment instead of `filename`, use that. If they use environment variables, check what's set.

### 5.3 — Deploy Script Update

If there's an existing deploy script (beyond `build-lambdas.sh`), update it to include the new functions. If deployment is manual, document the steps in `CLAUDE.md`.

---

## PHASE 6: TESTING

### 6.1 — Test Scripts

Create test scripts following the pattern of `scripts/start-test-game.js`:

**`scripts/test-dashboard-auth.js`:**
```bash
node scripts/test-dashboard-auth.js
```
- Creates a test bar with email via `register-bar`
- Requests OTP via `send-otp`
- Manually enter OTP (or read from DynamoDB directly for testing)
- Verify OTP via `verify-otp`
- Fetch dashboard data via `get-dashboard`
- Save test signage via `save-signage`

**`scripts/test-signage.js`:**
```bash
node scripts/test-signage.js --barCode BR7X4
```
- Requires a valid session token
- Saves a complete signage config with all 7 template types
- Verifies it round-trips correctly via `get-dashboard`
- Verifies it appears in `get-tv-state` response

### 6.2 — Manual Testing Checklist

Document this in `CLAUDE.md`:

- [ ] Register a bar with email → receive welcome email
- [ ] Request OTP → receive OTP email
- [ ] Enter wrong OTP → get error, attempts increment
- [ ] Enter correct OTP → get session token
- [ ] Use token to fetch dashboard data → get bar info
- [ ] Save signage with all 7 template types → round-trip check
- [ ] Upload a logo → verify background removal and S3 storage
- [ ] Poll tv-state → verify signage appears in break state
- [ ] Poll tv-state → verify signage appears in active_game state
- [ ] Wait for session expiry → verify 401 on next request
- [ ] Rate limit: request OTP twice within 60s → second should be ignored

---

## EXECUTION ORDER

Do these in order. Do not skip ahead. Complete each phase before starting the next.

1. **PHASE 1** — Backend infrastructure (DynamoDB table, shared modules, Terraform for SES/S3/CloudFront)
2. **PHASE 2** — Lambda functions (all 5 new + 2 modified)
3. **PHASE 5** — Terraform (all additions, deploy infrastructure)
4. **PHASE 2 contd** — Build and deploy Lambda functions
5. **PHASE 6** — Test backend with scripts
6. **PHASE 3** — Dashboard web app
7. **PHASE 4** — TV app signage rendering
8. **PHASE 6 contd** — End-to-end testing

### After each phase:
1. Update `CLAUDE.md` with completed tasks
2. Compact the conversation if it's getting long
3. Re-read `CLAUDE.md` after compacting to pick up context

---

## REFERENCE FILES

The `reference-designs/` directory contains prototype implementations:

- **`dashboard-v3-prototype.jsx`** — Complete React prototype of the dashboard signage editor. Contains:
  - EmojiPicker and InlineEmojiPicker components
  - All 7 template editors with their form fields
  - All 7 full-screen TV renderers (TVSpecials, TVHappyHour, etc.)
  - All 7 compact panel renderers (PanelSpecials, PanelHappyHour, etc.)
  - Dual-preview system (full-screen + in-game panel)
  - Template data schemas and defaults
  - **This is the source of truth for what the UI should look like**

- **`signage-concept-prototype.jsx`** — Standalone signage rendering demo showing how slides look on a TV

- **`v6-full-prototype.jsx`** — Complete v6 prototype with all 27 screens across TV and player app

**These are React prototypes built for design validation.** You are implementing the real thing in vanilla JS. Use them as visual and structural reference, not as code to copy directly.

---

## ANTI-PATTERNS — DO NOT DO THESE

- ❌ Do NOT use Cognito for auth
- ❌ Do NOT use WebSockets
- ❌ Do NOT use API Gateway Lambda authorizers (auth check is a simple DynamoDB get in shared/auth.js — faster and simpler)
- ❌ Do NOT create separate DynamoDB tables for signage data (it goes on the Bars table)
- ❌ Do NOT use SQS/SNS for email sending (SES direct from Lambda is fine at this scale)
- ❌ Do NOT use Step Functions
- ❌ Do NOT add provisioned capacity to any DynamoDB table
- ❌ Do NOT use TypeScript or any transpilation step
- ❌ Do NOT use React, Vue, or any frontend framework for the dashboard app
- ❌ Do NOT modify existing Lambda functions beyond what's specified in Sections 2.1 and 2.2
- ❌ Do NOT change existing API routes or response formats
- ❌ Do NOT rename existing DynamoDB tables or change their key schemas
