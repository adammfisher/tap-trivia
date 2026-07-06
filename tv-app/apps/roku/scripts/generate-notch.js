// Generates the next-game countdown pill assets:
//   next-pill-bg.png  — a "notch" tab: flat top edge, rounded bottom corners,
//                        dark glass fill + subtle border (matches web .tt-next-pill)
//   next-pill-dot.png — a small green status dot with glow
// Rendered at 2x for crispness (Roku Posters scale down cleanly).
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
function save(canvas, filename) {
  fs.writeFileSync(path.join(IMAGES_DIR, filename), canvas.toBuffer('image/png'));
  console.log('  saved', filename);
}

// ── Notch background ───────────────────────────────────────────────
// Display size 620x96; render at 2x.
const S = 2;
const W = 620 * S, H = 96 * S, R = 30 * S, B = 2 * S;
const c = createCanvas(W, H);
const ctx = c.getContext('2d');

function notchPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x, y);                                   // top-left (flat top)
  ctx.lineTo(x + w, y);                                // top-right
  ctx.lineTo(x + w, y + h - r);                        // down right side
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);// bottom-right round
  ctx.lineTo(x + r, y + h);                            // bottom edge
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);        // bottom-left round
  ctx.closePath();
}

// Fill
notchPath(0, 0, W, H, R);
ctx.fillStyle = 'rgba(15, 3, 38, 0.95)';
ctx.fill();

// Border (left / right / bottom only — top edge stays flush)
notchPath(B / 2, 0, W - B, H - B / 2, R);
ctx.lineWidth = B;
ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
ctx.stroke();

save(c, 'next-pill-bg.png');

// ── Green status dot (with glow) ───────────────────────────────────
const DS = 36 * S;
const d = createCanvas(DS, DS);
const dctx = d.getContext('2d');
const cx = DS / 2, cy = DS / 2, rad = 9 * S;
// glow
const g = dctx.createRadialGradient(cx, cy, 0, cx, cy, DS / 2);
g.addColorStop(0, 'rgba(0, 212, 170, 0.9)');
g.addColorStop(0.5, 'rgba(0, 212, 170, 0.25)');
g.addColorStop(1, 'rgba(0, 212, 170, 0)');
dctx.fillStyle = g;
dctx.fillRect(0, 0, DS, DS);
// solid core
dctx.beginPath();
dctx.arc(cx, cy, rad, 0, Math.PI * 2);
dctx.fillStyle = '#00d4aa';
dctx.fill();
save(d, 'next-pill-dot.png');

console.log('Done.');
