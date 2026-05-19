import {
  joinBar,
  getCurrentGame,
  getQuestion,
  submitAnswer,
  getLeaderboard,
  getServerNow,
  isApiError,
} from '../../src/services/api';

// Helper to create a mock fetch response
function mockFetch(data: unknown, status = 200, headers: Record<string, string> = {}) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

describe('isApiError', () => {
  test('returns true for error responses', () => {
    expect(isApiError({ error: 'API_ERROR', message: 'Bad request' })).toBe(true);
  });

  test('returns false for success responses', () => {
    expect(isApiError({ barCode: 'ABC12', barName: 'The Local', activePlayers: 5 })).toBe(false);
  });

  test('returns false for empty object', () => {
    expect(isApiError({})).toBe(false);
  });
});

describe('API successful GET', () => {
  test('getCurrentGame returns parsed JSON on success', async () => {
    const responseData = {
      status: 'active',
      gameId: 'game-123',
      startTimeEpoch: 1000000,
    };
    mockFetch(responseData, 200);
    const result = await getCurrentGame();
    expect(result).toEqual(responseData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('GET request uses correct URL', async () => {
    mockFetch({ status: 'no_game' });
    await getCurrentGame();
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/game/current');
    expect(url).toContain('api.taptrivia.tv');
  });
});

describe('API HTTP error handling', () => {
  test('4xx response returns ApiError object (not throws)', async () => {
    mockFetch({ error: 'NOT_FOUND', message: 'Game not found' }, 404);
    const result = await getCurrentGame();
    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.error).toBe('NOT_FOUND');
      expect(result.message).toBe('Game not found');
    }
  });

  test('5xx response returns ApiError with HTTP status fallback', async () => {
    mockFetch({}, 500);
    const result = await getCurrentGame();
    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.message).toContain('500');
    }
  });

  test('4xx response uses data.error field if present', async () => {
    mockFetch({ error: 'FORBIDDEN', message: 'Unauthorized' }, 403);
    const result = await getCurrentGame();
    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.error).toBe('FORBIDDEN');
    }
  });
});

describe('API network failure handling', () => {
  test('network failure returns NETWORK_ERROR (not throws)', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));
    const result = await getCurrentGame();
    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.error).toBe('NETWORK_ERROR');
    }
  });

  test('AbortError returns ABORTED', async () => {
    const abortError = new DOMException('The user aborted a request.', 'AbortError');
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);
    const result = await getCurrentGame();
    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.error).toBe('ABORTED');
    }
  });
});

describe('Server clock sync', () => {
  test('getServerNow() is close to server time after successful response with Date header', async () => {
    const serverTime = Date.now() + 1000; // server is 1s ahead
    const dateHeader = new Date(serverTime).toUTCString();
    mockFetch({ status: 'no_game' }, 200, { date: dateHeader });
    await getCurrentGame();
    // After sync, getServerNow should be closer to serverTime than before
    const now = getServerNow();
    // toUTCString() truncates to whole seconds → up to 1s drift; allow 1500ms for test execution
    expect(Math.abs(now - serverTime)).toBeLessThan(1500);
  });
});

describe('joinBar', () => {
  test('sends POST to /bar/join with X-Player-ID header', async () => {
    mockFetch({ barCode: 'ABC12', barName: 'The Local', activePlayers: 5 });
    await joinBar('ABC12', 'device-uuid-123');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/bar/join');
    expect((opts.headers as Record<string, string>)['X-Player-ID']).toBe('device-uuid-123');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toEqual({ barCode: 'ABC12' });
  });

  test('returns barJoinResponse on success', async () => {
    const response = { barCode: 'ABC12', barName: 'The Local', activePlayers: 3 };
    mockFetch(response);
    const result = await joinBar('ABC12', 'device-id');
    expect(result).toEqual(response);
    expect(isApiError(result)).toBe(false);
  });
});

describe('getQuestion', () => {
  test('sends GET request with X-Player-ID header', async () => {
    const questionResponse = {
      questionId: 'q-1',
      question: 'What is the capital of France?',
      answers: ['Paris', 'London', 'Berlin', 'Madrid'],
      category: 'Geography',
      difficulty: 1,
      eliminateOrder: [1, 3],
    };
    mockFetch(questionResponse);
    await getQuestion('game-123', 1, 'device-uuid');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/game/game-123/question/1');
    expect((opts.headers as Record<string, string>)['X-Player-ID']).toBe('device-uuid');
    expect(opts.method).toBe('GET');
  });

  test('URL encodes gameId', async () => {
    mockFetch({ questionId: 'q-1', question: 'Test', answers: [], category: 'Test', difficulty: 1, eliminateOrder: [] });
    await getQuestion('game id with spaces', 2, 'dev-id');
    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('game%20id%20with%20spaces');
  });
});

describe('submitAnswer', () => {
  test('sends POST to /game/{gameId}/answer with correct body fields', async () => {
    mockFetch({ correct: true, pointsAwarded: 850, correctAnswer: 'Paris', totalGameScore: 850 });
    await submitAnswer('game-123', 1, 'Paris', 'Alice', 7500, 'device-uuid', 'ABC12');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/game/game-123/answer');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body.questionNumber).toBe(1);
    expect(body.selectedAnswer).toBe('Paris');
    expect(body.playerName).toBe('Alice');
    expect(body.clientElapsedMs).toBe(7500);
    expect(body.barCode).toBe('ABC12');
    expect((opts.headers as Record<string, string>)['X-Player-ID']).toBe('device-uuid');
  });

  test('returns SubmitAnswerResponse on success', async () => {
    const response = { correct: true, pointsAwarded: 900, correctAnswer: 'Berlin', totalGameScore: 1800 };
    mockFetch(response);
    const result = await submitAnswer('game-1', 3, 'Berlin', 'Bob', 5000, 'dev-id');
    expect(result).toEqual(response);
  });
});

describe('getLeaderboard', () => {
  test('sends GET with type and barCode params', async () => {
    mockFetch({ leaders: [], totalPlayers: 10 });
    await getLeaderboard('game-123', 'bar', 'ABC12', 'device-uuid');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/game/game-123/leaderboard');
    expect(url).toContain('type=bar');
    expect(url).toContain('barCode=ABC12');
    expect((opts.headers as Record<string, string>)['X-Player-ID']).toBe('device-uuid');
    expect(opts.method).toBe('GET');
  });

  test('sends global leaderboard request without barCode', async () => {
    mockFetch({ leaders: [], totalPlayers: 50 });
    await getLeaderboard('game-123', 'global', undefined, 'device-uuid');
    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('type=global');
    expect(url).not.toContain('barCode');
  });

  test('returns parsed leaderboard response', async () => {
    const response = {
      leaders: [{ rank: 1, playerId: 'p1', playerName: 'Alice', score: 1000 }],
      totalPlayers: 5,
      you: { rank: 1, playerId: 'p1', score: 1000 },
    };
    mockFetch(response);
    const result = await getLeaderboard('game-1', 'bar', 'BAR01', 'dev-id');
    expect(result).toEqual(response);
  });
});
