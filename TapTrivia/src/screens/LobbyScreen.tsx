import { View, Text, Pressable, StyleSheet, ScrollView, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FadeInView } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { LoadingDots } from '../components/LoadingDots';
import { TimerRing } from '../components/TimerRing';
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
  const { nickname, deviceId, loaded: identityLoaded } = usePlayerIdentity();
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

  // Stable ref for the poll callback — avoids recreating intervals when deps change
  const checkGameStatusRef = useRef<(() => void) | null>(null);
  checkGameStatusRef.current = async () => {
    const result = await getCurrentGame();
    if (isApiError(result)) {
      setStatusText('Waiting for next game...');
      return;
    }

    if (result.activePlayers) setPlayerCount(result.activePlayers);

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
  };

  // Stable wrapper that always calls latest ref
  const checkGameStatus = useCallback(() => {
    checkGameStatusRef.current?.();
    return undefined;
  }, []);

  // Poll every 10 seconds — interval is created once, never recreated
  useEffect(() => {
    if (!identityLoaded) return;
    checkGameStatus();
    pollRef.current = setInterval(checkGameStatus, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkGameStatus, identityLoaded]);

  // 1-second countdown tick — also stable, never recreated
  useEffect(() => {
    const update = () => {
      if (nextGameEpochRef.current) {
        const secs = Math.max(0, Math.ceil((nextGameEpochRef.current - Date.now()) / 1000));
        setCountdownSecs(secs);

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

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* You're In! */}
          <View style={styles.heroSection}>
            <Text style={styles.heroEmoji}>
              {barCode === 'SOLO' ? '\u{1F3AE}' : '\u{1F389}'}
            </Text>
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
            {barCode !== 'SOLO' && (
              <Pressable
                onPress={() => Share.share({
                  message: `Join me on TapTrivia! Use code: ${barCode}\n\nhttps://taptrivia.tv`,
                })}
                style={styles.shareCodeButton}
              >
                <Text style={styles.shareCodeText}>Share Code</Text>
              </Pressable>
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
                <TimerRing
                  seconds={countdownSecs}
                  totalSeconds={900}
                  size={120}
                  strokeWidth={4}
                  label={formatCountdown(countdownSecs)}
                />
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

          {/* Did you know? */}
          <FadeInView duration={500} delay={300} direction="none" style={styles.didYouKnowBanner}>
            <Text style={styles.didYouKnowTitle}>Did you know?</Text>
            <Text style={styles.didYouKnowMessage}>
              The TapTrivia TV app is available on most platforms like Fire TV, Samsung, and Roku. Ask your favorite bar to turn it on — it's free! Or download it and host your own trivia night.
            </Text>
          </FadeInView>
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
    flexGrow: 1,
    padding: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 16,
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
  shareCodeButton: {
    marginTop: 10,
    backgroundColor: w(0.08),
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  shareCodeText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: w(0.4),
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
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  nextGameLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: w(0.35),
    letterSpacing: 2,
    marginBottom: 8,
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
  didYouKnowBanner: {
    backgroundColor: w(0.06),
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: w(0.08),
  },
  didYouKnowTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    color: colors.gold,
    marginBottom: 8,
  },
  didYouKnowMessage: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.4),
    textAlign: 'center',
    lineHeight: 19,
  },
});
