#!/usr/bin/env node
// Generate app icons for Samsung Tizen and LG webOS
// Samsung: 512x512 icon.png
// LG: 80x80 icon.png + 130x130 largeIcon.png

const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background: dark gradient matching app aesthetic
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#1e0f4a');
  grad.addColorStop(0.5, '#3d1866');
  grad.addColorStop(1, '#6b2358');
  ctx.fillStyle = grad;

  // Rounded rect background
  const r = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.fill();

  // "TT" text
  ctx.fillStyle = '#ffd200';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(size * 0.45)}px sans-serif`;
  ctx.fillText('TT', size / 2, size / 2);

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buf);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

// Samsung Tizen icon
const samsungDir = path.resolve(__dirname, '..');
generateIcon(512, path.join(samsungDir, 'icon.png'));

// LG webOS icons
const lgDir = path.resolve(__dirname, '../../lg-webos');
generateIcon(80, path.join(lgDir, 'icon.png'));
generateIcon(130, path.join(lgDir, 'largeIcon.png'));

console.log('Done!');
