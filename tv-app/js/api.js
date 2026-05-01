/**
 * Tap Trivia TV App — API Client
 */

// Server time offset: serverTime - clientTime (positive = client behind server)
let _serverTimeOffset = 0;

/** Returns server-adjusted current time (ms epoch). Corrects device clock drift. */
function getServerNow() {
  return Date.now() + _serverTimeOffset;
}

async function apiCall(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const requestStart = Date.now();
    const res = await fetch(`${CONFIG.API_BASE}${path}`, opts);
    // Tolerate empty response bodies (e.g. /tv-heartbeat returns 200 with
    // no body). JSON.parse on '' throws SyntaxError, so read raw text and
    // only parse when there's actually content.
    const text = await res.text();
    let data = text ? JSON.parse(text) : null;
    if (data === null && !res.ok) data = {};

    // Sync clock from server Date header
    const dateHeader = res.headers.get('Date');
    if (dateHeader && res.ok) {
      const serverTime = Date.parse(dateHeader);
      if (!isNaN(serverTime)) {
        const clientMidpoint = (requestStart + Date.now()) / 2;
        _serverTimeOffset = serverTime - clientMidpoint;
      }
    }

    if (!res.ok && data) {
      data._statusCode = res.status;
    }
    return data;
  } catch (err) {
    console.error('API error:', err);
    return { error: 'NETWORK_ERROR', message: 'Network error' };
  }
}
