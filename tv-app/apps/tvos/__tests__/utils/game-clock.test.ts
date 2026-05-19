import { getGameState, getDifficultyForQuestion, PHASES, QUESTION_DURATION_MS, GAME_DURATION_MS } from '../../src/utils/game-clock';

// Helper: build nowEpoch from gameStart + total elapsed ms
function at(gameStart: number, totalElapsed: number): number {
  return gameStart + totalElapsed;
}

// Helper: elapsed in Q1 = directly at totalElapsed
// elapsed in Qn = (n-1)*QUESTION_DURATION_MS + elapsedInQuestion
function elapsedAt(qNum: number, elapsedInQuestion: number): number {
  return (qNum - 1) * QUESTION_DURATION_MS + elapsedInQuestion;
}

const GAME_START = 1000000000000;

describe('getGameState — pre_game', () => {
  test('returns pre_game when now < gameStart', () => {
    const now = GAME_START - 30000; // 30s before
    const state = getGameState(GAME_START, now);
    expect(state.gamePhase).toBe('pre_game');
  });

  test('secondsUntilStart is correct (ceil of ms)', () => {
    const now = GAME_START - 30000;
    const state = getGameState(GAME_START, now);
    expect(state.secondsUntilStart).toBe(30);
  });

  test('secondsUntilStart rounds up fractional seconds', () => {
    const now = GAME_START - 30500; // 30.5s before
    const state = getGameState(GAME_START, now);
    expect(state.secondsUntilStart).toBe(31);
  });

  test('secondsUntilStart at exactly 1ms before start', () => {
    const now = GAME_START - 1;
    const state = getGameState(GAME_START, now);
    expect(state.gamePhase).toBe('pre_game');
    expect(state.secondsUntilStart).toBe(1);
  });
});

describe('getGameState — post_game', () => {
  test('returns post_game when elapsed >= GAME_DURATION_MS', () => {
    const state = getGameState(GAME_START, GAME_START + GAME_DURATION_MS);
    expect(state.gamePhase).toBe('post_game');
  });

  test('returns post_game well past end', () => {
    const state = getGameState(GAME_START, GAME_START + GAME_DURATION_MS + 60000);
    expect(state.gamePhase).toBe('post_game');
  });

  test('last ms of game is still active (GAME_DURATION_MS - 1)', () => {
    const state = getGameState(GAME_START, GAME_START + GAME_DURATION_MS - 1);
    expect(state.gamePhase).toBe('active');
  });
});

describe('getGameState — question numbers', () => {
  test('Q1 at elapsed=0', () => {
    const state = getGameState(GAME_START, at(GAME_START, 0));
    expect(state.questionNumber).toBe(1);
  });

  test('Q2 at elapsed=52000ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, QUESTION_DURATION_MS));
    expect(state.questionNumber).toBe(2);
  });

  test('Q15 at elapsed=14*52000ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, 14 * QUESTION_DURATION_MS));
    expect(state.questionNumber).toBe(15);
  });

  test('Q1 last ms is still Q1', () => {
    const state = getGameState(GAME_START, at(GAME_START, QUESTION_DURATION_MS - 1));
    expect(state.questionNumber).toBe(1);
  });
});

describe('getGameState — question phases at exact boundaries', () => {
  test('0ms → category_splash', () => {
    const state = getGameState(GAME_START, at(GAME_START, 0));
    expect(state.questionPhase).toBe('category_splash');
  });

  test('3000ms → read_time', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.READ_TIME.start));
    expect(state.questionPhase).toBe('read_time');
  });

  test('11000ms → all_answers', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.ALL_ANSWERS.start));
    expect(state.questionPhase).toBe('all_answers');
  });

  test('15000ms → hint_1', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.HINT_1.start));
    expect(state.questionPhase).toBe('hint_1');
  });

  test('24000ms → hint_2', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.HINT_2.start));
    expect(state.questionPhase).toBe('hint_2');
  });

  test('31000ms → reveal', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.REVEAL.start));
    expect(state.questionPhase).toBe('reveal');
  });

  test('37000ms → scores', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.SCORES.start));
    expect(state.questionPhase).toBe('scores');
  });
});

