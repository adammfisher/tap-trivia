'use strict';

const { TABLE, get } = require('./shared/dynamo');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  try {
    const barCode = event.pathParameters?.barCode;

    if (!barCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'MISSING_BAR_CODE', message: 'barCode is required' })
      };
    }

    const bar = await get(TABLE.BARS, { PK: `BAR#${barCode}` });

    if (!bar || bar.status !== 'active') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'BAR_NOT_FOUND', message: 'Bar not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        barCode: bar.barCode,
        barName: bar.barName,
        city: bar.city,
        state: bar.state,
        activePlayers: bar.activePlayers,
        status: bar.status
      })
    };
  } catch (err) {
    console.error('get-bar error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};
