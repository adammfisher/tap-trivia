# TV Signage Integration Guide

> **For Claude Code:** This is a drop-in module. Follow these steps exactly.

## Files Provided

```
tv-signage-module/
├── js/tv-signage.js    → Copy to tv-app/js/tv-signage.js
├── css/tv-signage.css  → Copy to tv-app/css/tv-signage.css
└── INTEGRATION.md      → This file (reference only)
```

## Step 1: Copy Files

```bash
cp tv-signage-module/js/tv-signage.js tv-app/js/tv-signage.js
cp tv-signage-module/css/tv-signage.css tv-app/css/tv-signage.css
```

## Step 2: Add to `tv-app/index.html`

In the `<head>`, add after the existing stylesheet:

```html
<link rel="stylesheet" href="css/tv-signage.css">
```

Before the closing `</body>`, add after the existing scripts:

```html
<script src="js/tv-signage.js"></script>
```

## Step 3: Add a Signage Container

In `tv-app/index.html`, add a container div for full-screen signage rendering. This should be a sibling of the existing screen containers:

```html
<!-- Add alongside existing screen divs -->
<div id="signage-fullscreen" style="display:none; width:960px; height:540px; position:absolute; inset:0; transition:opacity 0.3s ease;"></div>
```

For the in-game panel, the existing game screen likely has a right sidebar area. The signage panel renders INTO that existing container. If there's no panel container yet, add one inside the game screen layout:

```html
<!-- Inside the game/playing screen's right panel area -->
<div id="signage-panel" style="width:340px; height:100%; overflow:hidden;"></div>
```

## Step 4: Wire Into `tv-app/js/app.js`

### 4a: In the Main Poll Response Handler

The TV app polls `get-tv-state` every 2 seconds. Find where the poll response is handled (look for where `state === 'break'` or `state === 'active_game'` is checked).

**When state is `break` (off-hours / between games):**

```javascript
// Inside the poll response handler, when state === 'break':

if (response.signage && response.signage.enabled) {
  var signageContainer = document.getElementById('signage-fullscreen');
  var barInfo = {
    barCode: response.barCode,
    barName: response.barName,
    city: response.city || '',
    state: response.state || '',
    logoUrl: response.logoUrl || null,
    logoHash: response.logoHash || null,
    // Construct full logo URL if logoUrl is just an S3 key:
    logoFullUrl: response.logoUrl ? ('https://tv.taptrivia.tv/' + response.logoUrl) : null
  };

  var rendered = TapSignage.renderFullScreen(signageContainer, response.signage, barInfo);
  if (rendered) {
    // Show signage, hide the default idle/lobby screen
    signageContainer.style.display = 'block';
    // Hide whatever the default break screen is:
    // document.getElementById('idle-screen').style.display = 'none';
    // (adjust the ID to match your existing idle screen element)
  } else {
    // No slides for today — fall back to default idle screen
    signageContainer.style.display = 'none';
    TapSignage.stop();
    // Show default idle screen
  }
} else {
  // No signage configured — show default idle screen
  document.getElementById('signage-fullscreen').style.display = 'none';
  TapSignage.stop();
  // Show default idle screen
}
```

**When state is `active_game`:**

```javascript
// Inside the poll response handler, when state === 'active_game':

// Render the in-game panel signage (right sidebar)
if (response.signage && response.signage.enabled) {
  var panelContainer = document.getElementById('signage-panel');
  if (panelContainer) {
    var barInfo = {
      barCode: response.barCode,
      barName: response.barName,
      city: response.city || '',
      state: response.state || '',
      logoUrl: response.logoUrl || null,
      logoHash: response.logoHash || null,
      logoFullUrl: response.logoUrl ? ('https://tv.taptrivia.tv/' + response.logoUrl) : null
    };
    TapSignage.renderPanel(panelContainer, response.signage, barInfo);
  }
}

// ... rest of active game rendering (unchanged)
```

