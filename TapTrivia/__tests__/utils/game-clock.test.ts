import {
  getGameState,
  getDifficultyForQuestion,
  QUESTION_DURATION_MS,
  GAME_DURATION_MS,
  TOTAL_QUESTIONS,
} from '../../src/utils/game-clock';

const BASE_EPOCH = 1_000_000_000_000; // arbitrary fixed base

function stateAt(offsetMs: number) {
  return getGameState(BASE_EPOCH, BASE_EPOCH + offsetMs);
}

// Helper: state for question N at elapsedInQuestion ms
function stateAtQ(questionIndex: number, elapsedInQ: number) {
  const offset = questionIndex * QUESTION_DURATION_MS + elapsedInQ;
  return stateAt(offset);
}

describe('getGameState — pre_game', () => {
  test('returns pre_game when game has not started yet', () => {
    const state = getGameState(BASE_EPOCH + 5000, BASE_EPOCH);
    expect(state.gamePhase).toBe('pre_game');
    expect(state.secondsUntilStart).toBe(5);
  });

  test('secondsUntilStart rounds up', () => {
    const state = getGameState(BASE_EPOCH + 4001, BASE_EPOCH);
    expect(state.gamePhase).toBe('pre_game');
    expect(state.secondsUntilStart).toBe(5);
  });

  test('secondsUntilStart=1 for 1ms before start', () => {
    const state = getGameState(BASE_EPOCH + 1, BASE_EPOCH);
    expect(state.secondsUntilStart).toBe(1);
  });
});

describe('getGameState — post_game', () => {
  test('returns post_game at exact game duration', () => {
    const state = stateAt(GAME_DURATION_MS);
    expect(state.gamePhase).toBe('post_game');
    expect(state.questionNumber).toBeUndefined();
  });

  test('returns post_game well past game duration', () => {
    const state = stateAt(GAME_DURATION_MS + 60000);
    expect(state.gamePhase).toBe('post_game');
  });
});

describe('getGameState — question numbering', () => {
  test('Q1 at t=0ms', () => {
    const state = stateAt(0);
    expect(state.gamePhase).toBe('active');
    expect(state.questionNumber).toBe(1);
    expect(state.elapsedInQuestion).toBe(0);
  });

  test('Q2 at t=52000ms', () => {
    const state = stateAt(QUESTION_DURATION_MS);
    expect(state.questionNumber).toBe(2);
    expect(state.elapsedInQuestion).toBe(0);
  });

  test('Q15 at t=14*52000ms', () => {
    const state = stateAt(14 * QUESTION_DURATION_MS);
    expect(state.questionNumber).toBe(15);
    expect(state.elapsedInQuestion).toBe(0);
  });

  test('Q15 at last ms before game ends', () => {
    const state = stateAt(GAME_DURATION_MS - 1);
    expect(state.questionNumber).toBe(TOTAL_QUESTIONS);
  });
});

describe('getGameState — phase boundaries', () => {
  test('category_splash at elapsedInQuestion=0', () => {
    const state = stateAtQ(0, 0);
    expect(state.questionPhase).toBe('category_splash');
  });

  test('read_time at elapsedInQuestion=3000', () => {
    const state = stateAtQ(0, 3000);
    expect(state.questionPhase).toBe('read_time');
  });

  test('all_answers at elapsedInQuestion=11000', () => {
    const state = stateAtQ(0, 11000);
    expect(state.questionPhase).toBe('all_answers');
  });

  test('hint_1 at elapsedInQuestion=15000', () => {
    const state = stateAtQ(0, 15000);
    expect(state.questionPhase).toBe('hint_1');
  });

  test('hint_2 at elapsedInQuestion=24000', () => {
    const state = stateAtQ(0, 24000);
    expect(state.questionPhase).toBe('hint_2');
  });

  test('reveal at elapsedInQuestion=31000', () => {
    const state = stateAtQ(0, 31000);
    expect(state.questionPhase).toBe('reveal');
  });

  test('scores at elapsedInQuestion=37000', () => {
    const state = stateAtQ(0, 37000);
    expect(state.questionPhase).toBe('scores');
  });
});

describe('getGameState — phase boundary (one ms before)', () => {
  test('still category_splash at 2999ms', () => {
    const state = stateAtQ(0, 2999);
    expect(state.questionPhase).toBe('category_splash');
  });

  test('still read_time at 10999ms', () => {
    const state = stateAtQ(0, 10999);
    expect(state.questionPhase).toBe('read_time');
  });

  test('still all_answers at 14999ms', () => {
    const state = stateAtQ(0, 14999);
    expect(state.questionPhase).toBe('all_answers');
  });

  test('still hint_1 at 23999ms', () => {
    const state = stateAtQ(0, 23999);
    expect(state.questionPhase).toBe('hint_1');
  });

  test('still hint_2 at 30999ms', () => {
    const state = stateAtQ(0, 30999);
    expect(state.questionPhase).toBe('hint_2');
  });

  test('still reveal at 36999ms', () => {
    const state = stateAtQ(0, 36999);
    expect(state.questionPhase).toBe('reveal');
  });

  test('still scores at 51999ms', () => {
    const state = stateAtQ(0, 51999);
    expect(state.questionPhase).toBe('scores');
  });
});

