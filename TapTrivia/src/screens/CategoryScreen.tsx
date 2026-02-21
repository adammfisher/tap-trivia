import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FadeInView, FadeInText, ZoomInText } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { DifficultyDots } from '../components/DifficultyDots';
import { TimerRing } from '../components/TimerRing';
import { useGameState } from '../hooks/useGameState';
import { w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useEffect } from 'react';

type Props = NativeStackScreenProps<RootStackParamList, 'Category'>;

export function CategoryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { barCode, playerId, barName } = route.params;
  const { gameState } = useGameState({ barCode, playerId, barName });

  useEffect(() => {
    const params = { barCode, playerId, barName };
    if (gameState.gamePhase === 'question') {
      navigation.navigate('Playing', params);
    } else if (gameState.gamePhase === 'finished') {
      navigation.navigate('Results', params);
    }
  }, [gameState.gamePhase, navigation, barCode, playerId, barName]);

  const question = gameState.question;
  const countdown = gameState.countdownValue;

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.questionLabel}>
          QUESTION {gameState.questionNumber} OF {gameState.totalQuestions}
        </Text>

        {question ? (
          <>
            <ZoomInText spring style={styles.emoji}>
              {question.categoryEmoji}
            </ZoomInText>

            <FadeInText delay={200} duration={500} direction="down" style={styles.category}>
              {question.category}
            </FadeInText>

            {question.subcategory ? (
              <FadeInText delay={300} duration={500} direction="down" style={styles.subcategory}>
                {question.subcategory}
              </FadeInText>
            ) : null}

            <FadeInView delay={400} duration={500} direction="down" style={styles.dotsContainer}>
              <DifficultyDots difficulty={question.difficulty} />
            </FadeInView>
          </>
        ) : null}

        {countdown > 0 && (
          <View style={styles.countdownContainer}>
            <TimerRing
              seconds={countdown}
              totalSeconds={3}
              size={80}
              strokeWidth={4}
              pulse
            />
            <Text style={styles.readyText}>Get ready!</Text>
          </View>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  questionLabel: {
    fontFamily: fonts.dmMono.medium,
    fontSize: 12,
    color: w(0.3),
    letterSpacing: 1,
    marginBottom: 20,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  category: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subcategory: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    color: w(0.4),
  },
  dotsContainer: {
    marginTop: 24,
  },
  countdownContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  readyText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: w(0.4),
    marginTop: 4,
  },
});
