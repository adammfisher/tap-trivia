import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FadeInView } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { StatBox } from '../components/StatBox';
import { LeaderboardRow } from '../components/LeaderboardRow';
import { useGameState } from '../hooks/useGameState';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useEffect } from 'react';

type Props = NativeStackScreenProps<RootStackParamList, 'Between'>;

export function BetweenScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { barCode, playerId, barName } = route.params;
  const { gameState } = useGameState({ barCode, playerId, barName });

  useEffect(() => {
    const params = { barCode, playerId, barName };
    if (gameState.gamePhase === 'category') {
      navigation.navigate('Category', params);
    } else if (gameState.gamePhase === 'finished') {
      navigation.navigate('Results', params);
    }
  }, [gameState.gamePhase, navigation, barCode, playerId, barName]);

  const stats = gameState.playerStats;
  const isSolo = barCode === 'SOLO';
  const rankDirection = gameState.rankChange > 0 ? '\u25B2' : gameState.rankChange < 0 ? '\u25BC' : '';
  const rankChangeText =
    gameState.rankChange !== 0
      ? `${rankDirection} ${gameState.rankChange > 0 ? 'Up' : 'Down'} ${Math.abs(gameState.rankChange)} spot${Math.abs(gameState.rankChange) !== 1 ? 's' : ''}`
      : '';

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Logo size="sm" />
          <View style={styles.headerRight}>
            <View style={styles.playerCount}>
              <Text style={styles.emoji}>{'\u{1F465}'}</Text>
              <Text style={styles.countText}>{gameState.playerCount}</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
              <Text style={styles.settingsIcon}>{'\u2699'}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Score + Rank */}
          <View style={styles.scoreCard}>
            <Text style={styles.afterLabel}>After Question {gameState.questionNumber}</Text>
            {isSolo ? (
              <View style={styles.scoreSection}>
                <Text style={styles.scoreValue}>{gameState.totalScore.toLocaleString()}</Text>
                <Text style={styles.scoreSubLabel}>Your Score</Text>
              </View>
            ) : (
              <View style={styles.scoreRankRow}>
                <View style={styles.scoreSection}>
                  <Text style={styles.scoreValue}>{gameState.totalScore.toLocaleString()}</Text>
                  <Text style={styles.scoreSubLabel}>Your Score</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.rankSection}>
                  <Text style={styles.rankValue}>{gameState.rank > 0 ? `${gameState.rank}${getOrdinal(gameState.rank)}` : '--'}</Text>
                  {rankChangeText ? (
                    <Text style={[styles.rankChange, { color: gameState.rankChange > 0 ? colors.green : colors.red }]}>
                      {rankChangeText}
                    </Text>
                  ) : (
                    <Text style={styles.scoreSubLabel}>Your Rank</Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatBox value={stats.correct} label="Correct" color={colors.green} />
            <StatBox value={stats.wrong} label="Wrong" color={colors.red} />
            <StatBox value={stats.timeout} label="Unanswered" color={w(0.4)} />
          </View>

          {/* Leaderboard (bar play only) */}
          {!isSolo && gameState.leaderboard.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Leaderboard</Text>
              <View style={styles.leaderboardContainer}>
                {gameState.leaderboard.slice(0, 8).map((entry, i) => (
                  <FadeInView key={entry.name} delay={i * 40} duration={300} direction="left">
                    <LeaderboardRow entry={entry} />
                  </FadeInView>
                ))}
              </View>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.nextText}>Next question in 5s...</Text>
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: w(0.08),
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  settingsButton: {
    backgroundColor: w(0.08),
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  settingsIcon: {
    fontSize: 16,
    color: w(0.4),
  },
  emoji: { fontSize: 12 },
  countText: { fontFamily: fonts.outfit.bold, fontSize: 12, color: '#fff' },
  scrollContent: {
    padding: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  scoreCard: {
    backgroundColor: w(0.06),
    borderRadius: 16,
    padding: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: w(0.06),
    marginBottom: 14,
    alignItems: 'center',
  },
  afterLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: w(0.35),
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  scoreRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreSection: { alignItems: 'center' },
  rankSection: { alignItems: 'center' },
  scoreValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 32,
    color: colors.gold,
  },
  rankValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 32,
    color: '#fff',
  },
  scoreSubLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: w(0.35),
  },
  rankChange: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: w(0.08),
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: w(0.3),
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  leaderboardContainer: {
    gap: 5,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
  },
  nextText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: w(0.25),
  },
});
