/**
 * GameContext tests — verifies score/stats tracking, revealApplied guard,
 * and pendingResult path through the 250ms game loop.
 *
 * Strategy:
 * - Use jest fake timers to control the setInterval game loop
 * - Mock expo-keep-awake (auto-mocked by jest-expo)
 * - Mock all API calls
 * - Start a game with a fixed startTimeEpoch, advance timers to desired phase
 * - Assert gameState values exposed through useGame()
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { GameProvider, useGame } from '../../src/contexts/GameContext';

// Mock the API module
jest.mock('../../src/services/api', () => ({
  getCurrentGame: jest.fn(),
  getQuestion: jest.fn(),
  submitAnswer: jest.fn(),
  getLeaderboard: jest.fn(),
  getServerNow: jest.fn(() => Date.now()),
  isApiError: jest.fn((r: any) => !!(r && r.error)),
}));

// Mock expo-keep-awake
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn(),
}));

import * as api from '../../src/services/api';
const mockGetQuestion = api.getQuestion as jest.Mock;
const mockSubmitAnswer = api.submitAnswer as jest.Mock;
const mockGetLeaderboard = api.getLeaderboard as jest.Mock;
const mockGetServerNow = api.getServerNow as jest.Mock;
const mockIsApiError = api.isApiError as jest.Mock;

// Standard question data returned by getQuestion
const MOCK_QUESTION_RESPONSE = {
  questionId: 'q-001',
  question: 'What is the capital of France?',
  answers: ['Paris', 'London', 'Berlin', 'Madrid'],
  category: 'Geography',
  subcategory: 'Europe',
  difficulty: 1,
  eliminateOrder: [1, 3],
  correctIndex: 0,
  funFact: 'Paris has been the capital since 987 AD.',
};

// Wrapper for renderHook
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <GameProvider>{children}</GameProvider>
);

// Helper: advance timers by ms (in act to flush state updates)
async function advanceMs(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  // Default: isApiError returns false for valid responses
  mockIsApiError.mockImplementation((r: any) => !!(r && r.error));
  // Default: getQuestion resolves with mock data
  mockGetQuestion.mockResolvedValue(MOCK_QUESTION_RESPONSE);
  // Default: submitAnswer never resolves (slow network) unless overridden
  mockSubmitAnswer.mockImplementation(() => new Promise(() => {}));
  // Default: getLeaderboard returns empty
  mockGetLeaderboard.mockResolvedValue({ leaders: [], totalPlayers: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

/**
 * Sets up the hook and starts a game at a given elapsed offset into Q1.
 * The game clock is pinned: getServerNow() returns startEpoch + elapsedAtStart,
 * then we advance fake timers to simulate more time passing.
 *
 * setServerElapsed(ms) sets server time to startEpoch + ms (absolute from game start).
 */
function setupGame(initialElapsedMs = 0) {
  const startEpoch = 1_700_000_000_000; // fixed reference epoch
  // Pin server time to startEpoch + initialElapsed
  mockGetServerNow.mockReturnValue(startEpoch + initialElapsedMs);

  const { result } = renderHook(() => useGame(), { wrapper });

  act(() => {
    result.current.startGame(
      'game-123',
      startEpoch,
      'ABC12',
      'The Local',
      'device-uuid',
      'TestPlayer',
    );
  });

  // setServerElapsed: set server time to startEpoch + absoluteMs
  // This is always absolute from game start — no accumulation issues.
  const setServerElapsed = (absoluteMs: number) => {
    mockGetServerNow.mockReturnValue(startEpoch + absoluteMs);
  };

  // advanceServerTime: kept for backwards compat — adds addMs to initialElapsedMs.
  // Use setServerElapsed for clarity in new tests.
  const advanceServerTime = (addMs: number) => {
    mockGetServerNow.mockReturnValue(startEpoch + initialElapsedMs + addMs);
  };

  return { result, startEpoch, advanceServerTime, setServerElapsed };
}

describe('GameContext — initial state', () => {
  test('starts with idle phase before startGame is called', () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    expect(result.current.gameState.gamePhase).toBe('idle');
    expect(result.current.gameState.totalScore).toBe(0);
  });
});

describe('GameContext — game loop starts correctly', () => {
  test('transitions to active phase after startGame', async () => {
    const { result, setServerElapsed } = setupGame(0);
    setServerElapsed(0);
    await advanceMs(250);
    // At t=0 → category_splash → 'category' phase in mobile
    expect(result.current.gameState.gamePhase).toBe('category');
  });

  test('phase transitions to question during read_time', async () => {
    const { result, setServerElapsed } = setupGame(0);
    setServerElapsed(3500); // mid read_time
    await advanceMs(250);
    expect(result.current.gameState.gamePhase).toBe('question');
  });
});

