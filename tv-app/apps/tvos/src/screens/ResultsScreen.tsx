import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Podium } from '../components/Podium';
import { Confetti } from '../components/Confetti';
import { Avatar } from '../components/Avatar';
import { SignagePanel } from '../signage/SignagePanel';
import { FadeInView, FadeInText, ZoomInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { formatCountdown, formatNumber } from '../utils/format';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

export function ResultsScreen() {
  const { state } = useTVState();
  const {
    barLeaderboard,
    secondsUntilNextGame,
    barName,
    totalQuestions,
    activePlayers,
    signageSlides,
    signageCurrentIndex,
    barCode,
    logoUrl,
  } = state;

  const podiumEntries = barLeaderboard.slice(0, 3);
  const runners = barLeaderboard.slice(3, 5);
  const hasSignage = signageSlides.length > 0;

  return (
    <>
      <Confetti />
      <View style={s.root}>
        <View style={s.body}>
          {/* ── Left panel: Results ─────────── */}
          <View style={[s.panel, hasSignage && s.panelHalf]}>
            {/* Next-game countdown now lives in the persistent top pill (App.tsx) */}

            {/* Trophy */}
            <ZoomInText spring style={[s.trophy, hasSignage && s.trophyHalf]}>
              {'\u{1F3C6}'}
            </ZoomInText>

            {/* Title */}
            <FadeInText delay={100} style={[s.title, hasSignage && s.titleHalf]}>
              Game Over!
            </FadeInText>

            {/* Subtitle: "X questions · Y players" */}
            <FadeInText delay={200} style={s.subtitle}>
              {totalQuestions} questions · {activePlayers || barLeaderboard.length} players
            </FadeInText>

            {/* Podium (top 3) */}
            {podiumEntries.length > 0 && (
              <FadeInView delay={400} style={s.podiumContainer}>
                <Podium entries={podiumEntries} />
              </FadeInView>
            )}

            {podiumEntries.length === 0 && (
              <View style={s.emptyState}>
                <Text style={s.emptyText}>No players this round</Text>
              </View>
            )}

            {/* Runners (4th & 5th) */}
            {runners.length > 0 && (
              <FadeInView delay={600} style={s.runnersRow}>
                {runners.map((entry, i) => (
                  <View key={entry.playerName + i} style={s.runnerCard}>
                    <Text style={s.runnerRank}>{entry.rank}</Text>
                    <Avatar name={entry.playerName} size="sm" />
                    <Text style={s.runnerName} numberOfLines={1}>{entry.playerName}</Text>
                    <Text style={s.runnerScore}>{formatNumber(entry.score)}</Text>
                  </View>
                ))}
              </FadeInView>
            )}
          </View>

          {/* ── Right: Signage panel ─────────── */}
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
  },

  body: {
    flex: 1,
    flexDirection: 'row',
  },

  // Panel (full or half)
  panel: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 56,
  },
  panelHalf: {
    flex: 1,
    padding: 32,
    paddingHorizontal: 48,
  },

  // Countdown (at top of panel)
  countdown: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
    color: w(0.35),
    letterSpacing: 2,
    marginBottom: 4,
  },
  countdownValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 56,
    color: colors.gold,
  },

  // Trophy
  trophy: {
    fontSize: 128,
    marginBottom: 24,
  },
  trophyHalf: {
    fontSize: 80,
    marginBottom: 8,
  },

  // Title
  title: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 64,
    color: '#f0f0f0',
    marginBottom: 8,
  },
  titleHalf: {
    fontSize: 48,
    marginBottom: 4,
  },

  // Subtitle
  subtitle: {
    fontFamily: fonts.outfit.medium,
    fontSize: 28,
    color: w(0.4),
    marginBottom: 56,
  },

  // Podium
  podiumContainer: {
    width: '100%',
    marginBottom: 20,
  },

  emptyState: {
    marginTop: 16,
  },
  emptyText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 28,
    color: w(0.4),
  },

  // Runners (4th & 5th)
  runnersRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  runnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    minWidth: 220,
  },
  runnerRank: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 24,
    color: w(0.25),
    width: 24,
    textAlign: 'center',
  },
  runnerName: {
    fontFamily: fonts.outfit.medium,
    fontSize: 22,
    color: w(0.7),
    flex: 1,
  },
  runnerScore: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 22,
    color: colors.gold,
  },

  // Signage column
  signageCol: {
    flex: 1,
  },
});
