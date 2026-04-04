# Claude Code Prompt: Build taptrivia.com + app.taptrivia.tv

## OVERVIEW

Build two static websites as React + Vite projects, deployed to AWS (S3 + CloudFront + Route 53). These are marketing/utility sites for the TapTrivia platform. Both should be production-ready and deployable.

**Important context:** The JSX reference files for both sites are in this project folder. They are fully functional React components built as Claude.ai artifacts. Your job is to scaffold proper React + Vite projects around them, adapt them for Vite's build system, and deploy to AWS.

---

## SITE 1: taptrivia.com

### What It Is
The main marketing/sales site for TapTrivia, targeting venue owners (bars, breweries, country clubs, restaurants, hotels, fraternal organizations, corporate facilities, senior living, etc.). The site sells the product as 100% free for venues and directs them to install the TV app to register.

### Reference File
`taptrivia-com.jsx` — This is the complete site as a single React component. It includes:
- Fixed nav bar with scroll-based transparency
- Hero section with animated entrance, TV platform badges, and cycling TV preview
- Social proof counter bar (200K+ questions, 60 categories, 7 platforms, $0 cost)
- 4-step "How It Works" (Install TV App → Register on TV → Guests Play → Customize via Dashboard)
- 8-feature grid
- Interactive digital signage demo (live preview updates as user types)
- 12 venue type grid
- Comparison section (Traditional Trivia Host vs TapTrivia)
- TV platform badges section
- Bottom CTA
- FAQ accordion
- Contact form (POST to `https://api.taptrivia.tv/contact`)
- Footer with Visudo Labs credit

### Key Content Details

**Trivia operating hours:** Trivia runs nightly from 5:00 PM to 5:00 AM Eastern. During off-hours (5 AM to 5 PM), the TV displays the venue's digital signage on a loop — logo, promotions, and announcements. The TV is never just sitting dark. This is already reflected in the JSX reference file — do not change the copy unless specifically asked.

**Contact form endpoint:** The form POSTs to `https://api.taptrivia.tv/contact`. Wire up a Lambda function behind API Gateway that sends the form submission via SES to `adam@visudolabs.com`. The Lambda should:
1. Validate that name, email, and message are non-empty
2. Send an email via SES with subject: "TapTrivia Contact: [name]"
3. Body should include all 4 fields (name, email, venue name if provided, message)
4. Return 200 on success, 400 on validation failure, 500 on SES failure
5. CORS headers for `www.taptrivia.com` and `taptrivia.com` origins

### Tech Stack
- React 18 + Vite
- No additional dependencies needed — the JSX uses Google Fonts via CSS @import and inline styles only
- Build output is static HTML/CSS/JS

### Fonts (loaded via Google Fonts CSS @import in the component)
- Fredoka (400–700) — headings, numbers, display text
- Outfit (300–900) — body text, UI labels, buttons
- DM Mono (400–500) — technical labels, badges

### Deploy
- S3 bucket: `www.taptrivia.com`
- CloudFront distribution with custom domain `www.taptrivia.com`
- ACM certificate for `taptrivia.com` and `*.taptrivia.com` (in us-east-1) — may already exist
- Route 53 hosted zone for `taptrivia.com`:
  - CNAME or A alias: `www.taptrivia.com` → CloudFront distribution
  - Apex redirect: `taptrivia.com` → redirect to `www.taptrivia.com` (use S3 redirect bucket or CloudFront function)
- S3 bucket policy: CloudFront OAC access only
- Cache: `index.html` → 60s TTL, `*.js, *.css, *.png` → 1 year TTL
- Custom error response: 403/404 → `/index.html` with 200 (SPA routing)
- `npm run deploy` script that builds, syncs to S3, and invalidates CloudFront

---

## SITE 2: app.taptrivia.tv

### What It Is
A smart app-store redirect page. When someone visits `app.taptrivia.tv`:
- **iOS device** → 3-second countdown, then auto-redirect to App Store
- **Android device** → 3-second countdown, then auto-redirect to Google Play
- **Desktop/other** → Shows both store download buttons
- User can cancel the redirect with a "Stay on this page" button

This URL goes on business cards, signage, QR codes, etc.

### Reference File
`app-taptrivia-tv.jsx` — Complete React component with user agent detection, countdown, and store buttons.

### Placeholder Store URLs (replace when live)
- iOS: `https://apps.apple.com/app/taptrivia/id000000000`
- Android: `https://play.google.com/store/apps/details?id=com.visudolabs.taptrivia`

