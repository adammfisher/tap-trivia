import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { DifficultyDots } from '../components/DifficultyDots';
import { QRBadge } from '../components/QRBadge';
import { FadeInView, FadeInText, ZoomInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { getCategoryIcon } from '../utils/format';
import { fonts } from '../theme/typography';
import { w } from '../theme/colors';

export function CategoryScreen() {
  const { state } = useTVState();
  const { category, subcategory, difficulty, questionNumber, totalQuestions, barName, barCode } = state;

  const icon = getCategoryIcon(category || '');

  return (
    <>
      <View style={s.container}>
        {/* Bar name */}
        {barName ? (
          <Text style={s.barName}>{barName}</Text>
        ) : null}

        {/* Question counter */}
        <Text style={s.counter}>
          QUESTION {questionNumber} OF {totalQuestions}
        </Text>

        {/* Category icon */}
        <ZoomInText spring style={s.icon}>
          {icon}
        </ZoomInText>

        {/* Category name */}
        <FadeInText delay={200} style={s.category}>
          {category || 'Trivia'}
        </FadeInText>

        {/* Subcategory */}
        {subcategory ? (
          <FadeInText delay={350} style={s.subcategory}>
            {subcategory}
          </FadeInText>
        ) : null}

        {/* Difficulty */}
        <FadeInView delay={500} style={s.diffRow}>
          <DifficultyDots level={difficulty || 1} />
        </FadeInView>

        {/* QR Badge (absolute bottom-left) */}
        <View style={s.qrBadge}>
          <QRBadge barCode={barCode} variant="inline" />
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barName: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 40,
    color: w(0.5),
    marginBottom: 16,
  },
  counter: {
    fontFamily: fonts.dmMono.regular,
    fontSize: 28,
    color: w(0.35),
    letterSpacing: 2,
    marginBottom: 40,
  },
  icon: {
    fontSize: 176,
    marginBottom: 32,
  },
  category: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 84,
    color: '#f0f0f0',
    textAlign: 'center',
    marginBottom: 16,
  },
  subcategory: {
    fontFamily: fonts.outfit.medium,
    fontSize: 32,
    color: w(0.4),
    textAlign: 'center',
    marginBottom: 40,
  },
  diffRow: {
    marginTop: 8,
  },
  qrBadge: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    zIndex: 20,
  },
});
