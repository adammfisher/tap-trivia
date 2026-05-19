import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
  const { isPro, isLoading, offering, restore, startFreeTrial } = useSubscription();

  // Derive price string from the live RC offering (never hardcoded — handles
  // currency / price changes set in App Store Connect / Play Console).
  const rcActive = isConfigured();
  const pkg = offering?.availablePackages[0] ?? null;
  const priceString = pkg?.product.priceString ?? '$2.99';

  // If already subscribed or in trial, auto-dismiss.
  if (isPro && !isLoading) {
    navigation.goBack();
    return null;
  }

  const handleStartTrial = async () => {
    const ok = await startFreeTrial();
    if (ok) navigation.goBack();
  };

  const handleRestore = async () => {
    if (!rcActive) return;
    const ok = await restore();
    if (ok) navigation.goBack();
  };


  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: BG }]} testID="subscription:screen">
      {/* Close button */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton} testID="subscription:close-button">
          <Text style={styles.closeText}>{'\u2715'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heroEmoji}>{'\u{1F451}'}</Text>
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

        {/* Single CTA — taps Purchases.purchasePackage(). Apple/Google decide
            intro-offer eligibility on their side: trial-eligible users see
            "Free for 7 days, then $2.99/mo" on the native sheet; users who
            already burned their trial see the regular $2.99/mo sheet. */}
        <Pressable
          onPress={handleStartTrial}
          disabled={isLoading}
          testID="subscription:subscribe-button"
          style={({ pressed }) => [
            styles.trialButton,
            isLoading && styles.buttonDisabled,
            pressed && !isLoading && { opacity: 0.85 },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={BG} size="small" />
          ) : (
            <>
              <Text style={styles.trialButtonText}>Start Free Trial</Text>
              <Text style={styles.trialButtonSub}>
                7 days free, then {priceString}/month{'\n'}
                Auto-renewing · Cancel anytime in settings
              </Text>
            </>
          )}
        </Pressable>

        {/* Restore — Apple's review guideline 3.1.1 requires this on every
            paywall for users who change devices or reinstall. */}
        <Pressable onPress={handleRestore} disabled={isLoading} testID="subscription:restore-button">
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </Pressable>


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
    backgroundColor: '#4cd964',
    marginBottom: 16,
    shadowColor: '#4cd964',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  trialButtonText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: BG,
    textAlign: 'center',
  },
  trialButtonSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
    textAlign: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
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
