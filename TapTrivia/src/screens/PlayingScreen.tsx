import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { PointsDisplay } from '../components/PointsDisplay';
import { TimerRing } from '../components/TimerRing';
import { CategoryBadge } from '../components/CategoryBadge';
import { ProgressBar } from '../components/ProgressBar';
import { AnswerCard } from '../components/AnswerCard';
import { useGameState } from '../hooks/useGameState';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { QuestionData } from '../types/game';
import { useEffect, useCallback, useRef } from 'react';

type Props = NativeStackScreenProps<RootStackParamList, 'Playing'>;

export function PlayingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { barCode, playerId, barName } = route.params;
  const { gameState, submitAnswer } = useGameState({ barCode, playerId, barName });

  // Cache last known question to prevent white flash during transitions
  const lastQuestionRef = useRef<QuestionData | null>(null);
  if (gameState.question) lastQuestionRef.current = gameState.question;

  // Phase-driven navigation
  useEffect(() => {
    const params = { barCode, playerId, barName };
    const { answerResult, gamePhase } = gameState;
    if (gamePhase === 'question' && answerResult) {
      navigation.navigate('LockedIn', params);
    } else if (gamePhase === 'reveal') {
      if (answerResult?.correct) {
        navigation.navigate('Correct', params);
      } else {
        navigation.navigate('Wrong', params);
      }
    } else if (gamePhase === 'leaderboard') {
      navigation.navigate('Between', params);
    } else if (gamePhase === 'category' && gameState.questionNumber > 1) {
      // Next question category splash
      navigation.navigate('Category', params);
    } else if (gamePhase === 'finished') {
      navigation.navigate('Results', params);
    }
  }, [gameState.gamePhase, gameState.answerResult, gameState.questionNumber, navigation, barCode, playerId, barName]);

  const handleAnswer = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitAnswer(index);
  }, [submitAnswer]);

  const question = gameState.question || lastQuestionRef.current;
  if (!question) {
    return <GradientBackground><View style={{ flex: 1 }} /></GradientBackground>;
  }

  // Determine answer card states based on eliminated indices
  const getAnswerState = (index: number) => {
    if (question.eliminatedIndices.includes(index)) return 'eliminated' as const;
    return 'default' as const;
  };

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Points */}
          <PointsDisplay points={gameState.pointsAvailable} />

          {/* Total score pill */}
          <View style={styles.totalRow}>
            <View style={styles.totalPill}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{gameState.totalScore.toLocaleString()}</Text>
            </View>
          </View>

          {/* Timer */}
          <View style={styles.timerRow}>
            <TimerRing seconds={gameState.timeRemaining} totalSeconds={39} />
          </View>

          {/* Category + progress */}
          <View style={styles.categoryRow}>
            <CategoryBadge emoji={question.categoryEmoji} category={question.category} />
            <Text style={styles.questionNum}>
              {gameState.questionNumber}
              <Text style={styles.questionTotal}>/{gameState.totalQuestions}</Text>
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <ProgressBar current={gameState.questionNumber} total={gameState.totalQuestions} />
          </View>

          {/* Question */}
          <Text style={styles.questionText}>{question.question}</Text>

          {/* Answer cards */}
          <View style={styles.answers}>
            {question.answers.map((answer, i) => (
              <AnswerCard
                key={i}
                label={answer}
                letter={i + 1}
                state={getAnswerState(i)}
                delay={i}
                onPress={() => handleAnswer(i)}
                disabled={question.eliminatedIndices.includes(i)}
              />
            ))}
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
  totalRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: w(0.06),
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  totalLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 10, color: w(0.35) },
  totalValue: { fontFamily: fonts.fredoka.bold, fontSize: 16, color: colors.gold },
  timerRow: { alignItems: 'center', paddingVertical: 4 },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  questionNum: { fontFamily: fonts.fredoka.semiBold, fontSize: 14, color: w(0.5) },
  questionTotal: { color: w(0.25) },
  progressContainer: { paddingHorizontal: 24, marginBottom: 8 },
  questionText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: '#fff',
    lineHeight: 23,
    letterSpacing: -0.3,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  answers: { paddingHorizontal: 18, gap: 7 },
});
