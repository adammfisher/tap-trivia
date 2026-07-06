#!/usr/bin/env node
/**
 * Generate PNG assets for the TapTrivia Roku app.
 * Creates gradient backgrounds, orbs, QR codes, timer ring frames,
 * splash screen, channel poster, glass cards, and signage backgrounds.
 *
 * Usage: cd scripts && npm install && node generate-assets.js
 * Requires: @napi-rs/canvas, qrcode
 */

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Register bundled fonts
const FONTS_DIR = path.join(__dirname, '..', 'fonts');
if (fs.existsSync(FONTS_DIR)) {
  const fontFiles = fs.readdirSync(FONTS_DIR).filter(f => f.endsWith('.ttf'));
  for (const f of fontFiles) {
    const name = f.replace('.ttf', '').replace(/-/g, ' ');
    GlobalFonts.registerFromPath(path.join(FONTS_DIR, f), name);
  }
}

function save(canvas, filename) {
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(IMAGES_DIR, filename), buf);
  console.log(`  ✓ ${filename} (${buf.length} bytes)`);
}

// ═══════════════════════════════════════════════════════════
// BACKGROUND GRADIENT (1280x720 — Roku Express renders at 720p UI resolution;
// smaller texture saves ~4.6MB GPU memory. Poster nodes still display at 1920x1080
// via width/height attributes — gradients scale identically.)
// ═══════════════════════════════════════════════════════════

function generateBgGradient() {
  console.log('Generating background gradient...');
  const c = createCanvas(1280, 720);
  const ctx = c.getContext('2d');
  // Match web: linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)
  const grad = ctx.createLinearGradient(0, 0, 640, 720);
  grad.addColorStop(0, '#0f0326');
  grad.addColorStop(0.2, '#1e0f4a');
  grad.addColorStop(0.45, '#3d1866');
  grad.addColorStop(0.7, '#6b2358');
  grad.addColorStop(1, '#a8334a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 720);
  save(c, 'bg-gradient.png');
}

// ═══════════════════════════════════════════════════════════
// GRADIENT ORBS (soft radial gradient circles)
// ═══════════════════════════════════════════════════════════

function generateOrb(color1, color2, size, filename) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, color1);
  grad.addColorStop(0.6, color2);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  save(c, filename);
}

function generateOrbs() {
  console.log('Generating orbs...');
  generateOrb('rgba(102,126,234,0.4)', 'rgba(102,126,234,0.05)', 600, 'orb-blue.png');
  generateOrb('rgba(168,51,74,0.35)', 'rgba(168,51,74,0.05)', 500, 'orb-red.png');
  generateOrb('rgba(0,212,170,0.3)', 'rgba(0,212,170,0.05)', 400, 'orb-green.png');
}

// ═══════════════════════════════════════════════════════════
// QR CODES (using qrcode toFile — no canvas dependency)
// ═══════════════════════════════════════════════════════════

async function generateQRCodes() {
  console.log('Generating QR codes...');
  const url = 'https://app.taptrivia.tv';
  const opts = { color: { dark: '#1e0f4a', light: '#ffffff' }, type: 'png' };

  // 120px QR for badges
  await QRCode.toFile(path.join(IMAGES_DIR, 'qr-play-120.png'), url, { ...opts, width: 120, margin: 1 });
  console.log('  ✓ qr-play-120.png');

  // 360px QR for lobby
  await QRCode.toFile(path.join(IMAGES_DIR, 'qr-play-360.png'), url, { ...opts, width: 360, margin: 2 });
  console.log('  ✓ qr-play-360.png');

  // 200px QR for signage
  await QRCode.toFile(path.join(IMAGES_DIR, 'qr-play-200.png'), url, { ...opts, width: 200, margin: 1 });
  console.log('  ✓ qr-play-200.png');

  // 244px QR for the two-screen Scores rotation (matches web qrCodeHTML(244))
  await QRCode.toFile(path.join(IMAGES_DIR, 'qr-play-244.png'), url, { ...opts, width: 244, margin: 1 });
  console.log('  ✓ qr-play-244.png');
}

// ═══════════════════════════════════════════════════════════
// TIMER RING FRAMES
// ═══════════════════════════════════════════════════════════

