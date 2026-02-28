'use strict';

const { TABLE, put, query } = require('./shared/dynamo');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'us-east-1' });
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 30 chars — no 0/O/1/I/L

function generateBarCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

function isPrivateIp(ip) {
  if (!ip) return true;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('172.22.') ||
    ip.startsWith('172.23.') ||
    ip.startsWith('172.24.') ||
    ip.startsWith('172.25.') ||
    ip.startsWith('172.26.') ||
    ip.startsWith('172.27.') ||
    ip.startsWith('172.28.') ||
    ip.startsWith('172.29.') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.') ||
    ip.startsWith('fd') ||
    ip.startsWith('fe80')
  );
}

function fetchGeoLocation(ip) {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.get(`http://ip-api.com/json/${ip}?fields=status,city,regionName,region,countryCode,lat,lon`, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'success') {
            resolve({ city: json.city || '', state: json.region || '', country: json.countryCode || '', latitude: json.lat || 0, longitude: json.lon || 0 });
          } else {
            resolve({ city: '', state: '', country: '', latitude: 0, longitude: 0 });
          }
        } catch { resolve({ city: '', state: '', country: '', latitude: 0, longitude: 0 }); }
      });
    });
    req.on('error', () => resolve({ city: '', state: '', country: '', latitude: 0, longitude: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ city: '', state: '', country: '', latitude: 0, longitude: 0 }); });
  });
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

async function sendWelcomeEmail(email, barName, barCode) {
  const params = {
    Source: 'TapTrivia <noreply@taptrivia.tv>',
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: `Welcome to TapTrivia — Your code is ${barCode}` },
      Body: {
        Html: {
          Data: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <span style="font-size: 32px; font-weight: 700; color: #764ba2;">TapTrivia</span>
              </div>
              <p style="font-size: 18px; color: #333; margin: 0 0 4px; text-align: center;">
                <strong>${barName}</strong> is now registered!
              </p>
              <p style="font-size: 15px; color: #666; margin: 0 0 32px; text-align: center;">
                Use this code on your TV to activate your display.
              </p>
              <div style="background-color: #f5f0ff; border: 2px solid #e0d4f5; border-radius: 12px; padding: 28px; margin: 0 0 28px; text-align: center;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 3px; color: #999; margin-bottom: 12px;">Your Location Code</div>
                <div style="font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #764ba2;">${barCode}</div>
              </div>
              <p style="font-size: 14px; color: #888; margin: 0 0 28px; text-align: center;">
                Use this same code on all your TVs &mdash; one code activates every screen.
              </p>
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="https://admin.taptrivia.tv" style="display: inline-block; background-color: #764ba2; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
                  Open Your Dashboard
                </a>
              </div>
              <p style="font-size: 13px; color: #999; text-align: center; margin: 0 0 32px;">
                Log in with this email + your bar code. No password needed.
              </p>
              <p style="font-size: 12px; color: #bbb; text-align: center; margin: 0; border-top: 1px solid #eee; padding-top: 20px;">
                taptrivia.tv &middot; Free for venues &middot; Powered by Visudo Labs
              </p>
            </div>
          `
        },
        Text: {
          Data: `Welcome to TapTrivia!\n\n${barName} is registered. Your location code: ${barCode}\n\nEnter this code on your TV to activate.\nUse the same code on all your TVs.\n\nDashboard: https://admin.taptrivia.tv\nLog in with this email + your bar code.\n`
        }
      }
    }
  };

  await ses.send(new SendEmailCommand(params));
}

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { barName, tvDeviceId, ownerEmail } = body;

    if (!barName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'MISSING_FIELDS', message: 'barName is required', statusCode: 400 })
      };
    }

    // Only check existing device when tvDeviceId is provided
    if (tvDeviceId) {
      const existingBars = await query(TABLE.BARS, {
        IndexName: 'tvDeviceId-index',
        KeyConditionExpression: 'tvDeviceId = :tvId',
        ExpressionAttributeValues: { ':tvId': tvDeviceId }
      });

      const activeBar = existingBars.find(b => b.status === 'active');
      if (activeBar) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            barCode: activeBar.barCode,
            barName: activeBar.barName,
            city: activeBar.city,
            state: activeBar.state,
            isNew: false
          })
        };
      }
    }

    // Geo-locate the caller IP
    const ip = event.requestContext?.http?.sourceIp || '';
    let geo = { city: '', state: '', country: '', latitude: 0, longitude: 0 };
    if (ip && !isPrivateIp(ip)) {
      geo = await fetchGeoLocation(ip);
    }

    // Validate owner email upfront
    const validEmail = ownerEmail && typeof ownerEmail === 'string' && EMAIL_REGEX.test(ownerEmail.trim());
    const cleanEmail = validEmail ? ownerEmail.trim().toLowerCase() : null;

    // Generate a unique bar code with retry on collision
    const now = new Date().toISOString();
    let barCode;
    let written = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      barCode = generateBarCode();
      const barItem = {
        PK: `BAR#${barCode}`,
        barCode,
        barName,
        activePlayers: 0,
        city: geo.city,
        state: geo.state,
        country: geo.country,
        latitude: geo.latitude,
        longitude: geo.longitude,
        createdAt: now,
        lastPollAt: now,
        status: 'active'
      };

      // Only include tvDeviceId if provided
      if (tvDeviceId) {
        barItem.tvDeviceId = tvDeviceId;
      }

      if (cleanEmail) {
        barItem.ownerEmail = cleanEmail;
        barItem.emailVerified = false;
      }

      try {
        await put(TABLE.BARS, barItem, 'attribute_not_exists(PK)');
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
        body: JSON.stringify({ error: 'CODE_GENERATION_FAILED', message: 'Unable to generate unique bar code. Please try again.', statusCode: 500 })
      };
    }

    // Send welcome email if owner email was provided
    if (cleanEmail) {
      try {
        await sendWelcomeEmail(cleanEmail, barName, barCode);
        console.log('Welcome email sent to:', cleanEmail);
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
        // Don't fail the registration if email fails
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        barCode,
        barName,
        city: geo.city,
        state: geo.state,
        isNew: true,
        ownerEmail: cleanEmail || undefined
      })
    };
  } catch (err) {
    console.error('register-bar error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', statusCode: 500 })
    };
  }
};
