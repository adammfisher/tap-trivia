import { useState, useEffect, useCallback, useRef } from 'react';
import type { PurchasesOffering } from 'react-native-purchases';
import {
  checkSubscription,
  purchaseMonthly,
  restorePurchases as rcRestore,
  getOffering,
  isConfigured,
} from '../services/revenuecat';

interface UseSubscription {
  /** True if user has an active subscription (RevenueCat only) */
  isPro: boolean;
  /** True while checking subscription status */
  isLoading: boolean;
  /** RevenueCat offering for purchase UI */
  offering: PurchasesOffering | null;
  /** Trigger a purchase. Returns true on success. */
  purchase: () => Promise<boolean>;
  /** Restore previous purchases. Returns true on success. */
  restore: () => Promise<boolean>;
}

const FORCE_PRO = false;

export function useSubscription(): UseSubscription {
  // Start with isPro = true and isLoading = true so nothing renders the paywall
  // until we've confirmed the user is NOT subscribed
  const [isPro, setIsPro] = useState(true);
  const [isLoading, setIsLoading] = useState(!FORCE_PRO);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (FORCE_PRO || checkedRef.current) return;
    checkedRef.current = true;
    let cancelled = false;

    (async () => {
      if (isConfigured()) {
        const [entitled, off] = await Promise.all([checkSubscription(), getOffering()]);
        if (!cancelled) {
          setIsPro(entitled);
          setOffering(off);
          setIsLoading(false);
        }
      } else {
        // RevenueCat not configured (Expo Go, emulator)
        if (!cancelled) {
          setIsPro(false);
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const purchase = useCallback(async () => {
    if (!isConfigured()) return false;
    setIsLoading(true);
    const ok = await purchaseMonthly();
    setIsPro(ok);
    setIsLoading(false);
    return ok;
  }, []);

  const restore = useCallback(async () => {
    if (!isConfigured()) return false;
    setIsLoading(true);
    const ok = await rcRestore();
    setIsPro(ok);
    setIsLoading(false);
    return ok;
  }, []);

  return { isPro: FORCE_PRO || isPro, isLoading, offering, purchase, restore };
}