**When state transitions (e.g., break → active_game or active_game → break):**

```javascript
// When the TV transitions OUT of break to an active game:
document.getElementById('signage-fullscreen').style.display = 'none';
TapSignage.stop();

// The active_game handler above will start panel rendering
```

### 4b: Critical Detail — Don't Restart on Every Poll

The `TapSignage.renderPanel()` method is smart — if it's already running panel rotation for the same slides, it returns `true` without restarting. So you CAN call it on every poll without disrupting the rotation. Same for `renderFullScreen()`.

However, if the signage CONFIG changes between polls (bar owner saved new slides), the module will detect the change and restart. This is handled automatically by comparing slide counts.

### 4c: Logo URL Resolution

The `get-tv-state` response includes `logoUrl` as an S3 key like `logos/BR7X4.png`. The TV app needs to resolve this to a full URL. Options:

1. **CloudFront origin for logos bucket** — Best approach. Add the logos S3 bucket as an origin on the TV CloudFront distribution with path pattern `/logos/*`. Then the full URL is `https://tv.taptrivia.tv/logos/BR7X4.png`.

2. **Separate CloudFront distribution** — If you set up a separate CDN for logos, the URL would be something like `https://assets.taptrivia.tv/logos/BR7X4.png`.

3. **Direct S3** — Not recommended for production, but works for testing: `https://taptrivia-logos.s3.amazonaws.com/logos/BR7X4.png` (requires bucket public access or signed URLs).

The `barInfo.logoFullUrl` field in the integration code above is where you set the resolved URL.

## Step 5: Test with Mock Data

Before the backend delivers real signage data, you can test the rendering by injecting mock data. Add this to `app.js` or run in the browser console:

