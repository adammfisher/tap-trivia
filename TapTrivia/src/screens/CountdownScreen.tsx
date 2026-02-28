import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ZoomInView, ZoomInText, FadeInText } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { useGameState } from '../hooks/useGameState';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useEffect } from 'react';
import { useIsOnTop } from '../hooks/useIsOnTop';

type Props = NativeStackScreenProps<RootStackParamList, 'Countdown'>;

export function CountdownScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { barCode, playerId, barName } = route.params;
  const { gameState } = useGameState({ barCode, playerId, barName });
  const isOnTop = useIsOnTop(route.key);

  useEffect(() => {
    if (!isOnTop) return;
    if (gameState.gamePhase === 'category') {
      navigation.replace('Category', { barCode, playerId, barName });
    }
  }, [gameState.gamePhase, isOnTop, navigation, barCode, playerId, barName]);

  const question = gameState.question;

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Logo size="md" />

        <Text style={styles.questionLabel}>
          Question {gameState.questionNumber} of {gameState.totalQuestions}
        </Text>
        {question && (
          <Text style={styles.categoryText}>
            {question.categoryEmoji} {question.category} {'\u2014'} {question.subcategory}
          </Text>
        )}

        <ZoomInView duration={600} style={styles.ring}>
          <ZoomInText delay={200} duration={400} style={styles.countNumber}>
            {gameState.countdownValue}
          </ZoomInText>
        </ZoomInView>

        <FadeInText delay={300} duration={400} direction="none" style={styles.readyText}>
          Get ready!
        </FadeInText>
        <Text style={styles.hintText}>Answer fast for more points</Text>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: w(0.4),
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 50,
  },
  categoryText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.3),
    marginTop: 6,
  },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: w(0.06),
    borderWidth: 3,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  countNumber: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 64,
    color: '#fff',
    lineHeight: 72,
  },
  readyText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: w(0.5),
    marginTop: 28,
  },
  hintText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: w(0.3),
    marginTop: 8,
  },
});
