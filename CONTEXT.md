# TapTrivia — Where We Are

**Last updated:** 2026-05-01 (Friday)
**Picking up:** Monday 2026-05-04
**Author of this handoff:** Claude (Opus 4.7) working with Adam

This is a snapshot for picking the work back up after a few days away. Everything below is committed; all infrastructure is deployed except where noted.

---

## TL;DR — what to do Monday

1. **Set up EAS Submit credentials** (one-time, ~30 min). Section ["Monday: EAS submit setup"](#monday-eas-submit-setup) below has the step-by-step.
2. **Test the new free-trial flow on real hardware** via TestFlight (iOS) and Internal Testing (Android). Section ["Verify the trial fix"](#verify-the-trial-fix) below.
3. **Submit to production** once trial is confirmed working.
4. **Then** decide whether to continue with Phase 8 (analytics polish) or move on.

---

## What got built in this session (May 1)

Phases 1-7 of the analytics build spec at `analytics/analytics-build-spec.md`, plus a mobile-app trial-flow fix at the end.

### Recent commit log

```
71fb30b Fix: route Start Free Trial through native purchase flow      ← needs ship
a6028aa Phase 7: frontend deployed to analytics.taptrivia.tv          ← live
2b48249 Tighten analytics CORS to admin.taptrivia.tv only             (superseded by Phase 7's switch to analytics.taptrivia.tv)
a5e3aa9 Phase 6: analytics API Lambda + Cognito auth                  ← live
a01bd52 Cleanup: wipe non-demo data, daily-only sync, RC primary, …   ← state-of-the-world
ae1697f Phase 5: analytics sync Lambda with four source integrations  ← live
76a496f Phase 4: signage impression logging + web TV deploy           ← live (web only; Roku/tvOS code committed but not built)
7372a20 Phase 3: TV pairing and heartbeat                             ← live (web only; Roku/tvOS code committed but not built)
7e83258 Phase 2: geo-IP resolution                                    ← live
72adf0b Phase 1: analytics schema                                     ← live
```

---

## Live URLs and their state

| URL | What | State |
|---|---|---|
| https://analytics.taptrivia.tv | Operator analytics console (you, signed in as `adam@visudolabs.com`) | **Live, deployed Phase 7.** All 7 tabs render real data (mostly zeros pre-revenue — that is correct). |
| https://api.taptrivia.tv/analytics/* | Operator analytics REST API | Live. JWT-auth via Cognito, Origin-locked to `analytics.taptrivia.tv` only. |
| https://admin.taptrivia.tv | Bar-owner dashboard (different product, different audience) | **Untouched** by the analytics work — explicitly kept separate at your direction. |
| https://tv.taptrivia.tv | Public TV web app (Fire Stick / Vega / Vizio) | Live; carries Phase 3 heartbeat + Phase 4 signage-impression code. |
| https://api.taptrivia.tv (other routes) | Public TV / player / dashboard API | Unchanged. |

---

## Pre-revenue data state (after the May 1 cleanup wipe)

Tables in DynamoDB after `Cleanup` commit:

| Table | Rows | Note |
|---|---|---|
| `TapTrivia-Bars` | 1 | Demo Bar `9CK6T` only. |
| `TapTrivia-Players` | 0 | Wiped. |
| `TapTrivia-Sessions` | unknown | Not analytics-relevant; not touched. |
| `TapTrivia-TvPairings` | 0 | Empty since Phase 3 deploy. |
| `TapTrivia-SignageImpressions` | 0 | Empty since Phase 4 deploy. |
| `TapTrivia-QuestionUsageByQuestion` | 0 | New per-question table from Phase 1; not yet populated. |
| `TapTrivia-AnalyticsCache` | ~17 rows | Refreshed daily 06:05 UTC by `TapTrivia-analytics-sync`. |
| `TapTrivia-Questions` | 100,010 | Untouched. |

**RevenueCat:** 458 customers, 0 paid, 0 trial (pre-revenue). After Monday's trial-flow fix ships and you do real subscription tests, those numbers will start moving.

---

## The trial fix that needs deploying (commit 71fb30b)

### What it does

The "Start Free Trial" button used to write a local timestamp and grant 7 days of access without ever touching the App Store / Play Store. After 7 days the paywall reappeared, the user had to make a fresh decision in cold blood, and most would churn there.

The fix routes that button through `Purchases.purchasePackage()` — same path as the regular Subscribe button. The store applies the configured 7-day intro offer, shows the native confirmation sheet, captures payment up front, and auto-charges on day 8. No second decision moment.

### Files changed

```
TapTrivia/src/hooks/useSubscription.ts       — startFreeTrial() now calls purchaseMonthly()
TapTrivia/src/screens/SubscriptionScreen.tsx — comment fix + button copy "Auto-renewing · Cancel anytime in settings"
```

`TapTrivia/src/services/trial.ts` is intentionally left in place. `checkTrial()` is still called on app boot to honor existing soft-trial users (anyone who started a soft trial before this fix). Once those soft trials have all expired in the wild, that file can be deleted.

### Verify the trial fix

You **cannot ship blind** — Apple's review will flag a broken intro offer and rejecting a binary takes 24-48h to recover from. 5-min sanity test on real hardware before submitting:

1. **iOS sandbox tester (free, no real charges)**
   1. App Store Connect → Users and Access → Sandbox → Testers → "+"
   2. Create a tester with a fake email (any `@anything.test` works) and any password
   3. On your iPhone: Settings → App Store → sign **out** of your real Apple ID
   4. Open the TestFlight build of TapTrivia (after running `eas submit -p ios` and waiting ~15-30 min for Apple processing)
   5. Tap "Start Free Trial" — sheet should say *"Free for 7 days, then $2.99/month"* and prompt for the sandbox-tester sign-in
   6. Enter the sandbox tester credentials → trial activates immediately, you see the app as Pro
   7. To verify auto-renew works, sandbox time-accelerates: 1 month = 5 minutes. Wait ~5 min and check RevenueCat dashboard — should show a renewal event.

2. **Android license tester (free, no real charges)**
   1. Play Console → Settings → License testing → add your Google account email
   2. Install the Internal Testing track build on your phone (after `eas submit -p android --track internal`)
   3. Tap "Start Free Trial" — sheet should say *"$2.99/month after 7-day free trial"* with your Google account selected
   4. Tap Subscribe → trial activates → you're Pro

### Important: trial eligibility is per-account, not per-RC-customer

You mentioned removing two test accounts from your DB. **Apple and Google track intro-offer eligibility on their side, per Apple ID / Google account.** Wiping RC customers or DB rows does NOT re-grant a fresh trial to an Apple ID that already consumed one. If you've already burned the trial on your real Apple ID during earlier testing, that Apple ID will see a non-trial purchase sheet ("$2.99/mo, no free period") on the new build. Use sandbox / license testers for fresh-trial verification.

---

## Monday: EAS submit setup

Right now `eas submit -p ios` will prompt for your Apple ID + 2FA each time, and `eas submit -p android` will fail outright (no submit config). One-time setup to make both fully automatic:

### iOS — App Store Connect API Key (~5 min)

1. Sign in to https://appstoreconnect.apple.com/access/integrations/api
2. Click **+** → Name "EAS Submit", **Access** = **App Manager**
3. Generate the key, **download the `.p8` file** (one-time download — save it carefully). Note the **Key ID** (10 chars next to the key) and the **Issuer ID** (UUID at the top of the page).
4. Save the `.p8` somewhere outside the repo, e.g. `~/Desktop/secrets/AuthKey_EAS_<KEY_ID>.p8`. Do **not** commit it to git.
5. Add to `TapTrivia/eas.json` under `submit.production.ios`:
   ```jsonc
   "ascApiKeyPath":     "/Users/adamfisher/Desktop/secrets/AuthKey_EAS_XXXXXX.p8",
   "ascApiKeyId":       "XXXXXXXXXX",
   "ascApiKeyIssuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```
   (Or `eas credentials` to upload it to EAS-managed storage — the path then doesn't need to live in eas.json.)

The Phase 5 ASC API key already in Secrets Manager (`taptrivia/appstore/private-key`) was scoped for **Sales/Finance**, not **App Manager**. Make a separate one for submissions.

### Android — Service Account JSON (~10 min)

1. Google Cloud Console → IAM & Admin → Service Accounts → **Create**
   - Name: `eas-submit`
   - Skip optional grant of GCP-level roles (none needed at the GCP project level for this)
2. Open the new service account → Keys → Add Key → JSON, **download the JSON file**.
3. Go to **Play Console** → Users and permissions → **Invite new users** → enter the service-account email (it's the `client_email` field in the JSON, looks like `eas-submit@taptrivia.iam.gserviceaccount.com`). Grant **Release manager** role on the TapTrivia app only.
4. Save the JSON outside the repo: `~/Desktop/secrets/play-eas-submit.json`. Do **not** commit it.
5. Add to `TapTrivia/eas.json`:
   ```jsonc
   "submit": {
     "production": {
       "ios": { /* ... existing ... */ },
       "android": {
         "serviceAccountKeyPath": "/Users/adamfisher/Desktop/secrets/play-eas-submit.json",
         "track": "internal"
       }
     }
   }
   ```
   `track: "internal"` puts the build in Internal Testing first — that's what you want for the trial-flow sanity check. Promote to `"production"` from the Play Console dashboard once verified.

The Phase 5 Google service account (`taptrivia-analytics@taptrivia.iam.gserviceaccount.com`) is scoped for BigQuery / Storage, not Play Console. Use a separate identity here.

### Then: build + submit

```bash
cd TapTrivia
eas build  --profile production --platform all       # ~10-20 min, both stores in parallel
eas submit --profile production --platform ios       # → goes to TestFlight automatically
eas submit --profile production --platform android   # → goes to Internal Testing track
```

After both submissions land:
- iOS: open TestFlight on your iPhone, install, sandbox-test the trial flow per [Verify](#verify-the-trial-fix). Then App Store Connect → "Submit for Review" to push to the public App Store.
- Android: install via Play Store on the Internal Testing track, license-test the trial flow. Then promote to production from Play Console (or change `track: "production"` in eas.json and re-submit).

---

## Open product/operational items

| Item | Where it stands |
|---|---|
| App Store API key — needs **App Manager** role for submissions | Existing key has only Sales/Finance — make a new one before Monday's submit |
| Play Console service account for submissions | Needs to be created and granted Release Manager — see Monday section |
| Apple intro-offer config | **Done** — Adam confirmed configured 2026-05-01 |
| Google intro-offer config | **Done** — Adam confirmed configured 2026-05-01 |
| Subscription test accounts in DB | **Wipe pending** — Adam will clear the two test rows on Monday before final test |
| RevenueCat dashboard test customers | Optional cleanup; once Apple/Google reports the refund/cancel, RC will mirror it |
| Bar-owner dashboard at admin.taptrivia.tv | Untouched on purpose. Different product. Don't conflate. |
| Phase 8 (analytics polish: skeletons, error boundaries, refresh UX) | Not started. Defer until trial fix lands and you decide whether the analytics console needs more work pre-launch. |

---

## Things that will surprise future you

These are gotchas not obvious from the code or git history:

- **Apple's `.p8` keys are scoped at issuance.** The Phase 5 key only has Sales/Finance role; using it for `eas submit` will silently fail in confusing ways. Make a fresh App-Manager-role key for submissions.
- **CloudFront `analytics.taptrivia.tv` reuses the existing wildcard ACM cert** (`*.taptrivia.tv`) — no new cert was requested. That's why Phase 7 infra came up in one apply with no waiting.
- **Soft-trial users still exist in the wild.** `TapTrivia/src/services/trial.ts` is intentionally still imported by `useSubscription.checkTrial()`. Anyone who tapped "Start Free Trial" before commit `71fb30b` keeps their remaining days; only the *write* path was switched. Don't delete `services/trial.ts` until you're sure all soft trials have expired.
- **Daily-only analytics sync, by design.** EventBridge cron is `cron(5 6 * * ? *)` (06:05 UTC). To bump back to hourly: change the cron and drop the per-source 24h guard in each source module. ~$13/mo more in Cost Explorer charges; not free.
- **Mobile app's RevenueCat still uses the old "soft trial" customers.** The 458 RC customers seen in analytics include early test users — they're not "real" customers in any meaningful sense. Don't read anything into the count yet.
- **Apple/Google intro eligibility is per Apple ID / Google account.** Resetting your DB or RC customers does NOT reset Apple's eligibility records. If you've already burned the trial on your real Apple ID, you'll need a sandbox tester to see the trial sheet again.
- **CORS on `analytics.taptrivia.tv` is enforced at the Lambda level**, not at API Gateway (which is wildcard for the public TV/player apps). The `ALLOWED_ORIGIN` env var on `TapTrivia-analytics-api` Lambda is the gate. To add a second admin domain in the future, env-var override is the easy path.
- **The Adam-Visudo AWS profile doesn't exist** on this machine — only the `default` profile, pointing at account `683032473658`. The original spec mentioned a different account number; that was stale. Everything is in `683032473658`, us-east-1.

---

## File / directory map (just the analytics-relevant parts)

```
tap-trivia/
├── CONTEXT.md                              ← this file
├── analytics/
│   ├── analytics-build-spec.md             ← the build blueprint (Phases 1-8)
│   ├── taptrivia-analytics-dashboard.jsx   ← visual contract (mockup)
│   └── frontend/                           ← Phase 7 React app, deployed to analytics.taptrivia.tv
│       ├── src/{App,main}.jsx
│       ├── src/lib/{theme,api,auth,format,ranges,useFetch}.{js,jsx}
│       ├── src/components/{Topbar,DateControl,Stat,Panel,Pill,Table,PanelState}.jsx
│       ├── src/components/charts/{SubChart,Donut,RevenueHeatmap,DailyCostChart}.jsx
│       ├── src/login/LoginScreen.jsx
│       └── src/tabs/{Overview,Subscribers,Bars,BarDrillIn,Signage,Finance,Questions,Aws}Tab.jsx
├── backend/
│   ├── functions/
│   │   ├── analytics-sync/        ← Phase 5: pulls RC, ASC, Play, AWS daily; writes to AnalyticsCache
│   │   │   ├── lambda_function.py
│   │   │   ├── cache.py · computed.py
│   │   │   └── sources/{revenuecat,appstore,googleplay,aws_costs}.py
│   │   ├── analytics-api/         ← Phase 6: 9 endpoints, JWT-auth, Origin-gated
│   │   │   ├── lambda_function.py
│   │   │   ├── handlers.py · cache.py · ranges.py · response.py
│   │   ├── geoip-update/          ← Phase 2
│   │   ├── tv-activate/           ← Phase 3 (Python rewrite)
│   │   ├── tv-heartbeat/          ← Phase 3
│   │   └── signage-impression/    ← Phase 4
│   ├── layers/
│   │   ├── geoip-py/              ← Phase 2: maxminddb + zip→DMA
│   │   └── analytics-py/          ← Phase 5: PyJWT + cryptography + google-auth + requests
│   └── shared/python/             ← dynamo, tv_status helpers
├── terraform/
│   ├── analytics-sync.tf          ← Phase 5
│   ├── analytics-api.tf           ← Phase 6
│   ├── analytics-frontend.tf      ← Phase 7 (S3 + CloudFront + R53 for analytics.taptrivia.tv)
│   └── geoip.tf                   ← Phase 2
└── TapTrivia/                     ← React Native mobile app
    ├── eas.json                   ← submit config — needs ASC API key + Play SA paths Monday
    ├── src/
    │   ├── hooks/useSubscription.ts        ← updated 71fb30b
    │   ├── screens/SubscriptionScreen.tsx  ← updated 71fb30b
    │   ├── services/{revenuecat,trial}.ts  ← trial.ts read-path only now
    │   └── ...
```

---

## Credentials inventory (where things live)

| What | Where | Used by |
|---|---|---|
| RevenueCat API key + project ID | Secrets Manager: `taptrivia/revenuecat/credentials` | analytics-sync |
| App Store Connect Sales/Finance .p8 | Secrets Manager: `taptrivia/appstore/private-key` | analytics-sync |
| App Store Connect issuer/key/vendor IDs | Secrets Manager: `taptrivia/appstore/credentials` | analytics-sync |
| Google service account (BigQuery/Storage scope) | Secrets Manager: `taptrivia/googleplay/service-account-key` | analytics-sync |
| MaxMind GeoLite2 license | Secrets Manager: `taptrivia/geoip/maxmind-credentials` | geoip-update |
| **EAS Submit ASC API key** | **TBD Monday** — make a new App-Manager-role key, save outside repo | `eas submit -p ios` |
| **EAS Submit Play service account** | **TBD Monday** — make a new SA with Release Manager, save outside repo | `eas submit -p android` |
| Cognito admin user (`adam@visudolabs.com`) password | In your password manager (you set it 2026-05-01) | Sign-in to https://analytics.taptrivia.tv |

---

## Monthly cost as of today (operator-only, pre-revenue)

| Component | $/mo |
|---|---|
| Lambda (analytics-sync × daily, analytics-api per-request) | ~$0 |
| DynamoDB (on-demand, near-empty tables) | ~$0 |
| Cost Explorer ($0.01/call × 2 calls/run × 30 days) | ~$0.60 |
| Secrets Manager (5 secrets × $0.40) | ~$2.00 |
| CloudFront / S3 / Route 53 / SES | ~$3 (mostly Route 53 hosted zone) |
| Cognito (50K MAU free tier) | $0 |
| **Total operator analytics overhead** | **~$5-6/mo** |
| AWS Cost Explorer reports total monthly spend at `https://analytics.taptrivia.tv` (AWS tab) | live |

---

## Restart instructions (what I'd do Monday morning if I were Adam)

1. Open this file (`CONTEXT.md`) — re-read TL;DR + "Verify the trial fix" + "Monday: EAS submit setup".
2. Sign in to https://analytics.taptrivia.tv with `adam@visudolabs.com` to confirm everything's still up.
3. Open App Store Connect → make the App Manager API key. Open Google Cloud + Play Console → make the service account, grant Release Manager. ~15 min total.
4. Save both files outside the repo, e.g. `~/Desktop/secrets/`. Update `TapTrivia/eas.json` with the paths.
5. Add a new App Store Connect Sandbox Tester (any fake email is fine).
6. Add yourself as a Play License Tester.
7. `cd TapTrivia && eas build --profile production --platform all` (waits ~15-20 min — go grab coffee).
8. When build finishes: `eas submit --profile production --platform ios` and `eas submit --profile production --platform android`.
9. Wait for Apple processing (~15-30 min) and Play processing (~10 min).
10. Install via TestFlight on iPhone — sandbox-test the trial flow. Confirm sheet says "Free for 7 days, then $2.99/month".
11. Install via Play Internal Testing on Android — license-test the same flow.
12. If both work, App Store Connect → Submit for Review (Apple takes ~24h). Play Console → Promote to production (Google takes a few hours).
13. Go live. Watch RevenueCat dashboard for the first real trial-start event.

That's it. Open question for after launch: whether to do Phase 8 polish on the analytics console, or move on to other work.
