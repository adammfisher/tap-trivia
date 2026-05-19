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

type Props = NativeStackScreenProps<RootStackParamList, 'Wrong'>;

export function WrongScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { barCode, playerId, barName } = route.params;
  const { gameState } = useGameState({ barCode, playerId, barName });
  const isOnTop = useIsOnTop(route.key);

  // Cache last known data to prevent white flash during transitions
  const lastQuestionRef = useRef<QuestionData | null>(null);
  const lastResultRef = useRef<AnswerResult | null>(null);
  if (gameState.question) lastQuestionRef.current = gameState.question;
  if (gameState.answerResult) lastResultRef.current = gameState.answerResult;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  // No question data — show minimal fallback (shouldn't stay long, navigation will fire)
  if (!question) {
    return <GradientBackground><View style={{ flex: 1 }} /></GradientBackground>;
  }

  // No answer result means time ran out — build a timeout result
  const displayResult = result || {
    selectedIndex: -1,
    correct: false,
    pointsAwarded: 0,
    lockedInPoints: 0,
    correctAnswer: '',
    correctIndex: -1,
  };

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]} testID="wrong:screen">
        <View style={styles.header}>
          <Logo size="sm" />
          <View style={styles.playerCount}>
            <Text style={styles.emoji}>{'\u{1F465}'}</Text>
            <Text style={styles.countText}>{gameState.playerCount}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          {/* +0 */}
          <ZoomInView spring style={styles.pointsSection}>
            <Text style={styles.zeroPoints} testID="wrong:points">+0</Text>
            <Text style={styles.wrongLabel}>{displayResult.selectedIndex === -1 ? "Time's Up" : 'Wrong Answer'}</Text>
          </ZoomInView>

          {/* Total */}
          <View style={styles.totalRow}>
            <View style={styles.totalPill}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{gameState.totalScore.toLocaleString()}</Text>
            </View>
          </View>

          {/* X circle */}
          <View style={styles.xRow}>
            <ZoomInView delay={200} duration={500} style={styles.xCircle}>
              <Text style={styles.xMark}>{'\u2717'}</Text>
            </ZoomInView>
          </View>

          {/* Category + progress */}
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

          {/* Question */}
          <Text style={styles.questionText} testID="wrong:your-answer">{question.question}</Text>

          {/* Answers */}
          <View style={styles.answers}>
            {question.answers.map((answer, i) => (
              <AnswerCard
                key={i}
                label={answer}
                letter={i + 1}
                state={
                  i === displayResult.correctIndex
                    ? 'correct'
                    : i === displayResult.selectedIndex
                      ? 'wrong'
                      : question.eliminatedIndices.includes(i)
                        ? 'eliminated'
                        : 'default'
                }
                disabled
              />
            ))}
          </View>

          {/* Fun fact */}
          {question.funFact && !question.funFact.startsWith('This is a fun fact placeholder') ? (
            <View style={styles.funFactCard}>
              <Text style={styles.funFactLabel}>DID YOU KNOW?</Text>
              <Text style={styles.funFactText}>{question.funFact}</Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            {displayResult.correctAnswer ? (
              <Text style={styles.answerWas} testID="wrong:correct-answer">
                The answer was{' '}
                <Text style={styles.correctAnswer}>{displayResult.correctAnswer}</Text>
              </Text>
            ) : (
              <Text style={styles.answerWas}>Waiting for reveal...</Text>
            )}
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
  zeroPoints: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 48,
    lineHeight: 48,
    color: colors.red,
  },
  wrongLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    color: colors.red,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 3,
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
  xRow: { alignItems: 'center', paddingVertical: 4 },
  xCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,71,87,0.12)',
    borderWidth: 3,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xMark: { fontSize: 28, color: colors.red },
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
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: '#fff',
    lineHeight: 23,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  answers: { paddingHorizontal: 18, gap: 7 },
  funFactCard: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: w(0.06),
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: w(0.08),
  },
  funFactLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  funFactText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.55),
    lineHeight: 19,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 32,
  },
  answerWas: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.35),
  },
  correctAnswer: {
    fontFamily: fonts.outfit.bold,
    color: colors.green,
  },
});
