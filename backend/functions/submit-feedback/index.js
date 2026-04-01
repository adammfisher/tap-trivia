'use strict';

const { TABLE, put } = require('./shared/dynamo');
const crypto = require('crypto');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'us-east-1' });
const FEEDBACK_EMAIL = 'adam.fisher@visudolabs.com';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

function response(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const playerId = event.headers?.['x-player-id'] || event.headers?.['X-Player-ID'];

    const { message, category, email, nickname, barCode, platform, appVersion } = body || {};

    // Validate required field
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return response(400, { error: 'MISSING_MESSAGE', message: 'Feedback message is required' });
    }

    if (message.trim().length > 2000) {
      return response(400, { error: 'MESSAGE_TOO_LONG', message: 'Feedback must be 2000 characters or less' });
    }

    // Validate optional email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response(400, { error: 'INVALID_EMAIL', message: 'Please provide a valid email address' });
    }

    // Validate category
    const validCategories = ['bug', 'feature', 'general'];
    const feedbackCategory = category && validCategories.includes(category) ? category : 'general';

    const feedbackId = crypto.randomUUID();
    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + (365 * 24 * 60 * 60); // 1 year

    await put(TABLE.FEEDBACK, {
      PK: `FEEDBACK#${feedbackId}`,
      feedbackId,
      message: message.trim(),
      category: feedbackCategory,
      email: email || undefined,
      playerId: playerId || 'anonymous',
      nickname: nickname || undefined,
      barCode: barCode || undefined,
      platform: platform || undefined,
      appVersion: appVersion || undefined,
      createdAt: now.toISOString(),
      ttl
    });

    console.log(`Feedback submitted: ${feedbackId} (${feedbackCategory}) from ${playerId || 'anonymous'}`);

    // Send email notification (fire-and-forget)
    ses.send(new SendEmailCommand({
      Source: 'noreply@taptrivia.tv',
      Destination: { ToAddresses: [FEEDBACK_EMAIL] },
      Message: {
        Subject: { Data: `TapTrivia Feedback [${feedbackCategory}] from ${nickname || playerId || 'anonymous'}` },
        Body: {
          Text: { Data: [
            `Category: ${feedbackCategory}`,
            `From: ${nickname || 'anonymous'} (${playerId || 'no-id'})`,
            email ? `Email: ${email}` : '',
            barCode ? `Location: ${barCode}` : '',
            platform ? `Platform: ${platform}` : '',
            appVersion ? `App Version: ${appVersion}` : '',
            '',
            `Message:`,
            message.trim(),
          ].filter(Boolean).join('\n') },
        },
      },
    })).catch(err => console.error('Failed to send feedback email:', err.message));

    return response(200, { success: true, feedbackId });
  } catch (err) {
    console.error('submit-feedback error:', err);
    return response(500, { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  }
};
