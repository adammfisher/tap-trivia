# AWS Pricing Analysis

Last updated: February 2026

---

## Assumptions

### 100K Registered Users Scenario

| Metric | Value | Rationale |
|--------|-------|-----------|
| Registered users | 100,000 | Total accounts |
| Daily active users (DAU) | 15,000 | 15% DAU rate (typical for nightly entertainment apps) |
| Avg games per session | 3 | ~45 min at the bar |
| Games per night | 36 | Every 15 min, 5 PM - 2 AM ET |
| Avg players per game | 1,250 | 15K DAU / 36 games x 3 games each |
| Peak per game (8-10 PM) | ~2,500 | 2x average during prime time |
| Bars with TVs | 500 | ~200 registered users per bar |
| TV active hours | 6 avg | Not all bars run the full 9-hour window |

### Current Users (Testing)

| Metric | Value |
|--------|-------|
| Daily players | ~5 |
| Active TVs | ~2 |

---

## How API Calls Break Down

### Per Player (one session = 3 games)

| Activity | API Calls | How |
|----------|-----------|-----|
| Lobby polling | 108 | GET /game/current every 5s, ~9 min waiting |
| Question fetches | 45 | 15 per game x 3 games |
| Answer submissions | 45 | 15 per game x 3 games |
| Leaderboard fetches | 45 | 15 per game x 3 games (scores phase) |
| Join bar | 1 | Once per session |
| **Total** | **~244** | |

### Per TV (one day)

| Activity | API Calls | How |
|----------|-----------|-----|
| Polling | 10,800 | GET /game/tv-state every 2s x 6 hours |

---

## Daily Request Volume

| Source | 100K Users | Current (testing) |
|--------|-----------|-------------------|
| Player API calls | 3,660,000 | 1,220 |
| TV API calls | 5,400,000 | 21,600 |
| **Total per day** | **~9.1M** | **~23K** |
| **Total per month** | **~272M** | **~690K** |

---

## DynamoDB Operations Per Endpoint

Each API call translates to multiple DynamoDB read/write operations. Here's the breakdown based on actual code:

| Endpoint | Reads per call | Writes per call | Notes |
|----------|---------------|-----------------|-------|
| GET /game/current | 2 | 0 | 2 gets (adhoc check + game lookup) |
| GET /game/tv-state | 3-13 | 1 | Base 3 reads + 1 heartbeat write; up to 10 extra bar-name lookups during results |
| GET /game/{id}/question/{num} | 1 | 0 | Single query on gameId index |
| POST /game/{id}/answer | 3 | 1 | 2 queries + 1 get + 1 put |
| GET /game/{id}/leaderboard | 2-22 | 0 | Bar: 2 reads; Global: up to 22 (bar name lookups for top 20) |
| POST /bar/join | 3 | 2-3 | 3 gets + 2-3 updates (decrement old bar if switching) |

### Daily DynamoDB Volume (100K users)

**Reads:**

| Source | Calls/day | RCU/call | Daily RCU |
|--------|-----------|----------|-----------|
| Player lobby polling | 1,620,000 | 2 | 3,240,000 |
| TV state polling | 5,400,000 | 5 avg | 27,000,000 |
| Question fetches | 675,000 | 1 | 675,000 |
| Answer submissions | 675,000 | 3 | 2,025,000 |
| Leaderboard fetches | 675,000 | 3 avg | 2,025,000 |
| Bar joins | 15,000 | 3 | 45,000 |
| **Total reads/day** | | | **35,010,000** |
| **Total reads/month** | | | **~1,050M** |

**Writes:**

| Source | Calls/day | WCU/call | Daily WCU |
|--------|-----------|----------|-----------|
| TV heartbeat (every poll) | 5,400,000 | 1 | 5,400,000 |
| Answer submissions | 675,000 | 1 | 675,000 |
| Bar joins | 15,000 | 2.5 avg | 37,500 |
| **Total writes/day** | | | **6,112,500** |
| **Total writes/month** | | | **~183M** |

---

## Monthly Cost Breakdown

### 100K Registered Users (15K DAU)

#### DynamoDB (On-Demand) - $485/month

| Component | Volume | Rate | Cost |
|-----------|--------|------|------|
| Reads | 1,050M RRU | $0.25 per million | $262.50 |
| Writes | 183M WRU | $1.25 per million | $228.75 |
| Storage (~5 GB) | 5 GB | $0.25/GB | $1.25 |
| **Subtotal** | | | **$485** |

