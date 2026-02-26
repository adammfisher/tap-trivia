#!/usr/bin/env node
/**
 * Generate TapTrivia app icon, splash screen, and adaptive icon.
 * Uses sharp to compose SVG elements into PNG files.
 *
 * Usage: node scripts/generate-app-assets.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, '..', 'TapTrivia', 'assets');
const BG = '#0D0D0F';
const CYAN = '#00E5FF';
const WHITE = '#FFFFFF';

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

/**
 * Bold, modern question mark with a "tap ripple" dot.
 * Designed on a 512x512 viewBox; caller scales via sharp.
 *
 * The "?" curve is hand-tuned to be thick, rounded, and legible at 29px (iOS
 * smallest icon render). The dot at the bottom has two concentric rings to
 * suggest a finger-tap ripple.
 */
function questionMarkSVG(size, color = CYAN) {
  // The question mark is drawn centered in a 512x512 viewBox.
  // It consists of:
  //   1) A thick "?" stroke path
  //   2) A solid dot with two ripple rings
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#00B8D4"/>
    </linearGradient>
  </defs>

  <!-- Question mark curve -->
  <path d="
    M 210 135
    C 210 90, 260 62, 300 62
    C 345 62, 378 95, 378 140
    C 378 185, 345 210, 310 235
    C 285 252, 270 270, 270 305
    L 270 330
  " fill="none" stroke="url(#qGrad)" stroke-width="52" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>

  <!-- Tap dot -->
  <circle cx="270" cy="410" r="32" fill="url(#qGrad)" filter="url(#glow)"/>

  <!-- Ripple ring 1 -->
  <circle cx="270" cy="410" r="52" fill="none" stroke="${color}" stroke-width="3" opacity="0.4"/>

  <!-- Ripple ring 2 -->
  <circle cx="270" cy="410" r="72" fill="none" stroke="${color}" stroke-width="2" opacity="0.2"/>
</svg>`;
}

/**
 * "TapTrivia" wordmark for the splash screen.
 * Uses system sans-serif fallback (the final rendered font won't match Fredoka
 * exactly, but sharp/librsvg don't support custom web fonts). We approximate
 * the feel with bold weight and letter-spacing.
 */
function wordmarkSVG(width, color = WHITE) {
  const fontSize = Math.round(width * 0.075);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(fontSize * 2.5)}" viewBox="0 0 ${width} ${Math.round(fontSize * 2.5)}">
  <text
    x="50%"
    y="55%"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="'Fredoka', 'Rounded Mplus 1c', 'Nunito', 'SF Pro Rounded', 'Helvetica Neue', sans-serif"
    font-weight="700"
    font-size="${fontSize}"
    letter-spacing="${Math.round(fontSize * 0.06)}"
    fill="${color}"
  >TapTrivia</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Asset generators
// ---------------------------------------------------------------------------

async function generateIcon() {
  const SIZE = 1024;
  const MARK = 680; // question mark size within icon

  const bg = sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BG },
  }).png();

  const markBuf = Buffer.from(questionMarkSVG(MARK));

  const result = await bg
    .composite([
      {
        input: markBuf,
        top: Math.round((SIZE - MARK) / 2),
        left: Math.round((SIZE - MARK) / 2),
      },
    ])
    .png()
    .toBuffer();

  const outPath = path.join(ASSETS_DIR, 'icon.png');
  fs.writeFileSync(outPath, result);
  console.log(`✓ icon.png (${SIZE}x${SIZE})`);
}

async function generateAdaptiveIcon() {
  const SIZE = 1024;
  // Android safe zone is center 66%, so the mark should be ~66% of 1024 ≈ 676
  // Add a bit more padding to be safe: use 580
  const MARK = 520;

  const bg = sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BG },
  }).png();

  const markBuf = Buffer.from(questionMarkSVG(MARK));

  const result = await bg
    .composite([
      {
        input: markBuf,
        top: Math.round((SIZE - MARK) / 2),
        left: Math.round((SIZE - MARK) / 2),
      },
    ])
    .png()
    .toBuffer();

  const outPath = path.join(ASSETS_DIR, 'adaptive-icon.png');
  fs.writeFileSync(outPath, result);
  console.log(`✓ adaptive-icon.png (${SIZE}x${SIZE})`);
}

async function generateSplash() {
  const WIDTH = 1284;
  const HEIGHT = 2778;
  const MARK = 420;
  const MARK_Y_OFFSET = -180; // shift mark above center

  const bg = sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: BG },
  }).png();

  const markBuf = Buffer.from(questionMarkSVG(MARK));
  const wordBuf = Buffer.from(wordmarkSVG(WIDTH, WHITE));

  // Get wordmark dimensions for positioning
  const wordMeta = await sharp(wordBuf).metadata();
  const wordH = wordMeta.height || 160;

  const markTop = Math.round(HEIGHT / 2 - MARK / 2 + MARK_Y_OFFSET);
  const wordTop = markTop + MARK + 40; // 40px gap below mark

  const result = await bg
    .composite([
      {
        input: markBuf,
        top: markTop,
        left: Math.round((WIDTH - MARK) / 2),
      },
      {
        input: wordBuf,
        top: wordTop,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  const outPath = path.join(ASSETS_DIR, 'splash.png');
  fs.writeFileSync(outPath, result);
  console.log(`✓ splash.png (${WIDTH}x${HEIGHT})`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  console.log('Generating TapTrivia app assets...\n');
  await Promise.all([generateIcon(), generateAdaptiveIcon(), generateSplash()]);
  console.log('\nDone! Assets written to TapTrivia/assets/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
