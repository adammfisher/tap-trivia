/**
 * Tap Trivia — Scoring Engine
 * Shared across backend, player-app, and tv-app.
 *
 * 1000 points max per question.
 * 8-second read time (5s–13s): full 1000 points.
 * Front-weighted exponential decay (k=3.0) after read time.
 */

const ANSWER_START_MS = 5000;
const READ_TIME_END_MS = 13000;
const ANSWER_END_MS = 50000;
const DECAY_K = 3.0;

function calculatePoints(elapsedMs) {
  if (elapsedMs < ANSWER_START_MS || elapsedMs > ANSWER_END_MS) return 0;

  // READ TIME: 5s–13s → full 1000 points
  if (elapsedMs <= READ_TIME_END_MS) return 1000;

  // After read time: decay from 13s onward
  const decayElapsed = elapsedMs - READ_TIME_END_MS;

  if (decayElapsed < 5000) {
    // TIER 1: 13s–18s (5 seconds). 1000 → 500.
    const t = decayElapsed / 5000;
    return Math.round(500 + 500 * Math.exp(-DECAY_K * t));
  }

  if (decayElapsed < 20000) {
    // TIER 2: 18s–33s (15 seconds). 500 → 250.
    const t = (decayElapsed - 5000) / 15000;
    return Math.round(250 + 250 * Math.exp(-DECAY_K * t));
  }

  if (decayElapsed < 32000) {
    // TIER 3: 33s–45s (12 seconds). 250 → 0.
    const t = (decayElapsed - 20000) / 12000;
    return Math.round(250 * Math.exp(-DECAY_K * t));
  }

  return 0; // 45s–50s: answer revealed, 0 points
}

// UMD export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculatePoints, ANSWER_START_MS, READ_TIME_END_MS, ANSWER_END_MS };
}
