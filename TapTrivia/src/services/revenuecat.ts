import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';
import { RC_API_KEY_APPLE, RC_API_KEY_GOOGLE, RC_ENTITLEMENT_ID, RC_OFFERING_ID } from '../constants/revenuecat';

let _configured = false;

const isExpoGo = Constants.appOwnership === 'expo';

/** Whether RevenueCat initialized successfully. If false, all RC calls degrade gracefully. */
export function isConfigured(): boolean {
  return _configured;
}

/** Call once at app startup (App.tsx). Works on iOS and Android (no-ops on web/Expo Go). */
export function configureRevenueCat(appUserID?: string): void {
  if (_configured) return;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  if (isExpoGo) return;

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_APPLE : RC_API_KEY_GOOGLE;
  // Don't configure with placeholder keys
  if (apiKey.startsWith('test_') || apiKey.includes('PLACEHOLDER')) return;

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey, appUserID: appUserID ?? undefined });
    _configured = true;
  } catch (e) {
    console.warn('[RevenueCat] configure failed:', e);
    _configured = false;
  }
}

/** Check whether the user has an active "TapTrivia Pro" entitlement. */
export async function checkSubscription(): Promise<boolean> {
  if (!_configured) return false;
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    return info.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
  } catch (e) {
    console.warn('[RevenueCat] checkSubscription failed:', e);
    return false;
  }
}

/** Fetch the default offering (contains price, product metadata). */
export async function getOffering(): Promise<PurchasesOffering | null> {
  if (!_configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? offerings.all[RC_OFFERING_ID] ?? null;
  } catch (e) {
    console.warn('[RevenueCat] getOffering failed:', e);
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
  } catch (e) {
    console.warn('[RevenueCat] purchaseMonthly failed:', e);
    return false;
  }
}

/** Restore previous purchases. Returns true if entitlement is now active. */
export async function restorePurchases(): Promise<boolean> {
  if (!_configured) return false;
  try {
    const info: CustomerInfo = await Purchases.restorePurchases();
    return info.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
  } catch (e) {
    console.warn('[RevenueCat] restorePurchases failed:', e);
    return false;
  }
}
