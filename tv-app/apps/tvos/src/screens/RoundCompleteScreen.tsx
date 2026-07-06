import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '../components/Avatar';
import { FadeInView } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { formatNumber } from '../utils/format';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';
import type { TvLeaderboardEntry } from '../services/api';

// Between-games slide 1 (0:00–0:20): final standings — matches Roku LeaderResults.
export function RoundCompleteScreen() {
  const { state } = useTVState();
  const { barLeaderboard, barName } = state;
  const rows = barLeaderboard.slice(0, 5);

  return (
    <View style={s.root}>
      <View style={s.titleRow}>
        <Text style={s.title}>Round Complete!</Text>
        <Text style={s.titleEmoji}>🎉</Text>
      </View>
      <Text style={s.subtitle}>FINAL STANDINGS · {barName}</Text>

      <View style={s.rows}>
        {rows.length > 0 ? (
          rows.map((e, i) => (
            <FadeInView key={e.playerName + i} delay={i * 70}>
              <ResultRow entry={e} first={i === 0} />
            </FadeInView>
          ))
        ) : (
          <Text style={s.empty}>No players this round</Text>
        )}
      </View>
    </View>
  );
}

function ResultRow({ entry, first }: { entry: TvLeaderboardEntry; first: boolean }) {
  const top3 = entry.rank <= 3;
  return (
    <View style={[s.row, first ? s.rowWinner : s.rowNormal]}>
      <View style={s.rankSlot}>
        {first ? (
          <Text style={s.crown}>👑</Text>
        ) : (
          <Text style={[s.rank, top3 && s.rankTop]}>{entry.rank}</Text>
        )}
      </View>
      <Avatar name={entry.playerName} size="md" />
      <Text style={[s.name, first ? s.nameWinner : s.nameNormal]} numberOfLines={1}>
        {entry.playerName}
      </Text>
      <Text style={[s.score, first ? s.scoreWinner : s.scoreNormal]}>
        {formatNumber(entry.score)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { fontFamily: fonts.fredoka.bold, fontSize: 55, color: '#ffffff' },
  titleEmoji: { fontSize: 48 },
  subtitle: {
    fontFamily: fonts.dmMono.regular,
    fontSize: 18,
    color: colors.gold,
    letterSpacing: 3,
    marginTop: 12,
    marginBottom: 40,
  },
  rows: { gap: 11, alignItems: 'center' },
  row: {
    width: 980,
    height: 84,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 28,
    gap: 20,
  },
  rowWinner: { backgroundColor: colors.gold },
  rowNormal: { backgroundColor: 'rgba(255,255,255,0.05)' },
  rankSlot: { width: 56, alignItems: 'center' },
  crown: { fontSize: 40 },
  rank: { fontFamily: fonts.fredoka.bold, fontSize: 33, color: w(0.3) },
  rankTop: { color: colors.gold },
  name: { flex: 1, fontSize: 28 },
  nameWinner: { fontFamily: fonts.outfit.bold, color: '#1e0f4a' },
  nameNormal: { fontFamily: fonts.outfit.semiBold, color: 'rgba(255,255,255,0.8)' },
  score: { fontSize: 28 },
  scoreWinner: { fontFamily: fonts.fredoka.bold, color: '#1e0f4a' },
  scoreNormal: { fontFamily: fonts.fredoka.bold, color: colors.gold },
  empty: { fontFamily: fonts.outfit.medium, fontSize: 28, color: w(0.4) },
});
