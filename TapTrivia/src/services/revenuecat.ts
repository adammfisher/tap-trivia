import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';
import { RC_API_KEY, RC_ENTITLEMENT_ID, RC_OFFERING_ID } from '../constants/revenuecat';

let _configured = false;

/** Whether RevenueCat initialized successfully. If false, all RC calls degrade gracefully. */
export function isConfigured(): boolean {
  return _configured;
}

/** Call once at app startup (App.tsx). iOS only — no-ops on Android/web. */
export function configureRevenueCat(appUserID?: string): void {
  if (_configured || Platform.OS !== 'ios') return;
  // RevenueCat's native SDK force-kills the app if it detects a test_ key
  // in a non-development build. Skip configuration until a production key is set.
  if (RC_API_KEY.startsWith('test_')) return;
  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: RC_API_KEY, appUserID: appUserID ?? undefined });
    _configured = true;
  } catch {
    _configured = false;
  }
}

/** Check whether the user has an active "TapTrivia Pro" entitlement. */
export async function checkSubscription(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !_configured) return true;
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    return info.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
  } catch {
    return true; // degrade to unlocked if RC fails
  }
}

/** Fetch the default offering (contains price, product metadata). */
export async function getOffering(): Promise<PurchasesOffering | null> {
  if (!_configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? offerings.all[RC_OFFERING_ID] ?? null;
  } catch {
    return null;
  }
}

/** Purchase the monthly subscription from the default offering. Returns true on success. */
export async function purchaseMonthly(): Promise<boolean> {
  if (!_configured) return false;
  try {
    const offering = await getOffering();
    if (!offering) return false;
    const pkg = offering.availablePackages[0];
    if (!pkg) return false;
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

/** Restore previous purchases. Returns true if entitlement is now active. */
export async function restorePurchases(): Promise<boolean> {
  if (!_configured) return false;
  try {
    const info: CustomerInfo = await Purchases.restorePurchases();
    return info.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}
