/**
 * game-clock tests for Fire TV Vega app.
 * Fire TV phase timings differ from mobile/tvOS:
 *   CATEGORY_SPLASH 0-4000, READ_TIME 4000-13000, ALL_ANSWERS 13000-17000,
 *   HINT_1 17000-29000, HINT_2 29000-39000, REVEAL 39000-45000, SCORES 45000-52000
 */

import {
  getGameState,
  getDifficultyForQuestion,
  PHASES,
  GAME_DURATION_MS,
  QUESTION_DURATION_MS,
  TOTAL_QUESTIONS,
} from '../../src/utils/game-clock';

// A fixed game start epoch (arbitrary)
const START = 1_000_000_000_000;

/** Helper: move n full questions forward then add intra-question ms */
function at(intraMs: number, questionIndex = 0) {
  return START + questionIndex * QUESTION_DURATION_MS + intraMs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase constant sanity-checks
// ─────────────────────────────────────────────────────────────────────────────
describe('PHASES constants (Fire TV timings)', () => {
  it('CATEGORY_SPLASH starts at 0, ends at 4000', () => {
    expect(PHASES.CATEGORY_SPLASH).toEqual({ start: 0, end: 4000 });
  });
  it('READ_TIME starts at 4000, ends at 13000', () => {
    expect(PHASES.READ_TIME).toEqual({ start: 4000, end: 13000 });
  });
  it('ALL_ANSWERS starts at 13000, ends at 17000', () => {
    expect(PHASES.ALL_ANSWERS).toEqual({ start: 13000, end: 17000 });
  });
  it('HINT_1 starts at 17000, ends at 29000', () => {
    expect(PHASES.HINT_1).toEqual({ start: 17000, end: 29000 });
  });
  it('HINT_2 starts at 29000, ends at 39000', () => {
    expect(PHASES.HINT_2).toEqual({ start: 29000, end: 39000 });
  });
  it('REVEAL starts at 39000, ends at 45000', () => {
    expect(PHASES.REVEAL).toEqual({ start: 39000, end: 45000 });
  });
  it('SCORES starts at 45000, ends at 52000', () => {
    expect(PHASES.SCORES).toEqual({ start: 45000, end: 52000 });
  });
  it('QUESTION_DURATION_MS is 52000', () => {
    expect(QUESTION_DURATION_MS).toBe(52000);
  });
  it('TOTAL_QUESTIONS is 15', () => {
    expect(TOTAL_QUESTIONS).toBe(15);
  });
  it('GAME_DURATION_MS is 15 * 52000', () => {
    expect(GAME_DURATION_MS).toBe(15 * 52000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pre-game / post-game
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameState: pre_game and post_game', () => {
  it('returns pre_game when elapsed < 0', () => {
    const state = getGameState(START, START - 1);
    expect(state.gamePhase).toBe('pre_game');
    expect(state.secondsUntilStart).toBe(1);
  });

  it('returns pre_game with correct countdown at -30s', () => {
    const state = getGameState(START, START - 30_000);
    expect(state.gamePhase).toBe('pre_game');
    expect(state.secondsUntilStart).toBe(30);
  });

  it('returns post_game at exactly GAME_DURATION_MS elapsed', () => {
    const state = getGameState(START, START + GAME_DURATION_MS);
    expect(state.gamePhase).toBe('post_game');
  });

  it('returns post_game well past game end', () => {
    const state = getGameState(START, START + GAME_DURATION_MS + 1_000_000);
    expect(state.gamePhase).toBe('post_game');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Question numbering
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameState: question numbering', () => {
  it('Q1 at elapsed=0', () => {
    const state = getGameState(START, at(0));
    expect(state.questionNumber).toBe(1);
  });

  it('Q2 at start of second question', () => {
    const state = getGameState(START, at(0, 1));
    expect(state.questionNumber).toBe(2);
  });

  it('Q15 at start of last question', () => {
    const state = getGameState(START, at(0, 14));
    expect(state.questionNumber).toBe(15);
  });

  it('Q1 one ms before Q2', () => {
    const state = getGameState(START, at(QUESTION_DURATION_MS - 1));
    expect(state.questionNumber).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase detection — exact phase start boundaries
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameState: phase detection at exact start boundaries', () => {
  it('0ms → category_splash', () => {
    expect(getGameState(START, at(0)).questionPhase).toBe('category_splash');
  });

  it('4000ms → read_time', () => {
    expect(getGameState(START, at(4000)).questionPhase).toBe('read_time');
  });

  it('13000ms → all_answers', () => {
    expect(getGameState(START, at(13000)).questionPhase).toBe('all_answers');
  });

  it('17000ms → hint_1', () => {
    expect(getGameState(START, at(17000)).questionPhase).toBe('hint_1');
  });

  it('29000ms → hint_2', () => {
    expect(getGameState(START, at(29000)).questionPhase).toBe('hint_2');
  });

  it('39000ms → reveal', () => {
    expect(getGameState(START, at(39000)).questionPhase).toBe('reveal');
  });

  it('45000ms → scores', () => {
    expect(getGameState(START, at(45000)).questionPhase).toBe('scores');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase detection — one ms before each boundary
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameState: phase detection one ms before each boundary', () => {
  it('3999ms → category_splash (not yet read_time)', () => {
    expect(getGameState(START, at(3999)).questionPhase).toBe('category_splash');
  });

  it('12999ms → read_time (not yet all_answers)', () => {
    expect(getGameState(START, at(12999)).questionPhase).toBe('read_time');
  });

  it('16999ms → all_answers (not yet hint_1)', () => {
    expect(getGameState(START, at(16999)).questionPhase).toBe('all_answers');
  });

  it('28999ms → hint_1 (not yet hint_2)', () => {
    expect(getGameState(START, at(28999)).questionPhase).toBe('hint_1');
  });

  it('38999ms → hint_2 (not yet reveal)', () => {
    expect(getGameState(START, at(38999)).questionPhase).toBe('hint_2');
  });

  it('44999ms → reveal (not yet scores)', () => {
    expect(getGameState(START, at(44999)).questionPhase).toBe('reveal');
  });

  it('51999ms → scores (last ms before question ends)', () => {
    expect(getGameState(START, at(51999)).questionPhase).toBe('scores');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// canAnswer
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameState: canAnswer', () => {
  it('false at 0ms (category_splash)', () => {
    expect(getGameState(START, at(0)).canAnswer).toBe(false);
  });

  it('false at 3999ms (one ms before answer window)', () => {
    expect(getGameState(START, at(3999)).canAnswer).toBe(false);
  });

  it('true at 4000ms (answer window opens)', () => {
    expect(getGameState(START, at(4000)).canAnswer).toBe(true);
  });

  it('true at 44999ms (last ms inside answer window)', () => {
    expect(getGameState(START, at(44999)).canAnswer).toBe(true);
  });

  it('false at 45000ms (answer window closes at scores phase)', () => {
    expect(getGameState(START, at(45000)).canAnswer).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// correctRevealed
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameState: correctRevealed', () => {
  it('false at 38999ms (one ms before reveal)', () => {
    expect(getGameState(START, at(38999)).correctRevealed).toBe(false);
  });

  it('true at 39000ms (reveal phase start)', () => {
    expect(getGameState(START, at(39000)).correctRevealed).toBe(true);
  });

  it('true during scores phase', () => {
    expect(getGameState(START, at(45000)).correctRevealed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hintsVisible
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameState: hintsVisible', () => {
  it('[] at 16999ms (before hint_1)', () => {
    expect(getGameState(START, at(16999)).hintsVisible).toEqual([]);
  });

  it('[0] at 17000ms (hint_1 starts)', () => {
    expect(getGameState(START, at(17000)).hintsVisible).toEqual([0]);
  });

  it('[0] at 28999ms (hint_1 active, hint_2 not yet)', () => {
    expect(getGameState(START, at(28999)).hintsVisible).toEqual([0]);
  });

  it('[0, 1] at 29000ms (hint_2 starts)', () => {
    expect(getGameState(START, at(29000)).hintsVisible).toEqual([0, 1]);
  });

  it('[0, 1] during reveal phase', () => {
    expect(getGameState(START, at(39000)).hintsVisible).toEqual([0, 1]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// questionSecondsRemaining
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameState: questionSecondsRemaining', () => {
  it('at 29000ms = 10 (ceil((39000-29000)/1000))', () => {
    expect(getGameState(START, at(29000)).questionSecondsRemaining).toBe(10);
  });

  it('at 39000ms = 0 (reveal already started)', () => {
    expect(getGameState(START, at(39000)).questionSecondsRemaining).toBe(0);
  });

  it('at 38001ms = 1 (ceil((39000-38001)/1000) = ceil(0.999) = 1)', () => {
    expect(getGameState(START, at(38001)).questionSecondsRemaining).toBe(1);
  });

  it('at 38000ms = 1 (ceil((39000-38000)/1000) = 1)', () => {
    expect(getGameState(START, at(38000)).questionSecondsRemaining).toBe(1);
  });

  it('at 4000ms = 35 (ceil((39000-4000)/1000))', () => {
    expect(getGameState(START, at(4000)).questionSecondsRemaining).toBe(35);
  });

  it('never goes below 0 (at scores phase)', () => {
    expect(getGameState(START, at(50000)).questionSecondsRemaining).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pointsAvailable
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameState: pointsAvailable', () => {
  it('0 when canAnswer is false (category_splash)', () => {
    expect(getGameState(START, at(0)).pointsAvailable).toBe(0);
  });

  it('1000 at read_time (4000ms)', () => {
    expect(getGameState(START, at(4000)).pointsAvailable).toBe(1000);
  });

  it('0 in scores phase (canAnswer=false)', () => {
    expect(getGameState(START, at(45000)).pointsAvailable).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDifficultyForQuestion
// ─────────────────────────────────────────────────────────────────────────────
describe('getDifficultyForQuestion', () => {
  it('Q1 = level 1', () => expect(getDifficultyForQuestion(1)).toBe(1));
  it('Q2 = level 1', () => expect(getDifficultyForQuestion(2)).toBe(1));
  it('Q3 = level 1', () => expect(getDifficultyForQuestion(3)).toBe(1));
  it('Q4 = level 1', () => expect(getDifficultyForQuestion(4)).toBe(1));
  it('Q5 = level 2', () => expect(getDifficultyForQuestion(5)).toBe(2));
  it('Q6 = level 2', () => expect(getDifficultyForQuestion(6)).toBe(2));
  it('Q9 = level 2', () => expect(getDifficultyForQuestion(9)).toBe(2));
  it('Q10 = level 3', () => expect(getDifficultyForQuestion(10)).toBe(3));
  it('Q11 = level 3', () => expect(getDifficultyForQuestion(11)).toBe(3));
  it('Q15 = level 3', () => expect(getDifficultyForQuestion(15)).toBe(3));
});
