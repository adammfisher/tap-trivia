import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { useIsOnTop } from '../hooks/useIsOnTop';
import { ZoomInView } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { CategoryBadge } from '../components/CategoryBadge';
import { ProgressBar } from '../components/ProgressBar';
import { AnswerCard } from '../components/AnswerCard';
import { useGameState } from '../hooks/useGameState';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { QuestionData, AnswerResult } from '../types/game';
import { useEffect } from 'react';

type Props = NativeStackScreenProps<RootStackParamList, 'Correct'>;

export function CorrectScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { barCode, playerId, barName } = route.params;
  const { gameState } = useGameState({ barCode, playerId, barName });
  const isOnTop = useIsOnTop(route.key);

  // Cache last known data to prevent white flash during transitions
  const lastQuestionRef = useRef<QuestionData | null>(null);
  const lastResultRef = useRef<AnswerResult | null>(null);
  const lastScoreRef = useRef(0);
  if (gameState.question) lastQuestionRef.current = gameState.question;
  if (gameState.answerResult) lastResultRef.current = gameState.answerResult;
  if (gameState.totalScore > 0) lastScoreRef.current = gameState.totalScore;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    if (!isOnTop) return;
    const params = { barCode, playerId, barName };
    if (gameState.gamePhase === 'leaderboard') {
      navigation.replace('Between', params);
    } else if (gameState.gamePhase === 'finished') {
      navigation.replace('Results', params);
    } else if (gameState.gamePhase === 'category' && gameState.questionNumber > 1) {
      navigation.replace('Category', params);
    }
  }, [gameState.gamePhase, gameState.questionNumber, isOnTop, navigation, barCode, playerId, barName]);

  const question = gameState.question || lastQuestionRef.current;
  const result = gameState.answerResult || lastResultRef.current;
  if (!question || !result) {
    return <GradientBackground><View style={{ flex: 1 }} /></GradientBackground>;
  }

  const earned = result.pointsAwarded;
  const newTotal = gameState.totalScore || lastScoreRef.current;

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Logo size="sm" />
          <View style={styles.playerCount}>
            <Text style={styles.emoji}>{'\u{1F465}'}</Text>
            <Text style={styles.countText}>{gameState.playerCount}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          {/* Points earned */}
          <ZoomInView spring style={styles.pointsSection}>
            <Text style={styles.earnedPoints}>+{earned}</Text>
            <Text style={styles.earnedLabel}>
              Points Earned! <Text style={styles.maxLabel}>/ 1,000</Text>
            </Text>
          </ZoomInView>

          {/* Total */}
          <View style={styles.totalRow}>
            <View style={styles.totalPill}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{newTotal.toLocaleString()}</Text>
            </View>
          </View>

          {/* Checkmark circle */}
          <View style={styles.checkRow}>
            <ZoomInView delay={200} duration={500} style={styles.checkCircle}>
              <Text style={styles.checkMark}>{'\u2714'}</Text>
            </ZoomInView>
          </View>

          {/* Category + progress */}
          <View style={styles.categoryRow}>
            <CategoryBadge emoji={question.categoryEmoji} category={question.category} />
            <Text style={styles.questionNum}>
              {gameState.questionNumber || lastQuestionRef.current ? gameState.questionNumber : ''}
              <Text style={styles.questionTotal}>/{gameState.totalQuestions}</Text>
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <ProgressBar current={gameState.questionNumber} total={gameState.totalQuestions} />
          </View>

          {/* Question */}
          <Text style={styles.questionText}>{question.question}</Text>

          {/* Answers */}
          <View style={styles.answers}>
            {question.answers.map((answer, i) => (
              <AnswerCard
                key={i}
                label={answer}
                letter={i + 1}
                state={
                  i === result.correctIndex
                    ? 'correct'
                    : i === result.selectedIndex
                      ? 'selected'
                      : question.eliminatedIndices.includes(i)
                        ? 'eliminated'
                        : 'default'
                }
                disabled
              />
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.nextText}>Next question in 5s...</Text>
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
  playerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: w(0.08),
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  emoji: { fontSize: 12 },
  countText: { fontFamily: fonts.outfit.bold, fontSize: 12, color: '#fff' },
  scrollContent: { paddingBottom: 32 },
  pointsSection: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  earnedPoints: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 52,
    lineHeight: 52,
    color: colors.green,
  },
  earnedLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    color: colors.green,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  maxLabel: {
    color: w(0.3),
    fontFamily: fonts.outfit.medium,
  },
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
  checkRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderWidth: 3,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 28,
    color: colors.green,
  },
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
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  answers: { paddingHorizontal: 18, gap: 7 },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 32,
  },
  nextText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.35),
  },
});
