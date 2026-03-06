import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';
import { formatNumber } from '../utils/format';
import type { TvLeaderboardEntry } from '../services/api';

interface Props {
  entry: TvLeaderboardEntry;
  index: number;
}

export function StandingRow({ entry, index }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.rank}>{entry.rank}</Text>
      <Avatar name={entry.playerName} size="sm" style={styles.avatar} />
      <Text style={styles.name} numberOfLines={1}>{entry.playerName}</Text>
      <Text style={styles.score}>{formatNumber(entry.score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  rank: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 22,
    color: w(0.4),
    width: 24,
    textAlign: 'center',
  },
  avatar: {},
  name: {
    flex: 1,
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: 'rgba(255,255,255,0.85)',
  },
  score: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 24,
    color: colors.gold,
  },
});
