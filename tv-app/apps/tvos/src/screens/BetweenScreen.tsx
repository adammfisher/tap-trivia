import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { SignagePanel } from '../signage/SignagePanel';
import { FadeInView } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { getServerNow } from '../services/api';
import { getGameState } from '../utils/game-clock';
import { formatNumber } from '../utils/format';
import { PLAYER_APP_URL } from '../config';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';
import type { TvLeaderboardEntry } from '../services/api';

// Scores phase runs 37s–52s of the question. Two-screen rotation:
//   Screen 1 (37–45s): "DID YOU KNOW?" fact (left) + live Standings (right)
//   Screen 2 (45–52s): venue ad / signage (left) + "Play TapTrivia!" QR (right)
// (Did You Know gets one extra second vs the 44s web/Roku split, per request.)
const SCREEN2_START_MS = 45000;
const URL_DISPLAY = PLAYER_APP_URL.replace('https://', '');

export function BetweenScreen() {
  const { state } = useTVState();
  const {
    barLeaderboard, questionNumber, totalQuestions, gameStartEpoch, elapsedSeconds,
    signageSlides, signageCurrentIndex, barCode, barName, logoUrl, funFact,
  } = state;

  // Local toggle from Screen 1 → Screen 2 at 44s elapsed-in-question.
  // Latched so a TV that loads mid-phase lands on the correct screen and doesn't flash.
  const [showScreen2, setShowScreen2] = useState(false);
  const latchedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      let elapsedInQ: number;
      if (gameStartEpoch != null) {
        const gs = getGameState(gameStartEpoch, getServerNow());
        elapsedInQ = gs.elapsedInQuestion != null ? gs.elapsedInQuestion : (elapsedSeconds || 0) * 1000;
      } else {
        elapsedInQ = (elapsedSeconds || 0) * 1000;
      }
      // Latch onto Screen 2 once we reach its window, and STAY latched until this
      // component unmounts at the next question. That way the question rollover
      // (elapsedInQ wrapping back toward 0) never flashes back to Screen 1.
      if (elapsedInQ >= SCREEN2_START_MS) latchedRef.current = true;
      setShowScreen2(latchedRef.current);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [gameStartEpoch, elapsedSeconds]);

  if (showScreen2) {
    return (
      <Screen2
        signageSlides={signageSlides}
        signageCurrentIndex={signageCurrentIndex}
        barCode={barCode}
        barName={barName}
        logoUrl={logoUrl}
      />
    );
  }
  return (
    <Screen1
      funFact={funFact}
      barLeaderboard={barLeaderboard}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
    />
  );
}

