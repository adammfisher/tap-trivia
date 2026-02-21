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
  CATEGORY_SPLASH: { start: 0,     end: 4000  },
  READ_TIME:       { start: 4000,  end: 13000 },
  ALL_ANSWERS:     { start: 13000, end: 17000 },
  HINT_1:          { start: 17000, end: 29000 },
  HINT_2:          { start: 29000, end: 39000 },
  REVEAL:          { start: 39000, end: 45000 },
  SCORES:          { start: 45000, end: 52000 }
};

/**
 * Game schedule: every 15 minutes from 10:00 AM ET to 9:00 PM ET.
 * 44 slots per day. Returns the epoch of the current game if active,
 * or the next scheduled game start.
 */
function getNextGameTime(nowEpoch) {
  const INTERVAL_MS = 15 * 60 * 1000;
  const WINDOW_START_MIN = 10 * 60; // 10 AM ET = 600
  const WINDOW_END_MIN = 21 * 60;   // 9 PM ET = 1260
  const WINDOW_DURATION_MIN = 11 * 60; // 660 minutes

  const now = new Date(nowEpoch);
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const et = new Date(etStr);
  const totalMinutesET = et.getHours() * 60 + et.getMinutes();
  const etOffset = now.getTime() - et.getTime();

  const inWindow = totalMinutesET >= WINDOW_START_MIN && totalMinutesET < WINDOW_END_MIN;

  if (!inWindow) {
    // Outside window — next game is today at 10 AM (or tomorrow if past 9 PM)
    const nextStart = new Date(etStr);
    if (totalMinutesET >= WINDOW_END_MIN) {
      nextStart.setDate(nextStart.getDate() + 1);
    }
    nextStart.setHours(10, 0, 0, 0);
    return nextStart.getTime() + etOffset;
  }

  // Inside window — find current 15-min slot
  const minsIntoWindow = totalMinutesET - WINDOW_START_MIN;
  const slotMinsIntoWindow = Math.floor(minsIntoWindow / 15) * 15;

  const windowStartET = new Date(etStr);
  windowStartET.setHours(10, 0, 0, 0);

  const slotEpoch = windowStartET.getTime() + etOffset + (slotMinsIntoWindow * 60 * 1000);

  // If past this slot's game + results window, move to next slot
  if (nowEpoch >= slotEpoch + GAME_DURATION_MS + RESULTS_DURATION_MS) {
    const nextSlotMins = slotMinsIntoWindow + 15;
    if (nextSlotMins >= WINDOW_DURATION_MIN) {
      // Past last slot — next window is tomorrow at 10 AM
      const nextWindowET = new Date(etStr);
      nextWindowET.setDate(nextWindowET.getDate() + 1);
      nextWindowET.setHours(10, 0, 0, 0);
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

  const canAnswer = elapsedInQuestion >= 4000 && elapsedInQuestion < 45000;

  const hintsVisible = [];
  if (elapsedInQuestion >= 17000) hintsVisible.push(0);
  if (elapsedInQuestion >= 29000) hintsVisible.push(1);

  const correctRevealed = elapsedInQuestion >= 39000;

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
    questionSecondsRemaining: Math.max(0, Math.ceil((39000 - elapsedInQuestion) / 1000))
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
