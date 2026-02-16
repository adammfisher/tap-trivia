'use strict';

const { authenticate, unauthorized } = require('./shared/auth');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  try {
    const bar = await authenticate(event);
    if (!bar) return unauthorized();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        bar: {
          barCode: bar.barCode,
          barName: bar.barName,
          city: bar.city || '',
          state: bar.state || '',
          ownerEmail: bar.ownerEmail || '',
          emailVerified: bar.emailVerified || false,
          logoUrl: bar.logoUrl || null,
          logoHash: bar.logoHash || null
        },
        signage: bar.signage || {
          slides: [],
          rotationSpeed: 15,
          enabled: true
        },
        analytics: {
          // TODO: Phase 4 — query Answers table for real analytics
          totalGamesHosted: 0,
          totalUniquePlayers: 0,
          avgPlayersPerGame: 0,
          lastGameAt: null
        }
      })
    };
  } catch (err) {
    console.error('get-dashboard error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', statusCode: 500 })
    };
  }
};
