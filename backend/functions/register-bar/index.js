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
      Subject: { Data: `Welcome to TapTrivia — Your bar code is ${barCode}` },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #764ba2;">Welcome to TapTrivia!</h1>
              <p>Hi there! <strong>${barName}</strong> is now registered on TapTrivia.</p>
              <div style="background: #f5f0ff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #666;">Your permanent bar code:</p>
                <h2 style="font-size: 48px; letter-spacing: 12px; color: #764ba2; margin: 0;">${barCode}</h2>
              </div>
              <p>Enter this code in the TV app to activate your display.</p>
              <h3>Set Up Your Dashboard</h3>
              <p>Manage your digital signage, upload your logo, and view analytics:</p>
              <p><a href="https://dashboard.taptrivia.tv" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open Dashboard</a></p>
              <p style="color: #999; font-size: 12px; margin-top: 32px;">You'll use this email and bar code to log in. No password needed — we'll send you a one-time code each time.</p>
            </div>
          `
        },
        Text: {
          Data: `Welcome to TapTrivia!\n\n${barName} is registered. Your bar code: ${barCode}\n\nEnter this code in the TV app to activate.\n\nDashboard: https://dashboard.taptrivia.tv\nLog in with this email + your bar code.\n`
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

    if (!barName || !tvDeviceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'MISSING_FIELDS', message: 'barName and tvDeviceId are required', statusCode: 400 })
      };
    }

    // Check if this TV device already has an active bar
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

    // Geo-locate the caller IP
    const ip = event.requestContext?.http?.sourceIp || '';
    let geo = { city: '', state: '', country: '', latitude: 0, longitude: 0 };
    if (ip && !isPrivateIp(ip)) {
      geo = await fetchGeoLocation(ip);
    }

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
        tvDeviceId,
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

      // Add owner email if provided and valid
      const validEmail = ownerEmail && typeof ownerEmail === 'string' && EMAIL_REGEX.test(ownerEmail.trim());
      if (validEmail) {
        barItem.ownerEmail = ownerEmail.trim().toLowerCase();
        barItem.emailVerified = false;
      }

      try {
        await put(TABLE.BARS, barItem, 'attribute_not_exists(PK)');
        written = true;
        break;
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
          // Collision — retry with a new code
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
    if (barItem.ownerEmail) {
      try {
        await sendWelcomeEmail(barItem.ownerEmail, barName, barCode);
        console.log('Welcome email sent to:', barItem.ownerEmail);
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
        ownerEmail: barItem.ownerEmail || undefined
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
