import { calculatePoints } from '../../src/utils/scoring';

describe('calculatePoints', () => {
  // Before answer window
  test('returns 0 at 0ms (before answer start)', () => {
    expect(calculatePoints(0)).toBe(0);
  });

  test('returns 0 at 2999ms (just before answer start)', () => {
    expect(calculatePoints(2999)).toBe(0);
  });

  // Full points window (3000–11000ms)
  test('returns 1000 at 3000ms (answer start)', () => {
    expect(calculatePoints(3000)).toBe(1000);
  });

  test('returns 1000 at 7000ms (mid read time)', () => {
    expect(calculatePoints(7000)).toBe(1000);
  });

  test('returns 1000 at 11000ms (end of read time)', () => {
    expect(calculatePoints(11000)).toBe(1000);
  });

  // Speed bump (11000–15000ms): 1000→800
  test('returns 900 at 13000ms (mid speed bump: t=0.5, 1000-200*0.5=900)', () => {
    // t = (13000-11000)/(15000-11000) = 2000/4000 = 0.5
    // points = round(1000 - 200*0.5) = round(900) = 900
    expect(calculatePoints(13000)).toBe(900);
  });

  test('returns 800 at 15000ms (end of speed bump: t=1.0, 1000-200=800)', () => {
    expect(calculatePoints(15000)).toBe(800);
  });

  // Linear decay (15000–31000ms): 800→0
  test('returns 400 at 23000ms (mid decay: t=0.5, 800*0.5=400)', () => {
    // t = (23000-15000)/(31000-15000) = 8000/16000 = 0.5
    // points = round(800*(1-0.5)) = round(400) = 400
    expect(calculatePoints(23000)).toBe(400);
  });

  test('returns 0 at 31000ms (end of decay: t=1.0, 800*0=0)', () => {
    expect(calculatePoints(31000)).toBe(0);
  });

  // Past reveal
  test('returns 0 at 31001ms (just past reveal start)', () => {
    expect(calculatePoints(31001)).toBe(0);
  });

  test('returns 0 at 37000ms (at answer end)', () => {
    expect(calculatePoints(37000)).toBe(0);
  });

  test('returns 0 at 37001ms (past answer end)', () => {
    expect(calculatePoints(37001)).toBe(0);
  });

  test('returns 0 at 100000ms (far past game)', () => {
    expect(calculatePoints(100000)).toBe(0);
  });

  // Edge cases in speed bump
  test('returns 1000 at 11001ms (just entered speed bump, t~0)', () => {
    // t = 1/4000 = 0.00025
    // points = round(1000 - 200*0.00025) = round(999.95) = 1000
    expect(calculatePoints(11001)).toBe(1000);
  });

  test('returns 950 at 12000ms (speed bump t=0.25)', () => {
    // t = (12000-11000)/4000 = 0.25
    // points = round(1000 - 200*0.25) = round(950) = 950
    expect(calculatePoints(12000)).toBe(950);
  });

  // Monotonically non-increasing from 3000 to 37000
  test('is monotonically non-increasing from 3000ms to 37000ms', () => {
    const samples = [3000, 5000, 8000, 11000, 13000, 15000, 20000, 25000, 31000, 37000];
    for (let i = 1; i < samples.length; i++) {
      const prev = calculatePoints(samples[i - 1]);
      const curr = calculatePoints(samples[i]);
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });

  // Spot check decay values
  test('returns 800 at 15001ms (just entered decay, near 800)', () => {
    // t = 1/16000 ≈ 0.0000625
    // points = round(800*(1-0.0000625)) = round(799.95) = 800
    expect(calculatePoints(15001)).toBe(800);
  });

  test('returns 200 at 27000ms (decay t=0.75)', () => {
    // t = (27000-15000)/16000 = 12000/16000 = 0.75
    // points = round(800*(1-0.75)) = round(200) = 200
    expect(calculatePoints(27000)).toBe(200);
  });
});
