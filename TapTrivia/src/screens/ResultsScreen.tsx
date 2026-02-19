import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FadeInView, ZoomInText } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { LeaderboardRow } from '../components/LeaderboardRow';
import { Confetti } from '../components/Confetti';
import { useGameState } from '../hooks/useGameState';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { useGame } from '../contexts/GameContext';
import { colors, gradients, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export function ResultsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { barCode, playerId, barName } = route.params;
  const { gameState } = useGameState({ barCode, playerId, barName });
  const { nickname } = usePlayerIdentity();
  const { resetGame } = useGame();
  const stats = gameState.playerStats;
  const playerName = nickname || 'Player';

  const handlePlayAgain = () => {
    resetGame();
    navigation.navigate('Lobby', { barCode, barName, playerId });
  };

  return (
    <GradientBackground>
      <Confetti />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Logo size="sm" />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Trophy */}
          <View style={styles.trophySection}>
            <ZoomInText spring style={styles.trophy}>
              {'\u{1F3C6}'}
            </ZoomInText>
            <Text style={styles.gameOver}>Game Over!</Text>
            <Text style={styles.gameInfo}>
              {gameState.totalQuestions} questions {'\u00B7'} {gameState.playerCount > 0 ? `${gameState.playerCount} players` : barName}
            </Text>
          </View>

          {/* Your stats card */}
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Avatar name={playerName} rank={gameState.rank} size={44} isYou />
              <View>
                <Text style={styles.playerName}>
                  {playerName} {gameState.rank > 0 ? `\u2014 ${gameState.rank}${getOrdinal(gameState.rank)} Place` : ''}
                </Text>
                <Text style={styles.finalScore}>{gameState.totalScore.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              {[
                { n: stats.correct, l: 'Correct', c: colors.green },
                { n: stats.wrong, l: 'Wrong', c: colors.red },
                { n: stats.timeout, l: 'Timeout', c: w(0.4) },
                { n: `\u{1F525} ${stats.bestStreak}`, l: 'Best Streak', c: colors.gold },
              ].map((s, i) => (
                <View key={i} style={styles.statItem}>
                  <Text style={[styles.statValue, { color: s.c }]}>{s.n}</Text>
                  <Text style={styles.statLabel}>{s.l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Final standings */}
          {gameState.leaderboard.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Final Standings</Text>
              <View style={styles.leaderboard}>
                {gameState.leaderboard.slice(0, 10).map((entry, i) => (
                  <FadeInView key={entry.name} delay={i * 40} duration={300} direction="left">
                    <LeaderboardRow entry={entry} compact />
                  </FadeInView>
                ))}
              </View>
            </>
          )}

          {/* Play Again */}
          <View style={styles.playAgainSection}>
            <Pressable onPress={handlePlayAgain} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
              <LinearGradient
                colors={[...gradients.selected]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.playAgainButton}
              >
                <Text style={styles.playAgainText}>Play Again {'\u{1F504}'}</Text>
              </LinearGradient>
            </Pressable>
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
    paddingHorizontal: 24,
    paddingTop: 2,
  },
  scrollContent: {
    padding: 8,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  trophySection: { alignItems: 'center', marginBottom: 14 },
  trophy: { fontSize: 48, marginBottom: 4 },
  gameOver: { fontFamily: fonts.fredoka.bold, fontSize: 24, color: '#fff' },
  gameInfo: { fontFamily: fonts.outfit.regular, fontSize: 12, color: w(0.35), marginTop: 4 },
  statsCard: {
    backgroundColor: w(0.06), borderRadius: 16, padding: 16, paddingHorizontal: 18,
    borderWidth: 1, borderColor: w(0.08), marginBottom: 14,
  },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  playerName: { fontFamily: fonts.outfit.bold, fontSize: 16, color: '#fff' },
  finalScore: { fontFamily: fonts.fredoka.bold, fontSize: 22, color: colors.gold },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.fredoka.bold, fontSize: 18 },
  statLabel: { fontFamily: fonts.outfit.regular, fontSize: 9, color: w(0.35) },
  sectionLabel: {
    fontFamily: fonts.outfit.semiBold, fontSize: 11, color: w(0.3),
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
  },
  leaderboard: { gap: 4 },
  playAgainSection: { alignItems: 'center', paddingTop: 14, paddingBottom: 20 },
  playAgainButton: {
    paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14,
    shadowColor: 'rgba(102,126,234,0.3)', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 24, elevation: 6,
  },
  playAgainText: { fontFamily: fonts.outfit.bold, fontSize: 15, color: '#fff' },
});