describe('getGameState — one ms before each boundary is still previous phase', () => {
  test('2999ms → category_splash', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.READ_TIME.start - 1));
    expect(state.questionPhase).toBe('category_splash');
  });

  test('10999ms → read_time', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.ALL_ANSWERS.start - 1));
    expect(state.questionPhase).toBe('read_time');
  });

  test('14999ms → all_answers', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.HINT_1.start - 1));
    expect(state.questionPhase).toBe('all_answers');
  });

  test('23999ms → hint_1', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.HINT_2.start - 1));
    expect(state.questionPhase).toBe('hint_1');
  });

  test('30999ms → hint_2', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.REVEAL.start - 1));
    expect(state.questionPhase).toBe('hint_2');
  });

  test('36999ms → reveal', () => {
    const state = getGameState(GAME_START, at(GAME_START, PHASES.SCORES.start - 1));
    expect(state.questionPhase).toBe('reveal');
  });

  test('51999ms → scores', () => {
    const state = getGameState(GAME_START, at(GAME_START, QUESTION_DURATION_MS - 1));
    expect(state.questionPhase).toBe('scores');
  });
});

describe('getGameState — canAnswer', () => {
  test('canAnswer=false at 2999ms (before read_time)', () => {
    const state = getGameState(GAME_START, at(GAME_START, 2999));
    expect(state.canAnswer).toBe(false);
  });

  test('canAnswer=true at 3000ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, 3000));
    expect(state.canAnswer).toBe(true);
  });

  test('canAnswer=true mid-game at 20000ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, 20000));
    expect(state.canAnswer).toBe(true);
  });

  test('canAnswer=false at 37000ms (scores phase)', () => {
    const state = getGameState(GAME_START, at(GAME_START, 37000));
    expect(state.canAnswer).toBe(false);
  });

  test('canAnswer=true at 36999ms (last ms of reveal)', () => {
    const state = getGameState(GAME_START, at(GAME_START, 36999));
    expect(state.canAnswer).toBe(true);
  });
});

describe('getGameState — correctRevealed', () => {
  test('correctRevealed=false at 30999ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, 30999));
    expect(state.correctRevealed).toBe(false);
  });

  test('correctRevealed=true at 31000ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, 31000));
    expect(state.correctRevealed).toBe(true);
  });

  test('correctRevealed=true during scores phase at 40000ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, 40000));
    expect(state.correctRevealed).toBe(true);
  });
});

describe('getGameState — hintsVisible', () => {
  test('hintsVisible=[] at 14999ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, 14999));
    expect(state.hintsVisible).toEqual([]);
  });

  test('hintsVisible=[0] at 15000ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, 15000));
    expect(state.hintsVisible).toEqual([0]);
  });

  test('hintsVisible=[0] at 23999ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, 23999));
    expect(state.hintsVisible).toEqual([0]);
  });

  test('hintsVisible=[0,1] at 24000ms', () => {
    const state = getGameState(GAME_START, at(GAME_START, 24000));
    expect(state.hintsVisible).toEqual([0, 1]);
  });

  test('hintsVisible=[0,1] persists into reveal phase', () => {
    const state = getGameState(GAME_START, at(GAME_START, 33000));
    expect(state.hintsVisible).toEqual([0, 1]);
  });
});

