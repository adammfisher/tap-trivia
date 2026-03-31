'use strict';

const crypto = require('crypto');
const { TABLE, get, put, update } = require('./shared/dynamo');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_OTP_ATTEMPTS = 5;
const SESSION_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { email, barCode, otp } = body || {};

    // Validate input
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'A valid email address is required' })
      };
    }

    if (!barCode || typeof barCode !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'Bar code is required' })
      };
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_INPUT', message: 'A 6-digit code is required' })
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedBarCode = barCode.trim().toUpperCase();

    // Look up bar record
    const bar = await get(TABLE.BARS, { PK: `BAR#${normalizedBarCode}` });

    if (!bar || !bar.ownerEmail || bar.ownerEmail.toLowerCase() !== normalizedEmail) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or bar code' })
      };
    }

    // Check attempt count
    if ((bar.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Request a new code.' })
      };
    }

    // Check OTP expiry
    if (!bar.otpExpiresAt || bar.otpExpiresAt < Date.now()) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'CODE_EXPIRED', message: 'Code expired. Request a new one.' })
      };
    }

    // Check OTP match
    if (bar.pendingOtp !== otp) {
      // Increment attempt count
      await update(
        TABLE.BARS,
        { PK: `BAR#${normalizedBarCode}` },
        'SET otpAttempts = if_not_exists(otpAttempts, :zero) + :one',
        { ':zero': 0, ':one': 1 }
      );
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'INVALID_CODE', message: 'Invalid code' })
      };
    }

    // OTP is valid — clear it and mark email as verified
    await update(
      TABLE.BARS,
      { PK: `BAR#${normalizedBarCode}` },
      'REMOVE pendingOtp, otpExpiresAt, otpAttempts SET emailVerified = :t',
      { ':t': true }
    );

    // Generate session token
    const token = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const ttl = now + SESSION_TTL_SECONDS;

    // Write session
    await put(TABLE.SESSIONS, {
      PK: `SESSION#${token}`,
      barCode: normalizedBarCode,
      ownerEmail: normalizedEmail,
      createdAt: new Date().toISOString(),
      ttl: ttl
    });

    console.log('Session created for bar:', normalizedBarCode);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token: token,
        barCode: normalizedBarCode,
        barName: bar.barName,
        expiresAt: ttl
      })
    };
  } catch (err) {
    console.error('verify-otp error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};
