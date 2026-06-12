#!/usr/bin/env node
/**
 * House players — Phase 1 gate tests.
 * Run: node scripts/test-house-players.js
 *
 * Verifies the spec rules against backend/shared/house-players.js:
 *  1. 0/1/2/3/4 real players → 3/2/1/0/0 house entries
 *  2. A real player holds rank #1 whenever realCount ≥ 1
 *  3. Determinism: same slot + question index → byte-identical entries
 *  4. Accrual: scores climb monotonically 1→15 with misses, per-question ≤ 700
 *  5. Toggle off → zero house entries
 *  6. Names stable within a game, varied across games/venues, no collisions
 */

'use strict';

const path = require('path');
const hp = require(path.join(__dirname, '..', 'backend', 'shared', 'house-players.js'));

let passed = 0;
let failed = 0;

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

const GAME = 'game-2026-06-12-2015';
const BAR = '2EHRT';

function realEntries(n, baseScore) {
  return Array.from({ length: n }, (_, i) => ({
    playerId: `p${i}`,
    playerName: `Real${i}`,
    score: (baseScore || 5000) - i * 700
  }));
}

function opts(extra) {
  return Object.assign({ enabled: true, gameId: GAME, barCode: BAR, completedQuestions: 15 }, extra);
}

// ── 1. House count recedes 1:1 ──────────────────────────────────────────
console.log('\n1. House count 0/1/2/3/4 real → 3/2/1/0/0');
for (const [realCount, expected] of [[0, 3], [1, 2], [2, 1], [3, 0], [4, 0]]) {
  const board = hp.injectHousePlayers(realEntries(realCount), opts());
  const houseCount = board.filter(e => e.isHouse).length;
  check(`${realCount} real → ${expected} house`, houseCount === expected, `got ${houseCount}`);
  check(`${realCount} real → board size ${realCount + expected}`, board.length === realCount + expected);
}

// ── 2. Real player always at #1 ─────────────────────────────────────────
console.log('\n2. Real player holds #1 whenever realCount ≥ 1');
let realTopAlways = true;
let clampObserved = false;
for (let g = 0; g < 200; g++) {
  for (const realCount of [1, 2]) {
    for (const topScore of [0, 50, 300, 1200, 4000]) {
      const real = realEntries(realCount, topScore);
      const board = hp.injectHousePlayers(real, opts({ gameId: `g${g}` }));
      if (board[0].isHouse) {
        realTopAlways = false;
        console.error(`    leader is house: g${g} real=${realCount} top=${topScore}`, board[0]);
      }
      const rawHouse = hp.computeHouseEntries({
        gameId: `g${g}`, barCode: BAR, completedQuestions: 15,
        realPlayerCount: 0, topRealScore: null
      });
      if (rawHouse.some(h => h.score >= topScore)) clampObserved = true;
    }
  }
}
check('real entry at index 0 across 2000 boards', realTopAlways);
check('clamp actually exercised (house would otherwise exceed top real)', clampObserved);

// ── 3. Determinism ──────────────────────────────────────────────────────
console.log('\n3. Determinism: byte-identical across repeated calls');
for (const q of [1, 7, 15]) {
  const a = JSON.stringify(hp.injectHousePlayers(realEntries(1), opts({ completedQuestions: q })));
  const b = JSON.stringify(hp.injectHousePlayers(realEntries(1), opts({ completedQuestions: q })));
  check(`q=${q} identical`, a === b);
}
const tvSide = JSON.stringify(hp.computeHouseEntries({ gameId: GAME, barCode: BAR, completedQuestions: 9, realPlayerCount: 0, topRealScore: null }));
const mobileSide = JSON.stringify(hp.computeHouseEntries({ gameId: GAME, barCode: BAR, completedQuestions: 9, realPlayerCount: 0, topRealScore: null }));
check('same inputs from two callers (TV/mobile) identical', tvSide === mobileSide);

