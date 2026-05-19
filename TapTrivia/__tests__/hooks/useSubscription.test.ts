/**
 * useSubscription tests.
 *
 * Our expo-constants mock sets appOwnership='expo', which together with
 * __DEV__=true (set in jest globals) makes IS_SIMULATOR_OR_EXPO_GO=true.
 * In this mode the hook bypasses RevenueCat entirely and immediately sets
 * isPro=true, isLoading=false.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useSubscription } from '../../src/hooks/useSubscription';

// Mock the revenuecat service so we can verify it's not called in Expo Go mode
jest.mock('../../src/services/revenuecat', () => ({
  checkSubscription: jest.fn().mockResolvedValue(false),
  purchaseMonthly: jest.fn().mockResolvedValue(false),
  restorePurchases: jest.fn().mockResolvedValue(false),
  getOffering: jest.fn().mockResolvedValue(null),
  isConfigured: jest.fn().mockReturnValue(false),
}));

import {
  checkSubscription,
  getOffering,
  isConfigured,
} from '../../src/services/revenuecat';

beforeEach(() => {
  jest.clearAllMocks();
  (isConfigured as jest.Mock).mockReturnValue(false);
});

describe('useSubscription — Expo Go mode (IS_SIMULATOR_OR_EXPO_GO=true)', () => {
  test('isPro=true immediately in Expo Go without calling RevenueCat', async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isPro).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  test('checkSubscription from revenuecat is NOT called in Expo Go mode', async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(checkSubscription).not.toHaveBeenCalled();
  });

  test('getOffering from revenuecat is NOT called in Expo Go mode', async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getOffering).not.toHaveBeenCalled();
  });

  test('offering is null in Expo Go mode (no RC fetch)', async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.offering).toBeNull();
  });

  test('returns all expected hook fields', async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.purchase).toBe('function');
    expect(typeof result.current.restore).toBe('function');
    expect(typeof result.current.startFreeTrial).toBe('function');
  });
});
