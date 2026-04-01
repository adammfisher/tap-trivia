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
  if (isExpoGo) {
    console.log('[RC] Skipping — running in Expo Go');
    return;
  }

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_APPLE : RC_API_KEY_GOOGLE;
  console.log('[RC] configure() — platform:', Platform.OS, 'apiKey:', apiKey.slice(0, 8) + '...');

  // Don't configure with placeholder keys
  if (apiKey.startsWith('test_') || apiKey.includes('PLACEHOLDER')) {
    console.log('[RC] Skipping — placeholder key detected');
    return;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey, appUserID: appUserID ?? undefined });
    _configured = true;
    console.log('[RC] configure() SUCCESS — _configured =', _configured);
  } catch (e) {
    console.warn('[RC] configure() FAILED:', e);
    _configured = false;
  }
}

/** Check whether the user has an active "TapTrivia Pro" entitlement. */
export async function checkSubscription(): Promise<boolean> {
  console.log('[RC] checkSubscription() — _configured:', _configured);
  if (!_configured) return false;
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    const active = Object.keys(info.entitlements.active);
    console.log('[RC] checkSubscription — active entitlements:', active);
    return info.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
  } catch (e) {
    console.warn('[RC] checkSubscription FAILED:', e);
    return false;
  }
}

/** Fetch the default offering (contains price, product metadata). */
export async function getOffering(): Promise<PurchasesOffering | null> {
  console.log('[RC] getOffering() — _configured:', _configured);
  if (!_configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    console.log('[RC] getOffering — offerings.current:', offerings.current?.identifier ?? 'null');
    console.log('[RC] getOffering — all offering IDs:', Object.keys(offerings.all));
    if (offerings.current) {
      console.log('[RC] getOffering — packages:', offerings.current.availablePackages.map(p => ({
        id: p.identifier,
        product: p.product.identifier,
        price: p.product.priceString,
      })));
    }
    return offerings.current ?? offerings.all[RC_OFFERING_ID] ?? null;
  } catch (e) {
    console.warn('[RC] getOffering FAILED:', e);
    return null;
  }
}

/** Purchase the monthly subscription from the default offering. Returns true on success. */
export async function purchaseMonthly(): Promise<boolean> {
  console.log('[RC] purchaseMonthly() — _configured:', _configured);
  if (!_configured) { console.log('[RC] purchaseMonthly — not configured, returning false'); return false; }
  try {
    const offering = await getOffering();
    console.log('[RC] purchaseMonthly — offering:', offering?.identifier ?? 'null');
    if (!offering) { console.log('[RC] purchaseMonthly — no offering, returning false'); return false; }
    const pkg = offering.availablePackages[0];
    console.log('[RC] purchaseMonthly — package:', pkg?.identifier ?? 'null', 'product:', pkg?.product.identifier ?? 'null');
    if (!pkg) { console.log('[RC] purchaseMonthly — no package, returning false'); return false; }
    console.log('[RC] purchaseMonthly — calling Purchases.purchasePackage()...');
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const entitled = customerInfo.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
    console.log('[RC] purchaseMonthly — entitled:', entitled, 'active:', Object.keys(customerInfo.entitlements.active));
    return entitled;
  } catch (e: any) {
    console.warn('[RC] purchaseMonthly FAILED:', e?.code, e?.message, e);
    return false;
  }
}

/** Restore previous purchases. Returns true if entitlement is now active. */
export async function restorePurchases(): Promise<boolean> {
  console.log('[RC] restorePurchases() — _configured:', _configured);
  if (!_configured) return false;
  try {
    const info: CustomerInfo = await Purchases.restorePurchases();
    const entitled = info.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
    console.log('[RC] restorePurchases — entitled:', entitled, 'active:', Object.keys(info.entitlements.active));
    return entitled;
  } catch (e: any) {
    console.warn('[RC] restorePurchases FAILED:', e?.code, e?.message, e);
    return false;
  }
}
