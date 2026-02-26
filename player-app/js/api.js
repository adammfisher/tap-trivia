/**
 * Tap Trivia Player App — API Client
 */

// Server time offset: serverTime - clientTime (positive = client behind server)
let _serverTimeOffset = 0;

/** Returns server-adjusted current time (ms epoch). Corrects device clock drift. */
function getServerNow() {
  return Date.now() + _serverTimeOffset;
}

async function apiCall(method, path, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Player-ID': localStorage.getItem('tt_player_id') || ''
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const requestStart = Date.now();
    const res = await fetch(`${CONFIG.API_BASE}${path}`, opts);
    const data = await res.json();

    // Sync clock from server Date header
    const dateHeader = res.headers.get('Date');
    if (dateHeader && res.ok) {
      const serverTime = Date.parse(dateHeader);
      if (!isNaN(serverTime)) {
        const clientMidpoint = (requestStart + Date.now()) / 2;
        _serverTimeOffset = serverTime - clientMidpoint;
      }
    }

    if (!res.ok) data._statusCode = res.status;
    return data;
  } catch (err) {
    console.error('API error:', err);
    return { error: 'NETWORK_ERROR', message: 'Network error — check your connection.' };
  }
}
