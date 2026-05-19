import { useRef, useEffect, memo } from 'react';
import { Pressable, Text, View, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeInView } from '../utils/animations';
import { colors, gradients, w } from '../theme/colors';
import { fonts } from '../theme/typography';

export type AnswerCardState = 'default' | 'selected' | 'correct' | 'wrong' | 'eliminated';

interface AnswerCardProps {
  label: string;
  letter: number; // 1-4
  state?: AnswerCardState;
  onPress?: () => void;
  disabled?: boolean;
  dimmed?: boolean;
  delay?: number;
  testID?: string;
}

const LETTERS = ['A', 'B', 'C', 'D'];

// Memoize to avoid re-renders from GameContext's 250ms tick.
// Custom comparison ignores onPress (closure changes every render but behavior is stable).
export const AnswerCard = memo(function AnswerCard({
  label,
  letter,
  state = 'default',
  onPress,
  disabled,
  dimmed,
  delay = 0,
  testID,
}: AnswerCardProps) {
  const letterDisplay = LETTERS[letter - 1];

  // Smooth opacity transition for dimmed/selected changes
  const opacityAnim = useRef(new Animated.Value(dimmed ? 0.45 : state === 'eliminated' ? 0.45 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const targetOpacity = dimmed ? 0.45 : state === 'eliminated' ? 0.45 : 1;
    const anim = Animated.timing(opacityAnim, {
      toValue: targetOpacity,
      duration: 80,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [dimmed, state, opacityAnim]);

  // Quick scale pop on selection
  useEffect(() => {
    if (state === 'selected') {
      scaleAnim.setValue(0.96);
      const anim = Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 200,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    }
  }, [state, scaleAnim]);

  const badgeContent =
    state === 'correct' ? '\u2713' : state === 'wrong' ? '\u2717' : letterDisplay;

  const useGradient = state === 'selected' || state === 'correct' || state === 'wrong';
  const gradientColors =
    state === 'selected'
      ? gradients.selected
      : state === 'correct'
        ? gradients.correct
        : state === 'wrong'
          ? gradients.wrong
          : gradients.selected;

  const textColor =
    state === 'default' ? '#1e0f4a' : state === 'eliminated' ? w(0.35) : '#fff';

  const badgeBg =
    state === 'correct'
      ? colors.green
      : state === 'wrong'
        ? colors.red
        : state === 'selected'
          ? w(0.2)
          : state === 'eliminated'
            ? w(0.1)
            : undefined;
  const badgeTextColor =
    state === 'default' ? '#5b2a86' : '#fff';

  if (state === 'eliminated') {
    return (
      <FadeInView delay={delay * 80} duration={400}>
        <Animated.View style={{ opacity: opacityAnim }}>
          <View style={[styles.cardBase, styles.eliminatedCard]}>
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: w(0.35) }]}>{badgeContent}</Text>
            </View>
            <Text style={[styles.label, { color: textColor, textDecorationLine: 'line-through' }]}>
              {label}
            </Text>
          </View>
        </Animated.View>
      </FadeInView>
    );
  }

  const cardContent = (
    <>
      <View
        style={[
          styles.badge,
          badgeBg ? { backgroundColor: badgeBg } : styles.defaultBadge,
        ]}
      >
        <Text style={[styles.badgeText, { color: badgeTextColor }]}>{badgeContent}</Text>
      </View>
      <Text style={[styles.label, { color: textColor, flex: 1 }]}>{label}</Text>
      {state === 'correct' && <Text style={styles.emoji}>{'\u{1F389}'}</Text>}
    </>
  );

  if (useGradient) {
    return (
      <FadeInView delay={delay * 80} duration={400}>
        <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
          <Pressable
            onPress={onPress}
            disabled={disabled}
            testID={testID}
            style={({ pressed }) => [pressed && !disabled && styles.pressed]}
          >
            <LinearGradient
              colors={[...gradientColors]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.cardBase, styles.gradientCard]}
            >
              {cardContent}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </FadeInView>
    );
  }

  return (
    <FadeInView delay={delay * 80} duration={400}>
      <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={onPress}
          disabled={disabled}
          testID={testID}
          style={({ pressed }) => [
            styles.cardBase,
            styles.defaultCard,
            pressed && !disabled && styles.pressed,
          ]}
        >
          {cardContent}
        </Pressable>
      </Animated.View>
    </FadeInView>
  );
}, (prev, next) =>
  prev.label === next.label &&
  prev.letter === next.letter &&
  prev.state === next.state &&
  prev.disabled === next.disabled &&
  prev.dimmed === next.dimmed &&
  prev.delay === next.delay &&
  prev.testID === next.testID
);

const styles = StyleSheet.create({
  cardBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    minHeight: 56,
    borderRadius: 14,
  },
  defaultCard: {
    backgroundColor: '#fff',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16 }
      : { elevation: 2 }),
  },
  gradientCard: {
    ...(Platform.OS === 'ios'
      ? { shadowColor: 'rgba(102,126,234,0.35)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 24 }
      : { elevation: 3 }),
  },
  eliminatedCard: {
    backgroundColor: w(0.06),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: w(0.1),
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultBadge: {
    backgroundColor: '#eef1ff',
  },
  badgeText: {
    fontFamily: fonts.outfit.extraBold,
    fontSize: 14,
  },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    letterSpacing: -0.2,
    textAlign: 'left',
  },
  emoji: {
    fontSize: 16,
  },
});