describe('GameContext — Test 1: Local derivation awards score when API result is absent', () => {
  test('correct answer at t=7000ms, API slow, local derivation gives 1000pts at reveal', async () => {
    const { result, setServerElapsed } = setupGame(0);

    // Start at read_time (t=5000ms)
    setServerElapsed(5000);
    await advanceMs(500);

    // Wait for question data to load
    await waitFor(() => expect(result.current.gameState.question).not.toBeNull(), { timeout: 3000 });

    // Player answers at t=7000ms (during read_time → 1000 pts locked in)
    setServerElapsed(7000);
    act(() => {
      result.current.doSubmitAnswer(0); // answer index 0 (Paris = correct)
    });

    // submitAnswer never resolves → pendingResult stays null → local derivation fires
    // Advance to reveal phase (t=32000ms, firmly in reveal)
    setServerElapsed(32000);
    await advanceMs(500);

    // At reveal: local derivation should fire
    await waitFor(() => {
      return result.current.gameState.answerResult?.correctAnswer !== '' &&
             result.current.gameState.answerResult?.correctAnswer !== undefined;
    }, { timeout: 3000 });

    const ar = result.current.gameState.answerResult;
    expect(ar).not.toBeNull();
    expect(ar!.correct).toBe(true);
    expect(ar!.pointsAwarded).toBe(1000); // locked in at read_time → full 1000pts
    expect(ar!.correctIndex).toBe(0);

    // Stats: correct=1, streak=1
    expect(result.current.gameState.playerStats.correct).toBe(1);
    expect(result.current.gameState.playerStats.streak).toBe(1);

    // Advance to scores phase (t=38000ms) — deferred score applied
    setServerElapsed(38000);
    await advanceMs(300);
    expect(result.current.gameState.totalScore).toBe(1000);
  });
});

describe('GameContext — Test 2: pendingResult path awards score', () => {
  test('submitAnswer resolves before reveal → pendingResult applied at reveal', async () => {
    // Override: submitAnswer resolves immediately
    mockSubmitAnswer.mockResolvedValue({
      correct: true,
      pointsAwarded: 850,
      correctAnswer: 'Paris',
      totalGameScore: 850,
      correctIndex: 0,
    });

    const { result, setServerElapsed } = setupGame(0);
    setServerElapsed(5000);
    await advanceMs(500);

    await waitFor(() => expect(result.current.gameState.question).not.toBeNull(), { timeout: 3000 });

    // Answer at t=7000ms
    setServerElapsed(7000);
    await act(async () => {
      result.current.doSubmitAnswer(0);
    });

    // Wait for submitAnswer promise to resolve
    await act(async () => {
      await Promise.resolve();
    });

    // Advance to reveal (t=33000ms, firmly in reveal phase 31000–37000)
    setServerElapsed(33000);
    await advanceMs(500);

    await waitFor(() => {
      return result.current.gameState.answerResult?.correct === true;
    }, { timeout: 3000 });

    const ar = result.current.gameState.answerResult;
    expect(ar!.correct).toBe(true);
    expect(ar!.pointsAwarded).toBe(850);

    // Stats updated
    expect(result.current.gameState.playerStats.correct).toBe(1);
    expect(result.current.gameState.playerStats.streak).toBe(1);

    // Advance to scores phase (t=39000ms) → deferred score (totalGameScore=850) applied
    setServerElapsed(39000);
    await advanceMs(300);
    expect(result.current.gameState.totalScore).toBe(850);
  });
});

describe('GameContext — Test 3: revealApplied prevents double-counting', () => {
  test('stats not double-counted when pendingResult arrives after local derivation', async () => {
    // submitAnswer resolves AFTER the tick (simulated via a deferred resolve)
    let resolveSubmit: (val: any) => void;
    mockSubmitAnswer.mockImplementation(() => new Promise((res) => { resolveSubmit = res; }));

    const { result, setServerElapsed } = setupGame(0);
    setServerElapsed(5000);
    await advanceMs(500);

    await waitFor(() => expect(result.current.gameState.question).not.toBeNull(), { timeout: 3000 });

    // Answer at t=7000ms
    setServerElapsed(7000);
    act(() => {
      result.current.doSubmitAnswer(0);
    });

    // Advance to reveal — local derivation fires (pendingResult is null)
    setServerElapsed(32000);
    await advanceMs(500);

    await waitFor(() => {
      return result.current.gameState.answerResult?.correctAnswer !== '' &&
             result.current.gameState.answerResult?.correctAnswer !== undefined;
    }, { timeout: 3000 });

    // Local derivation fired: stats.correct should be 1
    expect(result.current.gameState.playerStats.correct).toBe(1);

    // Now resolve the pending API call — pendingResult arrives
    await act(async () => {
      resolveSubmit!({
        correct: true,
        pointsAwarded: 900,
        correctAnswer: 'Paris',
        totalGameScore: 900,
        correctIndex: 0,
      });
      await Promise.resolve();
    });

    // Advance another tick to process pendingResult
    await advanceMs(500);

    // revealApplied=true prevents double-counting → still 1
    expect(result.current.gameState.playerStats.correct).toBe(1);
  });
});

