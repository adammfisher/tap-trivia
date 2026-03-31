import { useState, useEffect, useCallback } from 'react';
import type { PurchasesOffering } from 'react-native-purchases';
import {
  checkSubscription,
  purchaseMonthly,
  restorePurchases as rcRestore,
  getOffering,
  isConfigured,
} from '../services/revenuecat';
import { checkTrial, startTrial } from '../services/trial';
import type { TrialStatus } from '../services/trial';

interface UseSubscription {
  /** True if user can play (active trial OR active subscription) */
  isPro: boolean;
  /** True while checking subscription/trial status */
  isLoading: boolean;
  /** Trial status: never_started, active, or expired */
  trialStatus: TrialStatus;
  /** Days remaining in trial (0 if not started or expired) */
  trialDaysRemaining: number;
  /** RevenueCat offering for purchase UI */
  offering: PurchasesOffering | null;
  /** Trigger a purchase. Returns true on success. */
  purchase: () => Promise<boolean>;
  /** Restore previous purchases. Returns true on success. */
  restore: () => Promise<boolean>;
  /** Start the trial countdown (call when user taps "Start Free Trial"). */
  activateTrial: () => Promise<void>;
  /** Dev bypass — set isPro to true without real subscription */
  devBypass: () => void;
}

export function useSubscription(): UseSubscription {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [trialStatus, setTrialStatus] = useState<TrialStatus>('never_started');
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Step 1: Check trial
      const trial = await checkTrial();

      if (!cancelled) {
        setTrialStatus(trial.status);
        setTrialDaysRemaining(trial.daysRemaining);
      }

      if (trial.status === 'active') {
        if (!cancelled) {
          setIsPro(true);
          setIsLoading(false);
        }
        // Fetch offering in background for when trial expires
        if (isConfigured()) {
          const off = await getOffering();
          if (!cancelled) setOffering(off);
        }
        return;
      }

      // Step 2: Trial not active (never_started or expired) — check RevenueCat
      if (isConfigured()) {
        const [entitled, off] = await Promise.all([checkSubscription(), getOffering()]);
        if (!cancelled) {
          setIsPro(entitled);
          setOffering(off);
          setIsLoading(false);
        }
      } else {
        // RevenueCat not configured (Expo Go, placeholder key)
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

  const activateTrial = useCallback(async () => {
    await startTrial();
    const trial = await checkTrial();
    setTrialStatus(trial.status);
    setTrialDaysRemaining(trial.daysRemaining);
    setIsPro(trial.status === 'active');
  }, []);

  const devBypass = useCallback(() => {
    setIsPro(true);
    setIsLoading(false);
  }, []);

  return { isPro, isLoading, trialStatus, trialDaysRemaining, offering, purchase, restore, activateTrial, devBypass };
}
