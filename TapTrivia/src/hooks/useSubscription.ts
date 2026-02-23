import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import type { PurchasesOffering } from 'react-native-purchases';
import {
  checkSubscription,
  purchaseMonthly,
  restorePurchases as rcRestore,
  getOffering,
} from '../services/revenuecat';

interface UseSubscription {
  isPro: boolean;
  isLoading: boolean;
  offering: PurchasesOffering | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
}

/**
 * RevenueCat subscription hook.
 * On non-iOS platforms, always returns isPro=true (no paywall).
 */
export function useSubscription(): UseSubscription {
  const [isPro, setIsPro] = useState(Platform.OS !== 'ios');
  const [isLoading, setIsLoading] = useState(Platform.OS === 'ios');
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    (async () => {
      const [entitled, off] = await Promise.all([checkSubscription(), getOffering()]);
      if (cancelled) return;
      setIsPro(entitled);
      setOffering(off);
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const purchase = useCallback(async () => {
    if (Platform.OS !== 'ios') return true;
    setIsLoading(true);
    const ok = await purchaseMonthly();
    setIsPro(ok);
    setIsLoading(false);
    return ok;
  }, []);

  const restore = useCallback(async () => {
    if (Platform.OS !== 'ios') return true;
    setIsLoading(true);
    const ok = await rcRestore();
    setIsPro(ok);
    setIsLoading(false);
    return ok;
  }, []);

  return { isPro, isLoading, offering, purchase, restore };
}