function generateTimerRings() {
  console.log('Generating timer ring frames...');
  const size = 96;
  const strokeWidth = 6;
  const r = (size - strokeWidth * 2) / 2;
  const colors = {
    safe: '#667eea',
    warning: '#ffd200',
    danger: '#ff4757'
  };

  for (const [tier, color] of Object.entries(colors)) {
    for (let sec = 0; sec <= 35; sec++) {
      const c = createCanvas(size, size);
      const ctx = c.getContext('2d');
      const pct = sec / 35;

      // Track
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.arc(size/2, size/2, r, 0, Math.PI * 2);
      ctx.stroke();

      // Ring fill
      if (pct > 0) {
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(size/2, size/2, r, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * pct);
        ctx.stroke();
      }

      save(c, `timer-ring-${tier}-${sec}.png`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SPLASH SCREEN (1920x1080)
// ═══════════════════════════════════════════════════════════

function generateSplashScreen() {
  console.log('Generating splash screen...');
  const c = createCanvas(1920, 1080);
  const ctx = c.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 960, 1080);
  grad.addColorStop(0, '#0f0326');
  grad.addColorStop(0.5, '#1e0f4a');
  grad.addColorStop(1, '#3d1866');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1920, 1080);

  // Logo text — try Fredoka, fall back to sans-serif
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 96px "Fredoka Bold", sans-serif';
  ctx.fillStyle = '#667eea';
  ctx.fillText('Tap', 880, 520);
  ctx.fillStyle = '#ffd200';
  ctx.fillText('Trivia', 1080, 520);

  // Subtitle
  ctx.font = '28px "Outfit Regular", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Live Bar Trivia', 960, 600);

  save(c, 'splash-screen-fhd.png');

  // HD splash (1280×720) — required by Roku cert when manifest declares
  // splash_screen_hd; downscaled from FHD so visuals stay identical.
  const hd = createCanvas(1280, 720);
  hd.getContext('2d').drawImage(c, 0, 0, 1280, 720);
  save(hd, 'splash-screen-hd.png');
}

// ═══════════════════════════════════════════════════════════
// CHANNEL POSTER (540x405)
// ═══════════════════════════════════════════════════════════

function generateChannelPoster() {
  console.log('Generating channel poster...');
  const c = createCanvas(540, 405);
  const ctx = c.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, 270, 405);
  grad.addColorStop(0, '#0f0326');
  grad.addColorStop(0.5, '#1e0f4a');
  grad.addColorStop(1, '#3d1866');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 540, 405);

  // Logo
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 52px "Fredoka Bold", sans-serif';
  ctx.fillStyle = '#667eea';
  ctx.fillText('Tap', 230, 190);
  ctx.fillStyle = '#ffd200';
  ctx.fillText('Trivia', 330, 190);

  ctx.font = '18px "Outfit Regular", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Live Bar Trivia', 270, 240);

  save(c, 'channel-poster.png');

  // HD channel poster (290×218) — required by Roku cert when manifest
  // declares mm_icon_focus_hd; downscaled from FHD.
  const hd = createCanvas(290, 218);
  hd.getContext('2d').drawImage(c, 0, 0, 290, 218);
  save(hd, 'channel-poster-hd.png');
}

// ═══════════════════════════════════════════════════════════
// GLASS CARD BACKGROUNDS (9-patch style)
// ═══════════════════════════════════════════════════════════

