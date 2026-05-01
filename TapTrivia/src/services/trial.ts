/**
 * Trial tracking — 7-day free trial before subscription required.
 *
 * Storage strategy:
 * - Backend player record is the authoritative source of truth (reinstall protection
 *   on both iOS and Android).
 * - SecureStore + AsyncStorage are local caches for offline use.
 *
 * getTrialStart() prefers the backend when reachable, syncing local caches to match
 * (including wiping them when the backend says no trial). Falls back to local caches
 * only when the backend is unreachable.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { TRIAL_DURATION_MS } from '../constants/revenuecat';
import { getPlayer, updatePlayer, isApiError } from './api';

const SECURE_KEY = 'taptrivia_trial_start';
const ASYNC_KEY = '@taptrivia:trialStartedAt';
const DEVICE_ID_KEY = '@taptrivia:deviceId';

export type TrialStatus = 'never_started' | 'active' | 'expired';

export interface TrialInfo {
  status: TrialStatus;
  daysRemaining: number;
}

async function readLocalCache(): Promise<number | null> {
  try {
    const secureVal = await SecureStore.getItemAsync(SECURE_KEY);
    if (secureVal) {
      const ts = parseInt(secureVal, 10);
      if (!isNaN(ts)) return ts;
    }
  } catch {}

  try {
    const asyncVal = await AsyncStorage.getItem(ASYNC_KEY);
    if (asyncVal) {
      const ts = parseInt(asyncVal, 10);
      if (!isNaN(ts)) return ts;
    }
  } catch {}

  return null;
}

async function writeLocalCache(ts: number): Promise<void> {
  const val = ts.toString();
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEY, val).catch(() => {}),
    AsyncStorage.setItem(ASYNC_KEY, val).catch(() => {}),
  ]);
}

async function clearLocalCache(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEY).catch(() => {}),
    AsyncStorage.removeItem(ASYNC_KEY).catch(() => {}),
  ]);
}

/**
 * Get the trial start timestamp. Backend is source of truth when reachable;
 * stale local caches are wiped to match. Returns null if trial never started.
 */
export async function getTrialStart(): Promise<number | null> {
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (deviceId) {
    try {
      const player = await getPlayer(deviceId);
      if (!isApiError(player)) {
        if (player.trialStartedAt) {
          await writeLocalCache(player.trialStartedAt);
          return player.trialStartedAt;
        }
        // Backend says no trial — wipe any stale local cache so the paywall fires.
        await clearLocalCache();
        return null;
      }
    } catch {
      // Backend unreachable — fall through to local cache.
    }
  }

  return readLocalCache();
}

/** Start the trial. Returns the trial start timestamp. */
export async function startTrial(): Promise<number> {
  const existing = await getTrialStart();
  if (existing) return existing;

  const now = Date.now();
  const val = now.toString();

  // Write locally first — synchronous from user's perspective
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEY, val).catch(() => {}),
    AsyncStorage.setItem(ASYNC_KEY, val).catch(() => {}),
  ]);

  // Sync to backend fire-and-forget (write-once on server — if_not_exists)
  // If player doesn't exist yet, this fails silently; NicknameScreen will
  // persist trialStartedAt when the player record is first created.
  (async () => {
    try {
      const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (deviceId) {
        await updatePlayer(deviceId, undefined, undefined, now);
      }
    } catch {
      // Ignore — NicknameScreen is the guaranteed write path
    }
  })();

  return now;
}

/** Check trial status: never_started, active, or expired. */
export async function checkTrial(): Promise<TrialInfo> {
  const trialStart = await getTrialStart();

  if (!trialStart) {
    return { status: 'never_started', daysRemaining: 0 };
  }

  const elapsed = Date.now() - trialStart;
  const remaining = TRIAL_DURATION_MS - elapsed;
  const daysRemaining = Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));

  return {
    status: remaining > 0 ? 'active' : 'expired',
    daysRemaining,
  };
}
