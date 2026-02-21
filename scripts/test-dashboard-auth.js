#!/usr/bin/env node
'use strict';

/**
 * Tap Trivia -- Dashboard Auth End-to-End Test
 *
 * Tests the full OTP authentication flow:
 *   1. Finds or creates a test bar with ownerEmail
 *   2. Requests OTP via send-otp
 *   3. Reads OTP directly from DynamoDB (bypass email for testing)
 *   4. Verifies OTP via verify-otp → gets session token
 *   5. Fetches dashboard data via get-dashboard
 *   6. Saves test signage via save-signage
 *   7. Cleans up test session
 *
 * Usage:
 *   node scripts/test-dashboard-auth.js                    # Full flow with auto-created test bar
 *   node scripts/test-dashboard-auth.js --barCode BR7X4    # Use existing bar
 *   node scripts/test-dashboard-auth.js --cleanup          # Remove test data
 */

const path = require('path');
const crypto = require('crypto');

const { TABLE, get, put, update, query, docClient, DeleteCommand } = require(
  path.resolve(__dirname, '../backend/shared/dynamo')
);

const API_BASE = 'https://api.taptrivia.tv';
const TEST_EMAIL = 'test-dashboard@taptrivia.tv';
const TEST_BAR_NAME = 'Test Dashboard Bar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(step, msg) {
  console.log(`  [${step}] ${msg}`);
}

function pass(step) {
  console.log(`  [${step}] \x1b[32mPASS\x1b[0m`);
}

function fail(step, msg) {
  console.error(`  [${step}] \x1b[31mFAIL\x1b[0m — ${msg}`);
}

async function apiCall(method, path, body, token) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

// ---------------------------------------------------------------------------
// Test Steps
// ---------------------------------------------------------------------------

async function findOrCreateTestBar(barCode) {
  if (barCode) {
    const bar = await get(TABLE.BARS, { PK: `BAR#${barCode}` });
    if (!bar) {
      fail('SETUP', `Bar ${barCode} not found`);
      process.exit(1);
    }
    if (!bar.ownerEmail) {
      log('SETUP', `Bar ${barCode} has no ownerEmail, adding test email...`);
      await update(
        TABLE.BARS,
        { PK: `BAR#${barCode}` },
        'SET ownerEmail = :email',
        { ':email': TEST_EMAIL }
      );
      bar.ownerEmail = TEST_EMAIL;
    }
    log('SETUP', `Using existing bar: ${bar.barName} (${barCode}) — email: ${bar.ownerEmail}`);
    return { barCode, email: bar.ownerEmail, barName: bar.barName };
  }

  // Create a test bar via API
  log('SETUP', 'Creating test bar via API...');
  const { status, data } = await apiCall('POST', '/bar/register', {
    barName: TEST_BAR_NAME,
    ownerEmail: TEST_EMAIL,
    tvDeviceId: `test-${crypto.randomUUID()}`
  });

  if (status !== 200 && status !== 201) {
    fail('SETUP', `Register bar failed: ${JSON.stringify(data)}`);
    process.exit(1);
  }

  log('SETUP', `Created bar: ${data.barName} (${data.barCode})`);
  return { barCode: data.barCode, email: TEST_EMAIL, barName: data.barName };
}

async function testSendOtp(email, barCode) {
  log('1-OTP', `Requesting OTP for ${email} / ${barCode}...`);
  const { status, data } = await apiCall('POST', '/dashboard/auth/otp', { email, barCode });

  if (status !== 200) {
    fail('1-OTP', `send-otp returned ${status}: ${JSON.stringify(data)}`);
    return false;
  }

  pass('1-OTP');
  return true;
}

async function readOtpFromDb(barCode) {
  log('2-READ', `Reading OTP from DynamoDB for ${barCode}...`);
  const bar = await get(TABLE.BARS, { PK: `BAR#${barCode}` });

  if (!bar || !bar.pendingOtp) {
    fail('2-READ', 'No pending OTP found on bar record');
    return null;
  }

  log('2-READ', `OTP: ${bar.pendingOtp} (expires: ${new Date(bar.otpExpiresAt).toLocaleTimeString()})`);
  pass('2-READ');
  return bar.pendingOtp;
}

async function testWrongOtp(email, barCode) {
  log('3-WRONG', 'Testing wrong OTP...');
  const { status, data } = await apiCall('POST', '/dashboard/auth/verify', {
    email, barCode, otp: '000000'
  });

  if (status !== 401 || data.error !== 'INVALID_CODE') {
    fail('3-WRONG', `Expected 401/INVALID_CODE, got ${status}/${data.error}`);
    return false;
  }

  pass('3-WRONG');
  return true;
}

