import { apiCall, getTvState, activateTV, tvHeartbeat, signageImpression, getBetweenGameData, getServerNow } from '../../src/services/api';
import { API_BASE } from '../../src/config';

// ---- Fetch mock helpers ----

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

function mockSuccess(data: unknown, headers: Record<string, string> = {}) {
  const body = data === null ? '' : JSON.stringify(data);
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
    headers: { get: (k: string) => headers[k] ?? null },
  });
}

function mockError(status: number, message?: string) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    text: () => Promise.resolve(message ? JSON.stringify({ message }) : ''),
    headers: { get: () => null },
  });
}

// ---- apiCall core behaviour ----

describe('apiCall — success cases', () => {
  test('resolves with parsed JSON on successful GET', async () => {
    mockSuccess({ foo: 'bar' });
    const result = await apiCall('GET', '/test');
    expect(result).toEqual({ foo: 'bar' });
  });

  test('empty body response resolves with null', async () => {
    mockSuccess(null);
    const result = await apiCall('POST', '/tv-heartbeat', { tvId: 'tv-001' });
    expect(result).toBeNull();
  });

  test('sends correct method and URL', async () => {
    mockSuccess({ ok: true });
    await apiCall('GET', '/some/path');
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/some/path`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('sends JSON body for POST', async () => {
    mockSuccess({ ok: true });
    await apiCall('POST', '/endpoint', { key: 'value' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });
});

describe('apiCall — error cases', () => {
  test('HTTP 4xx with message field throws Error with that message', async () => {
    mockError(400, 'Bar not found');
    await expect(apiCall('GET', '/test')).rejects.toThrow('Bar not found');
  });

  test('HTTP 500 with no message throws Error("HTTP 500")', async () => {
    mockError(500);
    await expect(apiCall('GET', '/test')).rejects.toThrow('HTTP 500');
  });

  test('HTTP 404 with no message throws Error("HTTP 404")', async () => {
    mockError(404);
    await expect(apiCall('GET', '/test')).rejects.toThrow('HTTP 404');
  });

  test('network failure propagates the error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    await expect(apiCall('GET', '/test')).rejects.toThrow('Network error');
  });
});

// ---- Clock sync ----

describe('getServerNow — clock sync from Date header', () => {
  test('syncs server clock from Date header', async () => {
    const serverTime = Date.now() + 5000; // server is 5s ahead
    const serverDateStr = new Date(serverTime).toUTCString();
    // toUTCString() truncates to whole seconds, so parsed value may differ from
    // serverTime by up to 1000ms. We verify offset is applied (getServerNow()
    // is ahead of Date.now() by ~5s), within a 2s window.
    mockSuccess(
      { state: 'break', barCode: 'ABC12', barName: 'Test Bar', activePlayers: 0 },
      { Date: serverDateStr },
    );
    await getTvState('ABC12');
    const offset = getServerNow() - Date.now();
    // Should be roughly +5000ms (server ahead by 5s), within ±2000ms tolerance
    expect(offset).toBeGreaterThan(3000);
    expect(offset).toBeLessThan(7000);
  });

  test('does not sync clock on error responses (no Date header used)', async () => {
    const beforeOffset = getServerNow() - Date.now();
    mockError(500);
    try { await apiCall('GET', '/test'); } catch { /* expected */ }
    // offset should not have changed from a failed request
    const afterOffset = getServerNow() - Date.now();
    expect(Math.abs(afterOffset - beforeOffset)).toBeLessThan(100);
  });
});

// ---- Named API functions ----

describe('getTvState', () => {
  test('calls GET /game/tv-state?barCode=ABC12', async () => {
    mockSuccess({ state: 'break', barCode: 'ABC12', barName: 'Test Bar', activePlayers: 0 });
    await getTvState('ABC12');
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/game/tv-state?barCode=ABC12`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('URL-encodes special characters in barCode', async () => {
    mockSuccess({ state: 'break', barCode: 'A B+C', barName: 'Test', activePlayers: 0 });
    await getTvState('A B+C');
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('barCode=A%20B%2BC');
  });

  test('returns parsed response data', async () => {
    const response = { state: 'break' as const, barCode: 'ABC12', barName: 'Test Bar', activePlayers: 5 };
    mockSuccess(response);
    const result = await getTvState('ABC12');
    expect(result).toEqual(response);
  });
});

describe('activateTV', () => {
  test('calls POST /tv/activate with barCode, tvId, tvPlatform', async () => {
    mockSuccess({ barCode: 'ABC12', barName: 'Test Bar', tvId: 'tv-001' });
    await activateTV('ABC12', 'tv-001');
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/tv/activate`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ barCode: 'ABC12', tvId: 'tv-001', tvPlatform: 'appletv' }),
      }),
    );
  });

  test('tvPlatform is always "appletv"', async () => {
    mockSuccess({ barCode: 'XYZ99', barName: 'Another Bar', tvId: 'tv-002' });
    await activateTV('XYZ99', 'tv-002');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.tvPlatform).toBe('appletv');
  });
});

describe('tvHeartbeat', () => {
  test('calls POST /tv-heartbeat with tvId', async () => {
    mockSuccess(null); // heartbeat returns empty body
    await tvHeartbeat('tv-001');
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/tv-heartbeat`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tvId: 'tv-001' }),
      }),
    );
  });

  test('resolves even with empty response body', async () => {
    mockSuccess(null);
    await expect(tvHeartbeat('tv-001')).resolves.toBeNull();
  });
});

describe('signageImpression', () => {
  const impressionBody = {
    bar_code: 'ABC12',
    tv_id: 'tv-001',
    signage_id: 'slide-1',
    content_type: 'specials',
    displayed_at_utc: '2026-05-18T17:00:00.000Z',
    duration_ms: 5000,
    context: 'game_lobby' as const,
    concurrent_players: 10,
    game_id: 'game-123',
    position_in_rotation: 0,
    tv_platform: 'appletv',
  };

  test('calls POST /signage-impression with full body', async () => {
    mockSuccess({ impression_id: 'imp-001' });
    await signageImpression(impressionBody);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/signage-impression`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(impressionBody),
      }),
    );
  });

  test('returns impression_id from response', async () => {
    mockSuccess({ impression_id: 'imp-abc' });
    const result = await signageImpression(impressionBody);
    expect(result).toEqual({ impression_id: 'imp-abc' });
  });
});

describe('getBetweenGameData', () => {
  test('calls GET /game/between with barCode and gameId', async () => {
    mockSuccess({ podium: null, barStandings: null, national: null, hype: null });
    await getBetweenGameData('ABC12', 'game-123');
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/game/between?barCode=ABC12&gameId=game-123`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('URL-encodes barCode and gameId', async () => {
    mockSuccess({ podium: null, barStandings: null, national: null, hype: null });
    await getBetweenGameData('A B', 'game 456');
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('barCode=A%20B');
    expect(calledUrl).toContain('gameId=game%20456');
  });

  test('returns parsed between-game data', async () => {
    const response = {
      podium: null,
      barStandings: null,
      national: null,
      hype: { nextGameId: 'g456', categories: ['History'], startsAt: 1700000000 },
    };
    mockSuccess(response);
    const result = await getBetweenGameData('ABC12', 'game-123');
    expect(result).toEqual(response);
  });
});
