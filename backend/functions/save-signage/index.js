'use strict';

const { TABLE, update } = require('./shared/dynamo');
const { authenticate, unauthorized } = require('./shared/auth');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const VALID_TEMPLATES = ['specials', 'happyhour', 'event', 'brand', 'announcement', 'sports', 'custom'];
const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_SLIDES = 10;
const MAX_SIGNAGE_SIZE = 50 * 1024; // 50KB

exports.handler = async (event) => {
  try {
    const bar = await authenticate(event);
    if (!bar) return unauthorized();

    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { signage } = body || {};

    if (!signage || typeof signage !== 'object') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'signage object is required' })
      };
    }

    // Validate signage structure
    if (!Array.isArray(signage.slides)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'signage.slides must be an array' })
      };
    }

    if (signage.slides.length > MAX_SLIDES) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: `Maximum ${MAX_SLIDES} slides allowed` })
      };
    }

    if (typeof signage.rotationSpeed !== 'number' || signage.rotationSpeed < 5 || signage.rotationSpeed > 60) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'rotationSpeed must be a number between 5 and 60' })
      };
    }

    if (typeof signage.enabled !== 'boolean') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'enabled must be a boolean' })
      };
    }

    // Validate each slide
    for (const slide of signage.slides) {
      if (!slide.id || typeof slide.id !== 'string') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Each slide must have a string id' })
        };
      }

      if (!VALID_TEMPLATES.includes(slide.template)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'INVALID_INPUT', message: `Invalid template: ${slide.template}. Valid templates: ${VALID_TEMPLATES.join(', ')}` })
        };
      }

      if (typeof slide.enabled !== 'boolean') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Each slide must have a boolean enabled field' })
        };
      }

      if (!slide.data || typeof slide.data !== 'object') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Each slide must have a data object' })
        };
      }

      if (!slide.schedule || typeof slide.schedule !== 'object') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Each slide must have a schedule object' })
        };
      }

      if (Array.isArray(slide.schedule.days)) {
        for (const day of slide.schedule.days) {
          if (!VALID_DAYS.includes(day)) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'INVALID_INPUT', message: `Invalid day: ${day}. Valid days: ${VALID_DAYS.join(', ')}` })
            };
          }
        }
      }
    }

    // Check total signage size
    const signageJson = JSON.stringify(signage);
    if (signageJson.length > MAX_SIGNAGE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Signage configuration is too large (max 50KB)' })
      };
    }

    // Save to Bars table
    const updatedAt = new Date().toISOString();
    await update(
      TABLE.BARS,
      { PK: `BAR#${bar.barCode}` },
      'SET signage = :s, signageUpdatedAt = :t',
      { ':s': signage, ':t': updatedAt }
    );

    console.log('Signage saved for bar:', bar.barCode, 'slides:', signage.slides.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        slideCount: signage.slides.length,
        updatedAt: updatedAt
      })
    };
  } catch (err) {
    console.error('save-signage error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};
