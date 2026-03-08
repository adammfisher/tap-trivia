import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GradientBackground } from '../components/GradientBackground';
import { Podium } from '../components/Podium';
import { Confetti } from '../components/Confetti';
import { Avatar } from '../components/Avatar';
import { QRBadge } from '../components/QRBadge';
import { CountdownBar } from '../components/CountdownBar';
import { FadeInView, FadeInText, ZoomInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { formatNumber } from '../utils/format';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

export function BetweenPodiumScreen() {
  const { state } = useTVState();
  const podium = state.betweenData?.podium;
  const barCode = state.barCode;

  if (!podium) return <GradientBackground><View style={s.root} /></GradientBackground>;

  const players = podium.players || [];
  // Build leaderboard entries for Podium component
  const podiumEntries = players.slice(0, 3).map(p => ({
    playerName: p.name,
    score: p.score,
    rank: p.rank,
    name: p.name,
  }));
  const runners = players.slice(3, 10);

  return (
    <GradientBackground>
      <Confetti />
      <CountdownBar />
      <View style={s.root}>
        <View style={s.body}>
          {/* Left: Trophy + Podium */}
          <View style={s.leftCol}>
            <ZoomInText spring style={s.trophy}>{'\u{1F3C6}'}</ZoomInText>
            <FadeInText delay={100} style={s.heading}>PODIUM</FadeInText>
            <FadeInText delay={200} style={s.stats}>
              {podium.questionCount} questions · {podium.playerCount} players
            </FadeInText>
            {podiumEntries.length > 0 && (
              <FadeInView delay={300} style={s.podiumWrap}>
                <Podium entries={podiumEntries} />
              </FadeInView>
            )}
          </View>

          {/* Right: Ranks 4-10 */}
          <View style={s.rightCol}>
            <Text style={s.runnersTitle}>RUNNERS UP</Text>
            {runners.map((p, i) => (
              <FadeInView key={p.name + i} delay={400 + i * 80} style={s.rankRow}>
                <Text style={[s.rankNum, p.rank <= 3 && s.rankGold]}>
                  {p.rank}
                </Text>
                <Avatar name={p.name} size="sm" />
                <Text style={s.rankName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.rankScore}>{formatNumber(p.score)}</Text>
              </FadeInView>
            ))}
            <View style={s.qrWrap}>
              <QRBadge barCode={barCode} />
            </View>
          </View>
        </View>
      </View>
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, flexDirection: 'row', paddingTop: 80 },
  leftCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  rightCol: {
    flex: 1,
    padding: 40,
    paddingTop: 20,
  },
  trophy: { fontSize: 100, marginBottom: 16 },
  heading: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 44,
    color: colors.gold,
    marginBottom: 8,
  },
  stats: {
    fontFamily: fonts.outfit.medium,
    fontSize: 22,
    color: w(0.4),
    marginBottom: 40,
  },
  podiumWrap: { width: '100%' },
  runnersTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 28,
    color: w(0.7),
    textAlign: 'center',
    marginBottom: 16,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    marginBottom: 8,
  },
  rankNum: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 22,
    color: w(0.3),
    width: 32,
    textAlign: 'center',
  },
  rankGold: { color: colors.gold },
  rankName: {
    fontFamily: fonts.outfit.medium,
    fontSize: 22,
    color: w(0.8),
    flex: 1,
  },
  rankScore: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 22,
    color: colors.gold,
  },
  qrWrap: {
    position: 'absolute',
    bottom: 20,
    right: 40,
  },
});