// ── 4. Accrual: monotonic climb, misses, ≤700 per question ──────────────
console.log('\n4. Accrual across questions 1→15');
let monotonic = true;
let withinBand = true;
let missCount = 0;
let startNearZero = true;
for (let g = 0; g < 50; g++) {
  for (let i = 0; i < 3; i++) {
    let prev = 0;
    for (let q = 1; q <= 15; q++) {
      const cum = hp.houseCumulativeScore(`g${g}`, BAR, i, q);
      const delta = cum - prev;
      if (delta < 0) monotonic = false;
      if (delta > 700) withinBand = false;
      if (delta === 0) missCount++;
      prev = cum;
    }
    if (hp.houseCumulativeScore(`g${g}`, BAR, i, 0) !== 0) startNearZero = false;
  }
}
check('cumulative score never decreases', monotonic);
check('per-question gain ≤ 700', withinBand);
check(`misses occur (${missCount} across 2250 player-questions)`, missCount > 100);
check('score is 0 before question 1', startNearZero);

// ── 5. Toggle off → zero house entries ──────────────────────────────────
console.log('\n5. Toggle');
const offBoard = hp.injectHousePlayers(realEntries(0), opts({ enabled: false }));
check('enabled:false with 0 real → empty board', offBoard.length === 0);
const offBoard1 = hp.injectHousePlayers(realEntries(1), opts({ enabled: false }));
check('enabled:false with 1 real → only the real entry', offBoard1.length === 1 && !offBoard1[0].isHouse);
check('housePlayersEnabled: absent field ⇒ enabled', hp.housePlayersEnabled({ barCode: BAR }) === true);
check('housePlayersEnabled: false ⇒ disabled', hp.housePlayersEnabled({ housePlayersEnabled: false }) === false);
check('housePlayersEnabled: true ⇒ enabled', hp.housePlayersEnabled({ housePlayersEnabled: true }) === true);

// ── 6. Names ────────────────────────────────────────────────────────────
console.log('\n6. Names');
const n1 = hp.injectHousePlayers([], opts({ completedQuestions: 3 })).map(e => e.playerName).sort();
const n2 = hp.injectHousePlayers([], opts({ completedQuestions: 12 })).map(e => e.playerName).sort();
check('same game slot → same names at different question indices', JSON.stringify(n1) === JSON.stringify(n2));

const otherGame = hp.injectHousePlayers([], opts({ gameId: 'game-2026-06-12-2030' })).map(e => e.playerName).sort();
const otherBar = hp.injectHousePlayers([], opts({ barCode: 'ZZZZZ' })).map(e => e.playerName).sort();
check('names vary across games or venues',
  JSON.stringify(n1) !== JSON.stringify(otherGame) || JSON.stringify(n1) !== JSON.stringify(otherBar));

const bankNames = new Set(hp.HOUSE_NAME_BANK);
check('all house names come from the bank', n1.every(n => bankNames.has(n)));

const collisionReal = [{ playerId: 'p0', playerName: n1[0], score: 9000 }];
const collisionBoard = hp.injectHousePlayers(collisionReal, opts());
const houseNames = collisionBoard.filter(e => e.isHouse).map(e => e.playerName);
check('house never reuses a real player name', !houseNames.includes(n1[0]));

// ── 7. Rank integrity ───────────────────────────────────────────────────
console.log('\n7. Ranks');
const board = hp.injectHousePlayers(realEntries(1, 800), opts());
const sortedOk = board.every((e, i) => i === 0 || board[i - 1].score >= e.score);
check('board sorted descending', sortedOk);
check('ranks start at 1', board[0].rank === 1);
const tieBoard = hp.injectHousePlayers(
  [{ playerId: 'a', playerName: 'A', score: 0 }],
  opts({ completedQuestions: 0 })
);
check('all-zero tie: real entry listed first', !tieBoard[0].isHouse);

// ── Summary ─────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
