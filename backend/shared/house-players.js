/**
 * Tap Trivia — House Players Module
 * Shared backend module (copied into Lambda dirs by build-lambdas.sh).
 *
 * Injects up to 3 deterministic "house players" into per-bar leaderboards so
 * empty venues never show a dead board. Pure function of
 * (gameId, barCode, houseIndex, questionNumber) — no stored state, no
 * randomness at request time. Every poll, every device, and every endpoint
 * computes byte-identical entries for the same slot + question index, which is
 * what keeps TV and mobile consistent with zero coordination.
 *
 * Rules (spec):
 * - houseCount = max(0, 3 - realPlayerCount): they recede 1:1 as real players join.
 * - A real player always holds rank #1 when any real player is present; house
 *   scores that would exceed the top real score are clamped just below it.
 * - Scores start near 0 at question 1 and accrue across the 15 questions, with
 *   plausible misses; per-question value is capped at 700 (humans earn up to
 *   1000/question, so an engaged human always out-paces them).
 * - Names come from a fixed bank, selected deterministically per venue + game
 *   slot — stable within a game, varied across games and venues.
 * - Every injected entry carries isHouse: true. Clients render it no
 *   differently; the flag exists for tooling/debugging and so any future
 *   aggregation over API responses can exclude house entries. House players
 *   never write to Answers/Players, so all stored-data aggregates (global
 *   leaderboards, weekly standings, analytics) exclude them by construction.
 */

'use strict';

const MAX_HOUSE_PLAYERS = 3;
const HOUSE_MAX_QUESTION_POINTS = 700;
const HOUSE_MIN_HIT_POINTS = 120;
const TOTAL_QUESTIONS = 15;

// Fixed name bank (seeded from the taptrivia-2screen.jsx mockup).
// Extend freely — selection is deterministic over whatever is here.
const HOUSE_NAME_BANK = [
  'Marcus', 'Jen', 'TKitchen', 'Dré', 'Hollis',
  'BoomBox', 'Reggie', 'Tina_M', 'Dax', 'PennyL',
  'Gus', 'Marlo', 'Vee', 'QuizKid', 'Siela'
];

// Same string-hash + LCG used by the deterministic answer shuffle in
// get-question/get-tv-state, so determinism guarantees match across features.
function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

/**
 * Points a house player earned on a single question. 0 on a miss; otherwise
 * 120–700 (the speed-decay band a casual human lands in). Miss probability
 * rises with house index so the three personas play at visibly different
 * strengths.
 */
function houseQuestionPoints(gameId, barCode, houseIndex, questionNumber) {
  const rng = seededRandom(seedFromString(`HOUSE#${gameId}#${barCode}#${houseIndex}#Q${questionNumber}`));
  const missProb = 0.32 + houseIndex * 0.06; // 0.32 / 0.38 / 0.44
  if (rng() < missProb) return 0;
  return HOUSE_MIN_HIT_POINTS + Math.floor(rng() * (HOUSE_MAX_QUESTION_POINTS - HOUSE_MIN_HIT_POINTS + 1));
}

/**
 * Cumulative house score through `completedQuestions` (0..15).
 * Accrual: the board must never show a fully-formed house score mid-game.
 */
function houseCumulativeScore(gameId, barCode, houseIndex, completedQuestions) {
  const through = Math.max(0, Math.min(TOTAL_QUESTIONS, completedQuestions || 0));
  let total = 0;
  for (let q = 1; q <= through; q++) {
    total += houseQuestionPoints(gameId, barCode, houseIndex, q);
  }
  return total;
}

/**
 * Deterministic name picks for this venue + game slot. Skips names that
 * collide (case-insensitively) with real player display names.
 */
function houseNames(gameId, barCode, count, realNames) {
  const rng = seededRandom(seedFromString(`HOUSE#${gameId}#${barCode}#names`));
  const bank = [...HOUSE_NAME_BANK];
  // Fisher-Yates with the seeded rng (deterministic shuffle)
  for (let i = bank.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bank[i], bank[j]] = [bank[j], bank[i]];
  }
  const taken = new Set((realNames || []).map(n => String(n).toLowerCase()));
  const picked = [];
  for (const name of bank) {
    if (picked.length >= count) break;
    if (taken.has(name.toLowerCase())) continue;
    picked.push(name);
  }
  return picked;
}

