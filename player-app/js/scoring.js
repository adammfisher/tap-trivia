/**
 * Tap Trivia — Scoring Engine
 * Shared across backend, player-app, and tv-app.
 *
 * 1000 points max per question.
 * 8-second read time (5s–13s): full 1000 points.
 * Speed bump (13s–16s): 1000→800 (fast linear drop).
 * Linear decay (16s–44s): 800→0 (steady ~28.6 pts/sec).
 */

const ANSWER_START_MS = 5000;
const READ_TIME_END_MS = 13000;
const ANSWER_END_MS = 49000;
const SPEED_BUMP_END_MS = 16000;
const REVEAL_START_MS = 44000;

function calculatePoints(elapsedMs) {
  if (elapsedMs < ANSWER_START_MS || elapsedMs > ANSWER_END_MS) return 0;

  // READ TIME: 5s–13s → full 1000 points
  if (elapsedMs <= READ_TIME_END_MS) return 1000;

  // SPEED BUMP: 13s–16s (3 seconds). 1000 → 800.
  if (elapsedMs <= SPEED_BUMP_END_MS) {
    const t = (elapsedMs - READ_TIME_END_MS) / (SPEED_BUMP_END_MS - READ_TIME_END_MS);
    return Math.round(1000 - 200 * t);
  }

  // LINEAR: 16s–44s (28 seconds). 800 → 0.
  if (elapsedMs <= REVEAL_START_MS) {
    const t = (elapsedMs - SPEED_BUMP_END_MS) / (REVEAL_START_MS - SPEED_BUMP_END_MS);
    return Math.round(800 * (1 - t));
  }

  return 0; // 44s–49s: answer revealed, 0 points
}

// UMD export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculatePoints, ANSWER_START_MS, READ_TIME_END_MS, ANSWER_END_MS };
}
