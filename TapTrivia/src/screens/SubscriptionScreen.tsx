import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FadeInView } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { useSubscription } from '../hooks/useSubscription';
import { gradients, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;

const FEATURES = [
  { icon: '\u{1F3AE}', text: 'Unlimited games at every bar' },
  { icon: '\u{1F4CA}', text: 'Personal stats & game history' },
  { icon: '\u2B50', text: 'Save your favorite bars' },
  { icon: '\u{1F3C6}', text: 'Compete on all-time leaderboards' },
  { icon: '\u{1F3A8}', text: 'Custom avatar & profile' },
];

export function SubscriptionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { purchase, restore } = useSubscription();

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Close button */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeText}>{'\u2715'}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Logo size="lg" />
          <Text style={styles.title}>Unlimited Trivia</Text>
          <Text style={styles.subtitle}>
            Play at any bar, anytime. Support your favorite spots.
          </Text>

          {/* Features */}
          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <FadeInView
                key={i}
                delay={i * 50}
                duration={300}
                style={styles.featureRow}
              >
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </FadeInView>
            ))}
          </View>

          {/* Price */}
          <View style={styles.priceCard}>
            <Text style={styles.price}>$2.99</Text>
            <Text style={styles.priceLabel}>per month</Text>
          </View>

          {/* Subscribe button */}
          <Pressable
            onPress={purchase}
            style={({ pressed }) => [pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={[...gradients.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.subscribeButton}
            >
              <Text style={styles.subscribeText}>Subscribe Now</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={restore}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </Pressable>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.footerText}>
            Auto-renews monthly. Cancel anytime.{'\n'}
            <Text style={styles.footerLink}>Terms</Text> {'\u00B7'}{' '}
            <Text style={styles.footerLink}>Privacy</Text>
          </Text>
        </View>
      </View>
    </GradientBackground>
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
    backgroundColor: w(0.08),
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closeText: { fontSize: 14, color: w(0.5) },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 22,
    color: '#fff',
    marginTop: 20,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: w(0.4),
    textAlign: 'center',
    marginBottom: 28,
  },
  features: {
    width: '100%',
    gap: 12,
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
    color: w(0.7),
  },
  priceCard: {
    backgroundColor: w(0.06),
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: w(0.08),
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
    color: w(0.4),
    marginTop: 2,
  },
  subscribeButton: {
    width: '100%',
    minWidth: 280,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: 'rgba(247,151,30,0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 8,
  },
  subscribeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: '#1e0f4a',
  },
  restoreText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: w(0.3),
    marginTop: 14,
  },
  footer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 10,
    color: w(0.15),
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    textDecorationLine: 'underline',
  },
});