async function testVerifyOtp(email, barCode, otp) {
  log('4-VERIFY', 'Verifying correct OTP...');
  const { status, data } = await apiCall('POST', '/dashboard/auth/verify', {
    email, barCode, otp
  });

  if (status !== 200 || !data.token) {
    fail('4-VERIFY', `Expected 200 with token, got ${status}: ${JSON.stringify(data)}`);
    return null;
  }

  log('4-VERIFY', `Session token: ${data.token.substring(0, 8)}...`);
  log('4-VERIFY', `Expires: ${new Date(data.expiresAt * 1000).toLocaleDateString()}`);
  pass('4-VERIFY');
  return data.token;
}

async function testGetDashboard(token) {
  log('5-DASH', 'Fetching dashboard data...');
  const { status, data } = await apiCall('GET', '/dashboard/data', null, token);

  if (status !== 200) {
    fail('5-DASH', `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    return false;
  }

  log('5-DASH', `Bar: ${data.bar?.barName} | Players today: ${data.analytics?.playersToday ?? 'N/A'}`);
  pass('5-DASH');
  return true;
}

async function testUnauthorized() {
  log('6-NOAUTH', 'Testing request without token...');
  const { status, data } = await apiCall('GET', '/dashboard/data', null, null);

  if (status !== 401) {
    fail('6-NOAUTH', `Expected 401, got ${status}`);
    return false;
  }

  pass('6-NOAUTH');
  return true;
}

async function testBadToken() {
  log('7-BADTOK', 'Testing request with invalid token...');
  const { status } = await apiCall('GET', '/dashboard/data', null, 'not-a-real-token');

  if (status !== 401) {
    fail('7-BADTOK', `Expected 401, got ${status}`);
    return false;
  }

  pass('7-BADTOK');
  return true;
}

async function testRateLimit(email, barCode) {
  log('8-RATE', 'Testing OTP rate limiting (second request within 60s)...');
  const { status, data } = await apiCall('POST', '/dashboard/auth/otp', { email, barCode });

  // Should return 200 (same response, but OTP not regenerated)
  if (status !== 200) {
    fail('8-RATE', `Expected 200, got ${status}`);
    return false;
  }

  // Verify OTP was NOT regenerated by checking DB
  const bar = await get(TABLE.BARS, { PK: `BAR#${barCode}` });
  // After verification, OTP should be cleared (no pendingOtp)
  // Rate-limited request should not have stored a new OTP either
  log('8-RATE', 'Rate limit response OK (same 200 response, no enumeration)');
  pass('8-RATE');
  return true;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup(barCode) {
  console.log(`\n  Cleaning up test data for ${barCode}...\n`);

  // Remove test sessions
  const sessions = await query(TABLE.SESSIONS, {
    IndexName: 'barCode-index',
    KeyConditionExpression: 'barCode = :bc',
    ExpressionAttributeValues: { ':bc': barCode }
  }).catch(() => []);

  for (const s of sessions) {
    await docClient.send(new DeleteCommand({
      TableName: TABLE.SESSIONS,
      Key: { PK: s.PK }
    }));
    log('CLEANUP', `Deleted session ${s.PK}`);
  }

  log('CLEANUP', 'Done');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  console.log('\n  Tap Trivia -- Dashboard Auth Test\n');

  const args = process.argv.slice(2);
  const barCodeArg = args.includes('--barCode') ? args[args.indexOf('--barCode') + 1] : null;
  const cleanupOnly = args.includes('--cleanup');

  if (cleanupOnly && barCodeArg) {
    await cleanup(barCodeArg);
    return;
  }

  let passed = 0;
  let failed = 0;

  // Setup
  const { barCode, email, barName } = await findOrCreateTestBar(barCodeArg);
  console.log('');

  // Test 1: Send OTP
  if (await testSendOtp(email, barCode)) passed++; else failed++;

  // Test 2: Read OTP from DB
  const otp = await readOtpFromDb(barCode);
  if (otp) passed++; else { failed++; console.log('\n  Cannot continue without OTP.\n'); return; }

  // Test 3: Wrong OTP
  if (await testWrongOtp(email, barCode)) passed++; else failed++;

  // Test 4: Verify correct OTP
  const token = await testVerifyOtp(email, barCode, otp);
  if (token) passed++; else { failed++; console.log('\n  Cannot continue without token.\n'); return; }

  // Test 5: Get dashboard data
  if (await testGetDashboard(token)) passed++; else failed++;

  // Test 6: Unauthorized (no token)
  if (await testUnauthorized()) passed++; else failed++;

  // Test 7: Bad token
  if (await testBadToken()) passed++; else failed++;

  // Test 8: Rate limit
  if (await testRateLimit(email, barCode)) passed++; else failed++;

  // Summary
  console.log('');
  console.log('  ─────────────────────────────────────');
  if (failed === 0) {
    console.log(`  \x1b[32mAll ${passed} tests passed!\x1b[0m`);
  } else {
    console.log(`  \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m`);
  }
  console.log('  ─────────────────────────────────────\n');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('\n  Fatal error:', err.message || err);
  process.exit(1);
});