describe('getGameState — questionSecondsRemaining', () => {
  test('21000ms → 10 seconds remaining', () => {
    // ceil((31000 - 21000) / 1000) = ceil(10) = 10
    const state = getGameState(GAME_START, at(GAME_START, 21000));
    expect(state.questionSecondsRemaining).toBe(10);
  });

  test('30000ms → 1 second remaining', () => {
    // ceil((31000 - 30000) / 1000) = ceil(1) = 1
    const state = getGameState(GAME_START, at(GAME_START, 30000));
    expect(state.questionSecondsRemaining).toBe(1);
  });

  test('31000ms → 0 seconds remaining', () => {
    // ceil((31000 - 31000) / 1000) = ceil(0) = 0
    const state = getGameState(GAME_START, at(GAME_START, 31000));
    expect(state.questionSecondsRemaining).toBe(0);
  });

  test('37000ms → 0 (clamped, not negative)', () => {
    const state = getGameState(GAME_START, at(GAME_START, 37000));
    expect(state.questionSecondsRemaining).toBe(0);
  });

  test('3000ms → 28 seconds remaining', () => {
    // ceil((31000 - 3000) / 1000) = ceil(28) = 28
    const state = getGameState(GAME_START, at(GAME_START, 3000));
    expect(state.questionSecondsRemaining).toBe(28);
  });

  test('fractional: 30500ms → 1 second remaining (ceil)', () => {
    // ceil((31000 - 30500) / 1000) = ceil(0.5) = 1
    const state = getGameState(GAME_START, at(GAME_START, 30500));
    expect(state.questionSecondsRemaining).toBe(1);
  });
});

describe('getDifficultyForQuestion', () => {
  test('Q1 → difficulty 1', () => expect(getDifficultyForQuestion(1)).toBe(1));
  test('Q2 → difficulty 1', () => expect(getDifficultyForQuestion(2)).toBe(1));
  test('Q3 → difficulty 1', () => expect(getDifficultyForQuestion(3)).toBe(1));
  test('Q4 → difficulty 1', () => expect(getDifficultyForQuestion(4)).toBe(1));
  test('Q5 → difficulty 2', () => expect(getDifficultyForQuestion(5)).toBe(2));
  test('Q6 → difficulty 2', () => expect(getDifficultyForQuestion(6)).toBe(2));
  test('Q7 → difficulty 2', () => expect(getDifficultyForQuestion(7)).toBe(2));
  test('Q8 → difficulty 2', () => expect(getDifficultyForQuestion(8)).toBe(2));
  test('Q9 → difficulty 2', () => expect(getDifficultyForQuestion(9)).toBe(2));
  test('Q10 → difficulty 3', () => expect(getDifficultyForQuestion(10)).toBe(3));
  test('Q11 → difficulty 3', () => expect(getDifficultyForQuestion(11)).toBe(3));
  test('Q12 → difficulty 3', () => expect(getDifficultyForQuestion(12)).toBe(3));
  test('Q13 → difficulty 3', () => expect(getDifficultyForQuestion(13)).toBe(3));
  test('Q14 → difficulty 3', () => expect(getDifficultyForQuestion(14)).toBe(3));
  test('Q15 → difficulty 3', () => expect(getDifficultyForQuestion(15)).toBe(3));
  test('Q16 → difficulty 1 (out-of-range falls back to 1)', () => expect(getDifficultyForQuestion(16)).toBe(1));
  test('Q0 → difficulty 1 (undefined index returns 1)', () => expect(getDifficultyForQuestion(0)).toBe(1));
});

describe('getGameState — active game fields are set', () => {
  test('active state has all required fields', () => {
    const state = getGameState(GAME_START, at(GAME_START, 5000));
    expect(state.gamePhase).toBe('active');
    expect(state.questionNumber).toBeDefined();
    expect(state.questionPhase).toBeDefined();
    expect(state.elapsedInQuestion).toBeDefined();
    expect(state.canAnswer).toBeDefined();
    expect(state.pointsAvailable).toBeDefined();
    expect(state.hintsVisible).toBeDefined();
    expect(state.correctRevealed).toBeDefined();
    expect(state.questionSecondsRemaining).toBeDefined();
  });

  test('elapsedInQuestion wraps per question', () => {
    // Q2 at 1000ms into its slot
    const totalElapsed = QUESTION_DURATION_MS + 1000;
    const state = getGameState(GAME_START, at(GAME_START, totalElapsed));
    expect(state.elapsedInQuestion).toBe(1000);
  });
});
