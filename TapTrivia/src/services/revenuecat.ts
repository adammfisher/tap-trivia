import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';
import { RC_API_KEY, RC_ENTITLEMENT_ID, RC_OFFERING_ID } from '../constants/revenuecat';

let _configured = false;

/** Call once at app startup (App.tsx). iOS only — no-ops on Android/web. */
export function configureRevenueCat(appUserID?: string): void {
  if (_configured || Platform.OS !== 'ios') return;
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: RC_API_KEY, appUserID: appUserID ?? undefined });
  _configured = true;
}

/** Check whether the user has an active "TapTrivia Pro" entitlement. */
export async function checkSubscription(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true; // no paywall outside iOS
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    return info.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

/** Fetch the default offering (contains price, product metadata). */
export async function getOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? offerings.all[RC_OFFERING_ID] ?? null;
  } catch {
    return null;
  }
}

/** Purchase the monthly subscription from the default offering. Returns true on success. */
export async function purchaseMonthly(): Promise<boolean> {
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
  try {
    const info: CustomerInfo = await Purchases.restorePurchases();
    return info.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}
