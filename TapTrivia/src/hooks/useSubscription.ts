import { useState, useEffect, useCallback, useRef } from 'react';
import type { PurchasesOffering } from 'react-native-purchases';
import {
  checkSubscription,
  purchaseMonthly,
  restorePurchases as rcRestore,
  getOffering,
  isConfigured,
} from '../services/revenuecat';
import { checkTrial } from '../services/trial';

interface UseSubscription {
  /** True if user has an active subscription OR an active trial */
  isPro: boolean;
  /** True while checking subscription status */
  isLoading: boolean;
  /** RevenueCat offering for purchase UI */
  offering: PurchasesOffering | null;
  /** Trigger a purchase. Returns true on success. */
  purchase: () => Promise<boolean>;
  /** Restore previous purchases. Returns true on success. */
  restore: () => Promise<boolean>;
  /** Start the free trial (user-initiated from paywall). Returns true on success. */
  startFreeTrial: () => Promise<boolean>;
}

export function useSubscription(): UseSubscription {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    let cancelled = false;

    (async () => {
      // Check RevenueCat subscription and existing trial in parallel.
      // Trial is NOT auto-started here — user must opt in from the paywall.
      const [trialInfo, off] = await Promise.all([
        checkTrial(),
        isConfigured() ? getOffering() : Promise.resolve(null),
      ]);

      const trialActive = trialInfo.status === 'active';

      let rcEntitled = false;
      if (isConfigured()) {
        rcEntitled = await checkSubscription();
      }

      if (!cancelled) {
        setIsPro(rcEntitled || trialActive);
        setOffering(off);
        setIsLoading(false);
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

  // "Start Free Trial" routes through the same RevenueCat purchase path as
  // the regular subscribe button. The intro offer (configured in App Store
  // Connect / Play Console as a 7-day free trial on the monthly product)
  // is applied automatically by the store when the user is eligible — they
  // see the native confirmation sheet ("Free for 7 days, then $2.99/month,
  // cancel anytime"), authenticate, and a payment method is captured up
  // front. Day 8 the store auto-charges. No second decision moment.
  //
  // Existing soft-trial users (started a trial under the old client-tracked
  // flow) keep their remaining days via checkTrial() in the useEffect above
  // — when their soft trial expires they hit the paywall and go through
  // this same path.
  const startFreeTrial = useCallback(async () => {
    if (!isConfigured()) return false;
    setIsLoading(true);
    const ok = await purchaseMonthly();
    setIsPro(ok);
    setIsLoading(false);
    return ok;
  }, []);

  return { isPro, isLoading, offering, purchase, restore, startFreeTrial };
}