/**
 * Compute the house entries for a venue + game slot at a given progress point.
 *
 * @param {object} opts
 * @param {string} opts.gameId             game-slot identifier (stable per slot)
 * @param {string} opts.barCode            venue code
 * @param {number} opts.completedQuestions how many questions' scores are on the
 *                                         board (0..15). Callers must pass the
 *                                         same index they expose real scores
 *                                         through (i.e. respect the freeze rule).
 * @param {number} opts.realPlayerCount    distinct real players on the board
 * @param {number|null} opts.topRealScore  highest real score (null if none)
 * @param {string[]} [opts.realNames]      real display names (collision avoidance)
 * @returns {Array<{playerName: string, score: number, isHouse: true}>}
 */
function computeHouseEntries(opts) {
  const { gameId, barCode, completedQuestions, realPlayerCount, topRealScore, realNames } = opts;
  const count = Math.max(0, MAX_HOUSE_PLAYERS - (realPlayerCount || 0));
  if (count === 0 || !gameId || !barCode) return [];

  const names = houseNames(gameId, barCode, count, realNames);
  const entries = names.map((playerName, i) => ({
    playerName,
    score: houseCumulativeScore(gameId, barCode, i, completedQuestions),
    isHouse: true
  }));

  // A real player always holds #1: clamp any house score at/above the top real
  // score to just below it. Per-entry offsets are deterministic and disjoint
  // (base i*45) so clamped entries never tie each other.
  if ((realPlayerCount || 0) > 0 && typeof topRealScore === 'number') {
    entries.forEach((e, i) => {
      if (e.score >= topRealScore) {
        const rng = seededRandom(seedFromString(`HOUSE#${gameId}#${barCode}#${i}#clamp`));
        e.score = Math.max(0, topRealScore - 1 - i * 45 - Math.floor(rng() * 40));
      }
    });
  }

  return entries;
}

/**
 * Merge house entries into an aggregated real-player leaderboard.
 *
 * Takes the real entries (any shape with playerName + score) and returns a new
 * sorted array with ranks recomputed (ties share a rank, exactly like the
 * existing aggregators). On equal scores real players sort ahead of house
 * players, so a real player always holds #1 when present.
 *
 * @param {Array<{playerName: string, score: number}>} realEntries
 * @param {object} opts  { enabled, gameId, barCode, completedQuestions }
 *                       `enabled` is the per-venue toggle value
 *                       (bar.housePlayersEnabled !== false — absent ⇒ enabled).
 */
function injectHousePlayers(realEntries, opts) {
  const real = realEntries || [];
  const house = (!opts || opts.enabled === false) ? [] : computeHouseEntries({
    gameId: opts.gameId,
    barCode: opts.barCode,
    completedQuestions: opts.completedQuestions,
    realPlayerCount: real.length,
    topRealScore: real.length > 0 ? Math.max(...real.map(e => e.score || 0)) : null,
    realNames: real.map(e => e.playerName)
  });

  const merged = [...real, ...house].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.isHouse ? 1 : 0) - (b.isHouse ? 1 : 0); // real ahead of house on ties
  });

  let rank = 0;
  let prevScore = -1;
  for (let i = 0; i < merged.length; i++) {
    if (merged[i].score !== prevScore) {
      rank = i + 1;
      prevScore = merged[i].score;
    }
    merged[i].rank = rank;
  }

  return merged;
}

/** Per-venue toggle accessor — absent ⇒ enabled (fail-open, like adEligible). */
function housePlayersEnabled(bar) {
  return !bar || bar.housePlayersEnabled !== false;
}

module.exports = {
  MAX_HOUSE_PLAYERS,
  HOUSE_MAX_QUESTION_POINTS,
  HOUSE_NAME_BANK,
  computeHouseEntries,
  injectHousePlayers,
  housePlayersEnabled,
  houseQuestionPoints,
  houseCumulativeScore
};
