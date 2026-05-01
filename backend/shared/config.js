/**
 * Centralized game config — reads from SSM Parameter Store.
 * Cached for 5 minutes so a toggle propagates within one poll cycle.
 *
 * Game modes:
 *   timed   — games run 4:00 PM – 4:00 AM ET (crosses midnight)
 *   all_on  — games run 24/7 (testing, App Store submission)
 *   all_off — no games, signage only
 *
 * Toggle:
 *   aws ssm put-parameter --name /taptrivia/prod/game_mode --value "all_on" --overwrite --region us-east-1
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const SSM_PARAM = '/taptrivia/prod/game_mode';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Timed window: 4 PM – 4 AM ET (crosses midnight)
const TIMED_START_MIN = 16 * 60; // 960  — 4:00 PM ET
const TIMED_END_MIN   =  4 * 60; // 240  — 4:00 AM ET

let _cached = null;
let _cachedAt = 0;

const ssm = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

/** Returns the current game mode from SSM (cached 5 min). */
async function getGameMode() {
  const now = Date.now();
  if (_cached && now - _cachedAt < CACHE_TTL_MS) return _cached;

  try {
    const res = await ssm.send(new GetParameterCommand({ Name: SSM_PARAM }));
    const mode = res.Parameter?.Value || 'timed';
    _cached = ['timed', 'all_on', 'all_off'].includes(mode) ? mode : 'timed';
  } catch (e) {
    console.warn('[config] SSM read failed, defaulting to timed:', e.message);
    _cached = _cached || 'timed';
  }

  _cachedAt = now;
  return _cached;
}

/**
 * Returns whether games should be active right now given the current mode.
 * @param {number} nowMinutesET - minutes since midnight in ET timezone
 */
function isGameActive(mode, nowMinutesET) {
  if (mode === 'all_on')  return true;
  if (mode === 'all_off') return false;
  // timed: 4 PM (960) to 4 AM (240) — crosses midnight
  return nowMinutesET >= TIMED_START_MIN || nowMinutesET < TIMED_END_MIN;
}

/**
 * Returns the full config object clients embed in API responses.
 */
async function getConfig(nowMinutesET) {
  const gameMode = await getGameMode();
  return {
    gameMode,
    isActive: isGameActive(gameMode, nowMinutesET ?? 0),
    windowStartMin: TIMED_START_MIN, // 960
    windowEndMin: TIMED_END_MIN,     // 240
  };
}

module.exports = { getGameMode, getConfig, isGameActive, TIMED_START_MIN, TIMED_END_MIN };
