import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useEffect, useCallback } from 'react';
import { useIsOnTop } from '../hooks/useIsOnTop';
import * as Haptics from 'expo-haptics';
import { FadeInView } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { TimerRing } from '../components/TimerRing';
import { CategoryBadge } from '../components/CategoryBadge';
import { ProgressBar } from '../components/ProgressBar';
import { AnswerCard } from '../components/AnswerCard';
import { LoadingDots } from '../components/LoadingDots';
import { useGameState } from '../hooks/useGameState';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { QuestionData, AnswerResult } from '../types/game';

type Props = NativeStackScreenProps<RootStackParamList, 'LockedIn'>;

export function LockedInScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { barCode, playerId, barName } = route.params;
  const { gameState, submitAnswer } = useGameState({ barCode, playerId, barName });
  const isOnTop = useIsOnTop(route.key);

  // Cache last known data to prevent white flash during transitions
  const lastQuestionRef = useRef<QuestionData | null>(null);
  const lastResultRef = useRef<AnswerResult | null>(null);
  if (gameState.question) lastQuestionRef.current = gameState.question;
  if (gameState.answerResult) lastResultRef.current = gameState.answerResult;

  useEffect(() => {
    if (!isOnTop) return;
    const params = { barCode, playerId, barName };
    if (gameState.gamePhase === 'reveal') {
      if (gameState.answerResult?.correct) {
        navigation.replace('Correct', params);
      } else {
        navigation.replace('Wrong', params);
      }
    } else if (gameState.gamePhase === 'leaderboard') {
      navigation.replace('Between', params);
    } else if (gameState.gamePhase === 'finished') {
      navigation.replace('Results', params);
    }
  }, [gameState.gamePhase, gameState.answerResult, isOnTop, navigation, barCode, playerId, barName]);

  const question = gameState.question || lastQuestionRef.current;
  const answerResult = gameState.answerResult || lastResultRef.current;
  if (!question) {
    return <GradientBackground><View style={{ flex: 1 }} /></GradientBackground>;
  }

  const lockedPoints = answerResult?.lockedInPoints ?? 0;

  const handleChangeAnswer = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitAnswer(index);
  }, [submitAnswer]);

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Logo size="sm" />
          <View style={styles.headerRight}>
            {gameState.playerCount > 0 && (
              <View style={styles.playerCount}>
                <Text style={styles.playerCountEmoji}>{'\u{1F465}'}</Text>
                <Text style={styles.playerCountText}>{gameState.playerCount}</Text>
              </View>
            )}
            <Pressable onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
              <Text style={styles.settingsIcon}>{'\u2699'}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          <FadeInView duration={400} direction="none" style={styles.pointsSection}>
            <Text style={styles.lockedPoints}>{lockedPoints}</Text>
            <Text style={styles.lockedLabel}>
              Locked In! <Text style={styles.maxLabel}>/ 1,000</Text>
            </Text>
          </FadeInView>

          <View style={styles.totalRow}>
            <View style={styles.totalPill}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{gameState.totalScore.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.timerRow}>
            <TimerRing seconds={gameState.timeRemaining} totalSeconds={35} />
          </View>

          <View style={styles.categoryRow}>
            <CategoryBadge emoji={question.categoryEmoji} category={question.category} />
          </View>
          <View style={styles.progressRow}>
            <View style={styles.progressContainer}>
              <ProgressBar current={gameState.questionNumber} total={gameState.totalQuestions} />
            </View>
            <Text style={styles.questionNum}>
              Q{gameState.questionNumber}
              <Text style={styles.questionTotal}>/{gameState.totalQuestions}</Text>
            </Text>
          </View>

          <Text style={styles.questionText}>{question.question}</Text>

          <View style={styles.answers}>
            {question.answers.map((answer, i) => {
              const isEliminated = question.eliminatedIndices.includes(i);
              const isSelected = i === answerResult?.selectedIndex;
              return (
                <AnswerCard
                  key={i}
                  label={answer}
                  letter={i + 1}
                  state={
                    isEliminated
                      ? 'eliminated'
                      : isSelected
                        ? 'selected'
                        : 'default'
                  }
                  dimmed={false}
                  onPress={() => handleChangeAnswer(i)}
                  disabled={isEliminated}
                />
              );
            })}
          </View>

          <View style={styles.waitingSection}>
            <View style={styles.waitingRow}>
              <Text style={styles.waitingText}>Waiting for reveal</Text>
              <LoadingDots />
            </View>
          </View>
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
  scrollContent: { paddingBottom: 32 },
  pointsSection: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 24 },
  lockedPoints: { fontFamily: fonts.fredoka.bold, fontSize: 48, lineHeight: 48, color: colors.gold },
  lockedLabel: {
    fontFamily: fonts.outfit.semiBold, fontSize: 11, color: colors.gold,
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 3,
  },
  maxLabel: { color: w(0.3) },
  totalRow: { alignItems: 'center', paddingVertical: 6 },
  totalPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: w(0.06), borderRadius: 10, paddingVertical: 4, paddingHorizontal: 14,
  },
  totalLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 10, color: w(0.35) },
  totalValue: { fontFamily: fonts.fredoka.bold, fontSize: 16, color: colors.gold },
  timerRow: { alignItems: 'center', paddingVertical: 4 },
  categoryRow: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
    gap: 10,
  },
  progressContainer: { flex: 1 },
  questionNum: { fontFamily: fonts.outfit.semiBold, fontSize: 12, color: w(0.4) },
  questionTotal: { color: w(0.25) },
  questionText: {
    fontFamily: fonts.outfit.bold, fontSize: 17, color: '#fff', lineHeight: 23,
    textAlign: 'center', paddingHorizontal: 24, marginBottom: 10,
  },
  answers: { paddingHorizontal: 18, gap: 7 },
  waitingSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 32 },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waitingText: { fontFamily: fonts.outfit.regular, fontSize: 13, color: w(0.4) },
});
