'use strict';

const { TABLE, get, update } = require('./shared/dynamo');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'us-east-1' });

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds between OTP requests

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(email, barName, otp) {
  const params = {
    Source: 'TapTrivia <noreply@taptrivia.tv>',
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: `Your TapTrivia login code: ${otp}` },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #764ba2;">TapTrivia Login Code</h1>
              <p>Your one-time login code for <strong>${barName}</strong> is:</p>
              <div style="background: #f5f0ff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <h2 style="font-size: 48px; letter-spacing: 12px; color: #764ba2; margin: 0;">${otp}</h2>
              </div>
              <p>This code expires in 10 minutes.</p>
              <p style="color: #999; font-size: 12px; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `
        },
        Text: {
          Data: `Your TapTrivia login code for ${barName} is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, you can safely ignore this email.`
        }
      }
    }
  };

  await ses.send(new SendEmailCommand(params));
}

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { email, barCode } = body || {};

    // Validate input
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_EMAIL', message: 'A valid email address is required' })
      };
    }

    if (!barCode || typeof barCode !== 'string' || barCode.trim().length < 3 || barCode.trim().length > 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_BAR_CODE', message: 'A valid bar code is required' })
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedBarCode = barCode.trim().toUpperCase();

    // Always return the same response to prevent enumeration
    const successResponse = {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'If this email and code match our records, a code has been sent.' })
    };

    // Look up bar record
    const bar = await get(TABLE.BARS, { PK: `BAR#${normalizedBarCode}` });

    if (!bar) {
      console.log('OTP request for non-existent bar:', normalizedBarCode);
      return successResponse;
    }

    if (!bar.ownerEmail || bar.ownerEmail.toLowerCase() !== normalizedEmail) {
      console.log('OTP request with mismatched email for bar:', normalizedBarCode);
      return successResponse;
    }

    // Rate limit: if OTP was generated less than 60 seconds ago, skip
    if (bar.otpExpiresAt) {
      const otpCreatedAt = bar.otpExpiresAt - OTP_EXPIRY_MS;
      if (Date.now() - otpCreatedAt < OTP_COOLDOWN_MS) {
        console.log('OTP rate limited for', normalizedBarCode);
        return successResponse;
      }
    }

    // Generate and store OTP
    const otp = generateOtp();
    await update(
      TABLE.BARS,
      { PK: `BAR#${normalizedBarCode}` },
      'SET pendingOtp = :otp, otpExpiresAt = :exp, otpAttempts = :zero',
      { ':otp': otp, ':exp': Date.now() + OTP_EXPIRY_MS, ':zero': 0 }
    );

    // Send OTP email
    try {
      await sendOtpEmail(normalizedEmail, bar.barName, otp);
      console.log('OTP sent for bar:', normalizedBarCode);
    } catch (emailErr) {
      console.error('Failed to send OTP email:', emailErr);
      // Still return success to prevent enumeration
    }

    return successResponse;
  } catch (err) {
    console.error('send-otp error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};
