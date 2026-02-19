import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GradientBackground } from '../components/GradientBackground';
import { w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'TapTrivia collects minimal data to provide the game experience:\n\n\u2022 Device identifier \u2014 A randomly generated UUID stored locally on your device. This is not linked to your real identity.\n\u2022 Display name \u2014 The nickname you choose, visible to other players at your venue.\n\u2022 Bar/venue code \u2014 The venue you join to play.\n\u2022 Game data \u2014 Your answers, scores, and response times during gameplay.\n\u2022 Feedback \u2014 If you submit feedback, we store your message and optional email address.',
  },
  {
    title: '2. Information We Do NOT Collect',
    body: 'TapTrivia does not collect: real names, phone numbers, physical addresses, payment information, location data, contacts, photos, or any other personal information. We do not require an email address or password to play.',
  },
  {
    title: '3. How We Use Information',
    body: 'We use collected data to: operate the trivia game and display leaderboards; show your chosen name to other players at your venue; improve game quality and fix bugs; respond to feedback you submit.',
  },
  {
    title: '4. Data Storage & Security',
    body: 'Game data is stored on secure AWS servers in the United States. Answer records are automatically deleted after a retention period. Your device identifier and display name are stored locally on your device using standard device storage.',
  },
  {
    title: '5. Third-Party Services',
    body: 'TapTrivia uses AWS (Amazon Web Services) for hosting and data storage. We do not sell, share, or provide your data to advertisers or data brokers.',
  },
  {
    title: '6. Children\'s Privacy',
    body: 'TapTrivia is not intended for children under 13 years of age. We do not knowingly collect information from children under 13. If you believe a child under 13 has provided us with information, please contact us so we can remove it.',
  },
  {
    title: '7. Data Retention',
    body: 'Game answer data is automatically expired and removed after the retention period. Your device identifier persists on your device until you clear the app data or uninstall the app. Feedback submissions are retained for up to one year.',
  },
  {
    title: '8. Your Rights',
    body: 'Since TapTrivia uses an anonymous device identifier rather than a personal account, you can effectively "delete your account" by clearing the app data or uninstalling the app. This removes your local identifier and all locally stored preferences.',
  },
  {
    title: '9. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will indicate the date of the most recent revision at the top of this page. Continued use of the App after changes constitutes acceptance of the revised policy.',
  },
  {
    title: '10. Contact',
    body: 'If you have questions about this Privacy Policy or your data, contact us at privacy@taptrivia.tv.',
  },
];

export function PrivacyPolicyScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeText}>{'\u2715'}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lastUpdated}>Last updated: February 2026</Text>

          {SECTIONS.map((section, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 2,
  },
  headerTitle: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 20,
    color: '#fff',
  },
  closeButton: {
    backgroundColor: w(0.08),
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closeText: { fontSize: 14, color: w(0.5) },
  scrollContent: {
    padding: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: w(0.3),
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 15,
    color: w(0.85),
    marginBottom: 6,
  },
  sectionBody: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.5),
    lineHeight: 20,
  },
});
