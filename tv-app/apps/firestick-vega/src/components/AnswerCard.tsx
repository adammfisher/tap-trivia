import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { fonts } from '../theme/typography';
import { w } from '../theme/colors';

type AnswerState = 'default' | 'correct' | 'wrong' | 'dimmed' | 'eliminated';

interface Props {
  index: number;
  text: string;
  state?: AnswerState;
  percentage?: number | null;
}

const LETTERS = ['A', 'B', 'C', 'D'];

function getCardStyle(state: AnswerState) {
  switch (state) {
    case 'correct':
      return { bg: ['#00c9a7', '#2ee6b6'], textColor: '#fff', badgeBg: '#00d4aa', badgeText: '#fff' };
    case 'wrong':
      return { bg: ['#ff4757', '#ff6b81'], textColor: '#fff', badgeBg: '#ff4757', badgeText: '#fff' };
    case 'dimmed':
      return { bg: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.12)'], textColor: w(0.4), badgeBg: 'rgba(255,255,255,0.15)', badgeText: w(0.5) };
    case 'eliminated':
      return { bg: ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.25)'], textColor: w(0.3), badgeBg: 'rgba(255,255,255,0.2)', badgeText: '#fff' };
    default:
      return { bg: ['#ffffff', '#ffffff'], textColor: '#1e0f4a', badgeBg: undefined, badgeText: '#5b2a86' };
  }
}

export function AnswerCard({ index, text, state = 'default', percentage }: Props) {
  const card = getCardStyle(state);
  const isDefault = state === 'default';
  const isEliminated = state === 'eliminated';
  const isCorrect = state === 'correct';

  return (
    <View
      style={[
        styles.card,
        isEliminated && styles.eliminated,
        state === 'dimmed' && styles.dimmed,
        isDefault && styles.defaultShadow,
      ]}
    >
      {/* Background gradient (absolute fill) */}
      <LinearGradient
        colors={card.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bgGradient}
      />

      {/* Letter badge */}
      {isDefault ? (
        <LinearGradient
          colors={['#eef1ff', '#e4d8ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}
        >
          <Text style={[styles.badgeLetter, { color: card.badgeText }]}>
            {LETTERS[index]}
          </Text>
        </LinearGradient>
      ) : (
        <View style={[styles.badge, { backgroundColor: card.badgeBg }]}>
          <Text style={[styles.badgeLetter, { color: card.badgeText }]}>
            {isCorrect ? '\u2713' : LETTERS[index]}
          </Text>
        </View>
      )}

      {/* Answer text */}
      <Text
        style={[
          styles.answerText,
          { color: card.textColor },
          isEliminated && styles.strikethrough,
        ]}
        numberOfLines={2}
      >
        {text}
      </Text>

      {/* Percentage (reveal screen) */}
      {percentage != null && (
        <Text style={styles.percentage}>
          {percentage}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 48,
    borderRadius: 32,
    minHeight: 136,
    gap: 36,
    overflow: 'hidden',
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
  },
  defaultShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
  },
  eliminated: {
    opacity: 0.45,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
  },
  dimmed: {
    opacity: 0.45,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  badgeLetter: {
    fontFamily: fonts.outfit.extraBold,
    fontSize: 32,
  },
  answerText: {
    flex: 1,
    fontFamily: fonts.outfit.semiBold,
    fontSize: 40,
    letterSpacing: -0.4,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  percentage: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 32,
    color: 'rgba(255,255,255,0.9)',
    minWidth: 70,
    textAlign: 'right',
  },
});
