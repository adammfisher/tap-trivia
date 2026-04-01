import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Logo } from '../components/Logo';
import { StandingRow } from '../components/StandingRow';
import { SignagePanel } from '../signage/SignagePanel';
import { FadeInView } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';
import { QUESTION_DURATION_MS } from '../utils/game-clock';

export function BetweenScreen() {
  const { state } = useTVState();
  const {
    barLeaderboard,
    questionNumber,
    totalQuestions,
    elapsedSeconds,
    signageSlides,
    signageCurrentIndex,
    barCode,
    barName,
    logoUrl,
    funFact,
  } = state;

  const isLastQuestion = (questionNumber || 1) >= totalQuestions;
  const hasSignage = signageSlides.length > 0;
  const hasFunFact = !!funFact && !funFact.startsWith('This is a fun fact placeholder');

  // Compute seconds until next question (matches web: QUESTION_DURATION_MS/1000 - elapsed)
  const nextQuestionIn = elapsedSeconds != null
    ? Math.max(1, Math.ceil(QUESTION_DURATION_MS / 1000 - elapsedSeconds))
    : 5;

  return (
    <>
      <View style={s.root}>
        <View style={s.body}>
          {/* ── Left: Fun fact + Standings ─────────── */}
          <View style={[s.standingsCol, hasSignage && s.standingsColHalf]}>
            <View style={s.centeredContent}>
              <Logo size="sm" />
              {barName ? <Text style={s.barName}>{barName}</Text> : null}

              {/* Fun fact card */}
              {hasFunFact && (
                <View style={s.funFactCard}>
                  <Text style={s.funFactLabel}>DID YOU KNOW?</Text>
                  <Text style={s.funFactText} numberOfLines={3}>{funFact}</Text>
                </View>
              )}

              <Text style={s.title}>Standings</Text>

              {/* Standings list */}
              {barLeaderboard.length > 0 ? (
                <View style={s.standingsList}>
                  {barLeaderboard.slice(0, 5).map((entry, i) => (
                    <FadeInView key={entry.playerName + i} delay={i * 60}>
                      <StandingRow entry={entry} index={i} />
                    </FadeInView>
                  ))}
                </View>
              ) : null}

              {/* Countdown */}
              <Text style={s.countdown}>
                {isLastQuestion ? (
                  'Final results coming...'
                ) : (
                  <>
                    Next question in{' '}
                    <Text style={s.countdownNum}>{nextQuestionIn}</Text>
                    s...
                  </>
                )}
              </Text>
            </View>
          </View>

          {/* ── Right: Signage ─────────── */}
          {hasSignage && (
            <View style={s.signageCol}>
              <SignagePanel
                slides={signageSlides}
                currentIndex={signageCurrentIndex}
                barCode={barCode}
                barName={barName}
                logoUrl={logoUrl}
              />
            </View>
          )}
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 80,
    paddingVertical: 56,
  },

  body: {
    flex: 1,
    flexDirection: 'row',
  },

  // Standings column
  standingsCol: {
    flex: 1,
    paddingRight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  standingsColHalf: {
    flex: 1,
  },

  centeredContent: {
    alignItems: 'center',
    width: '100%',
  },

  barName: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 32,
    color: '#f0f0f0',
    marginTop: 12,
    textAlign: 'center',
  },

  funFactCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  funFactLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    letterSpacing: 3,
    color: colors.gold,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  funFactText: {
    fontFamily: fonts.fredoka.medium,
    fontSize: 26,
    color: '#f0f0f0',
    textAlign: 'center',
    lineHeight: 34,
  },

  title: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 34,
    color: w(0.5),
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },

  standingsList: {
    gap: 8,
    width: '100%',
  },

  countdown: {
    fontFamily: fonts.outfit.medium,
    fontSize: 22,
    color: w(0.25),
    marginTop: 24,
    textAlign: 'center',
  },
  countdownNum: {
    color: colors.gold,
    fontFamily: fonts.outfit.semiBold,
  },

  // Signage column (50% split)
  signageCol: {
    flex: 1,
  },
});
