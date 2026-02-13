'use strict';

const { TABLE, put, query } = require('./shared/dynamo');

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

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { barName, tvDeviceId } = body;

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        barCode,
        barName,
        city: geo.city,
        state: geo.state,
        isNew: true
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
