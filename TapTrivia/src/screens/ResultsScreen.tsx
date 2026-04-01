import { View, Text, Pressable, StyleSheet, ScrollView, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState, useCallback } from 'react';
import { FadeInView, ZoomInText } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { LeaderboardRow } from '../components/LeaderboardRow';
import { Confetti } from '../components/Confetti';
import { useGameState } from '../hooks/useGameState';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { useGame } from '../contexts/GameContext';
import { getNextGameTime } from '../utils/game-clock';
import { getServerNow, getCurrentGame, isApiError } from '../services/api';
import { colors, w } from '../theme/colors';
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
  const isSolo = barCode === 'SOLO';

  const [nextGameSecs, setNextGameSecs] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigatedRef = useRef(false);

  // Navigate to lobby (reused by countdown tick and foreground handler)
  const goToLobby = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    if (countdownRef.current) clearInterval(countdownRef.current);
    resetGame();
    navigation.navigate('Lobby', { barCode, barName, playerId });
  }, [resetGame, navigation, barCode, barName, playerId]);

  // Countdown to next game + auto-navigate to lobby
  useEffect(() => {
    const SLOT_MS = 15 * 60 * 1000;
    const tick = () => {
      const now = getServerNow();
      let nextEpoch = getNextGameTime(now);
      // getNextGameTime returns current slot start if game is active/results —
      // advance to next slot if it's in the past
      while (nextEpoch <= now) nextEpoch += SLOT_MS;
      const secs = Math.max(0, Math.ceil((nextEpoch - now) / 1000));
      setNextGameSecs(secs);

      if (secs <= 60) goToLobby();
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [goToLobby]);

  // Refresh on foreground — re-syncs server clock and checks if we should be in lobby
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || navigatedRef.current) return;
      // API call re-syncs the server time offset
      const result = await getCurrentGame();
      if (!isApiError(result) && (result.status === 'active' || result.status === 'scheduled')) {
        goToLobby();
      }
    });
    return () => sub.remove();
  }, [goToLobby]);

  return (
    <GradientBackground>
      <Confetti />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Logo size="sm" />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>{'\u2699'}</Text>
          </Pressable>
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
                  {playerName} {!isSolo && gameState.rank > 0 ? `\u2014 ${gameState.rank}${getOrdinal(gameState.rank)} Place` : ''}
                </Text>
                <Text style={styles.finalScore}>{gameState.totalScore.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              {[
                { n: stats.correct, l: 'Correct', c: colors.green },
                { n: stats.wrong, l: 'Wrong', c: colors.red },
                { n: stats.timeout, l: 'Unanswered', c: w(0.4) },
                { n: `\u{1F525} ${stats.bestStreak}`, l: 'Best Streak', c: colors.gold },
              ].map((s, i) => (
                <View key={i} style={styles.statItem}>
                  <Text style={[styles.statValue, { color: s.c }]}>{s.n}</Text>
                  <Text style={styles.statLabel}>{s.l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Final standings (location play only) */}
          {!isSolo && gameState.leaderboard.length > 0 && (
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

          {/* Next game countdown */}
          {nextGameSecs !== null && (
            <View style={styles.nextGameSection}>
              <Text style={styles.nextGameLabel}>NEXT GAME IN</Text>
              <Text style={styles.nextGameTimer}>{formatCountdown(nextGameSecs)}</Text>
              <Text style={styles.nextGameHint}>Auto-joining next game</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

function formatCountdown(totalSecs: number): string {
  if (totalSecs <= 0) return '0:00';
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 2,
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
  nextGameSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 20 },
  nextGameLabel: {
    fontFamily: fonts.outfit.semiBold, fontSize: 11, color: w(0.35),
    letterSpacing: 2, marginBottom: 4,
  },
  nextGameTimer: {
    fontFamily: fonts.fredoka.bold, fontSize: 48, color: '#fff', marginBottom: 4,
  },
  nextGameHint: {
    fontFamily: fonts.outfit.regular, fontSize: 12, color: w(0.25),
  },
});
