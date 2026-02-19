/**
 * Game Clock — TypeScript port of backend/shared/game-clock.js
 * MUST stay in sync with backend + player-app + tv-app.
 */

export const QUESTION_DURATION_MS = 54000;
export const TOTAL_QUESTIONS = 15;
export const GAME_DURATION_MS = TOTAL_QUESTIONS * QUESTION_DURATION_MS;

export const PHASES = {
  CATEGORY_SPLASH: { start: 0, end: 5000 },
  READ_TIME: { start: 5000, end: 13000 },
  ALL_ANSWERS: { start: 13000, end: 17000 },
  HINT_1: { start: 17000, end: 32000 },
  HINT_2: { start: 32000, end: 44000 },
  REVEAL: { start: 44000, end: 49000 },
  SCORES: { start: 49000, end: 54000 },
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

  const canAnswer = elapsedInQuestion >= 5000 && elapsedInQuestion < 49000;

  const hintsVisible: number[] = [];
  if (elapsedInQuestion >= 17000) hintsVisible.push(0);
  if (elapsedInQuestion >= 32000) hintsVisible.push(1);

  const correctRevealed = elapsedInQuestion >= 44000;

  return {
    gamePhase: 'active',
    questionNumber,
    questionPhase,
    elapsedInQuestion,
    canAnswer,
    pointsAvailable: 0, // calculated by scoring.ts
    hintsVisible,
    correctRevealed,
    questionSecondsRemaining: Math.max(0, Math.ceil((44000 - elapsedInQuestion) / 1000)),
  };
}

export const DIFFICULTY_RAMP = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3];

export function getDifficultyForQuestion(questionNumber: number): number {
  return DIFFICULTY_RAMP[questionNumber - 1] || 1;
}
