import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef } from 'react';
import { FadeInView } from '../utils/animations';
import { useSubscription } from '../hooks/useSubscription';
import { isConfigured } from '../services/revenuecat';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;

const ACCENT = '#00E5FF';
const BG = '#0D0D0F';

const FEATURES = [
  { icon: '\u{1F3AE}', text: 'Unlimited games at every location' },
  { icon: '\u{1F4CA}', text: 'Personal stats & game history' },
  { icon: '\u2B50', text: 'Save your favorite locations' },
  { icon: '\u{1F3C6}', text: 'Compete on all-time leaderboards' },
];

export function SubscriptionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isPro, isLoading, trialStatus, offering, purchase, restore, activateTrial, devBypass } = useSubscription();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive price string from offering (never hardcoded)
  const rcActive = isConfigured();
  const pkg = offering?.availablePackages[0] ?? null;
  const priceString = pkg?.product.priceString ?? '$2.99';
  const periodLabel = 'per month';

  // Check if the product has a free trial offer from Google Play / App Store
  const hasStoreTrial = pkg?.product?.introPrice != null;

  // If already subscribed or in trial, auto-dismiss
  if (isPro && !isLoading) {
    navigation.goBack();
    return null;
  }

  // Both "Start Free Trial" and "Subscribe Now" go through Google Play purchase flow.
  // If the product has a free trial offer configured in the store, Google/Apple
  // will show the trial terms and collect payment info upfront.
  const handlePurchase = async () => {
    if (!rcActive) return;
    const ok = await purchase();
    if (ok) navigation.goBack();
  };

  const handleRestore = async () => {
    if (!rcActive) return;
    const ok = await restore();
    if (ok) navigation.goBack();
  };

  // Secret dev bypass: triple-tap the crown emoji (works on all builds)
  const handleCrownTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      devBypass();
      navigation.goBack();
      return;
    }
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 800);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: BG }]}>
      {/* Close button */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeText}>{'\u2715'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero — crown is secret dev bypass (5 taps) */}
        <Pressable onPress={handleCrownTap}>
          <Text style={styles.heroEmoji}>{'\u{1F451}'}</Text>
        </Pressable>
        <Text style={styles.title}>TapTrivia Pro</Text>
        <Text style={styles.subtitle}>
          Play unlimited trivia at any location. Try it free for 7 days!
        </Text>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <FadeInView key={i} delay={i * 60} duration={300} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </FadeInView>
          ))}
        </View>

        {/* Start Free Trial button — goes through Google Play / App Store purchase flow.
            The store handles the trial period and collects payment info upfront. */}
        {hasStoreTrial && (
          <Pressable
            onPress={handlePurchase}
            disabled={isLoading || (!pkg && rcActive)}
            style={({ pressed }) => [
              styles.trialButton,
              (isLoading || (!pkg && rcActive)) && styles.buttonDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.trialButtonText}>Start Free Trial</Text>
            <Text style={styles.trialButtonSub}>
              {pkg?.product.introPrice?.periodNumberOfUnits
                ? `${pkg.product.introPrice.periodNumberOfUnits} ${pkg.product.introPrice.periodUnit === 'DAY' ? 'days' : 'week'} free, then ${priceString}/month`
                : `7 days free, then ${priceString}/month`}
            </Text>
          </Pressable>
        )}

        {/* Price card */}
        <View style={styles.priceCard}>
          <Text style={styles.price}>{priceString}</Text>
          <Text style={styles.priceLabel}>{periodLabel}</Text>
        </View>

        {/* Subscribe button */}
        <Pressable
          onPress={handlePurchase}
          disabled={isLoading || (!pkg && rcActive)}
          style={({ pressed }) => [
            styles.subscribeButton,
            (isLoading || (!pkg && rcActive)) && styles.buttonDisabled,
            pressed && !isLoading && { opacity: 0.85 },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={BG} size="small" />
          ) : (
            <Text style={styles.subscribeText}>Subscribe Now</Text>
          )}
        </Pressable>

        {/* Restore */}
        <Pressable onPress={handleRestore} disabled={isLoading}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </Pressable>

        {/* Visible dev bypass — only in development builds */}
        {__DEV__ && (
          <Pressable onPress={() => { devBypass(); navigation.goBack(); }} style={styles.devButton}>
            <Text style={styles.devText}>Skip (Dev)</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.footerText}>
          Auto-renews monthly. Cancel anytime.{'\n'}
          <Text
            style={styles.footerLink}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            Terms
          </Text>
          {' \u00B7 '}
          <Text
            style={styles.footerLink}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            Privacy
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 2,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closeText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  heroEmoji: { fontSize: 56, marginBottom: 8 },
  title: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 26,
    color: ACCENT,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  features: {
    width: '100%',
    gap: 14,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: { fontSize: 20 },
  featureText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  trialButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#00d4aa',
    marginBottom: 16,
  },
  trialButtonText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: BG,
  },
  trialButtonSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
  priceCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: ACCENT + '30',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  price: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 40,
    color: '#fff',
  },
  priceLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  subscribeButton: {
    width: '100%',
    minWidth: 280,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: ACCENT,
  },
  buttonDisabled: { opacity: 0.5 },
  subscribeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: BG,
  },
  restoreText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 14,
  },
  devButton: {
    marginTop: 20,
    backgroundColor: 'rgba(255,100,0,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,100,0,0.4)',
  },
  devText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    color: '#ff6400',
  },
  footer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.15)',
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    textDecorationLine: 'underline',
  },
});