function generateGlassCards() {
  console.log('Generating glass card backgrounds...');

  const sizes = [
    { name: 'glass-card-sm', w: 100, h: 60 },
    { name: 'glass-card-md', w: 200, h: 100 },
    { name: 'glass-card-lg', w: 400, h: 200 },
  ];

  for (const { name, w, h } of sizes) {
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');
    const radius = 16;

    // Rounded rect with glass effect
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(w - radius, 0);
    ctx.quadraticCurveTo(w, 0, w, radius);
    ctx.lineTo(w, h - radius);
    ctx.quadraticCurveTo(w, h, w - radius, h);
    ctx.lineTo(radius, h);
    ctx.quadraticCurveTo(0, h, 0, h - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.fill();

    // Subtle top border highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(radius, 0.5);
    ctx.lineTo(w - radius, 0.5);
    ctx.quadraticCurveTo(w - 0.5, 0.5, w - 0.5, radius);
    ctx.stroke();

    save(c, `${name}.png`);
  }
}

// ═══════════════════════════════════════════════════════════
// SIGNAGE GRADIENT BACKGROUNDS
// ═══════════════════════════════════════════════════════════

function generateSignageBackgrounds() {
  console.log('Generating signage backgrounds...');
  // Unified gradient — matches web: linear-gradient(150deg, #0f0326, #1e0f4a, #3d1866, #6b2358, #a8334a)
  // All templates use the same background so transitions are seamless.
  const navy = ['#0f0326', '#1e0f4a', '#3d1866', '#6b2358', '#a8334a'];
  const gradients = {
    'signage-specials': navy,
    'signage-happyhour': navy,
    'signage-event': navy,
    'signage-brand': navy,
    'signage-announcement': navy,
    'signage-sports': navy,
    'signage-custom': navy,
    'signage-default-qr': navy,
  };

  // 1280x720 — same as bg-gradient.png; saves ~4.6MB per texture (×8 = ~37MB)
  for (const [name, stops] of Object.entries(gradients)) {
    const c = createCanvas(1280, 720);
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 640, 720);
    stops.forEach((stop, i) => {
      grad.addColorStop(i / (stops.length - 1), stop);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);
    save(c, `${name}.png`);
  }
}

// ═══════════════════════════════════════════════════════════
// ROUNDED RECT HELPER
// ═══════════════════════════════════════════════════════════

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════
// HEADER / FOOTER FADE GRADIENTS
// ═══════════════════════════════════════════════════════════

function generateHeaderFooterFades() {
  console.log('Generating header/footer fades...');

  // Header: top-down dark fade (1280x80 — scales to 1920x120 in Poster node)
  const hc = createCanvas(1280, 80);
  const hctx = hc.getContext('2d');
  const hg = hctx.createLinearGradient(0, 0, 0, 80);
  hg.addColorStop(0, 'rgba(0,0,0,0.8)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  hctx.fillStyle = hg;
  hctx.fillRect(0, 0, 1280, 80);
  save(hc, 'header-fade.png');

  // Footer: bottom-up dark fade (1280x80)
  const fc = createCanvas(1280, 80);
  const fctx = fc.getContext('2d');
  const fg = fctx.createLinearGradient(0, 0, 0, 80);
  fg.addColorStop(0, 'rgba(0,0,0,0)');
  fg.addColorStop(1, 'rgba(0,0,0,0.67)');
  fctx.fillStyle = fg;
  fctx.fillRect(0, 0, 1280, 80);
  save(fc, 'footer-fade.png');
}

// ═══════════════════════════════════════════════════════════
// ANSWER CARD BACKGROUNDS (780x136, rounded)
// ═══════════════════════════════════════════════════════════

function generateAnswerCards() {
  console.log('Generating answer card backgrounds...');
  const w = 780, h = 136, r = 24;

  // Default state — white card (matches web TV app)
  const c1 = createCanvas(w, h);
  const ctx1 = c1.getContext('2d');
  // Soft shadow behind the card
  ctx1.shadowColor = 'rgba(0,0,0,0.10)';
  ctx1.shadowBlur = 16;
  ctx1.shadowOffsetY = 4;
  roundedRect(ctx1, 4, 2, w - 8, h - 6, r);
  ctx1.fillStyle = '#ffffff';
  ctx1.fill();
  ctx1.shadowColor = 'transparent';
  save(c1, 'answer-card-default.png');

  // Correct state — green gradient (matches web: #00c9a7 → #2ee6b6)
  const c2 = createCanvas(w, h);
  const ctx2 = c2.getContext('2d');
  ctx2.shadowColor = 'rgba(0,212,170,0.35)';
  ctx2.shadowBlur = 20;
  ctx2.shadowOffsetY = 4;
  roundedRect(ctx2, 4, 2, w - 8, h - 6, r);
  const gGrad = ctx2.createLinearGradient(0, 0, w, h);
  gGrad.addColorStop(0, '#00c9a7');
  gGrad.addColorStop(1, '#2ee6b6');
  ctx2.fillStyle = gGrad;
  ctx2.fill();
  ctx2.shadowColor = 'transparent';
  save(c2, 'answer-card-correct.png');

  // Dimmed / wrong state — semi-transparent
  const c3 = createCanvas(w, h);
  const ctx3 = c3.getContext('2d');
  roundedRect(ctx3, 4, 2, w - 8, h - 6, r);
  ctx3.fillStyle = 'rgba(255,255,255,0.12)';
  ctx3.fill();
  save(c3, 'answer-card-dimmed.png');

  // Eliminated state — dashed border look
  const c4 = createCanvas(w, h);
  const ctx4 = c4.getContext('2d');
  roundedRect(ctx4, 4, 2, w - 8, h - 6, r);
  ctx4.fillStyle = 'rgba(255,255,255,0.08)';
  ctx4.fill();
  ctx4.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx4.lineWidth = 2;
  ctx4.setLineDash([8, 6]);
  roundedRect(ctx4, 5, 3, w - 10, h - 8, r);
  ctx4.stroke();
  save(c4, 'answer-card-eliminated.png');
}

// ═══════════════════════════════════════════════════════════
// LETTER BADGES (60x60 circles with letters)
// ═══════════════════════════════════════════════════════════

function generateLetterBadges() {
  console.log('Generating letter badges...');
  const size = 80;
  const r = 18; // rounded rect radius (matches web 18px)
  const badges = [
    { letter: 'A', file: 'badge-a.png' },
    { letter: 'B', file: 'badge-b.png' },
    { letter: 'C', file: 'badge-c.png' },
    { letter: 'D', file: 'badge-d.png' },
  ];

  // Default badges: light purple gradient rounded-rect, dark purple text
  for (const { letter, file } of badges) {
    const c = createCanvas(size, size);
    const ctx = c.getContext('2d');
    roundedRect(ctx, 0, 0, size, size, r);
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#eef1ff');
    grad.addColorStop(1, '#e4d8ff');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.font = 'bold 32px "Fredoka Bold", sans-serif';
    ctx.fillStyle = '#5b2a86';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size / 2, size / 2);
    save(c, file);
  }

  // Check badge (correct state) — green circle with white checkmark
  const cc = createCanvas(size, size);
  const cctx = cc.getContext('2d');
  cctx.beginPath();
  cctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  cctx.fillStyle = '#00d4aa';
  cctx.fill();
  // Draw a checkmark
  cctx.strokeStyle = '#ffffff';
  cctx.lineWidth = 5;
  cctx.lineCap = 'round';
  cctx.lineJoin = 'round';
  cctx.beginPath();
  cctx.moveTo(22, 40);
  cctx.lineTo(34, 52);
  cctx.lineTo(57, 29);
  cctx.stroke();
  save(cc, 'badge-check.png');

  // X badge (eliminated/dimmed state) — semi-transparent circle with X
  const xc = createCanvas(size, size);
  const xctx = xc.getContext('2d');
  xctx.beginPath();
  xctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  xctx.fillStyle = 'rgba(255,255,255,0.15)';
  xctx.fill();
  // Draw an X
  xctx.strokeStyle = '#ffffff';
  xctx.lineWidth = 4;
  xctx.lineCap = 'round';
  xctx.beginPath();
  xctx.moveTo(26, 26);
  xctx.lineTo(54, 54);
  xctx.moveTo(54, 26);
  xctx.lineTo(26, 54);
  xctx.stroke();
  save(xc, 'badge-x.png');
}

// ═══════════════════════════════════════════════════════════
// CATEGORY PILL (500x40, rounded)
// ═══════════════════════════════════════════════════════════

function generateCategoryPill() {
  console.log('Generating category pill...');
  const w = 500, h = 40, r = 20;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  roundedRect(ctx, 0, 0, w, h, r);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
  save(c, 'category-pill.png');
}

// ═══════════════════════════════════════════════════════════
// LEADER ROW BACKGROUND (860x68, rounded)
// ═══════════════════════════════════════════════════════════

function generateLeaderRowBg() {
  console.log('Generating leader row background...');
  const w = 860, h = 68, r = 10;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  roundedRect(ctx, 0, 0, w, h, r);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
  // Subtle top highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r, 0.5);
  ctx.lineTo(w - r, 0.5);
  ctx.quadraticCurveTo(w - 0.5, 0.5, w - 0.5, r);
  ctx.stroke();
  save(c, 'leader-row-bg.png');
}

// ═══════════════════════════════════════════════════════════
// TWO-SCREEN SCORES ROTATION assets (match web tv-app .tt-2s)
// ═══════════════════════════════════════════════════════════

function generateTwoScreenAssets() {
  console.log('Generating two-screen Scores rotation assets...');

  // Standings row — normal: white 4% fill + white 6% border (web .tt-2s__row)
  let c = createCanvas(864, 66);
  let ctx = c.getContext('2d');
  roundedRect(ctx, 0, 0, 864, 66, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  roundedRect(ctx, 0.5, 0.5, 863, 65, 18);
  ctx.stroke();
  save(c, 'row2s-bg.png');

  // Standings row — first place: white 10% fill + gold 33% border (web .tt-2s__row--first)
  c = createCanvas(864, 66);
  ctx = c.getContext('2d');
  roundedRect(ctx, 0, 0, 864, 66, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,0,0.33)';
  ctx.lineWidth = 2;
  roundedRect(ctx, 1, 1, 862, 64, 17);
  ctx.stroke();
  save(c, 'row2s-first.png');

  // QR white card (web .tt-2s__play QR wrapper — white rounded card, padding)
  c = createCanvas(268, 268);
  ctx = c.getContext('2d');
  roundedRect(ctx, 0, 0, 268, 268, 20);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  save(c, 'qrcard2s.png');
}

// ═══════════════════════════════════════════════════════════
// IN-GAME QR BADGE (web .tt-qr-badge--bl, 1.2x baked → 1920 native)
// ═══════════════════════════════════════════════════════════

function generateInGameQrBadge() {
  console.log('Generating in-game QR badge assets...');

  // Dark glass badge background (web .tt-qr-badge on TV: rgba(10,5,20,.88))
  let c = createCanvas(600, 270);
  let ctx = c.getContext('2d');
  roundedRect(ctx, 0, 0, 600, 270, 38);
  ctx.fillStyle = 'rgba(10,5,20,0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  roundedRect(ctx, 1, 1, 598, 268, 37);
  ctx.stroke();
  save(c, 'qrbadge-game-bg.png');

  // White rounded QR card (web .tt-qr wrapper)
  c = createCanvas(230, 230);
  ctx = c.getContext('2d');
  roundedRect(ctx, 0, 0, 230, 230, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  save(c, 'qrbadge-card.png');
}

// ═══════════════════════════════════════════════════════════
// QR BADGE BACKGROUND (360x140, rounded)
// ═══════════════════════════════════════════════════════════

function generateQrBadgeBg() {
  console.log('Generating QR badge background...');
  const w = 360, h = 140, r = 16;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  roundedRect(ctx, 0, 0, w, h, r);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  roundedRect(ctx, 0.5, 0.5, w - 1, h - 1, r);
  ctx.stroke();
  save(c, 'qr-badge-bg.png');
}

// ═══════════════════════════════════════════════════════════
// COUNTDOWN RING (240x240 circle outline + inner fill)
// ═══════════════════════════════════════════════════════════

function generateCountdownRing() {
  console.log('Generating countdown ring...');

  // Outer ring (circle outline, blue)
  const s1 = 240;
  const c1 = createCanvas(s1, s1);
  const ctx1 = c1.getContext('2d');
  ctx1.beginPath();
  ctx1.arc(s1 / 2, s1 / 2, s1 / 2 - 3, 0, Math.PI * 2);
  ctx1.strokeStyle = '#667eea';
  ctx1.lineWidth = 6;
  ctx1.stroke();
  save(c1, 'countdown-ring-bg.png');

  // Inner fill (glass circle)
  const s2 = 228;
  const c2 = createCanvas(s2, s2);
  const ctx2 = c2.getContext('2d');
  ctx2.beginPath();
  ctx2.arc(s2 / 2, s2 / 2, s2 / 2, 0, Math.PI * 2);
  ctx2.fillStyle = 'rgba(255,255,255,0.04)';
  ctx2.fill();
  save(c2, 'countdown-ring-inner.png');
}

// ═══════════════════════════════════════════════════════════
// PODIUM BARS (gradient fills, rounded top corners)
// ═══════════════════════════════════════════════════════════

function generatePodiumBars() {
  console.log('Generating podium bars...');

  const bars = [
    { name: 'podium-bar-gold', w: 280, h: 140, c1: '#ffd200', c2: '#e8a838' },
    { name: 'podium-bar-silver', w: 200, h: 100, c1: '#d0d0d0', c2: '#a0a0a0' },
    { name: 'podium-bar-bronze', w: 200, h: 80, c1: '#cd7f32', c2: '#a06020' },
  ];

  for (const { name, w, h, c1, c2 } of bars) {
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');
    const r = 12;
    // Rounded top, flat bottom
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fill();
    save(c, `${name}.png`);
  }
}

// ═══════════════════════════════════════════════════════════
// MEDALS (28x28 circles with rank numbers)
// ═══════════════════════════════════════════════════════════

function generateMedals() {
  console.log('Generating medals...');
  const size = 28;
  const medals = [
    { rank: '1', color: '#ffd200', file: 'medal-gold.png' },
    { rank: '2', color: '#c0c0c0', file: 'medal-silver.png' },
    { rank: '3', color: '#cd7f32', file: 'medal-bronze.png' },
  ];

  for (const { rank, color, file } of medals) {
    const c = createCanvas(size, size);
    const ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.font = 'bold 16px "Fredoka Bold", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rank, size / 2, size / 2);
    save(c, file);
  }
}

// ═══════════════════════════════════════════════════════════
// SETUP SCREEN ASSETS
// ═══════════════════════════════════════════════════════════

function generateSetupAssets() {
  console.log('Generating setup screen assets...');

  // Panel background (860x840, rounded)
  const pw = 860, ph = 840, pr = 16;
  const pc = createCanvas(pw, ph);
  const pctx = pc.getContext('2d');
  roundedRect(pctx, 0, 0, pw, ph, pr);
  pctx.fillStyle = 'rgba(255,255,255,0.04)';
  pctx.fill();
  save(pc, 'setup-panel-bg.png');

  // Blue pill badge (180x36)
  const bpc = createCanvas(180, 36);
  const bpctx = bpc.getContext('2d');
  roundedRect(bpctx, 0, 0, 180, 36, 18);
  bpctx.fillStyle = 'rgba(102,126,234,0.2)';
  bpctx.fill();
  save(bpc, 'pill-badge-blue.png');

  // Green pill badge (160x36)
  const gpc = createCanvas(160, 36);
  const gpctx = gpc.getContext('2d');
  roundedRect(gpctx, 0, 0, 160, 36, 18);
  gpctx.fillStyle = 'rgba(0,212,170,0.2)';
  gpctx.fill();
  save(gpc, 'pill-badge-green.png');

  // Input field background (780x56, rounded)
  const ifc = createCanvas(780, 56);
  const ifctx = ifc.getContext('2d');
  roundedRect(ifctx, 0, 0, 780, 56, 8);
  ifctx.fillStyle = 'rgba(255,255,255,0.06)';
  ifctx.fill();
  save(ifc, 'input-field-bg.png');

  // Signage callout background (780x60, rounded, gold tint)
  const scc = createCanvas(780, 60);
  const scctx = scc.getContext('2d');
  roundedRect(scctx, 0, 0, 780, 60, 8);
  scctx.fillStyle = 'rgba(255,210,0,0.06)';
  scctx.fill();
  save(scc, 'signage-callout-bg.png');

  // Error message background (780x44, rounded, red tint)
  const emc = createCanvas(780, 44);
  const emctx = emc.getContext('2d');
  roundedRect(emctx, 0, 0, 780, 44, 8);
  emctx.fillStyle = 'rgba(255,71,87,0.12)';
  emctx.fill();
  save(emc, 'error-msg-bg.png');

  // Gold button (780x56, rounded)
  const gbc = createCanvas(780, 56);
  const gbctx = gbc.getContext('2d');
  roundedRect(gbctx, 0, 0, 780, 56, 12);
  gbctx.fillStyle = '#ffd200';
  gbctx.fill();
  save(gbc, 'btn-gold.png');

  // Gold button focused (brighter)
  const gbfc = createCanvas(780, 56);
  const gbfctx = gbfc.getContext('2d');
  roundedRect(gbfctx, 0, 0, 780, 56, 12);
  gbfctx.fillStyle = '#ffe55a';
  gbfctx.fill();
  save(gbfc, 'btn-gold-focused.png');

  // Green button (780x56, rounded)
  const gnc = createCanvas(780, 56);
  const gnctx = gnc.getContext('2d');
  roundedRect(gnctx, 0, 0, 780, 56, 12);
  gnctx.fillStyle = '#00d4aa';
  gnctx.fill();
  save(gnc, 'btn-green.png');

  // Green button focused (brighter)
  const gnfc = createCanvas(780, 56);
  const gnfctx = gnfc.getContext('2d');
  roundedRect(gnfctx, 0, 0, 780, 56, 12);
  gnfctx.fillStyle = '#00ffcc';
  gnfctx.fill();
  save(gnfc, 'btn-green-focused.png');

  // Green button verifying (dimmed)
  const gnvc = createCanvas(780, 56);
  const gnvctx = gnvc.getContext('2d');
  roundedRect(gnvctx, 0, 0, 780, 56, 12);
  gnvctx.fillStyle = 'rgba(0,212,170,0.5)';
  gnvctx.fill();
  save(gnvc, 'btn-green-verifying.png');

  // Input field focused (780x56, rounded, blue-purple border)
  const iffc = createCanvas(780, 56);
  const iffctx = iffc.getContext('2d');
  roundedRect(iffctx, 0, 0, 780, 56, 8);
  iffctx.fillStyle = 'rgba(102,126,234,0.08)';
  iffctx.fill();
  iffctx.strokeStyle = 'rgba(102,126,234,0.5)';
  iffctx.lineWidth = 2;
  roundedRect(iffctx, 1, 1, 778, 54, 8);
  iffctx.stroke();
  save(iffc, 'input-field-bg-focused.png');

  // Panel background focused (860x840, slightly brighter)
  const pfc = createCanvas(pw, ph);
  const pfctx = pfc.getContext('2d');
  roundedRect(pfctx, 0, 0, pw, ph, pr);
  pfctx.fillStyle = 'rgba(255,255,255,0.07)';
  pfctx.fill();
  save(pfc, 'setup-panel-bg-focused.png');
}

// ═══════════════════════════════════════════════════════════
// MISCELLANEOUS UI ASSETS
// ═══════════════════════════════════════════════════════════

function generateMiscAssets() {
  console.log('Generating miscellaneous UI assets...');

  // Players badge background (100x40, rounded)
  const pbc = createCanvas(100, 40);
  const pbctx = pbc.getContext('2d');
  roundedRect(pbctx, 0, 0, 100, 40, 8);
  pbctx.fillStyle = 'rgba(255,255,255,0.04)';
  pbctx.fill();
  save(pbc, 'players-badge-bg.png');

  // Progress bar track (900x8, rounded)
  const ptc = createCanvas(900, 8);
  const ptctx = ptc.getContext('2d');
  roundedRect(ptctx, 0, 0, 900, 8, 4);
  ptctx.fillStyle = 'rgba(255,255,255,0.06)';
  ptctx.fill();
  save(ptc, 'progress-bar-track.png');

  // Difficulty dot filled (16x16, circle, white for blendColor tinting)
  const dfc = createCanvas(16, 16);
  const dfctx = dfc.getContext('2d');
  dfctx.beginPath();
  dfctx.arc(8, 8, 8, 0, Math.PI * 2);
  dfctx.fillStyle = '#ffffff';
  dfctx.fill();
  save(dfc, 'difficulty-dot-filled.png');

  // Difficulty dot empty (16x16, circle, faint)
  const dec = createCanvas(16, 16);
  const dectx = dec.getContext('2d');
  dectx.beginPath();
  dectx.arc(8, 8, 8, 0, Math.PI * 2);
  dectx.fillStyle = 'rgba(255,255,255,0.12)';
  dectx.fill();
  save(dec, 'difficulty-dot-empty.png');
}

// ═══════════════════════════════════════════════════════════
// SIGNAGE VISUAL ELEMENTS
// ═══════════════════════════════════════════════════════════

function generateSignageElements() {
  console.log('Generating signage visual elements...');

  // Helper: rounded rect with fill + optional border
  function glassBox(w, h, r, fill, borderColor, borderWidth = 2) {
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');
    roundedRect(ctx, borderWidth, borderWidth, w - borderWidth * 2, h - borderWidth * 2, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      roundedRect(ctx, borderWidth / 2, borderWidth / 2, w - borderWidth, h - borderWidth, r);
      ctx.stroke();
    }
    return c;
  }

  // ── Full-screen elements ──

  // Featured item box (specials) — 760x120
  save(glassBox(760, 120, 40, 'rgba(0,0,0,0.05)', null), 'signage-featured-box.png');

  // Menu item row (specials) — 790x112 (matches web: padding 28px 36px, border-radius 28px)
  save(glassBox(790, 112, 28, 'rgba(0,0,0,0.05)', null), 'signage-menu-item-bg.png');

  // Deal card (happyhour) — 320x200
  save(glassBox(320, 200, 36, 'rgba(0,0,0,0.05)', null), 'signage-deal-card.png');

  // Prize card (event) — 280x200
  save(glassBox(280, 200, 32, 'rgba(0,0,0,0.05)', null), 'signage-prize-card.png');

  // Promo box (sports) — 700x100
  save(glassBox(700, 100, 32, 'rgba(0,0,0,0.05)', null), 'signage-promo-box.png');

  // Custom item (custom template) — 300x80
  save(glassBox(300, 80, 28, 'rgba(0,0,0,0.05)', null), 'signage-custom-item.png');

  // Gold divider (brand) — 120x6
  {
    const c = createCanvas(120, 6);
    const ctx = c.getContext('2d');
    roundedRect(ctx, 0, 0, 120, 6, 3);
    const g = ctx.createLinearGradient(0, 0, 120, 0);
    g.addColorStop(0, '#f7971e');
    g.addColorStop(0.5, '#ffd200');
    g.addColorStop(1, '#ffe066');
    ctx.fillStyle = g;
    ctx.fill();
    save(c, 'signage-gold-divider.png');
  }

  // Powered by TapTrivia badge — 500x80
  save(glassBox(500, 80, 32, 'rgba(0,0,0,0.45)', 'rgba(255,255,255,0.06)'), 'signage-powered-bg.png');

  // Signage header logo bg — 88x88, gradient fill
  {
    const c = createCanvas(88, 88);
    const ctx = c.getContext('2d');
    roundedRect(ctx, 2, 2, 84, 84, 18);
    const g = ctx.createLinearGradient(0, 0, 88, 88);
    g.addColorStop(0, '#2a1a4e');
    g.addColorStop(1, '#3d2266');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 4;
    roundedRect(ctx, 2, 2, 84, 84, 18);
    ctx.stroke();
    save(c, 'signage-header-logo-bg.png');
  }

  // Brand logo bg (large) — 364x364 (+30%, matches IdleScreen brandLogoBg), same gradient
  {
    const c = createCanvas(364, 364);
    const ctx = c.getContext('2d');
    roundedRect(ctx, 3, 3, 358, 358, 73);
    const g = ctx.createLinearGradient(0, 0, 364, 364);
    g.addColorStop(0, '#2a1a4e');
    g.addColorStop(1, '#3d2266');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 5;
    roundedRect(ctx, 3, 3, 358, 358, 73);
    ctx.stroke();
    save(c, 'signage-brand-logo-bg.png');
  }

  // ── Panel elements ──

  // Panel featured box (specials) — 640x100, amber tint
  {
    const c = createCanvas(640, 100);
    const ctx = c.getContext('2d');
    roundedRect(ctx, 2, 2, 636, 96, 24);
    const g = ctx.createLinearGradient(0, 0, 640, 100);
    g.addColorStop(0, 'rgba(245,158,11,0.12)');
    g.addColorStop(1, 'rgba(245,158,11,0.04)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,158,11,0.15)';
    ctx.lineWidth = 2;
    roundedRect(ctx, 1, 1, 638, 98, 24);
    ctx.stroke();
    save(c, 'signage-panel-featured.png');
  }

  // Panel menu item — 640x72
  save(glassBox(640, 72, 18, 'rgba(0,0,0,0.05)', null), 'signage-panel-menu-item.png');

  // Panel deal card — 300x110 (for 2-column grid layout)
  save(glassBox(300, 110, 24, 'rgba(0,0,0,0.05)', null), 'signage-panel-deal.png');

  // Panel prize row — 560x56 (centered within 640)
  save(glassBox(560, 56, 18, 'rgba(0,0,0,0.05)', null), 'signage-panel-prize.png');

  // Panel promo box — 600x76
  save(glassBox(600, 76, 24, 'rgba(0,0,0,0.05)', null), 'signage-panel-promo.png');

  // Panel custom item — 560x52 (centered within 640)
  save(glassBox(560, 52, 16, 'rgba(0,0,0,0.05)', null), 'signage-panel-custom-item.png');

  // Panel QR badge bg — 640x120
  save(glassBox(640, 120, 22, 'rgba(0,0,0,0.3)', 'rgba(255,255,255,0.05)'), 'signage-panel-qr-bg.png');

  // Panel logo bg — 60x60
  {
    const c = createCanvas(60, 60);
    const ctx = c.getContext('2d');
    roundedRect(ctx, 2, 2, 56, 56, 14);
    const g = ctx.createLinearGradient(0, 0, 60, 60);
    g.addColorStop(0, '#2a1a4e');
    g.addColorStop(1, '#3d2266');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    roundedRect(ctx, 1, 1, 58, 58, 14);
    ctx.stroke();
    save(c, 'signage-panel-logo-bg.png');
  }

  // Brand panel logo bg (medium) — 160x160
  {
    const c = createCanvas(160, 160);
    const ctx = c.getContext('2d');
    roundedRect(ctx, 2, 2, 156, 156, 32);
    const g = ctx.createLinearGradient(0, 0, 160, 160);
    g.addColorStop(0, '#2a1a4e');
    g.addColorStop(1, '#3d2266');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    roundedRect(ctx, 1, 1, 158, 158, 32);
    ctx.stroke();
    save(c, 'signage-panel-brand-logo-bg.png');
  }
}

// ═══════════════════════════════════════════════════════════
// SIGNAGE EMOJI PNGs (common emojis pre-rendered for Roku)
// ═══════════════════════════════════════════════════════════

function generateSignageEmojis() {
  console.log('Generating signage emoji PNGs...');
  // Common emojis used in signage templates
  const emojis = [
    // Drinks
    '🍺', '🍻', '🍸', '🍹', '🍷', '🍾', '🥃', '🧊',
    // Food
    '☕', '🍔', '🍕', '🌮', '🌯', '🍗', '🥩', '🍳',
    '🥗', '🍽️', '🧀', '🥨', '🍟', '🥓',
    // Events & Music
    '🎧', '🎤', '🎵', '🎶', '🎸', '🎹', '🎺', '🎭',
    // More entertainment
    '🎨', '🎬', '🎪', '🎯', '🃏', '🎲', '🎰', '🎮',
    // Sports
    '🏈', '⚽', '🏀', '🏒', '⚾', '🏆', '🥊', '🎱',
    '🏓', '🎳', '🏎️', '🥋', '🏐', '🎣',
    // Celebrate
    '🎉', '🎊', '🥳', '✨', '🔥', '💥', '⭐', '🌟',
    '💫', '🎁', '🎀', '🥂', '🍀',
    // General
    '📢', '📣', '🔔', '💡', '🏷️', '🖤', '👑', '💎',
    '⚡', '🚀', '💬', '📌', '🎗️', 'ℹ️', '🆕', '🆓',
    '💯', '👍',
    // Extra (used in templates, categories, etc.)
    '🧠', '🎟️', '📺', '💰', '🎈', '🏅', '🥇', '🥈', '🥉',
    '🎖️', '🌈', '☀️', '🌙', '⛅', '🍝', '🍲', '🥁', '🎼',
    '💃', '🕺', '🤑', '🗓️', '⏰', '🕐', '📍', '🏠', '❤️',
    '🌈', '🎈', '🪩',
    // Between-game experience
    '👥', '📊', '🌎', '🇺🇸',
  ];

  // Big size (128px for FS, used for big emoji display)
  for (const emoji of emojis) {
    const c = createCanvas(128, 128);
    const ctx = c.getContext('2d');
    ctx.font = '100px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 64 + 4);
    // Use codepoint as filename
    const cp = [...emoji].map(ch => ch.codePointAt(0).toString(16)).join('-');
    save(c, `emoji-lg-${cp}.png`);
  }

  // Medium size (80px for panel emoji display)
  for (const emoji of emojis) {
    const c = createCanvas(80, 80);
    const ctx = c.getContext('2d');
    ctx.font = '64px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 40, 40 + 2);
    const cp = [...emoji].map(ch => ch.codePointAt(0).toString(16)).join('-');
    save(c, `emoji-md-${cp}.png`);
  }

  // Small size (56px for FS menu icons, 48px for custom items)
  for (const emoji of emojis) {
    const c = createCanvas(56, 56);
    const ctx = c.getContext('2d');
    ctx.font = '44px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 28, 28 + 2);
    const cp = [...emoji].map(ch => ch.codePointAt(0).toString(16)).join('-');
    save(c, `emoji-sm-${cp}.png`);
  }

  // Tiny size (36px for panel prize emojis, 32px for panel menu items)
  for (const emoji of emojis) {
    const c = createCanvas(36, 36);
    const ctx = c.getContext('2d');
    ctx.font = '28px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 18, 18 + 1);
    const cp = [...emoji].map(ch => ch.codePointAt(0).toString(16)).join('-');
    save(c, `emoji-xs-${cp}.png`);
  }
}

// ═══════════════════════════════════════════════════════════
// CATEGORY ICONS (emoji → PNG, 176x176 for category splash)
// ═══════════════════════════════════════════════════════════

function generateCategoryIcons() {
  console.log('Generating category icons...');

  const icons = [
    // Original icons
    { key: 'science',       emoji: '🔬' },
    { key: 'history',       emoji: '📜' },
    { key: 'geography',     emoji: '🌍' },
    { key: 'sports',        emoji: '⚽' },
    { key: 'entertainment', emoji: '🎭' },
    { key: 'music',         emoji: '🎵' },
    { key: 'art',           emoji: '🎨' },
    { key: 'literature',    emoji: '📚' },
    { key: 'technology',    emoji: '💻' },
    { key: 'nature',        emoji: '🌿' },
    { key: 'food',          emoji: '🍕' },
    { key: 'movies',        emoji: '🎬' },
    { key: 'tv',            emoji: '📺' },
    { key: 'gaming',        emoji: '🎮' },
    { key: 'animals',       emoji: '🐾' },
    { key: 'math',          emoji: '🔢' },
    { key: 'politics',      emoji: '🏛️' },
    { key: 'space',         emoji: '🚀' },
    { key: 'mythology',     emoji: '⚡' },
    { key: 'language',      emoji: '💬' },
    { key: 'pop culture',   emoji: '🌟' },
    { key: 'nhl',           emoji: '🏒' },
    { key: 'nfl',           emoji: '🏈' },
    { key: 'nba',           emoji: '🏀' },
    { key: 'mlb',           emoji: '⚾' },
    { key: 'soccer',        emoji: '⚽' },
    { key: 'olympics',      emoji: '🏅' },
    { key: 'disney',        emoji: '🏰' },
    { key: 'default',       emoji: '🧠' },
    // New icons for full category coverage
    { key: 'beer',          emoji: '🍺' },
    { key: 'biology',       emoji: '🧬' },
    { key: 'brand',         emoji: '📢' },
    { key: 'chemistry',     emoji: '⚗️' },
    { key: 'building',      emoji: '🏗️' },
    { key: 'fashion',       emoji: '👗' },
    { key: 'holiday',       emoji: '🎄' },
    { key: 'decade',        emoji: '📻' },
    { key: 'medicine',      emoji: '🩺' },
    { key: 'mountain',      emoji: '🏔️' },
    { key: 'ocean',         emoji: '🌊' },
    { key: 'religion',      emoji: '📖' },
    { key: 'theater',       emoji: '🎭' },
    { key: 'crime',         emoji: '🔍' },
    { key: 'government',    emoji: '⚖️' },
    { key: 'park',          emoji: '🏕️' },
    { key: 'weird',         emoji: '🤯' },
    { key: 'travel',        emoji: '✈️' },
    { key: 'business',      emoji: '💼' },
    { key: 'invention',     emoji: '💡' },
    { key: 'earth',         emoji: '🌎' },
    { key: 'weather',       emoji: '🌦️' },
    { key: 'geology',       emoji: '🌋' },
    { key: 'nascar',        emoji: '🏁' },
    { key: 'ncaa',          emoji: '🎓' },
    { key: 'socialmedia',   emoji: '📱' },
    { key: 'roadtrip',      emoji: '🚗' },
    { key: 'wrestling',     emoji: '🥊' },
    { key: 'landmark',      emoji: '📍' },
    { key: 'flag',          emoji: '🗺️' },
    { key: 'celebrity',     emoji: '🌟' },
  ];

  const size = 176;

  for (const { key, emoji } of icons) {
    const c = createCanvas(size, size);
    const ctx = c.getContext('2d');
    // Use Apple Color Emoji font on macOS, or fallback
    ctx.font = `140px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + 4);
    const filename = `cat-${key.replace(/\s+/g, '-')}.png`;
    save(c, filename);
  }

  // Also generate smaller 48x48 versions for pill icons
  console.log('Generating small category icons (48px)...');
  for (const { key, emoji } of icons) {
    const c = createCanvas(48, 48);
    const ctx = c.getContext('2d');
    ctx.font = `36px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 24, 24 + 2);
    const filename = `cat-sm-${key.replace(/\s+/g, '-')}.png`;
    save(c, filename);
  }
}

// ═══════════════════════════════════════════════════════════
// SILENT VIDEO (1x1 black pixel, 1 second)
// Creates a minimal MP4 for screensaver prevention on Roku.
// Falls back to a placeholder note if ffmpeg isn't available.
// ═══════════════════════════════════════════════════════════

function generateSilentVideo() {
  console.log('Generating silent keepalive video...');
  const outPath = path.join(IMAGES_DIR, 'silent.mp4');
  const { execSync } = require('child_process');

  try {
    execSync(
      `ffmpeg -y -f lavfi -i color=c=black:s=2x2:r=1:d=1 -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -c:a aac -b:a 32k -shortest "${outPath}"`,
      { stdio: 'pipe' }
    );
    const size = fs.statSync(outPath).size;
    console.log(`  ✓ silent.mp4 (${size} bytes)`);
  } catch {
    console.log('  ⚠ ffmpeg not found — silent.mp4 skipped');
    console.log('    Install ffmpeg (brew install ffmpeg) and re-run to generate.');
    console.log('    Or manually create a 1-second silent MP4 at images/silent.mp4');
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

/** Avatar circle (white filled) + gold ring overlay */
function generateAvatarCircles() {
  // White filled circle — tinted at runtime via blendColor
  const size = 128;
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  save(c, 'avatar-circle.png');

  // Gold ring overlay (4px stroke)
  const rc = createCanvas(size, size);
  const rctx = rc.getContext('2d');
  const stroke = 4;
  rctx.beginPath();
  rctx.arc(size / 2, size / 2, size / 2 - stroke / 2, 0, Math.PI * 2);
  rctx.strokeStyle = '#ffd200';
  rctx.lineWidth = stroke;
  rctx.stroke();
  save(rc, 'avatar-ring-gold.png');

  console.log('  ✓ Avatar circle + gold ring');
}

async function main() {
  console.log('TapTrivia Roku Asset Generator\n');

  generateBgGradient();
  generateOrbs();
  await generateQRCodes();
  generateTimerRings();
  generateSplashScreen();
  generateChannelPoster();
  generateGlassCards();
  generateSignageBackgrounds();
  generateHeaderFooterFades();
  generateAnswerCards();
  generateLetterBadges();
  generateCategoryPill();
  generateLeaderRowBg();
  generateQrBadgeBg();
  generateCountdownRing();
  generatePodiumBars();
  generateMedals();
  generateSetupAssets();
  generateMiscAssets();
  generateSignageElements();
  generateSignageEmojis();
  generateCategoryIcons();
  generateSilentVideo();
  generateAvatarCircles();

  console.log('\n✅ All assets generated!');
  console.log(`   Output: ${IMAGES_DIR}`);
}

main().catch(console.error);