describe('getGameState — canAnswer', () => {
  test('canAnswer=false before 3000ms', () => {
    expect(stateAtQ(0, 0).canAnswer).toBe(false);
    expect(stateAtQ(0, 2999).canAnswer).toBe(false);
  });

  test('canAnswer=true at 3000ms', () => {
    expect(stateAtQ(0, 3000).canAnswer).toBe(true);
  });

  test('canAnswer=true mid-question', () => {
    expect(stateAtQ(0, 20000).canAnswer).toBe(true);
  });

  test('canAnswer=false at 37000ms', () => {
    expect(stateAtQ(0, 37000).canAnswer).toBe(false);
  });

  test('canAnswer=false after 37000ms', () => {
    expect(stateAtQ(0, 40000).canAnswer).toBe(false);
  });
});

describe('getGameState — correctRevealed', () => {
  test('correctRevealed=false at 30999ms', () => {
    expect(stateAtQ(0, 30999).correctRevealed).toBe(false);
  });

  test('correctRevealed=true at 31000ms', () => {
    expect(stateAtQ(0, 31000).correctRevealed).toBe(true);
  });

  test('correctRevealed=true in scores phase', () => {
    expect(stateAtQ(0, 40000).correctRevealed).toBe(true);
  });
});

describe('getGameState — hintsVisible', () => {
  test('no hints at 14999ms', () => {
    expect(stateAtQ(0, 14999).hintsVisible).toEqual([]);
  });

  test('hint 0 visible at 15000ms', () => {
    expect(stateAtQ(0, 15000).hintsVisible).toEqual([0]);
  });

  test('still only hint 0 at 23999ms', () => {
    expect(stateAtQ(0, 23999).hintsVisible).toEqual([0]);
  });

  test('both hints visible at 24000ms', () => {
    expect(stateAtQ(0, 24000).hintsVisible).toEqual([0, 1]);
  });

  test('both hints visible at reveal', () => {
    expect(stateAtQ(0, 31000).hintsVisible).toEqual([0, 1]);
  });
});

describe('getGameState — questionSecondsRemaining', () => {
  test('10s remaining at 21000ms (31000-21000=10000, ceil=10)', () => {
    expect(stateAtQ(0, 21000).questionSecondsRemaining).toBe(10);
  });

  test('1s remaining at 30000ms (31000-30000=1000, ceil=1)', () => {
    expect(stateAtQ(0, 30000).questionSecondsRemaining).toBe(1);
  });

  test('0 remaining at 31000ms (reveal)', () => {
    expect(stateAtQ(0, 31000).questionSecondsRemaining).toBe(0);
  });

  test('0 remaining at 40000ms (scores)', () => {
    expect(stateAtQ(0, 40000).questionSecondsRemaining).toBe(0);
  });

  test('28s remaining at 3000ms (full read time)', () => {
    expect(stateAtQ(0, 3000).questionSecondsRemaining).toBe(28);
  });
});

describe('getDifficultyForQuestion', () => {
  test('Q1-4 → difficulty 1', () => {
    expect(getDifficultyForQuestion(1)).toBe(1);
    expect(getDifficultyForQuestion(2)).toBe(1);
    expect(getDifficultyForQuestion(3)).toBe(1);
    expect(getDifficultyForQuestion(4)).toBe(1);
  });

  test('Q5-9 → difficulty 2', () => {
    expect(getDifficultyForQuestion(5)).toBe(2);
    expect(getDifficultyForQuestion(6)).toBe(2);
    expect(getDifficultyForQuestion(7)).toBe(2);
    expect(getDifficultyForQuestion(8)).toBe(2);
    expect(getDifficultyForQuestion(9)).toBe(2);
  });

  test('Q10-15 → difficulty 3', () => {
    expect(getDifficultyForQuestion(10)).toBe(3);
    expect(getDifficultyForQuestion(11)).toBe(3);
    expect(getDifficultyForQuestion(12)).toBe(3);
    expect(getDifficultyForQuestion(13)).toBe(3);
    expect(getDifficultyForQuestion(14)).toBe(3);
    expect(getDifficultyForQuestion(15)).toBe(3);
  });

  test('Q16 (out of range) → fallback difficulty 1', () => {
    expect(getDifficultyForQuestion(16)).toBe(1);
  });

  test('Q0 (out of range) → fallback difficulty 1', () => {
    expect(getDifficultyForQuestion(0)).toBe(1);
  });
});
