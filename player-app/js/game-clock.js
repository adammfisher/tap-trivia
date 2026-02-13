/**
 * Tap Trivia — Game Clock Module
 * Shared across backend, player-app, and tv-app. SINGLE SOURCE OF TRUTH.
 *
 * Determines game state (phase, question number, hints, points)
 * from a game's start epoch and the current time.
 */

const QUESTION_DURATION_MS = 60000;
const TOTAL_QUESTIONS = 15;
const GAME_DURATION_MS = TOTAL_QUESTIONS * QUESTION_DURATION_MS;

const PHASES = {
  CATEGORY_SPLASH: { start: 0,     end: 5000  },
  READ_TIME:       { start: 5000,  end: 14000 },
  ALL_ANSWERS:     { start: 14000, end: 18000 },
  HINT_1:          { start: 18000, end: 33000 },
  HINT_2:          { start: 33000, end: 45000 },
  REVEAL:          { start: 45000, end: 50000 },
  SCORES:          { start: 50000, end: 60000 }
};

/**
 * Game schedule: every 15 minutes from 9:00 AM ET to 10:00 PM ET.
 * Returns the epoch of the next scheduled game start, or the current game
 * if one is active right now.
 */
function getNextGameTime(nowEpoch) {
  const INTERVAL_MS = 15 * 60 * 1000;

  // Convert to Date to work with ET hours
  const now = new Date(nowEpoch);

  // Get current time in ET (America/New_York)
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const et = new Date(etStr);

  // Game window: 9:00 AM ET (09:00) to 10:00 PM ET (22:00)
  const etHour = et.getHours();
  const etMinutes = et.getMinutes();
  const totalMinutesET = etHour * 60 + etMinutes;

  // 9:00 AM ET = 540 minutes, 10:00 PM ET = 1320 minutes
  const WINDOW_START = 9 * 60; // 540
  const WINDOW_END = 22 * 60; // 1320

  const inWindow = totalMinutesET >= WINDOW_START && totalMinutesET < WINDOW_END;

  if (!inWindow) {
    // Outside window — find today's (or tomorrow's) 9:00 AM ET
    const todayET = new Date(etStr);
    if (totalMinutesET >= WINDOW_END) {
      // Past 10 PM — next window is tomorrow 9 AM
      todayET.setDate(todayET.getDate() + 1);
    }
    todayET.setHours(9, 0, 0, 0);
    // Convert back to UTC epoch
    const etOffset = now.getTime() - et.getTime();
    return todayET.getTime() + etOffset;
  }

  // Inside window — find the current or next 15-min slot
  // Align to 15-minute intervals
  const slotMinutes = Math.floor(totalMinutesET / 15) * 15;
  const slotET = new Date(etStr);
  slotET.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);
  const etOffset = now.getTime() - et.getTime();
  const slotEpoch = slotET.getTime() + etOffset;

  // If we're past this slot's game end, move to next slot
  if (nowEpoch >= slotEpoch + GAME_DURATION_MS) {
    const nextSlotEpoch = slotEpoch + INTERVAL_MS;
    // Check if next slot is still in window (before 3 AM ET)
    return nextSlotEpoch;
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

  const canAnswer = elapsedInQuestion >= 5000 && elapsedInQuestion < 50000;

  const hintsVisible = [];
  if (elapsedInQuestion >= 18000) hintsVisible.push(0);
  if (elapsedInQuestion >= 33000) hintsVisible.push(1);

  const correctRevealed = elapsedInQuestion >= 50000;

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
    questionSecondsRemaining: Math.max(0, Math.ceil((50000 - elapsedInQuestion) / 1000))
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
const DIFFICULTY_RAMP = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5];

function getDifficultyForQuestion(questionNumber) {
  return DIFFICULTY_RAMP[questionNumber - 1] || 1;
}

// UMD export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QUESTION_DURATION_MS,
    TOTAL_QUESTIONS,
    GAME_DURATION_MS,
    PHASES,
    DIFFICULTY_RAMP,
    getGameState,
    getNextGameTime,
    gameTimeslotPK,
    questionStartEpoch,
    getDifficultyForQuestion
  };
}
