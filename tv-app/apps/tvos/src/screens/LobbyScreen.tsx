import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Logo } from '../components/Logo';
import { QRBadge } from '../components/QRBadge';
import { Avatar } from '../components/Avatar';
import { FadeInView, FadeInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { formatCountdown } from '../utils/format';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

export function LobbyScreen() {
  const { state } = useTVState();
  const { barCode, barName, activePlayers, secondsUntilNextGame, barLeaderboard } = state;

  return (
    <>
      <View style={s.root}>
        {/* Next-game countdown now lives in the persistent top pill (App.tsx) */}
        <View style={s.body}>
          {/* ── Left: Logo + QR + Code ─────────── */}
          <View style={s.leftCol}>
            <Logo size="lg" />
            {barName ? (
              <Text style={s.barName}>{barName}</Text>
            ) : null}
            <Text style={s.subtitle}>Scan to join or enter code below</Text>

            <QRBadge barCode={barCode} variant="lobby" />
          </View>

          {/* ── Right: Players ─────────── */}
          <View style={s.rightCol}>
            <Text style={s.playersLabel}>
              {activePlayers || barLeaderboard.length} PLAYERS JOINED
            </Text>

            {barLeaderboard.length > 0 && (
              <View style={s.avatarGrid}>
                {barLeaderboard.slice(0, 12).map((p, i) => (
                  <FadeInView key={p.playerName + i} delay={i * 60} style={s.avatarItem}>
                    <Avatar name={p.playerName} size="lg" />
                    <Text style={s.avatarName} numberOfLines={1}>
                      {p.playerName}
                    </Text>
                  </FadeInView>
                ))}
              </View>
            )}

            {barLeaderboard.length === 0 && (
              <View style={s.waitingRow}>
                <Text style={s.waitingText}>Waiting for players...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Countdown overlay (top-left)
  countdownOverlay: {
    position: 'absolute',
    top: 40,
    left: 48,
    zIndex: 10,
  },
  countdownLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 26,
    color: w(0.4),
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  countdownValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 64,
    color: colors.gold,
  },

  // Body
  body: {
    flex: 1,
    flexDirection: 'row',
  },

  // Left column
  leftCol: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 80,
  },
  barName: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 56,
    color: w(0.6),
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.outfit.medium,
    fontSize: 30,
    color: w(0.4),
    marginTop: 8,
    marginBottom: 56,
  },

  // Right column
  rightCol: {
    flex: 0.7,
    justifyContent: 'center',
    paddingHorizontal: 72,
  },
  playersLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: w(0.4),
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 36,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 28,
  },
  avatarItem: {
    alignItems: 'center',
    width: 100,
  },
  avatarName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 22,
    color: w(0.7),
    marginTop: 8,
    textAlign: 'center',
  },

  // Waiting state
  waitingRow: {
    marginTop: 48,
  },
  waitingText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 26,
    color: w(0.3),
  },
});
