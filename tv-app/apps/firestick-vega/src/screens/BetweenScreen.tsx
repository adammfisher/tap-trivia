import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Logo } from '../components/Logo';
import { StandingRow } from '../components/StandingRow';
import { SignagePanel } from '../signage/SignagePanel';
import { FadeInView } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';
import { getGameState, QUESTION_DURATION_MS } from '../utils/game-clock';
import { getServerNow } from '../services/api';

export function BetweenScreen() {
  const { state } = useTVState();
  const {
    barLeaderboard,
    questionNumber,
    totalQuestions,
    signageSlides,
    signageCurrentIndex,
    barCode,
    barName,
    logoUrl,
    gameStartEpoch,
  } = state;

  const isLastQuestion = (questionNumber || 1) >= totalQuestions;
  const hasSignage = signageSlides.length > 0;

  // Local countdown from gameStartEpoch — avoids depending on elapsedSeconds from state
  const [nextQuestionIn, setNextQuestionIn] = useState(5);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!gameStartEpoch) return;
    const serverNow = getServerNow();
    const localNow = Date.now();
    const stableNow = () => serverNow + (Date.now() - localNow);
    function tick() {
      const cs = getGameState(gameStartEpoch!, stableNow());
      if (cs.gamePhase === 'active' && cs.elapsedInQuestion != null) {
        const secs = Math.max(0, Math.ceil((QUESTION_DURATION_MS - cs.elapsedInQuestion) / 1000));
        setNextQuestionIn(secs);
      }
    }
    tick();
    intervalRef.current = setInterval(tick, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [gameStartEpoch, questionNumber]);

  return (
    <>
      <View style={s.root}>
        <View style={s.body}>
          {/* ── Left: Standings ─────────── */}
          <View style={[s.standingsCol, hasSignage && s.standingsColHalf]}>
            <View style={s.centeredContent}>
              <Logo size="sm" />
              {barName ? <Text style={s.barName}>{barName}</Text> : null}
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