> TV heartbeat writes alone = $202/month (81% of write cost). See optimizations below.

#### API Gateway (HTTP API) - $272/month

| Tier | Volume | Rate | Cost |
|------|--------|------|------|
| First 300M requests | 272M | $1.00 per million | $272.00 |

#### Lambda - $100/month

| Component | Calculation | Cost |
|-----------|------------|------|
| Invocations | 272M x $0.20/M | $54.40 |
| Compute (128 MB, ~80 ms avg) | 272M x 0.01 GB-s x $0.0000166667/GB-s | $45.33 |
| **Subtotal** | | **$100** |

#### CloudFront - $29/month

| Component | Volume | Rate | Cost |
|-----------|--------|------|------|
| Data transfer | ~100 GB | $0.085/GB | $8.50 |
| HTTPS requests | ~20M | $0.01/10K | $20.00 |
| **Subtotal** | | | **$29** |

#### Other Services - $8/month

| Service | Cost | Notes |
|---------|------|-------|
| Route53 | $6.50 | 1 hosted zone + DNS queries |
| S3 | $1.00 | Static hosting + logos bucket |
| SES | $0.50 | OTP emails + welcome emails |
| EventBridge | $0.00 | 1 daily scheduled rule |
| **Subtotal** | **$8** | |

---

### Total: 100K Users

| Service | $/month | $/day | % of total |
|---------|---------|-------|------------|
| DynamoDB | $485 | $16.17 | 54% |
| API Gateway | $272 | $9.07 | 30% |
| Lambda | $100 | $3.33 | 11% |
| CloudFront | $29 | $0.97 | 3% |
| Other (Route53, S3, SES) | $8 | $0.27 | 1% |
| **Total** | **$894** | **$29.80** | |

### Total: Current (Testing)

| Service | $/month | Notes |
|---------|---------|-------|
| All services combined | **$2-3** | Most falls under AWS free tier |

---

## Easy Optimizations

Three polling changes that cut costs by 35%:

| Change | What | Savings/month |
|--------|------|---------------|
| TV heartbeat every 30s | Currently writes to DynamoDB on every 2s poll. Write once per 30s instead. | **-$190** |
| TV idle poll at 5s | Poll every 5s during idle/break instead of 2s. Keep 2s during active game. | **-$80** |
| Player lobby poll at 10s | Poll every 10s instead of 5s while waiting for game. | **-$40** |
| **Total savings** | | **-$310/month** |

**Optimized monthly total: ~$584/month** ($19.47/day)

---

## Cost Per User

| DAU | Monthly (unoptimized) | Monthly (optimized) | Per active user |
|-----|----------------------|--------------------|--------------------|
| 100 | $2-3 | $2-3 | $0.03 |
| 1,000 | ~$65 | ~$45 | $0.045 |
| 5,000 | ~$310 | ~$200 | $0.040 |
| 15,000 | ~$894 | ~$584 | $0.039 |
| 50,000 | ~$2,800 | ~$1,800 | $0.036 |

Cost scales linearly. **~$0.04 per active user per month** after optimizations.

---

## When Architecture Needs to Change

The current polling + on-demand DynamoDB setup works well up to a point. Here's when things would need attention:

| Scale | Status | Notes |
|-------|--------|-------|
| 15K DAU | No changes needed | Current architecture handles this fine |
| 50K DAU | Monitor DynamoDB throttling | Watch for hot partitions on answer submissions during peak |
| 100K DAU | Add leaderboard caching | Pre-compute leaderboard snapshots instead of scanning answers live |
| 200K+ DAU | Consider WebSockets | Polling at this scale gets expensive; push model saves 60-70% on API calls |
| 500K+ DAU | Provisioned DynamoDB | Switch from on-demand to provisioned with auto-scaling for predictable costs |

---

## Notes

- All prices are **us-east-1** region as of February 2026
- DynamoDB uses **on-demand billing** (PAY_PER_REQUEST) — no reserved capacity
- Lambda functions are **128 MB** (except generate-games at 512 MB and upload-logo at 256 MB)
- Free tier discounts not included (they expire after 12 months for most services)
- Costs do not include Bedrock (logo background removal) — minimal usage, ~$1/month
