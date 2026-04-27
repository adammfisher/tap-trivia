/**
 * Tap Trivia — Game Clock Module
 * Shared across backend, player-app, and tv-app. SINGLE SOURCE OF TRUTH.
 *
 * Determines game state (phase, question number, hints, points)
 * from a game's start epoch and the current time.
 */

const QUESTION_DURATION_MS = 52000;
const TOTAL_QUESTIONS = 15;
const GAME_DURATION_MS = TOTAL_QUESTIONS * QUESTION_DURATION_MS;
const RESULTS_DURATION_MS = 120000;
const BREAK_DURATION_MS = 120000;

const PHASES = {
  CATEGORY_SPLASH: { start: 0,     end: 3000  },
  READ_TIME:       { start: 3000,  end: 11000 },
  ALL_ANSWERS:     { start: 11000, end: 15000 },
  HINT_1:          { start: 15000, end: 24000 },
  HINT_2:          { start: 24000, end: 31000 },
  REVEAL:          { start: 31000, end: 37000 },
  SCORES:          { start: 37000, end: 52000 }
};

/**
 * Game schedule: every 15 minutes, all day in ET (00:00 to 23:59).
 * 96 slots per day. Returns the epoch of the current game if active,
 * or the next scheduled game start.
 */
function getNextGameTime(nowEpoch) {
  const INTERVAL_MS = 15 * 60 * 1000;
  const WINDOW_START_MIN = 0;          // 12:00 AM ET
  const WINDOW_END_MIN = 24 * 60;      // 12:00 AM ET (next day) = 1440
  const WINDOW_DURATION_MIN = 24 * 60; // 1440 minutes

  const now = new Date(nowEpoch);
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const et = new Date(etStr);
  const totalMinutesET = et.getHours() * 60 + et.getMinutes();
  const etOffset = now.getTime() - et.getTime();

  const inWindow = totalMinutesET >= WINDOW_START_MIN && totalMinutesET < WINDOW_END_MIN;

  if (!inWindow) {
    // 24-hour window — this branch is unreachable, but kept defensively.
    const nextStart = new Date(etStr);
    if (totalMinutesET >= WINDOW_END_MIN) {
      nextStart.setDate(nextStart.getDate() + 1);
    }
    nextStart.setHours(0, 0, 0, 0);
    return nextStart.getTime() + etOffset;
  }

  // Inside window — find current 15-min slot
  const minsIntoWindow = totalMinutesET - WINDOW_START_MIN;
  const slotMinsIntoWindow = Math.floor(minsIntoWindow / 15) * 15;

  const windowStartET = new Date(etStr);
  windowStartET.setHours(0, 0, 0, 0);

  const slotEpoch = windowStartET.getTime() + etOffset + (slotMinsIntoWindow * 60 * 1000);

  // If past this slot's game + results window, move to next slot
  if (nowEpoch >= slotEpoch + GAME_DURATION_MS + RESULTS_DURATION_MS) {
    const nextSlotMins = slotMinsIntoWindow + 15;
    if (nextSlotMins >= WINDOW_DURATION_MIN) {
      // Past last slot of the day — next window starts at midnight tomorrow ET
      const nextWindowET = new Date(etStr);
      nextWindowET.setDate(nextWindowET.getDate() + 1);
      nextWindowET.setHours(0, 0, 0, 0);
      return nextWindowET.getTime() + etOffset;
    }
    return slotEpoch + INTERVAL_MS;
  }

  return slotEpoch;
}

/**
 * Build the PK for a game timeslot.
 * Format: GAME#2026-02-10#2015 (date + 24hr time in ET)
 */
function gameTimeslotPK(epochMs) {
  const d = new Date(epochMs);
  const etStr = d.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const et = new Date(etStr);
  const year = et.getFullYear();
  const month = String(et.getMonth() + 1).padStart(2, '0');
  const day = String(et.getDate()).padStart(2, '0');
  const hours = String(et.getHours()).padStart(2, '0');
  const minutes = String(et.getMinutes()).padStart(2, '0');
  return `GAME#${year}-${month}-${day}#${hours}${minutes}`;
}

/**
 * Get the full game state from a game's start time and current time.
 */
function getGameState(gameStartEpoch, nowEpoch) {
  const elapsed = nowEpoch - gameStartEpoch;

  if (elapsed < 0) {
    return {
      gamePhase: 'pre_game',
      secondsUntilStart: Math.ceil(-elapsed / 1000)
    };
  }

  if (elapsed >= GAME_DURATION_MS) {
    return { gamePhase: 'post_game' };
  }

  const questionNumber = Math.floor(elapsed / QUESTION_DURATION_MS) + 1;
  const elapsedInQuestion = elapsed % QUESTION_DURATION_MS;

  let questionPhase = 'scores';
  for (const [phase, range] of Object.entries(PHASES)) {
    if (elapsedInQuestion >= range.start && elapsedInQuestion < range.end) {
      questionPhase = phase.toLowerCase();
      break;
    }
  }

  const canAnswer = elapsedInQuestion >= 3000 && elapsedInQuestion < 37000;

  const hintsVisible = [];
  if (elapsedInQuestion >= 15000) hintsVisible.push(0);
  if (elapsedInQuestion >= 24000) hintsVisible.push(1);

  const correctRevealed = elapsedInQuestion >= 31000;

  // calculatePoints is from scoring.js — available globally in browser,
  // or must be required separately in Node.js
  let pointsAvailable = 0;
  if (canAnswer) {
    if (typeof calculatePoints === 'function') {
      pointsAvailable = calculatePoints(elapsedInQuestion);
    }
  }

  return {
    gamePhase: 'active',
    questionNumber,
    questionPhase,
    elapsedInQuestion,
    canAnswer,
    pointsAvailable,
    hintsVisible,
    correctRevealed,
    questionSecondsRemaining: Math.max(0, Math.ceil((31000 - elapsedInQuestion) / 1000))
  };
}

/**
 * Get the question start epoch for a given question number within a game.
 */
function questionStartEpoch(gameStartEpoch, questionNumber) {
  return gameStartEpoch + (questionNumber - 1) * QUESTION_DURATION_MS;
}

/**
 * Difficulty ramp: which difficulty for each question position (1-15).
 */
const DIFFICULTY_RAMP = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3];

function getDifficultyForQuestion(questionNumber) {
  return DIFFICULTY_RAMP[questionNumber - 1] || 1;
}

// UMD export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QUESTION_DURATION_MS,
    TOTAL_QUESTIONS,
    GAME_DURATION_MS,
    RESULTS_DURATION_MS,
    BREAK_DURATION_MS,
    PHASES,
    DIFFICULTY_RAMP,
    getGameState,
    getNextGameTime,
    gameTimeslotPK,
    questionStartEpoch,
    getDifficultyForQuestion
  };
}
