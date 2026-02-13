/**
 * Tap Trivia — Scoring Engine
 * Shared across backend, player-app, and tv-app.
 *
 * 1000 points max per question.
 * 9-second read time (5s–14s): full 1000 points.
 * Speed bump (14s–17s): 1000→800 (fast linear drop).
 * Linear decay (17s–45s): 800→0 (steady ~28.6 pts/sec).
 */

const ANSWER_START_MS = 5000;
const READ_TIME_END_MS = 14000;
const ANSWER_END_MS = 50000;
const SPEED_BUMP_END_MS = 17000;
const REVEAL_START_MS = 45000;

function calculatePoints(elapsedMs) {
  if (elapsedMs < ANSWER_START_MS || elapsedMs > ANSWER_END_MS) return 0;

  // READ TIME: 5s–14s → full 1000 points
  if (elapsedMs <= READ_TIME_END_MS) return 1000;

  // SPEED BUMP: 14s–17s (3 seconds). 1000 → 800.
  if (elapsedMs <= SPEED_BUMP_END_MS) {
    const t = (elapsedMs - READ_TIME_END_MS) / (SPEED_BUMP_END_MS - READ_TIME_END_MS);
    return Math.round(1000 - 200 * t);
  }

  // LINEAR: 17s–45s (28 seconds). 800 → 0.
  if (elapsedMs <= REVEAL_START_MS) {
    const t = (elapsedMs - SPEED_BUMP_END_MS) / (REVEAL_START_MS - SPEED_BUMP_END_MS);
    return Math.round(800 * (1 - t));
  }

  return 0; // 45s–50s: answer revealed, 0 points
}

// UMD export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculatePoints, ANSWER_START_MS, READ_TIME_END_MS, ANSWER_END_MS };
}
