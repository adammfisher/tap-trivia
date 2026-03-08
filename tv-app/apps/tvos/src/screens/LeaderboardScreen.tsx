import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Logo } from '../components/Logo';
import { Podium } from '../components/Podium';
import { LeaderboardRow } from '../components/LeaderboardRow';
import { SignagePanel } from '../signage/SignagePanel';
import { QRBadge } from '../components/QRBadge';
import { FadeInView, FadeInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

export function LeaderboardScreen() {
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
  } = state;

  const hasSignage = signageSlides.length > 0;
  const podiumEntries = barLeaderboard.slice(0, 3);
  const runners = barLeaderboard.slice(3, hasSignage ? 5 : 10);

  return (
    <>
      <View style={s.root}>
        <View style={s.body}>
          {/* ── Left: Podium + runners ─────────── */}
          <View style={s.mainCol}>
            {/* Header */}
            <View style={s.header}>
              <Logo size="md" />
              {barName ? <Text style={s.barName}>{barName}</Text> : null}
            </View>

            <Text style={s.afterQ}>
              AFTER QUESTION {questionNumber} OF {totalQuestions}
            </Text>

            {/* Podium */}
            {podiumEntries.length > 0 && (
              <FadeInView delay={100} style={s.podiumContainer}>
                <Podium entries={podiumEntries} />
              </FadeInView>
            )}

            {/* Runners */}
            {runners.length > 0 && (
              <View style={s.runnersContainer}>
                {runners.map((entry, i) => (
                  <FadeInView key={entry.playerName + i} delay={400 + i * 60}>
                    <LeaderboardRow entry={entry} compact={hasSignage} />
                  </FadeInView>
                ))}
              </View>
            )}
          </View>

          {/* ── Right: Signage or Sidebar ─────────── */}
          {hasSignage ? (
            <View style={s.signageCol}>
              <SignagePanel
                slides={signageSlides}
                currentIndex={signageCurrentIndex}
                barCode={barCode}
                barName={barName}
                logoUrl={logoUrl}
              />
            </View>
          ) : (
            <View style={s.sidebarCol}>
              <Text style={s.sidebarLabel}>TOP 10</Text>
              <View style={s.sidebarList}>
                {barLeaderboard.slice(0, 10).map((entry, i) => (
                  <FadeInView key={entry.playerName + i} delay={200 + i * 60}>
                    <LeaderboardRow entry={entry} compact />
                  </FadeInView>
                ))}
              </View>

              {/* QR badge at bottom */}
              <View style={s.sidebarQR}>
                <QRBadge barCode={barCode} variant="inline" />
              </View>
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

  // Main column (left)
  mainCol: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  barName: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 56,
    color: w(0.6),
  },
  afterQ: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 26,
    color: w(0.4),
    letterSpacing: 3,
    marginBottom: 48,
  },
  podiumContainer: {
    marginBottom: 32,
  },
  runnersContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 8,
  },

  // Signage column (right, 50% split)
  signageCol: {
    flex: 1,
  },

  // Sidebar column (right, no signage)
  sidebarCol: {
    flex: 0.8,
    paddingLeft: 40,
  },
  sidebarLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 22,
    color: w(0.35),
    letterSpacing: 3,
    marginBottom: 16,
  },
  sidebarList: {
    flex: 1,
  },
  sidebarQR: {
    marginTop: 16,
  },
});
