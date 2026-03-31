'use strict';

const { TABLE, put } = require('./shared/dynamo');

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 30 chars — no 0/O/1/I/L

function generateCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { groupName } = body;
    const playerId = event.headers?.['x-player-id'] || event.headers?.['X-Player-ID'];

    if (!playerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'MISSING_PLAYER_ID', message: 'X-Player-ID header is required' })
      };
    }

    const name = (groupName || '').trim();
    if (name.length < 2 || name.length > 30) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_NAME', message: 'Group name must be 2-30 characters' })
      };
    }

    // Generate a unique code with retry on collision
    const now = new Date().toISOString();
    let barCode;
    let written = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      barCode = generateCode();
      try {
        await put(TABLE.BARS, {
          PK: `BAR#${barCode}`,
          barCode,
          barName: name,
          type: 'group',
          createdBy: playerId,
          activePlayers: 0,
          status: 'active',
          createdAt: now,
          lastPollAt: now
        }, 'attribute_not_exists(PK)');
        written = true;
        break;
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') continue;
        throw err;
      }
    }

    if (!written) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'CODE_GENERATION_FAILED', message: 'Unable to generate unique code. Please try again.' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ barCode, barName: name, type: 'group' })
    };
  } catch (err) {
    console.error('create-group error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};
