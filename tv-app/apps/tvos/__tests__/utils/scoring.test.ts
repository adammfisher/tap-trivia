import { calculatePoints } from '../../src/utils/scoring';

describe('calculatePoints — boundary conditions', () => {
  test('0ms → 0 (before answer window)', () => {
    expect(calculatePoints(0)).toBe(0);
  });

  test('2999ms → 0 (just before answer start)', () => {
    expect(calculatePoints(2999)).toBe(0);
  });

  test('3000ms → 1000 (answer start = full points)', () => {
    expect(calculatePoints(3000)).toBe(1000);
  });

  test('7000ms → 1000 (mid read time = still full)', () => {
    expect(calculatePoints(7000)).toBe(1000);
  });

  test('11000ms → 1000 (end of read time = still full)', () => {
    expect(calculatePoints(11000)).toBe(1000);
  });

  test('13000ms → 900 (speed bump midpoint)', () => {
    // t = (13000 - 11000) / (15000 - 11000) = 2000/4000 = 0.5
    // points = round(1000 - 200 * 0.5) = round(900) = 900
    expect(calculatePoints(13000)).toBe(900);
  });

  test('15000ms → 800 (end of speed bump)', () => {
    // t = (15000 - 11000) / (15000 - 11000) = 1.0
    // points = round(1000 - 200 * 1.0) = 800
    expect(calculatePoints(15000)).toBe(800);
  });

  test('23000ms → 400 (mid of linear decay)', () => {
    // t = (23000 - 15000) / (31000 - 15000) = 8000/16000 = 0.5
    // points = round(800 * (1 - 0.5)) = round(400) = 400
    expect(calculatePoints(23000)).toBe(400);
  });

  test('31000ms → 0 (reveal start = decay complete)', () => {
    // t = (31000 - 15000) / (31000 - 15000) = 1.0
    // points = round(800 * 0) = 0
    expect(calculatePoints(31000)).toBe(0);
  });

  test('31001ms → 0 (just past reveal start)', () => {
    expect(calculatePoints(31001)).toBe(0);
  });

  test('37000ms → 0 (answer end boundary)', () => {
    // elapsedMs > ANSWER_END_MS (37000) returns 0 — at 37000 it's exactly equal,
    // which is > ANSWER_END_MS is false, but also not in any scoring range
    // The source: if > ANSWER_END_MS return 0; elapsedMs 37000 lands in the
    // final else branch which returns 0 after reveal check
    expect(calculatePoints(37000)).toBe(0);
  });

  test('37001ms → 0 (past answer end)', () => {
    expect(calculatePoints(37001)).toBe(0);
  });

  test('50000ms → 0 (deep in scores phase)', () => {
    expect(calculatePoints(50000)).toBe(0);
  });
});

describe('calculatePoints — speed bump range', () => {
  test('11001ms → slightly below 1000', () => {
    // t = 1/4000 = 0.00025; round(1000 - 200*0.00025) = round(999.95) = 1000
    expect(calculatePoints(11001)).toBe(1000);
  });

  test('11500ms → 975', () => {
    // t = 500/4000 = 0.125; round(1000 - 200*0.125) = round(975) = 975
    expect(calculatePoints(11500)).toBe(975);
  });

  test('14999ms → 800 at last ms of speed bump', () => {
    // t = (14999 - 11000) / 4000 = 3999/4000 = 0.999975
    // round(1000 - 200*0.999975) = round(800.005) = 800
    expect(calculatePoints(14999)).toBe(800);
  });
});

describe('calculatePoints — linear decay range', () => {
  test('15001ms → just below 800', () => {
    // t = 1/16000; round(800 * (1 - 1/16000)) = round(799.95) = 800
    expect(calculatePoints(15001)).toBe(800);
  });

  test('19000ms → 600', () => {
    // t = (19000 - 15000) / 16000 = 4000/16000 = 0.25
    // round(800 * 0.75) = 600
    expect(calculatePoints(19000)).toBe(600);
  });

  test('27000ms → 200', () => {
    // t = (27000 - 15000) / 16000 = 12000/16000 = 0.75
    // round(800 * 0.25) = 200
    expect(calculatePoints(27000)).toBe(200);
  });
});

describe('calculatePoints — monotonically non-increasing from 3000ms to 37000ms', () => {
  test('points never increase over time in answer window', () => {
    const samples = [
      3000, 5000, 7000, 9000, 11000, 12000, 13000, 14000, 15000,
      17000, 19000, 21000, 23000, 25000, 27000, 29000, 31000, 33000, 35000, 37000,
    ];
    for (let i = 1; i < samples.length; i++) {
      const prev = calculatePoints(samples[i - 1]);
      const curr = calculatePoints(samples[i]);
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });
});

describe('calculatePoints — negative / extreme inputs', () => {
  test('-1ms → 0', () => {
    expect(calculatePoints(-1)).toBe(0);
  });

  test('100000ms → 0', () => {
    expect(calculatePoints(100000)).toBe(0);
  });
});
