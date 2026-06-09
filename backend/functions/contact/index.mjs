import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: 'us-east-1' });

const ALLOWED_ORIGINS = [
  'https://taptrivia.tv',
  'https://www.taptrivia.tv',
  'https://taptrivia.com',
  'https://www.taptrivia.com',
  'http://localhost:5173'
];

const FROM_EMAIL = 'adam.fisher@visudolabs.com';
// Leads are delivered to both inboxes (Gmail is the known-good fallback).
const TO_EMAILS = ['adam.fisher@visudolabs.com', 'adammfisher@gmail.com'];

function getCorsOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

function response(statusCode, body, event) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getCorsOrigin(event),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const handler = async (event) => {
  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return response(200, {}, event);
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { name, email, venue, message } = body || {};

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return response(400, { error: 'VALIDATION_ERROR', message: 'Name is required' }, event);
    }
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return response(400, { error: 'VALIDATION_ERROR', message: 'Email is required' }, event);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return response(400, { error: 'VALIDATION_ERROR', message: 'Invalid email address' }, event);
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return response(400, { error: 'VALIDATION_ERROR', message: 'Message is required' }, event);
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedVenue = venue ? venue.trim() : '';
    const trimmedMessage = message.trim();

    // Build plain text body
    const textLines = [
      `Name: ${trimmedName}`,
      `Email: ${trimmedEmail}`,
      trimmedVenue ? `Venue: ${trimmedVenue}` : '',
      '',
      'Message:',
      trimmedMessage
    ].filter(line => line !== '' || true); // keep blank lines for spacing

    const textBody = textLines.join('\n');

    // Build HTML body
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #764ba2; margin-bottom: 24px;">TapTrivia Contact Form</h1>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top; width: 80px;">Name:</td>
            <td style="padding: 8px 12px;">${escapeHtml(trimmedName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Email:</td>
            <td style="padding: 8px 12px;"><a href="mailto:${escapeHtml(trimmedEmail)}" style="color: #667eea;">${escapeHtml(trimmedEmail)}</a></td>
          </tr>
          ${trimmedVenue ? `
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Venue:</td>
            <td style="padding: 8px 12px;">${escapeHtml(trimmedVenue)}</td>
          </tr>
          ` : ''}
        </table>
        <div style="background: #f5f0ff; border-radius: 12px; padding: 20px; margin-top: 16px;">
          <h3 style="color: #764ba2; margin: 0 0 12px 0;">Message</h3>
          <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(trimmedMessage)}</p>
        </div>
      </div>
    `;

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: TO_EMAILS },
      ReplyToAddresses: [trimmedEmail],
      Message: {
        Subject: { Data: `TapTrivia Contact: ${trimmedName}` },
        Body: {
          Text: { Data: textBody },
          Html: { Data: htmlBody }
        }
      }
    });

    await ses.send(command);
    console.log(`Contact form submitted by ${trimmedName} <${trimmedEmail}>`);

    return response(200, { success: true }, event);
  } catch (err) {
    console.error('Contact form error:', err);

    if (err instanceof SyntaxError) {
      return response(400, { error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, event);
    }

    return response(500, { error: 'SEND_FAILED', message: 'Failed to send message. Please try again later.' }, event);
  }
};