// ── Screen 1: Did You Know (left) + Standings (right) ──────────────────────
function Screen1({
  funFact, barLeaderboard, questionNumber, totalQuestions,
}: {
  funFact?: string;
  barLeaderboard: TvLeaderboardEntry[];
  questionNumber?: number;
  totalQuestions: number;
}) {
  const hasFunFact = !!funFact && !funFact.startsWith('This is a fun fact placeholder');
  const rows = barLeaderboard.slice(0, 7);

  return (
    <View style={s.root}>
      <View style={s.body}>
        {/* Left: Did You Know fact (or brand fallback) */}
        <View style={[s.half, s.halfDivider]}>
          {hasFunFact ? (
            <View style={s.factWrap}>
              <Text style={s.factLabel}>DID YOU KNOW?</Text>
              <Text style={s.factText} numberOfLines={6}>{funFact}</Text>
            </View>
          ) : (
            <View style={s.brandWrap}>
              <Logo size="lg" />
              <Text style={s.brandSub}>Live trivia every 15 minutes</Text>
            </View>
          )}
        </View>

        {/* Right: Standings */}
        <View style={s.half}>
          <View style={s.standingsHead}>
            <Logo size="sm" />
            <Text style={s.standingsLabel}>
              STANDINGS · Q{questionNumber || 1} OF {totalQuestions}
            </Text>
          </View>
          {rows.length > 0 ? (
            <View style={s.rows}>
              {rows.map((entry, i) => (
                <FadeInView key={entry.playerName + i} delay={i * 60}>
                  <Screen1Row entry={entry} first={i === 0} />
                </FadeInView>
              ))}
            </View>
          ) : (
            <Text style={s.empty}>Waiting for players…</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function Screen1Row({ entry, first }: { entry: TvLeaderboardEntry; first: boolean }) {
  const top3 = entry.rank <= 3;
  return (
    <View style={[s.row, first && s.rowFirst]}>
      <Text style={[s.rowRank, top3 && s.rowRankTop]}>{entry.rank}</Text>
      <Avatar name={entry.playerName} size="sm" />
      <Text style={[s.rowName, first && s.rowNameFirst]} numberOfLines={1}>{entry.playerName}</Text>
      <Text style={s.rowScore}>{formatNumber(entry.score)}</Text>
    </View>
  );
}

// ── Screen 2: Venue ad (left) + Play TapTrivia QR (right) ──────────────────
function Screen2({
  signageSlides, signageCurrentIndex, barCode, barName, logoUrl,
}: {
  signageSlides: any[];
  signageCurrentIndex: number;
  barCode: string;
  barName: string;
  logoUrl?: string | null;
}) {
  const hasSignage = signageSlides.length > 0;
  return (
    <View style={s.root}>
      <View style={s.body}>
        {/* Left: venue ad / signage (or welcome fallback) */}
        <View style={[s.half, s.halfDivider, hasSignage && s.adHalf]}>
          {hasSignage ? (
            <SignagePanel
              slides={signageSlides}
              currentIndex={signageCurrentIndex}
              barCode={barCode}
              barName={barName}
              logoUrl={logoUrl}
            />
          ) : (
            <View style={s.welcomeWrap}>
              <Text style={s.welcomeLabel}>WELCOME TO</Text>
              <Text style={s.welcomeName}>{barName || 'TapTrivia'}</Text>
              <Text style={s.welcomeSub}>Live trivia every 15 minutes</Text>
            </View>
          )}
        </View>

        {/* Right: Play TapTrivia QR card */}
        <View style={s.half}>
          <View style={s.playWrap}>
            <Text style={s.playEmoji}>🧠</Text>
            <Text style={s.playTitle}>Play TapTrivia!</Text>
            <Text style={s.playOffer}>Free for 7 days</Text>
            <Text style={s.playScan}>scan to start</Text>
            <View style={s.qrWrap}>
              <QRCode value={PLAYER_APP_URL} size={244} backgroundColor="#ffffff" color="#1e0f4a" />
            </View>
            <Text style={s.playUrl}>{URL_DISPLAY}</Text>
            <View style={s.playCodeRow}>
              <Text style={s.playCodeLabel}>CODE</Text>
              <Text style={s.playCode}>{barCode}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, flexDirection: 'row' },

  // Halves
  half: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 64,
  },
  halfDivider: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  adHalf: { paddingHorizontal: 0, paddingVertical: 0, alignItems: 'stretch', justifyContent: 'flex-start' },

  // ── Screen 1 left: fact ──
  factWrap: { alignItems: 'center' },
  factLabel: {
    fontFamily: fonts.dmMono.regular,
    fontSize: 22,
    letterSpacing: 8,
    color: colors.gold,
    marginBottom: 24,
  },
  factText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 42,
    color: '#f5f5f5',
    textAlign: 'center',
    lineHeight: 59,
  },
  brandWrap: { alignItems: 'center', gap: 16 },
  brandSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 30,
    color: w(0.5),
  },

  // ── Screen 1 right: standings ──
  standingsHead: { alignItems: 'center', marginBottom: 24 },
  standingsLabel: {
    fontFamily: fonts.dmMono.regular,
    fontSize: 18,
    letterSpacing: 5,
    color: w(0.4),
    marginTop: 8,
  },
  rows: { gap: 10, width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 13,
    paddingHorizontal: 23,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
  },
  rowFirst: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,210,0,0.33)',
  },
  rowRank: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 25,
    color: w(0.3),
    width: 28,
    textAlign: 'center',
  },
  rowRankTop: { color: colors.gold },
  rowName: {
    flex: 1,
    fontFamily: fonts.outfit.medium,
    fontSize: 25,
    color: w(0.7),
  },
  rowNameFirst: { fontFamily: fonts.outfit.bold, color: '#f5f5f5' },
  rowScore: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 25,
    color: colors.gold,
  },
  empty: {
    fontFamily: fonts.outfit.regular,
    fontSize: 28,
    color: w(0.4),
    paddingVertical: 40,
  },

  // ── Screen 2 left: welcome fallback ──
  welcomeWrap: { alignItems: 'center' },
  welcomeLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    letterSpacing: 6,
    color: colors.green,
    marginBottom: 26,
  },
  welcomeName: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 64,
    color: '#f5f5f5',
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 26,
    color: w(0.5),
  },

  // ── Screen 2 right: Play TapTrivia ──
  playWrap: { alignItems: 'center' },
  playEmoji: { fontSize: 72, marginBottom: 12 },
  playTitle: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 55,
    color: '#f5f5f5',
    marginBottom: 8,
  },
  playOffer: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 36,
    color: colors.green,
  },
  playScan: {
    fontFamily: fonts.outfit.regular,
    fontSize: 21,
    color: w(0.45),
    marginTop: 6,
    marginBottom: 28,
  },
  qrWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
  },
  playUrl: {
    fontFamily: fonts.dmMono.regular,
    fontSize: 21,
    color: colors.gold,
    marginTop: 20,
  },
  playCodeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginTop: 14,
  },
  playCodeLabel: {
    fontFamily: fonts.dmMono.regular,
    fontSize: 20,
    color: w(0.4),
    letterSpacing: 3,
  },
  playCode: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 49,
    color: colors.gold,
    letterSpacing: 7,
  },
});
