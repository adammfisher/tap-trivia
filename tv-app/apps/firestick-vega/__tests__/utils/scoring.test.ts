/**
 * Scoring tests for Fire TV Vega app.
 * Fire TV scoring differs from mobile/tvOS:
 *   ANSWER_START_MS  = 4000
 *   READ_TIME_END_MS = 13000  (full 1000pts up to here)
 *   SPEED_BUMP_END_MS = 17000 (1000→800 linear, over 4000ms)
 *   REVEAL_START_MS  = 39000  (800→0 linear decay over 22000ms, ~36.4 pts/sec)
 *   ANSWER_END_MS    = 45000
 */

import { calculatePoints, ANSWER_START_MS, READ_TIME_END_MS, ANSWER_END_MS, REVEAL_START_MS } from '../../src/utils/scoring';

// ─────────────────────────────────────────────────────────────────────────────
// Exported constant sanity-checks
// ─────────────────────────────────────────────────────────────────────────────
describe('scoring constants (Fire TV)', () => {
  it('ANSWER_START_MS = 4000', () => expect(ANSWER_START_MS).toBe(4000));
  it('READ_TIME_END_MS = 13000', () => expect(READ_TIME_END_MS).toBe(13000));
  it('ANSWER_END_MS = 45000', () => expect(ANSWER_END_MS).toBe(45000));
  it('REVEAL_START_MS = 39000', () => expect(REVEAL_START_MS).toBe(39000));
});

// ─────────────────────────────────────────────────────────────────────────────
// calculatePoints: specific values
// ─────────────────────────────────────────────────────────────────────────────
describe('calculatePoints', () => {
  // Before answer window
  it('0ms → 0 (before ANSWER_START)', () => {
    expect(calculatePoints(0)).toBe(0);
  });

  it('3999ms → 0 (one ms before ANSWER_START)', () => {
    expect(calculatePoints(3999)).toBe(0);
  });

  // Answer window opens — full points during read time
  it('4000ms → 1000 (ANSWER_START, full read-time points)', () => {
    expect(calculatePoints(4000)).toBe(1000);
  });

  it('8500ms → 1000 (mid read time, still full)', () => {
    expect(calculatePoints(8500)).toBe(1000);
  });

  it('13000ms → 1000 (exactly READ_TIME_END, still full)', () => {
    expect(calculatePoints(13000)).toBe(1000);
  });

  // Speed bump: 13000–17000ms, 1000→800 linear
  it('15000ms → 900 (mid speed bump: t=0.5, 1000-200*0.5=900)', () => {
    // t = (15000-13000)/(17000-13000) = 2000/4000 = 0.5
    // result = round(1000 - 200*0.5) = round(900) = 900
    expect(calculatePoints(15000)).toBe(900);
  });

  it('17000ms → 800 (end of speed bump: t=1.0, 1000-200=800)', () => {
    expect(calculatePoints(17000)).toBe(800);
  });

  it('13001ms → 1000 (just entered speed bump, rounds to 1000)', () => {
    // t = 1/4000 = 0.00025, result = round(1000 - 200*0.00025) = round(999.95) = 1000
    expect(calculatePoints(13001)).toBe(1000);
  });

  // Linear decay: 17000–39000ms, 800→0
  it('28000ms → 400 (mid decay: t=0.5, 800*0.5=400)', () => {
    // t = (28000-17000)/(39000-17000) = 11000/22000 = 0.5
    // result = round(800*(1-0.5)) = round(400) = 400
    expect(calculatePoints(28000)).toBe(400);
  });

  it('39000ms → 0 (end of decay: t=1.0, 800*(1-1)=0)', () => {
    expect(calculatePoints(39000)).toBe(0);
  });

  it('17001ms → 800 (just entered decay, rounds to 800)', () => {
    // t = 1/22000 ≈ 0.0000454, result = round(800*(1-0.0000454)) ≈ round(799.96) = 800
    expect(calculatePoints(17001)).toBe(800);
  });

  // At / past answer end boundary
  it('45000ms → 0 (at ANSWER_END boundary, treated as > ANSWER_END in implementation)', () => {
    // Source uses `elapsedMs > ANSWER_END_MS` for the first guard, so 45000 is NOT > 45000
    // but it falls through: 45000 > REVEAL_START_MS (39000), returns 0
    expect(calculatePoints(45000)).toBe(0);
  });

  it('45001ms → 0 (past ANSWER_END)', () => {
    expect(calculatePoints(45001)).toBe(0);
  });

  it('100000ms → 0 (far past game)', () => {
    expect(calculatePoints(100000)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Monotonicity: points never increase as time progresses from 4000ms to 45000ms
// ─────────────────────────────────────────────────────────────────────────────
describe('calculatePoints: monotonically non-increasing from 4000ms to 45000ms', () => {
  it('each 100ms step produces equal or fewer points than the previous', () => {
    let prev = calculatePoints(4000);
    for (let ms = 4100; ms <= 45000; ms += 100) {
      const curr = calculatePoints(ms);
      expect(curr).toBeLessThanOrEqual(prev);
      prev = curr;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boundary points: 0 before window, max inside, 0 at end
// ─────────────────────────────────────────────────────────────────────────────
describe('calculatePoints: window boundaries', () => {
  it('max points is 1000 (at ANSWER_START)', () => {
    expect(calculatePoints(ANSWER_START_MS)).toBe(1000);
  });

  it('points drop to 0 at REVEAL_START', () => {
    expect(calculatePoints(REVEAL_START_MS)).toBe(0);
  });

  it('points are positive well before REVEAL_START (38500ms)', () => {
    // At 38999ms integer rounding brings it to 0; use 38500ms (returns 18) instead
    expect(calculatePoints(38500)).toBeGreaterThan(0);
  });
});
