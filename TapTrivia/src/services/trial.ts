/**
 * Trial tracking — 7-day free trial before subscription required.
 *
 * Storage strategy (layered, most reliable first):
 * 1. SecureStore (Keychain on iOS) — survives app reinstall on iOS
 * 2. AsyncStorage — fast local fallback
 * 3. Backend player record — source of truth for Android reinstall protection
 *
 * startTrial() writes locally immediately, then syncs to backend (fire-and-forget).
 * getTrialStart() checks local first; falls back to backend if both local stores miss.
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

/** Get the trial start timestamp. Returns null if trial never started. */
export async function getTrialStart(): Promise<number | null> {
  // 1. SecureStore (survives iOS reinstall)
  try {
    const secureVal = await SecureStore.getItemAsync(SECURE_KEY);
    if (secureVal) {
      const ts = parseInt(secureVal, 10);
      if (!isNaN(ts)) {
        await AsyncStorage.setItem(ASYNC_KEY, secureVal).catch(() => {});
        return ts;
      }
    }
  } catch {
    // SecureStore not available (web, Expo Go) — fall through
  }

  // 2. AsyncStorage
  try {
    const asyncVal = await AsyncStorage.getItem(ASYNC_KEY);
    if (asyncVal) {
      const ts = parseInt(asyncVal, 10);
      if (!isNaN(ts)) {
        await SecureStore.setItemAsync(SECURE_KEY, asyncVal).catch(() => {});
        return ts;
      }
    }
  } catch {
    // AsyncStorage failure
  }

  // 3. Backend fallback — handles Android reinstall (local storage wiped)
  try {
    const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (deviceId) {
      const player = await getPlayer(deviceId);
      if (!isApiError(player) && player.trialStartedAt) {
        const ts = player.trialStartedAt;
        // Re-cache locally so next call is instant
        await Promise.all([
          SecureStore.setItemAsync(SECURE_KEY, ts.toString()).catch(() => {}),
          AsyncStorage.setItem(ASYNC_KEY, ts.toString()).catch(() => {}),
        ]);
        return ts;
      }
    }
  } catch {
    // Backend unreachable — treat as no trial
  }

  return null;
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
