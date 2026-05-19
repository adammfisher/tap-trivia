/**
 * API service tests for Fire TV Vega app.
 * The Fire TV apiCall:
 *   - uses res.json() directly (not .text())
 *   - THROWS an Error on non-ok responses (unlike mobile which returns error objects)
 *   - syncs server clock from the Date response header
 */

import {
  apiCall,
  getServerNow,
  getTvState,
  registerBar,
  activateTV,
  getBetweenGameData,
} from '../../src/services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Mock helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockSuccess = (data: unknown, headers: Record<string, string> = {}) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: { get: (k: string) => headers[k] ?? null },
  });
};

const mockError = (status: number, message?: string) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
    text: () => Promise.resolve(JSON.stringify({ message })),
    headers: { get: () => null },
  });
};

beforeAll(() => {
  global.fetch = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Core apiCall behaviour
// ─────────────────────────────────────────────────────────────────────────────
describe('apiCall', () => {
  it('resolves with parsed JSON on successful GET', async () => {
    mockSuccess({ state: 'break', barCode: 'ABC12' });
    const result = await apiCall<{ state: string; barCode: string }>('GET', '/game/tv-state?barCode=ABC12');
    expect(result).toEqual({ state: 'break', barCode: 'ABC12' });
  });

  it('throws Error with server message on HTTP 4xx', async () => {
    mockError(404, 'Bar not found');
    await expect(apiCall('GET', '/bar/register')).rejects.toThrow('Bar not found');
  });

  it('throws Error with generic HTTP message when server provides no message on 500', async () => {
    mockError(500, undefined);
    await expect(apiCall('GET', '/any-path')).rejects.toThrow('HTTP 500');
  });

  it('propagates network failures (fetch throws)', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    await expect(apiCall('GET', '/any-path')).rejects.toThrow('Network error');
  });

  it('sends POST with JSON body', async () => {
    mockSuccess({ barCode: 'XYZ99', barName: 'Test Bar' });
    await apiCall('POST', '/bar/register', { barName: 'Test Bar' });
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({ barName: 'Test Bar' });
  });

  it('does not send body on GET', async () => {
    mockSuccess({});
    await apiCall('GET', '/some/endpoint');
    const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(opts.body).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Server clock sync via Date header
// ─────────────────────────────────────────────────────────────────────────────
describe('server clock sync', () => {
  it('getServerNow() reflects server time after a response with Date header', async () => {
    // Use a fixed far-future server time so it's clearly different from local time
    const serverMs = new Date('2035-01-01T12:00:00.000Z').getTime();
    const serverDateHeader = new Date(serverMs).toUTCString();

    mockSuccess({ ok: true }, { Date: serverDateHeader });
    await apiCall('GET', '/ping');

    const now = getServerNow();
    // The offset should bring getServerNow() close to the server time.
    // Allow ±5000ms tolerance for test execution time.
    expect(Math.abs(now - serverMs)).toBeLessThan(5000);
  });

  it('does not update clock offset on error response', async () => {
    // Record the offset as it stands (already set from previous test or default 0)
    const before = getServerNow();

    const serverDateHeader = new Date('2099-12-31T00:00:00Z').toUTCString();
    // mockError sets ok: false — clock should NOT sync
    mockError(401, 'Unauthorized');

    try {
      await apiCall('GET', '/protected');
    } catch {
      // expected to throw
    }

    const after = getServerNow();
    // The offset should not have jumped to 2099 — within 10s of `before`
    expect(Math.abs(after - before)).toBeLessThan(10_000);
  });

  it('ignores invalid Date header values', async () => {
    const before = getServerNow();
    mockSuccess({ ok: true }, { Date: 'not-a-valid-date' });
    await apiCall('GET', '/ping');
    const after = getServerNow();
    // offset should be unchanged (within 5s drift from normal test time)
    expect(Math.abs(after - before)).toBeLessThan(5000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Convenience wrappers — correct URL / method / body
// ─────────────────────────────────────────────────────────────────────────────
describe('getTvState', () => {
  it('sends GET to /game/tv-state?barCode=ABC12', async () => {
    mockSuccess({ state: 'break', barCode: 'ABC12', barName: 'Test', activePlayers: 0 });
    await getTvState('ABC12');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/game\/tv-state\?barCode=ABC12$/);
    expect(opts.method).toBe('GET');
  });

  it('URL-encodes bar codes with special characters', async () => {
    mockSuccess({ state: 'break', barCode: 'A B+1', barName: 'X', activePlayers: 0 });
    await getTvState('A B+1');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(encodeURIComponent('A B+1'));
  });
});

describe('registerBar', () => {
  it('sends POST to /bar/register with barName', async () => {
    mockSuccess({ barCode: 'NEW01', barName: 'My Bar' });
    await registerBar('My Bar');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/bar\/register$/);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toMatchObject({ barName: 'My Bar' });
  });

  it('includes ownerEmail when provided', async () => {
    mockSuccess({ barCode: 'NEW02', barName: 'Bar With Email' });
    await registerBar('Bar With Email', 'owner@example.com');
    const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(opts.body)).toMatchObject({
      barName: 'Bar With Email',
      ownerEmail: 'owner@example.com',
    });
  });

  it('omits ownerEmail when not provided', async () => {
    mockSuccess({ barCode: 'NEW03', barName: 'No Email Bar' });
    await registerBar('No Email Bar');
    const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body).not.toHaveProperty('ownerEmail');
  });
});

describe('activateTV', () => {
  it('sends POST to /tv/activate with barCode', async () => {
    mockSuccess({ barCode: 'ABC12', barName: 'Test Bar' });
    await activateTV('ABC12');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/tv\/activate$/);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ barCode: 'ABC12' });
  });
});

describe('getBetweenGameData', () => {
  it('sends GET to /game/between with barCode and gameId query params', async () => {
    mockSuccess({ podium: null, barStandings: null, national: null, hype: null });
    await getBetweenGameData('ABC12', 'game123');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/game\/between/);
    expect(url).toContain('barCode=ABC12');
    expect(url).toContain('gameId=game123');
    expect(opts.method).toBe('GET');
  });

  it('URL-encodes gameId with special characters', async () => {
    mockSuccess({ podium: null, barStandings: null, national: null, hype: null });
    await getBetweenGameData('ABC12', 'GAME#2025-01-01T17:00');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(encodeURIComponent('GAME#2025-01-01T17:00'));
  });
});