### Deploy
- S3 bucket: `app-taptrivia-tv` (or similar)
- CloudFront distribution with custom domain `app.taptrivia.tv`
- ACM certificate: use the existing `*.taptrivia.tv` wildcard cert if available, or create one
- Route 53: A record alias to CloudFront for `app.taptrivia.tv`
- Same cache/error config as taptrivia.com
- `npm run deploy` script

---

## PROJECT STRUCTURE

```
websites/
├── taptrivia-com/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── main.jsx          # ReactDOM.createRoot, renders App
│   │   └── App.jsx            # Adapted from taptrivia-com.jsx
│   └── deploy.sh              # Build + S3 sync + CloudFront invalidation
│
├── app-taptrivia-tv/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── main.jsx
│   │   └── App.jsx            # Adapted from app-taptrivia-tv.jsx
│   └── deploy.sh
│
└── contact-lambda/
    ├── index.mjs              # Lambda handler for contact form
    └── README.md              # Deploy instructions
```

---

## ADAPTATION NOTES

When converting the JSX artifacts to Vite projects:

1. The artifacts use `export default function ComponentName()` — keep that as the default export in `App.jsx`
2. `main.jsx` should be standard React 18 entry:
   ```jsx
   import React from 'react';
   import ReactDOM from 'react-dom/client';
   import App from './App';
   ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
   ```
3. `index.html` needs the standard Vite template with `<div id="root"></div>` and `<script type="module" src="/src/main.jsx"></script>`
4. Add `<title>TapTrivia — Free Live Trivia & Digital Signage for Any Venue</title>` for taptrivia.com
5. Add `<title>Download TapTrivia</title>` for app.taptrivia.tv
6. Add meta description tags:
   - taptrivia.com: `<meta name="description" content="Turn any TV into an interactive trivia night with free digital signage. Available on Roku, Fire Stick, Apple TV, Samsung, and LG. No cost, no contract, no catch.">`
   - app.taptrivia.tv: `<meta name="description" content="Download the TapTrivia companion app to play live trivia at your favorite venue.">`
7. Add Open Graph tags with appropriate titles and descriptions
8. Set `<meta name="theme-color" content="#06060f">` on both
9. The Google Fonts `@import` in the `<style>` tag works fine in Vite — no changes needed

---

## DEPLOY SCRIPT TEMPLATE

Each site's `deploy.sh`:

```bash
#!/bin/bash
set -e

# Configuration — fill in after CloudFront is created
S3_BUCKET="your-bucket-name"
CF_DISTRIBUTION_ID="your-distribution-id"
AWS_PROFILE="Adam-Visudo"
AWS_REGION="us-east-1"

echo "Building..."
npm run build

echo "Deploying to S3..."
aws s3 sync dist/ s3://$S3_BUCKET \
  --delete \
  --profile $AWS_PROFILE \
  --region $AWS_REGION

echo "Setting cache headers..."
aws s3 cp s3://$S3_BUCKET/index.html s3://$S3_BUCKET/index.html \
  --cache-control "max-age=60" \
  --content-type "text/html" \
  --metadata-directive REPLACE \
  --profile $AWS_PROFILE \
  --region $AWS_REGION

echo "Invalidating CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id $CF_DISTRIBUTION_ID \
  --paths "/*" \
  --profile $AWS_PROFILE \
  --region $AWS_REGION

echo "Done!"
```

---

## AWS INFRASTRUCTURE NOTES

- AWS account: Adam-Visudo (3385-4023-6993)
- Existing domains in Route 53: taptrivia.tv (the main domain)
- taptrivia.com is owned — needs a hosted zone in Route 53 if one doesn't exist yet
- The primary site URL is `www.taptrivia.com` with `taptrivia.com` (apex) redirecting to it
- Use the same AWS profile (`Adam-Visudo`) for all CLI operations
- SES: Verify `adam@visudolabs.com` as a sender if not already verified. The contact Lambda sends FROM this address TO this address.
- API Gateway: The contact form endpoint at `https://api.taptrivia.tv/contact` should be added as a route on the existing TapTrivia API Gateway, or create a new one under `api.taptrivia.tv` if that doesn't exist yet.

---

## WHAT NOT TO DO

- Don't add any CSS framework (Tailwind, etc.) — the sites use inline styles exclusively
- Don't add React Router — both are single-page, no routing needed
- Don't modify the design, colors, fonts, or layout — they match the TapTrivia design system
- Don't add analytics or tracking scripts yet — that comes later
- Don't change the contact form endpoint URL — it's already coded in the JSX
