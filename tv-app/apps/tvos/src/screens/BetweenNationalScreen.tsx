import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { QRBadge } from '../components/QRBadge';
import { CountdownBar } from '../components/CountdownBar';
import { FadeInView, FadeInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { formatNumber } from '../utils/format';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

function NationalRow({ player, rank, delay }: {
  player: { name: string; bar: string; city: string; score: number };
  rank: number;
  delay: number;
}) {
  return (
    <FadeInView delay={delay} style={s.natRow}>
      <Text style={[s.natRank, rank <= 3 && s.natRankGold]}>{rank}</Text>
      <View style={s.natInfo}>
        <Text style={s.natName} numberOfLines={1}>{player.name || 'Anonymous'}</Text>
        <Text style={s.natBar} numberOfLines={1}>
          {[player.bar, player.city].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={s.natScore}>{formatNumber(player.score)}</Text>
    </FadeInView>
  );
}

export function BetweenNationalScreen() {
  const { state } = useTVState();
  const national = state.betweenData?.national;
  const barCode = state.barCode;

  if (!national) return <View style={s.root} />;

  const top25 = national.top25 || [];
  const col1 = top25.slice(0, 13);
  const col2 = top25.slice(13, 25);
  const stats = national.stats;

  return (
    <>
      <CountdownBar />
      <View style={s.root}>
        <View style={s.body}>
          {/* Left: Two-column top 25 */}
          <View style={s.leftArea}>
            <FadeInText delay={0} style={s.heading}>
              {'\u{1F30E}'} NATIONAL TOP 25
            </FadeInText>
            <View style={s.columns}>
              <View style={s.col}>
                {col1.map((p, i) => (
                  <NationalRow key={p.name + i} player={p} rank={i + 1} delay={100 + i * 30} />
                ))}
              </View>
              <View style={s.col}>
                {col2.map((p, i) => (
                  <NationalRow key={p.name + i} player={p} rank={i + 14} delay={100 + i * 30} />
                ))}
              </View>
            </View>
          </View>

          {/* Right: Stats + cutoff */}
          <View style={s.rightCol}>
            <Text style={s.statsHeading}>THIS WEEK</Text>

            {/* Stats row */}
            <FadeInView delay={200} style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statEmoji}>{'\u{1F465}'}</Text>
                <Text style={s.statValue}>{formatNumber(stats.players)}</Text>
                <Text style={s.statLabel}>Players</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statEmoji}>{'\u{1F37A}'}</Text>
                <Text style={s.statValue}>{formatNumber(stats.bars)}</Text>
                <Text style={s.statLabel}>Bars</Text>
              </View>
            </FadeInView>

            {/* Cutoff card */}
            <FadeInView delay={400} style={s.cutoffCard}>
              <Text style={s.cutoffEmoji}>{'\u{1F3AF}'}</Text>
              <View style={s.cutoffContent}>
                <Text style={s.cutoffLabel}>Top 25 Cutoff</Text>
                <Text style={s.cutoffValue}>
                  {national.cutoffScore > 0 ? `${formatNumber(national.cutoffScore)} pts` : '—'}
                </Text>
              </View>
            </FadeInView>

            {/* Your bar's best */}
            {national.yourBarBest && (
              <FadeInView delay={500} style={s.yourBarCard}>
                <Text style={s.yourBarLabel}>Your Bar's Best</Text>
                <View style={s.yourBarRow}>
                  <Text style={s.yourBarName}>{national.yourBarBest.name}</Text>
                  <Text style={s.yourBarScore}>
                    {formatNumber(national.yourBarBest.score)}
                  </Text>
                </View>
              </FadeInView>
            )}

            <View style={s.qrWrap}>
              <QRBadge barCode={barCode} />
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, flexDirection: 'row', paddingTop: 80 },
  leftArea: { flex: 1.2, padding: 32 },
  rightCol: { flex: 0.8, padding: 32 },
  heading: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 36,
    color: colors.gold,
    textAlign: 'center',
    marginBottom: 16,
  },
  columns: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  natRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    marginBottom: 4,
  },
  natRank: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 18,
    color: w(0.3),
    width: 28,
    textAlign: 'center',
  },
  natRankGold: { color: colors.gold },
  natInfo: { flex: 1 },
  natName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
    color: '#f0f0f0',
  },
  natBar: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: w(0.4),
  },
  natScore: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 18,
    color: colors.gold,
  },
  statsHeading: {
    fontFamily: fonts.outfit.bold,
    fontSize: 24,
    color: w(0.7),
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statEmoji: { fontSize: 28, marginBottom: 4 },
  statValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 28,
    color: '#f0f0f0',
  },
  statLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: w(0.4),
  },
  cutoffCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  cutoffEmoji: { fontSize: 32 },
  cutoffContent: { flex: 1 },
  cutoffLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.5),
    marginBottom: 2,
  },
  cutoffValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 28,
    color: colors.gold,
  },
  yourBarCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  yourBarLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.5),
    marginBottom: 6,
  },
  yourBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yourBarName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 22,
    color: '#f0f0f0',
  },
  yourBarScore: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 24,
    color: colors.green,
  },
  qrWrap: {
    position: 'absolute',
    bottom: 20,
    right: 32,
  },
});
