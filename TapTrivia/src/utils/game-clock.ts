/**
 * Game Clock — TypeScript port of backend/shared/game-clock.js
 * MUST stay in sync with backend + player-app + tv-app.
 */

export const QUESTION_DURATION_MS = 52000;
export const TOTAL_QUESTIONS = 15;
export const GAME_DURATION_MS = TOTAL_QUESTIONS * QUESTION_DURATION_MS;

export const PHASES = {
  CATEGORY_SPLASH: { start: 0,     end: 3000  },
  READ_TIME:       { start: 3000,  end: 11000 },
  ALL_ANSWERS:     { start: 11000, end: 15000 },
  HINT_1:          { start: 15000, end: 24000 },
  HINT_2:          { start: 24000, end: 31000 },
  REVEAL:          { start: 31000, end: 37000 },
  SCORES:          { start: 37000, end: 52000 },
} as const;

export type QuestionPhase =
  | 'category_splash'
  | 'read_time'
  | 'all_answers'
  | 'hint_1'
  | 'hint_2'
  | 'reveal'
  | 'scores';

export interface ClockState {
  gamePhase: 'pre_game' | 'active' | 'post_game';
  secondsUntilStart?: number;
  questionNumber?: number;
  questionPhase?: QuestionPhase;
  elapsedInQuestion?: number;
  canAnswer?: boolean;
  pointsAvailable?: number;
  hintsVisible?: number[];
  correctRevealed?: boolean;
  questionSecondsRemaining?: number;
}

export function getGameState(gameStartEpoch: number, nowEpoch: number): ClockState {
  const elapsed = nowEpoch - gameStartEpoch;

  if (elapsed < 0) {
    return {
      gamePhase: 'pre_game',
      secondsUntilStart: Math.ceil(-elapsed / 1000),
    };
  }

  if (elapsed >= GAME_DURATION_MS) {
    return { gamePhase: 'post_game' };
  }

  const questionNumber = Math.floor(elapsed / QUESTION_DURATION_MS) + 1;
  const elapsedInQuestion = elapsed % QUESTION_DURATION_MS;

  let questionPhase: QuestionPhase = 'scores';
  for (const [phase, range] of Object.entries(PHASES)) {
    if (elapsedInQuestion >= range.start && elapsedInQuestion < range.end) {
      questionPhase = phase.toLowerCase() as QuestionPhase;
      break;
    }
  }

  const canAnswer = elapsedInQuestion >= 3000 && elapsedInQuestion < 37000;

  const hintsVisible: number[] = [];
  if (elapsedInQuestion >= 15000) hintsVisible.push(0);
  if (elapsedInQuestion >= 24000) hintsVisible.push(1);

  const correctRevealed = elapsedInQuestion >= 31000;

  return {
    gamePhase: 'active',
    questionNumber,
    questionPhase,
    elapsedInQuestion,
    canAnswer,
    pointsAvailable: 0, // calculated by scoring.ts
    hintsVisible,
    correctRevealed,
    questionSecondsRemaining: Math.max(0, Math.ceil((31000 - elapsedInQuestion) / 1000)),
  };
}

export const RESULTS_DURATION_MS = 120000;

// Games run 24 hours — no restricted window
const WINDOW_START_MIN = 0;
const WINDOW_END_MIN = 24 * 60; // 1440

/** Always true — games run every 15 min, 24 hours a day */
export function isInGameWindow(): boolean {
  return true;
}

/** Returns minutes until the next 15-min game slot */
export function minutesUntilNextGame(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  let h = 0, m = 0;
  for (const p of parts) {
    if (p.type === 'hour') h = parseInt(p.value, 10);
    if (p.type === 'minute') m = parseInt(p.value, 10);
  }
  if (h === 24) h = 0;
  return 15 - ((h * 60 + m) % 15);
}

/** Returns epoch (ms) of the next game start.
 *  Games run every 15 min, 24 hours a day.
 *  Uses only Intl.DateTimeFormat.formatToParts (iOS-safe). */
export function getNextGameTime(nowEpoch: number): number {
  const INTERVAL_MS = 15 * 60 * 1000;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(new Date(nowEpoch));
  let h = 0, m = 0, s = 0;
  for (const p of parts) {
    if (p.type === 'hour') h = parseInt(p.value, 10);
    if (p.type === 'minute') m = parseInt(p.value, 10);
    if (p.type === 'second') s = parseInt(p.value, 10);
  }
  if (h === 24) h = 0;
  const totalMinutesET = h * 60 + m;

  // Find current 15-min slot
  const secsIntoSlot = (totalMinutesET % 15) * 60 + s;
  const slotEpoch = nowEpoch - secsIntoSlot * 1000;

  // If past this slot's game + results window, return next slot
  if (nowEpoch >= slotEpoch + GAME_DURATION_MS + RESULTS_DURATION_MS) {
    const nextSlotMins = Math.floor(totalMinutesET / 15) * 15 + 15;
    if (nextSlotMins >= 1440) {
      // Past last slot of the day — next slot is midnight ET
      const secsUntilMidnight = (1440 - totalMinutesET) * 60 - s;
      return nowEpoch + secsUntilMidnight * 1000;
    }
    return slotEpoch + INTERVAL_MS;
  }

  return slotEpoch;
}

export const DIFFICULTY_RAMP = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3];

export function getDifficultyForQuestion(questionNumber: number): number {
  return DIFFICULTY_RAMP[questionNumber - 1] || 1;
}
