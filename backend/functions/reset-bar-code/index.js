'use strict';

const crypto = require('crypto');
const { TABLE, get, put, update } = require('./shared/dynamo');

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 30 chars — no 0/O/1/I/L

function generateBarCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CHARS.charAt(crypto.randomInt(0, CHARS.length));
  }
  return code;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  try {
    const barCode = event.pathParameters?.barCode;
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { tvDeviceId } = body;

    if (!barCode || !tvDeviceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'MISSING_FIELDS', message: 'barCode and tvDeviceId are required' })
      };
    }

    // Fetch the existing bar
    const existingBar = await get(TABLE.BARS, { PK: `BAR#${barCode}` });

    if (!existingBar) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'BAR_NOT_FOUND', message: 'Location not found' })
      };
    }

    // Verify the TV device is authorized
    if (existingBar.tvDeviceId !== tvDeviceId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'UNAUTHORIZED_TV',
          message: 'This TV is not authorized to manage this location.'
        })
      };
    }

    // Mark old bar as inactive
    await update(
      TABLE.BARS,
      { PK: `BAR#${barCode}` },
      'SET #status = :inactive',
      { ':inactive': 'inactive' },
      { '#status': 'status' }
    );

    // Generate new bar code with collision retry
    const now = new Date().toISOString();
    let newBarCode;
    let written = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      newBarCode = generateBarCode();
      const newBarItem = {
        PK: `BAR#${newBarCode}`,
        barCode: newBarCode,
        barName: existingBar.barName,
        tvDeviceId,
        activePlayers: 0,
        city: existingBar.city || '',
        state: existingBar.state || '',
        country: existingBar.country || '',
        latitude: existingBar.latitude || 0,
        longitude: existingBar.longitude || 0,
        createdAt: now,
        lastPollAt: now,
        status: 'active'
      };

      try {
        await put(TABLE.BARS, newBarItem, 'attribute_not_exists(PK)');
        written = true;
        break;
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
          continue;
        }
        throw err;
      }
    }

    if (!written) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'CODE_GENERATION_FAILED', message: 'Unable to generate unique location code. Please try again.' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        oldBarCode: barCode,
        newBarCode,
        barName: existingBar.barName
      })
    };
  } catch (err) {
    console.error('reset-bar-code error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};
