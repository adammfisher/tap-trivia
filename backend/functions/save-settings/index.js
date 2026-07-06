'use strict';

const { TABLE, update } = require('./shared/dynamo');
const { authenticate, unauthorized } = require('./shared/auth');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

// Whitelisted venue settings and their expected types. Settings live as
// top-level attributes on the bar record (the existing convention — see
// adEligible, emailVerified). Add new settings here.
const SETTINGS = {
  housePlayersEnabled: 'boolean'
};

/**
 * PUT /dashboard/settings
 * Body: { housePlayersEnabled: boolean, ... } — any subset of SETTINGS.
 * Persists per-venue settings flags on the bar record.
 */
exports.handler = async (event) => {
  try {
    const bar = await authenticate(event);
    if (!bar) return unauthorized();

    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    if (!body || typeof body !== 'object') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'settings object is required' })
      };
    }

    const sets = [];
    const values = {};
    const applied = {};
    for (const [key, type] of Object.entries(SETTINGS)) {
      if (!(key in body)) continue;
      if (typeof body[key] !== type) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'INVALID_INPUT', message: `${key} must be a ${type}` })
        };
      }
      sets.push(`${key} = :${key}`);
      values[`:${key}`] = body[key];
      applied[key] = body[key];
    }

    if (sets.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'INVALID_INPUT',
          message: `No recognized settings provided. Valid: ${Object.keys(SETTINGS).join(', ')}`
        })
      };
    }

    const updatedAt = new Date().toISOString();
    sets.push('settingsUpdatedAt = :updatedAt');
    values[':updatedAt'] = updatedAt;

    await update(
      TABLE.BARS,
      { PK: `BAR#${bar.barCode}` },
      `SET ${sets.join(', ')}`,
      values
    );

    console.log('Settings saved for bar:', bar.barCode, JSON.stringify(applied));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, settings: applied, updatedAt })
    };
  } catch (err) {
    console.error('save-settings error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};
