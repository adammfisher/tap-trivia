import { useState, useCallback } from 'react';

/**
 * Subscription hook — mock implementation for Phase 1.
 * Always grants access. Will be replaced with RevenueCat in Phase 2.
 */
export function useSubscription() {
  const [isSubscribed] = useState(true); // Always grant access for now
  const [isLoading] = useState(false);

  const purchase = useCallback(async () => {
    // Will call RevenueCat in Phase 2
  }, []);

  const restore = useCallback(async () => {
    // Will call RevenueCat in Phase 2
  }, []);

  return {
    isSubscribed,
    isLoading,
    purchase,
    restore,
  };
}
