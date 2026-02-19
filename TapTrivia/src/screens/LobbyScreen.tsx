import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FadeInView } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { LoadingDots } from '../components/LoadingDots';
import { useGame } from '../contexts/GameContext';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { useSavedBars } from '../hooks/useSavedBars';
import { getCurrentGame, isApiError } from '../services/api';
import { getGameState as clockGetGameState } from '../utils/game-clock';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>;

function formatCountdown(totalSecs: number): string {
  if (totalSecs <= 0) return '0:00';
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function LobbyScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { barCode, barName, playerId } = route.params;
  const { nickname, deviceId } = usePlayerIdentity();
  const { saveBar } = useSavedBars();
  const { startGame, gameState } = useGame();

  const [statusText, setStatusText] = useState('Checking for games...');
  const [playerCount, setPlayerCount] = useState(0);
  const [countdownSecs, setCountdownSecs] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextGameEpochRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const playerName = nickname || 'Player';

  // Save bar on entry (skip for solo play)
  useEffect(() => {
    if (barCode !== 'SOLO') saveBar(barCode, barName);
  }, [barCode, barName, saveBar]);

  const checkGameStatus = useCallback(async () => {
    const result = await getCurrentGame();
    if (isApiError(result)) {
      setStatusText('Waiting for next game...');
      return;
    }

    if (result.activePlayers) setPlayerCount(result.activePlayers);

    // Try to find the next game epoch from any available field
    const findNextEpoch = (): number | null => {
      if (result.nextGameStartEpoch) return result.nextGameStartEpoch;
      if (result.startTimeEpoch && result.secondsUntilStart && result.secondsUntilStart > 0) {
        return result.startTimeEpoch;
      }
      if (result.startTimeEpoch) {
        const clock = clockGetGameState(result.startTimeEpoch, Date.now());
        if (clock.gamePhase === 'pre_game') return result.startTimeEpoch;
      }
      return null;
    };

    if (result.status === 'active' && result.startTimeEpoch) {
      const clock = clockGetGameState(result.startTimeEpoch, Date.now());
      if (clock.gamePhase === 'active' && !startedRef.current) {
        startedRef.current = true;
        if (pollRef.current) clearInterval(pollRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        startGame(
          result.gameId!,
          result.startTimeEpoch,
          barCode,
          barName,
          deviceId || playerId,
          playerName,
        );
        navigation.navigate('Category', { barCode, playerId: deviceId || playerId, barName });
        return;
      }
      if (clock.gamePhase === 'pre_game') {
        nextGameEpochRef.current = result.startTimeEpoch;
        setStatusText('Game starting soon...');
        return;
      }
      // Game already ended from client perspective — keep polling
      setStatusText('Checking for games...');
    } else if (result.status === 'scheduled' && result.startTimeEpoch) {
      nextGameEpochRef.current = result.startTimeEpoch;
      setStatusText('Next game scheduled');
    } else if (result.status === 'no_game') {
      const epoch = findNextEpoch();
      if (epoch) {
        nextGameEpochRef.current = epoch;
        setStatusText('Next game scheduled');
      } else {
        setStatusText('No games scheduled right now');
      }
    } else if (result.status === 'completed') {
      // Game just ended — check for nextGameStartEpoch or keep polling
      const epoch = findNextEpoch();
      if (epoch) {
        nextGameEpochRef.current = epoch;
        setStatusText('Next game scheduled');
      } else {
        setStatusText('Checking for games...');
      }
    } else {
      setStatusText('Waiting for next game...');
    }
  }, [barCode, barName, deviceId, playerId, playerName, navigation, startGame]);

  // Poll every 5 seconds
  useEffect(() => {
    checkGameStatus();
    pollRef.current = setInterval(checkGameStatus, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkGameStatus]);

  // 1-second countdown tick
  useEffect(() => {
    const update = () => {
      if (nextGameEpochRef.current) {
        const secs = Math.max(0, Math.ceil((nextGameEpochRef.current - Date.now()) / 1000));
        setCountdownSecs(secs);

        // Auto-check when countdown hits 0
        if (secs === 0 && !startedRef.current) {
          checkGameStatus();
        }
      }
    };
    update();
    countdownRef.current = setInterval(update, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [checkGameStatus]);

  // If game context phase changes, navigate
  useEffect(() => {
    if (gameState.gamePhase === 'category' && !startedRef.current) {
      startedRef.current = true;
      navigation.navigate('Category', { barCode, playerId: deviceId || playerId, barName });
    }
  }, [gameState.gamePhase, navigation, barCode, playerId, deviceId, barName]);

  const showCountdown = countdownSecs !== null && countdownSecs > 0;

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Logo size="sm" />
          <View style={styles.headerRight}>
            {playerCount > 0 && (
              <View style={styles.playerCount}>
                <Text style={styles.playerCountEmoji}>{'\u{1F465}'}</Text>
                <Text style={styles.playerCountText}>{playerCount}</Text>
              </View>
            )}
            <Pressable onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
              <Text style={styles.settingsIcon}>{'\u2699'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          {/* You're In! */}
          <View style={styles.heroSection}>
            <Text style={styles.heroEmoji}>{barCode === 'SOLO' ? '\u{1F3AE}' : '\u{1F389}'}</Text>
            <Text style={styles.heroTitle}>You're In!</Text>
            {barCode === 'SOLO' ? (
              <Text style={styles.barNameText}>Playing Solo</Text>
            ) : (
              <Text style={styles.heroSubtitle}>
                <Text style={styles.barNameText}>{barName}</Text>
                {' \u00B7 '}
                <Text style={styles.barCodeText}>{barCode}</Text>
              </Text>
            )}
          </View>

          {/* Your player card */}
          <FadeInView duration={400}>
            <View style={styles.playerCard}>
              <Avatar name={playerName} size={40} isYou />
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{playerName}</Text>
                <Text style={styles.playerStatus}>Ready to play</Text>
              </View>
              <View style={styles.readyDot} />
            </View>
          </FadeInView>

          {/* Countdown / Waiting */}
          <View style={styles.waitingSection}>
            {showCountdown ? (
              <>
                <Text style={styles.nextGameLabel}>NEXT GAME IN</Text>
                <Text style={styles.countdownTimer}>{formatCountdown(countdownSecs)}</Text>
                <Text style={styles.waitingSubtext}>Hang tight — the game starts automatically</Text>
              </>
            ) : (
              <>
                <Text style={styles.waitingStatus}>{statusText}</Text>
                <View style={styles.waitingRow}>
                  <Text style={styles.waitingText}>Waiting for game to start</Text>
                  <LoadingDots />
                </View>
              </>
            )}
          </View>
        </View>
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
  playerCountEmoji: { fontSize: 12 },
  playerCountText: { fontFamily: fonts.outfit.bold, fontSize: 12, color: '#fff' },
  content: {
    flex: 1,
    padding: 20,
    paddingHorizontal: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroEmoji: { fontSize: 36, marginBottom: 8 },
  heroTitle: { fontFamily: fonts.fredoka.bold, fontSize: 24, color: '#fff' },
  heroSubtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.4),
    marginTop: 4,
  },
  barNameText: { color: w(0.5) },
  barCodeText: {
    fontFamily: fonts.fredoka.bold,
    color: colors.gold,
    letterSpacing: 2,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: w(0.06),
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: w(0.06),
    marginBottom: 20,
  },
  playerInfo: { flex: 1 },
  playerName: { fontFamily: fonts.outfit.bold, fontSize: 15, color: '#fff' },
  playerStatus: { fontFamily: fonts.outfit.regular, fontSize: 11, color: w(0.35) },
  readyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  waitingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextGameLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: w(0.35),
    letterSpacing: 2,
    marginBottom: 8,
  },
  countdownTimer: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 56,
    color: '#fff',
    marginBottom: 12,
  },
  waitingSubtext: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.3),
  },
  waitingStatus: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: w(0.5),
    marginBottom: 12,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waitingText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: w(0.35),
  },
});
