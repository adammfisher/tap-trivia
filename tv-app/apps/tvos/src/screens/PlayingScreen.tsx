import React, { useEffect, useRef, useState, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { TimerRing } from '../components/TimerRing';
import { AnswerCard } from '../components/AnswerCard';
import { CategoryPill } from '../components/CategoryPill';
import { PlayersBadge } from '../components/PlayersBadge';
import { ProgressBar } from '../components/ProgressBar';
import { Logo } from '../components/Logo';
import { QRBadge } from '../components/QRBadge';
import { Avatar } from '../components/Avatar';
import { FadeInView, FadeInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { getPointsColor, w, colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { formatNumber } from '../utils/format';
import { getGameState } from '../utils/game-clock';
import { getServerNow } from '../services/api';

/**
 * Snapshot server-synced time once, then use local clock deltas.
 * Prevents jitter from _serverTimeOffset being recalculated every 2s API poll.
 */
function captureStableNow(): () => number {
  const serverNow = getServerNow();
  const localNow = Date.now();
  return () => serverNow + (Date.now() - localNow);
}

// ── Isolated points display — own 50ms interval, doesn't re-render parent ──
const PointsDisplay = memo(function PointsDisplay({
  gameStartEpoch,
  questionNumber,
}: {
  gameStartEpoch?: number;
  questionNumber?: number;
}) {
  const [pts, setPts] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!gameStartEpoch) return;
    const stableNow = captureStableNow();
    function tick() {
      const cs = getGameState(gameStartEpoch!, stableNow());
      if (cs.gamePhase === 'active') {
        setPts(cs.pointsAvailable ?? 0);
      }
    }
    tick();
    intervalRef.current = setInterval(tick, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [gameStartEpoch, questionNumber]);

  const ptsColor = getPointsColor(pts);
  return (
    <View style={s.headerCenter}>
      <Text style={[s.ptsValue, { color: ptsColor, textShadowColor: ptsColor + '40' }]}>
        {formatNumber(pts)}
      </Text>
      <Text style={s.ptsLabel}>POINTS AVAILABLE</Text>
    </View>
  );
});

// ── Isolated timer display — own interval, doesn't re-render parent ──
const TimerDisplay = memo(function TimerDisplay({
  gameStartEpoch,
  questionNumber,
  activePlayers,
}: {
  gameStartEpoch?: number;
  questionNumber?: number;
  activePlayers: number;
}) {
  const [secs, setSecs] = useState(28);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSecRef = useRef(28);

  useEffect(() => {
    if (!gameStartEpoch) return;
    const stableNow = captureStableNow();
    function tick() {
      const cs = getGameState(gameStartEpoch!, stableNow());
      if (cs.gamePhase === 'active') {
        const s = cs.questionSecondsRemaining ?? 0;
        if (s !== lastSecRef.current) {
          lastSecRef.current = s;
          setSecs(s);
        }
      }
    }
    tick();
    intervalRef.current = setInterval(tick, 200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [gameStartEpoch, questionNumber]);

  return (
    <View style={s.headerRight}>
      <PlayersBadge count={activePlayers} />
      <TimerRing seconds={secs} totalSeconds={28} size={96} strokeWidth={6} />
    </View>
  );
});

export function PlayingScreen() {
  const { state } = useTVState();
  const {
    question,
    answers,
    category,
    subcategory,
    questionNumber,
    totalQuestions,
    activePlayers,
    eliminated,
    barLeaderboard,
    barName,
    barCode,
    gameStartEpoch,
  } = state;

  const eliminatedSet = new Set((eliminated || []).map(e => e.index));
  const progress = (questionNumber || 1) / totalQuestions;

  return (
    <>
      <View style={s.root}>
        {/* ── Body (absolute, between header & footer) ──── */}
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

            <FadeInText key={questionNumber} style={s.questionText}>
              {question || ''}
            </FadeInText>

            <ProgressBar progress={progress} height={8} style={s.progressBar} />
          </View>

          {/* Right: Answer Cards */}
          <View style={s.answersCol}>
            {(answers || []).map((ans, i) => (
              <FadeInView key={i} delay={i * 80}>
                <AnswerCard
                  index={i}
                  text={ans}
                  state={eliminatedSet.has(i) ? 'eliminated' : 'default'}
                />
              </FadeInView>
            ))}
          </View>
        </View>

        {/* ── Header overlay (absolute top) ─────────────── */}
        <View style={s.header}>
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.headerLeft}>
            <Logo size="sm" />
            {barName ? <Text style={s.barName}>{barName}</Text> : null}
          </View>

          <PointsDisplay gameStartEpoch={gameStartEpoch} questionNumber={questionNumber} />

          <TimerDisplay gameStartEpoch={gameStartEpoch} questionNumber={questionNumber} activePlayers={activePlayers} />
        </View>

        {/* ── Footer overlay (absolute bottom) ──────────── */}
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

        {/* ── QR Badge (absolute bottom-left) ──────────── */}
        <View style={s.qrBadge}>
          <QRBadge barCode={barCode} variant="inline" />
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Header (absolute overlay) ──────────────────────
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
  ptsValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 76,
    lineHeight: 76,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  ptsLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 20,
    color: w(0.35),
    letterSpacing: 3,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },

  // ── Body (absolute, positioned between header & footer) ──
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
    fontSize: 42,
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

  // ── Answers column ──────────────────────────────────
  answersCol: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 32,
  },

  // ── Footer (absolute overlay) ───────────────────────
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

  // ── QR Badge (absolute bottom-left) ─────────────────
  qrBadge: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    zIndex: 20,
  },
});
