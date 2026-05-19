'use strict';

const crypto = require('crypto');
const { get, TABLE } = require('./dynamo');

/**
 * Validates a session token from the Authorization header.
 * Returns the bar record if valid, or null if invalid/expired.
 *
 * Usage in any dashboard Lambda:
 *   const { authenticate, unauthorized } = require('./shared/auth');
 *   const bar = await authenticate(event);
 *   if (!bar) return unauthorized();
 */
async function authenticate(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) return null;

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await get(TABLE.SESSIONS, { PK: `SESSION#${tokenHash}` });

    if (!session) return null;

    // Check if session has expired (belt + suspenders with DynamoDB TTL)
    const now = Math.floor(Date.now() / 1000);
    if (session.ttl && session.ttl < now) return null;

    // Fetch the bar record
    const bar = await get(TABLE.BARS, { PK: `BAR#${session.barCode}` });

    if (!bar) return null;

    return bar;
  } catch (err) {
    console.error('Auth error:', err);
    return null;
  }
}

/**
 * Standard 401 response matching existing API patterns
 */
function unauthorized() {
  return {
    statusCode: 401,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ error: 'Unauthorized' })
  };
}

module.exports = { authenticate, unauthorized };
