/**
 * Scoring Engine — TypeScript port of backend/shared/scoring.js
 * MUST stay in sync with backend + player-app + tv-app.
 *
 * 1000 points max per question.
 * 8-second read time (3s-11s): full 1000 points.
 * Speed bump (11s-15s): 1000->800 (fast linear drop).
 * Linear decay (15s-31s): 800->0 (steady 50 pts/sec).
 */

const ANSWER_START_MS = 3000;
const READ_TIME_END_MS = 11000;
const SPEED_BUMP_END_MS = 15000;
const REVEAL_START_MS = 31000;
const ANSWER_END_MS = 37000;

export function calculatePoints(elapsedMs: number): number {
  if (elapsedMs < ANSWER_START_MS || elapsedMs > ANSWER_END_MS) return 0;
  if (elapsedMs <= READ_TIME_END_MS) return 1000;
  if (elapsedMs <= SPEED_BUMP_END_MS) {
    const t = (elapsedMs - READ_TIME_END_MS) / (SPEED_BUMP_END_MS - READ_TIME_END_MS);
    return Math.round(1000 - 200 * t);
  }
  if (elapsedMs <= REVEAL_START_MS) {
    const t = (elapsedMs - SPEED_BUMP_END_MS) / (REVEAL_START_MS - SPEED_BUMP_END_MS);
    return Math.round(800 * (1 - t));
  }
  return 0;
}

export { ANSWER_START_MS, READ_TIME_END_MS, ANSWER_END_MS, REVEAL_START_MS };
