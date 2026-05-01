import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { AnswerCard } from '../components/AnswerCard';
import { CategoryPill } from '../components/CategoryPill';
import { ProgressBar } from '../components/ProgressBar';
import { Logo } from '../components/Logo';
import { PlayersBadge } from '../components/PlayersBadge';
import { Avatar } from '../components/Avatar';
import { FadeInView, FadeInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';
import { formatNumber } from '../utils/format';

export function RevealScreen() {
  const { state } = useTVState();
  const {
    question,
    answers,
    correctIndex,
    answerPercentages,
    pctCorrect,
    category,
    subcategory,
    questionNumber,
    totalQuestions,
    barLeaderboard,
    activePlayers,
    barName,
  } = state;

  const progress = (questionNumber || 1) / totalQuestions;

  function getCardState(i: number): 'correct' | 'dimmed' {
    return i === correctIndex ? 'correct' : 'dimmed';
  }

  return (
    <>
      <View style={s.root}>
        {/* ── Body (absolute, between header & footer) ── */}
        <View style={s.body}>
          {/* Left: Question Column */}
          <View style={s.questionCol}>
            <View style={s.catRow}>
              <CategoryPill category={category || ''} />
              <Text style={s.qCounter}>
                Q{questionNumber}<Text style={s.qCounterSep}>/{totalQuestions}</Text>
              </Text>
            </View>

            {subcategory ? (
              <Text style={s.subcategoryText}>{subcategory}</Text>
            ) : null}

            <FadeInText style={s.questionText}>
              {question || ''}
            </FadeInText>

            <ProgressBar progress={progress} height={8} style={s.progressBar} />
          </View>

          {/* Right: Answer Cards with percentages */}
          <View style={s.answersCol}>
            {(answers || []).map((ans, i) => (
              <FadeInView key={i} delay={i * 100}>
                <AnswerCard
                  index={i}
                  text={ans}
                  state={getCardState(i)}
                  percentage={answerPercentages?.[i]}
                />
              </FadeInView>
            ))}
          </View>
        </View>

        {/* ── Header overlay ───────────────────────────── */}
        <View style={s.header}>
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.headerLeft}>
            <Logo size="sm" />
            {barName ? <Text style={s.barName}>{barName}</Text> : null}
          </View>

          <View style={s.headerCenter}>
            <Text style={s.revealLabel}>Answer Revealed</Text>
            {pctCorrect != null && (
              <Text style={s.pctCorrect}>{pctCorrect}% got it right</Text>
            )}
          </View>

          <View style={s.headerRight}>
            <PlayersBadge count={activePlayers} />
          </View>
        </View>

        {/* ── Footer overlay ───────────────────────────── */}
        {barLeaderboard.length > 0 && (
          <View style={s.footer}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={s.footerScores}>
              {barLeaderboard.slice(0, 5).map((entry, i) => (
                <View key={entry.playerName + i} style={s.footerPlayer}>
                  <Avatar name={entry.playerName} size="sm" />
                  <Text style={s.footerName} numberOfLines={1}>{entry.playerName}</Text>
                  <Text style={s.footerScore}>{formatNumber(entry.score)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 56,
    paddingVertical: 24,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 4,
  },
  barName: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 36,
    color: w(0.8),
  },
  headerCenter: {
    alignItems: 'center',
  },
  revealLabel: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 40,
    color: colors.green,
  },
  pctCorrect: {
    fontFamily: fonts.outfit.medium,
    fontSize: 22,
    color: w(0.5),
    marginTop: 4,
  },
  headerRight: {},

  // Body
  body: {
    position: 'absolute',
    top: 152,
    bottom: 144,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 72,
    gap: 72,
    zIndex: 5,
  },
  questionCol: {
    flex: 1.2,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingTop: 35,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 16,
  },
  subcategoryText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 52,
    color: '#f0f0f0',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  qCounter: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 28,
    color: w(0.35),
  },
  qCounterSep: {
    color: w(0.18),
  },
  questionText: {
    fontFamily: fonts.outfit.extraBold,
    fontSize: 60,
    color: '#f0f0f0',
    lineHeight: 75,
    letterSpacing: -1,
    maxWidth: 1040,
  },
  progressBar: {
    marginTop: 44,
    maxWidth: 560,
  },

  // Answers
  answersCol: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 32,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 32,
    paddingHorizontal: 72,
    paddingBottom: 24,
  },
  footerScores: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 64,
    paddingLeft: 440,
  },
  footerPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  footerName: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    color: '#ffffff',
    maxWidth: 120,
  },
  footerScore: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 22,
    color: '#ffd200',
  },
});
