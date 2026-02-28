# Tap Trivia â€” Bar Identity, Onboarding & Authentication System

## Core Concept: One Unique ID Per Bar, Forever

Every bar gets a single permanent code (e.g., "BR7X") that serves as their identity across the entire platform. This code never changes. All trivia sessions, player data, signage content, and analytics roll up to this one ID in perpetuity.

---

## Bar Owner Registration Flow

### Step 1: TV App Signup
- Bar owner opens the TV app for the first time
- Enters their **bar name** and **email address**
- System generates their **permanent unique bar code**

### Step 2: Email Delivery
The bar owner receives a single email containing:
- Their **permanent bar code** for TV activation
- A **link to set up dashboard access** for managing digital signage (they can do this whenever they're ready â€” doesn't have to be immediate)

### Step 3: TV Activation
- Bar owner returns to the TV app and enters the code from the email
- TV is now paired to their bar identity
- The code displays on the TV for patrons to join games
- Email is verified as valid through this loop (they had to receive and retrieve the code)

### Key Design Detail
The TV activation step doubles as email verification. If the bar owner can enter the correct code, they received the email, which means the email address is real and belongs to them. No separate email verification flow needed.

---

## Bar Owner Dashboard Authentication

### Passwordless OTP Flow (No Passwords)

Bar owners do not have passwords. Authentication works as follows:

1. Bar owner goes to the dashboard website
2. Enters their **email** and **bar code**
3. Both must match the original registration â€” email and code are validated as a pair
4. System sends a **one-time passcode (OTP)** to the registered email
5. Bar owner enters the OTP
6. They're in

### Why Passwordless
- Bar owners log into the dashboard infrequently (maybe once a week to update specials)
- No password to forget, no reset flow to build, no password hashing to manage
- OTP to email is sufficient security for a trivia/signage platform
- Simpler auth infrastructure overall

### Trusted Computer Flow
After entering the OTP successfully, the system asks:

> **"Trust this computer?"** (Yes / No)

- **Yes**: Stores a long-lived session token in `localStorage`. The bar owner is automatically logged in on subsequent visits from that machine. Token expires after a reasonable period (30â€“90 days), at which point they re-verify with a new OTP.
- **No**: Treats it as a one-time session. No token stored. They'll need to OTP again next time.

This gives bar owners control â€” they'll trust their office laptop but skip it on a shared device behind the bar.

### Security Model
- A patron might know the bar code (it's on the TV), but they don't know the bar owner's email
- Both the code AND the email must match the original registration to trigger an OTP
- The OTP goes to the verified email, so even if someone has both the code and email, they can't get in without access to the inbox
- No passwords to leak, phish, or brute force

---

## What Hangs Off the Unique Bar ID

The permanent bar code becomes the anchor for everything:

| Feature | Tied to Bar ID |
|---|---|
| TV app pairing | Code entered to activate TV |
| Patron game sessions | Players join using the code displayed on TV |
| Player statistics | All player activity at that venue rolls up to the bar ID |
| Digital signage content | Bar owner configures signage in dashboard, TV pulls it by code |
| Bar owner dashboard access | Email + code pair for authentication |
| Analytics & metrics | Longitudinal data per bar â€” player counts, session lengths, trends |
| Promotional materials | Flyers, branded content, all generated against the bar identity |

---

## Digital Signage Architecture

- Bar owner manages signage through the dashboard (tied to their unique ID)
- Whatever content they configure (specials text, logo, messaging) is stored against their bar code
- The TV app pulls signage content associated with its paired code
- Signage displays between trivia rounds, during idle time, or on rotation
- Signage persists with the bar ID forever â€” even if they swap TVs or Fire Sticks, the content follows the code

---

## System Architecture Summary

```
Bar Owner â†’ TV App (enter name + email)
         â†’ System generates permanent code
         â†’ Email sent with code + dashboard link
         â†’ Bar owner enters code in TV App â†’ TV activated & paired

Bar Owner â†’ Dashboard (enter email + code)
         â†’ OTP sent to email
         â†’ Enter OTP â†’ "Trust this computer?" â†’ Yes/No
         â†’ Dashboard access: signage, analytics, metrics

Patrons â†’ See code on TV â†’ Enter on phone â†’ Play trivia
       â†’ All session data tied to bar's unique ID
```

---

## Logo Processing â€” Background Removal via AWS Titan

### Flow
1. Bar owner uploads their logo image in the dashboard (any JPEG or PNG â€” photo of their sign, screenshot from Facebook, business card scan, whatever they have)
2. Dashboard sends the image to a Lambda function
3. Lambda calls Amazon Bedrock Titan Image Generator v2 with `taskType: "BACKGROUND_REMOVAL"`
4. Titan returns a transparent PNG with the background stripped
5. Lambda resizes the result to 300x300 (or 512x512 for future flexibility)
6. Processed transparent PNG is stored in S3, keyed to the bar's unique ID
7. TV app pulls the clean logo by bar code and caches it locally

### Why Titan on Bedrock
- Single API call, no ML models to package or manage
- No containers, no heavy Lambda dependencies â€” stays lightweight
- Already within the AWS ecosystem, no third-party dependency
- Handles messy uploads well â€” photos of neon signs, screenshots, scans
- Bar owner never knows processing happened â€” they just see a clean logo on screen

### Cost
- Titan Image Generator pricing is roughly $0.01â€“0.02 per image
- At 1,000 bars uploading once: $10â€“20 total, one time
- Most bars upload a logo once and rarely change it â€” negligible ongoing cost

### TV App Caching
- TV app downloads the logo once when it first connects or when the logo changes
- A logo hash/version number is included in the regular polling response
- TV checks if the hash changed since last fetch â€” if no, uses cached image; if yes, fetches the new one
- Logo downloads happen maybe a few times per month per bar at most

### Image Constraints
- Output stored as transparent PNG
- Restricted to 300x300px (or 512x512 for more flexibility on large TV displays)
- At 50â€“100KB per image, bandwidth is negligible even at scale

---

## Patron Mobile App â€” Saved Bars

### How It Works
- Patron visits a bar, enters the TV code on their phone to join a game
- That bar (name + code) is saved locally on their device
- Next time they visit, the app shows their previously visited bars on the join screen
- They tap the bar name and they're in â€” no code entry needed

### Details
- Stored locally on the patron's device (no extra API calls)
- Patrons who frequent multiple bars see all of them in their list
- Most recent or most frequent bars surface to the top
- No account or login required beyond whatever the patron already has
- If a bar code somehow changed (it shouldn't), the saved entry would fail gracefully and prompt for a new code

### Why This Matters
- Eliminates friction for repeat visits â€” regulars shouldn't have to look up at the TV and type a code every time
- Makes the app feel personalized from the patron's perspective
- Encourages multi-bar usage â€” a patron who plays at one bar sees how easy it is to jump into another

---

## Key Principles

1. **One code, one bar, forever.** The code never changes. Everything ties back to it.
2. **No passwords.** OTP via email is the only auth mechanism.
3. **Email verification is built into onboarding.** The TV activation code proves the email is real.
4. **Trusted computer is opt-in.** Bar owner decides per device via localStorage token.
5. **Signage and analytics stay with the ID.** New TV, new device, doesn't matter â€” the code reconnects everything.
6. **Email + code pair is the security boundary.** Knowing one without the other isn't enough to access anything.
