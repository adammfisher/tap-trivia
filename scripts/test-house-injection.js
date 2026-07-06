#!/usr/bin/env node
/**
 * House players — handler-level integration test (no AWS calls).
 * Run: bash scripts/build-lambdas.sh && node scripts/test-house-injection.js
 *
 * Mocks ./shared/dynamo inside the built get-leaderboard Lambda dir via the
 * require cache, then invokes the real handler and asserts house entries
 * appear/disappear with the venue toggle, deterministic across calls.
 */

'use strict';

const path = require('path');

const FN_DIR = path.join(__dirname, '..', 'backend', 'functions', 'get-leaderboard');
const DYNAMO_PATH = require.resolve(path.join(FN_DIR, 'shared', 'dynamo.js'));

const GAME_ID = 'g-test-1';
const BAR_CODE = '2EHRT';

// Game started 16 questions ago → post_game (15 × 52s = 780s)
const GAME_START = Date.now() - 16 * 52000;

let barRecord = { PK: `BAR#${BAR_CODE}`, barCode: BAR_CODE, barName: 'Two Buck Saloon', status: 'active' };
let answerRecords = [];

const fakeDynamo = {
  TABLE: {
    GAMES: 'Games', QUESTIONS: 'Questions', QUESTION_USAGE: 'QU', ANSWERS: 'Answers',
    PLAYERS: 'Players', BARS: 'Bars', GAME_STATS: 'GS', SESSIONS: 'Sessions', FEEDBACK: 'FB'
  },
  async get(table, key) {
    if (table === 'Bars' && key.PK === `BAR#${BAR_CODE}`) return barRecord;
    return null;
  },
  async query(table, params) {
    if (table === 'Answers') return answerRecords;
    if (table === 'Games') return [{ gameId: GAME_ID, startTimeEpoch: GAME_START }];
    return [];
  },
  async put() {}, async update() {}, async scan() { return []; }
};

// Pre-seed the require cache so the handler's `require('./shared/dynamo')`
// resolves to the mock.
require.cache[DYNAMO_PATH] = { id: DYNAMO_PATH, filename: DYNAMO_PATH, loaded: true, exports: fakeDynamo };

const { handler } = require(path.join(FN_DIR, 'index.js'));

function event() {
  return {
    pathParameters: { gameId: GAME_ID },
    queryStringParameters: { type: 'bar', barCode: BAR_CODE },
    headers: {}
  };
}

function answersFor(n) {
  const out = [];
  for (let p = 0; p < n; p++) {
    for (let q = 1; q <= 15; q++) {
      out.push({
        playerId: `p${p}`, playerName: `Real${p}`, barCode: BAR_CODE,
        questionNumber: q, pointsAwarded: 500 - p * 50
      });
    }
  }
  return out;
}

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

(async () => {
  console.log('\nget-leaderboard handler (mocked dynamo)');

  // 0 real players, toggle default (absent) → 3 house
  answerRecords = [];
  barRecord = { PK: `BAR#${BAR_CODE}`, barCode: BAR_CODE, barName: 'Two Buck Saloon', status: 'active' };
  let res = JSON.parse((await handler(event())).body);
  check('0 real, toggle absent → 3 house leaders', res.leaders.length === 3 && res.leaders.every(l => l.isHouse));
  check('totalPlayers includes house', res.totalPlayers === 3);
  check('house scores > 0 for a completed game', res.leaders.every(l => l.score > 0));

  const again = JSON.parse((await handler(event())).body);
  check('byte-identical on repeated poll', JSON.stringify(res.leaders) === JSON.stringify(again.leaders));

  // 2 real players → 1 house, real at #1
  answerRecords = answersFor(2);
  res = JSON.parse((await handler(event())).body);
  const houseEntries = res.leaders.filter(l => l.isHouse);
  check('2 real → 1 house', houseEntries.length === 1, JSON.stringify(res.leaders));
  check('real player at rank 1', res.leaders[0].rank === 1 && !res.leaders[0].isHouse);
  check('house below top real score', houseEntries.every(h => h.score < res.leaders[0].score));

  // 3 real players → 0 house
  answerRecords = answersFor(3);
  res = JSON.parse((await handler(event())).body);
  check('3 real → 0 house', res.leaders.every(l => !l.isHouse));

  // Toggle off → no house even with 0 real
  answerRecords = [];
  barRecord = { ...barRecord, housePlayersEnabled: false };
  res = JSON.parse((await handler(event())).body);
  check('toggle off → zero house entries', res.leaders.length === 0 && res.totalPlayers === 0);

  // Toggle back on → house returns, same entries as before (deterministic)
  barRecord = { ...barRecord, housePlayersEnabled: true };
  res = JSON.parse((await handler(event())).body);
  check('toggle on → house returns deterministically',
    JSON.stringify(res.leaders) === JSON.stringify(again.leaders));

  // type=global must never include house (cross-venue exclusion)
  const globalEvent = { pathParameters: { gameId: GAME_ID }, queryStringParameters: { type: 'global' }, headers: {} };
  answerRecords = answersFor(1);
  const globalRes = JSON.parse((await handler(globalEvent)).body);
  check('global leaderboard has zero house entries', (globalRes.leaders || []).every(l => !l.isHouse));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
