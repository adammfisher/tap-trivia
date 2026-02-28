'use strict';

const { TABLE, get } = require('./shared/dynamo');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { barCode } = body || {};

    if (!barCode || typeof barCode !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'MISSING_FIELDS', message: 'barCode is required' })
      };
    }

    const code = barCode.trim().toUpperCase();
    const bar = await get(TABLE.BARS, { PK: `BAR#${code}` });

    if (!bar || bar.status !== 'active') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'NOT_FOUND', message: 'Bar code not found or inactive' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        barCode: bar.barCode,
        barName: bar.barName,
        city: bar.city || '',
        state: bar.state || ''
      })
    };
  } catch (err) {
    console.error('tv-activate error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};
