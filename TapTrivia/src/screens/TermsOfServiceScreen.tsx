import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GradientBackground } from '../components/GradientBackground';
import { w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsOfService'>;

const SECTIONS = [
  {
    title: '1. Agreement to Terms',
    body: 'By downloading, installing, or using TapTrivia ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 13 years of age to use TapTrivia. By using the App, you represent that you meet this age requirement. Some features may require you to be present at a participating venue.',
  },
  {
    title: '3. Account & Identity',
    body: 'TapTrivia does not require a traditional account. A unique device identifier is generated and stored locally on your device. Your chosen display name is visible to other players at your venue during gameplay. You are responsible for the content of the name you choose.',
  },
  {
    title: '4. Acceptable Use',
    body: 'You agree not to: use offensive or inappropriate display names; attempt to manipulate game results or scoring; interfere with other players\' experience; reverse-engineer, decompile, or attempt to extract the source code of the App; use automated tools, bots, or scripts to interact with the App.',
  },
  {
    title: '5. Gameplay & Scoring',
    body: 'Game schedules, scoring rules, question content, and leaderboard calculations are determined by TapTrivia and may change at any time. We reserve the right to reset scores, modify game parameters, or remove players who violate these terms.',
  },
  {
    title: '6. Intellectual Property',
    body: 'All content in TapTrivia, including questions, design, logos, and software, is owned by or licensed to TapTrivia. You may not reproduce, distribute, or create derivative works from any App content without prior written permission.',
  },
  {
    title: '7. Disclaimers',
    body: 'TapTrivia is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, accuracy of game content, or availability at any particular venue. Game results and leaderboard positions are for entertainment purposes only.',
  },
  {
    title: '8. Limitation of Liability',
    body: 'To the maximum extent permitted by law, TapTrivia shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.',
  },
  {
    title: '9. Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of the App after changes constitutes acceptance of the revised terms. We will indicate the date of the most recent revision at the top of this page.',
  },
  {
    title: '10. Contact',
    body: 'If you have questions about these Terms of Service, contact us at support@taptrivia.tv.',
  },
];

export function TermsOfServiceScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Terms of Service</Text>
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
