/**
 * Tap Trivia Player App — API Client
 */

async function apiCall(method, path, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Player-ID': localStorage.getItem('tt_player_id') || ''
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${CONFIG.API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) data._statusCode = res.status;
    return data;
  } catch (err) {
    console.error('API error:', err);
    return { error: 'NETWORK_ERROR', message: 'Network error — check your connection.' };
  }
}