describe('GameContext — Test 5: Wrong answer', () => {
  test('wrong answer at reveal: correct=false, pointsAwarded=0, wrong stat increments', async () => {
    // Player answers index 1 (London), correct is index 0 (Paris)
    mockSubmitAnswer.mockImplementation(() => new Promise(() => {})); // never resolves

    const { result, setServerElapsed } = setupGame(0);
    setServerElapsed(5000);
    await advanceMs(500);

    await waitFor(() => expect(result.current.gameState.question).not.toBeNull(), { timeout: 3000 });

    // Answer index 1 (wrong)
    setServerElapsed(7000);
    act(() => {
      result.current.doSubmitAnswer(1); // London — wrong
    });

    // Advance to reveal
    setServerElapsed(32000);
    await advanceMs(500);

    await waitFor(() => {
      const ar = result.current.gameState.answerResult;
      return ar?.correctAnswer !== '' && ar?.correctAnswer !== undefined;
    }, { timeout: 3000 });

    const ar = result.current.gameState.answerResult;
    expect(ar!.correct).toBe(false);
    expect(ar!.pointsAwarded).toBe(0);
    expect(ar!.selectedIndex).toBe(1);
    expect(ar!.correctIndex).toBe(0);

    // Stats: wrong=1, streak=0, correct=0
    expect(result.current.gameState.playerStats.wrong).toBe(1);
    expect(result.current.gameState.playerStats.streak).toBe(0);
    expect(result.current.gameState.playerStats.correct).toBe(0);

    // Total score stays 0 (scores phase at t=38000ms)
    setServerElapsed(38000);
    await advanceMs(300);
    expect(result.current.gameState.totalScore).toBe(0);
  });
});

describe('GameContext — Test 4: revealApplied resets between questions', () => {
  test('Q2 reveal correctly increments correct count after Q1 was already processed', async () => {
    // Q1: answer correctly with fast API resolve
    mockSubmitAnswer.mockResolvedValue({
      correct: true,
      pointsAwarded: 1000,
      correctAnswer: 'Paris',
      totalGameScore: 1000,
      correctIndex: 0,
    });

    const QUESTION_DURATION_MS = 52000;
    const { result, setServerElapsed } = setupGame(0);
    setServerElapsed(0);
    await advanceMs(500);

    await waitFor(() => expect(result.current.gameState.question).not.toBeNull(), { timeout: 3000 });

    // Answer Q1 at t=7000ms
    setServerElapsed(7000);
    await act(async () => {
      result.current.doSubmitAnswer(0);
    });
    await act(async () => { await Promise.resolve(); });

    // Advance to Q1 reveal (t=32000ms)
    setServerElapsed(32000);
    await advanceMs(500);
    await waitFor(() => result.current.gameState.playerStats.correct === 1, { timeout: 3000 });

    // Advance to Q2 start (t=53000ms — just past Q1 boundary)
    setServerElapsed(QUESTION_DURATION_MS + 500);
    await advanceMs(750);

    // Wait for Q2 question to load
    await waitFor(() => result.current.gameState.questionNumber === 2, { timeout: 3000 });

    // Answer Q2 during Q2 read_time (t = Q1_dur + 7000)
    setServerElapsed(QUESTION_DURATION_MS + 7000);
    await act(async () => {
      result.current.doSubmitAnswer(0);
    });
    await act(async () => { await Promise.resolve(); });

    // Advance to Q2 reveal (t = Q1_dur + 32000)
    setServerElapsed(QUESTION_DURATION_MS + 32000);
    await advanceMs(500);

    // Stats should now have correct=2 (one per question)
    await waitFor(() => result.current.gameState.playerStats.correct === 2, { timeout: 3000 });
    expect(result.current.gameState.playerStats.correct).toBe(2);
    expect(result.current.gameState.playerStats.streak).toBe(2);
  });
});

describe('GameContext — resetGame', () => {
  test('resets game state back to idle', async () => {
    const { result, setServerElapsed } = setupGame(0);
    setServerElapsed(5000);
    await advanceMs(500);

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.gameState.gamePhase).toBe('idle');
    expect(result.current.gameState.totalScore).toBe(0);
    expect(result.current.gameState.gameId).toBeNull();
  });
});