```javascript
// Mock test: render all 7 templates in sequence
var mockSignage = {
  enabled: true,
  rotationSpeed: 5,  // 5 seconds per slide for testing
  slides: [
    {
      id: 'test-1', template: 'specials', enabled: true,
      schedule: { days: ['mon','tue','wed','thu','fri','sat','sun'], allDay: true },
      data: {
        emoji: '🍺', label: "Tonight's Specials", headline: 'Thirsty Thursday',
        subheadline: 'All Day Deals', featuredName: 'Margarita Pitcher',
        featuredDesc: 'House lime, Cointreau, fresh squeeze', featuredPrice: '$18',
        menuItems: [
          { icon: '🍺', name: 'Draft Beers', desc: 'All domestics', price: '$3' },
          { icon: '🍸', name: 'Well Drinks', desc: 'Vodka, rum, whiskey', price: '$4' },
          { icon: '🍗', name: 'Wings Basket', desc: '12 ct. buffalo or BBQ', price: '$8' },
          { icon: '🌮', name: 'Loaded Nachos', desc: 'Beef, cheese, jalapenos', price: '$10' }
        ]
      }
    },
    {
      id: 'test-2', template: 'happyhour', enabled: true,
      schedule: { days: ['mon','tue','wed','thu','fri','sat','sun'], allDay: true },
      data: {
        emoji: '🍹', timeRange: '4 PM – 7 PM', frequency: 'Every weekday',
        deals: [
          { deal: '50% OFF', item: 'All Drafts', color: '#f59e0b' },
          { deal: '$5', item: 'House Wine', color: '#e879f9' },
          { deal: '$6', item: 'Appetizers', color: '#00d4aa' }
        ]
      }
    },
    {
      id: 'test-3', template: 'event', enabled: true,
      schedule: { days: ['mon','tue','wed','thu','fri','sat','sun'], allDay: true },
      data: {
        emoji: '🎧', eventName: 'Trivia Night', when: 'This Thursday',
        details: '8 PM • Free to play • Prizes for top 3',
        prizes: [
          { place: '1st', prize: '$50 Bar Tab', emoji: '🥇' },
          { place: '2nd', prize: '$25 Bar Tab', emoji: '🥈' },
          { place: '3rd', prize: 'Free Appetizer', emoji: '🥉' }
        ]
      }
    },
    {
      id: 'test-4', template: 'brand', enabled: true,
      schedule: { days: ['mon','tue','wed','thu','fri','sat','sun'], allDay: true },
      data: {
        tagline: 'Cold Drinks • Good Times • Live Trivia',
        hours: [
          { label: 'Mon–Thu', hours: '4 PM – 12 AM' },
          { label: 'Fri–Sat', hours: '4 PM – 2 AM' },
          { label: 'Sunday', hours: '12 PM – 10 PM' }
        ]
      }
    },
    {
      id: 'test-5', template: 'announcement', enabled: true,
      schedule: { days: ['mon','tue','wed','thu','fri','sat','sun'], allDay: true },
      data: {
        emoji: '📢', headline: 'Big News!',
        message: "We're expanding our patio — more seating, more fun starting next month!",
        subtext: 'Stay tuned for the grand reveal'
      }
    },
    {
      id: 'test-6', template: 'sports', enabled: true,
      schedule: { days: ['mon','tue','wed','thu','fri','sat','sun'], allDay: true },
      data: {
        emoji: '🏈', headline: 'Game Day', matchup: 'Eagles vs Cowboys',
        when: 'Sunday at 4:25 PM', promo: '$3 Bud Light • $5 Wings Basket',
        tagline: 'Best seat in town'
      }
    },
    {
      id: 'test-7', template: 'custom', enabled: true,
      schedule: { days: ['mon','tue','wed','thu','fri','sat','sun'], allDay: true },
      data: {
        emoji: '✨', headline: 'Welcome to Our Bar',
        body: 'Thanks for stopping by — grab a drink, play some trivia, and have a great time.',
        items: [
          { emoji: '🎯', text: 'Trivia every night' },
          { emoji: '🔥', text: 'Best wings in town' },
          { emoji: '💡', text: 'Free WiFi' }
        ]
      }
    }
  ]
};

var mockBarInfo = {
  barCode: 'BR7X4',
  barName: "Mo's Tavern",
  city: 'Brevard',
  state: 'NC',
  logoUrl: null,
  logoHash: null
};

// Test full-screen mode:
var container = document.getElementById('signage-fullscreen');
container.style.display = 'block';
TapSignage.renderFullScreen(container, mockSignage, mockBarInfo);

// To stop:
// TapSignage.stop();
// container.style.display = 'none';
```

## API Reference

```javascript
// Start full-screen signage rotation
// Returns: true if rendered, false if no slides for today
TapSignage.renderFullScreen(containerElement, signageConfig, barInfo)

// Start panel signage rotation (in-game sidebar)
// Returns: true if rendered, false if no slides
TapSignage.renderPanel(containerElement, signageConfig, barInfo)

// Stop all rotation timers and clean up
TapSignage.stop()

// Check if signage is currently rendering
TapSignage.isActive()  // → boolean

// Get count of slides available for today
TapSignage.getSlideCount(signageConfig)  // → number
```

### signageConfig Shape

```javascript
{
  enabled: true,           // Master toggle
  rotationSpeed: 15,       // Seconds per slide
  slides: [
    {
      id: 'uuid',
      template: 'specials',  // specials|happyhour|event|brand|announcement|sports|custom
      enabled: true,
      schedule: {
        days: ['mon', 'tue', ...],  // Which days to show
        allDay: true                 // (optional)
      },
      data: { ... }  // Template-specific data (see schemas in CLAUDE-CODE-PROMPT.md)
    }
  ]
}
```

### barInfo Shape

```javascript
{
  barCode: 'BR7X4',
  barName: "Mo's Tavern",
  city: 'Brevard',
  state: 'NC',
  logoUrl: 'logos/BR7X4.png',    // S3 key from tv-state response
  logoHash: 'abc123',            // For cache invalidation
  logoFullUrl: 'https://...'     // Resolved full URL (you construct this)
}
```
