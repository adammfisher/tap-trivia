import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';
import { formatNumber } from '../utils/format';
import type { TvLeaderboardEntry } from '../services/api';

interface Props {
  entry: TvLeaderboardEntry;
  compact?: boolean;
}

const RANK_MEDALS: Record<number, string> = {
  1: '\u{1F947}',
  2: '\u{1F948}',
  3: '\u{1F949}',
};

export function LeaderboardRow({ entry, compact }: Props) {
  const medal = RANK_MEDALS[entry.rank];

  return (
    <View style={[styles.row, compact && styles.compact]}>
      {/* Rank */}
      <View style={[styles.rankCol, compact && styles.rankColCompact]}>
        {medal ? (
          <Text style={[styles.medal, compact && styles.medalCompact]}>{medal}</Text>
        ) : (
          <Text style={[styles.rank, compact && styles.rankCompact]}>{entry.rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <Avatar name={entry.playerName} size={compact ? 'xs' : 'sm'} />

      {/* Name */}
      <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
        {entry.playerName}
      </Text>

      {/* Movement */}
      {entry.movement != null && entry.movement !== 0 && (
        <Text style={[styles.movement, { color: entry.movement > 0 ? colors.green : colors.red }]}>
          {entry.movement > 0 ? '\u25B2' : '\u25BC'}{Math.abs(entry.movement)}
        </Text>
      )}

      {/* Streak */}
      {entry.streak != null && entry.streak >= 3 && (
        <Text style={styles.streak}>{'\u{1F525}'}{entry.streak}</Text>
      )}

      {/* Correct indicator */}
      {entry.isCurrentCorrect != null && (
        <Text style={[styles.correctBadge, { color: entry.isCurrentCorrect ? colors.green : colors.red }]}>
          {entry.isCurrentCorrect ? '\u2713' : '\u2717'}
        </Text>
      )}

      {/* Score */}
      <Text style={[styles.score, compact && styles.scoreCompact]}>
        {formatNumber(entry.score)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 20,
    gap: 16,
  },
  compact: {
    paddingVertical: 0,
    paddingHorizontal: 16,
    gap: 14,
  },
  rankCol: {
    width: 36,
    alignItems: 'center',
  },
  rankColCompact: {
    width: 32,
  },
  rank: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 26,
    color: w(0.2),
  },
  rankCompact: {
    fontSize: 24,
  },
  medal: {
    fontSize: 28,
  },
  medalCompact: {
    fontSize: 24,
  },
  name: {
    flex: 1,
    fontFamily: fonts.outfit.medium,
    fontSize: 26,
    color: 'rgba(255,255,255,0.7)',
  },
  nameCompact: {
    fontSize: 22,
  },
  movement: {
    fontFamily: fonts.outfit.bold,
    fontSize: 20,
  },
  streak: {
    fontSize: 20,
  },
  correctBadge: {
    fontFamily: fonts.outfit.bold,
    fontSize: 24,
  },
  score: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 26,
    color: colors.gold,
    minWidth: 80,
    textAlign: 'right',
  },
  scoreCompact: {
    fontSize: 22,
  },
});
