import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { LeaderboardEntry } from '../types/game';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  compact?: boolean;
  testID?: string;
}

export function LeaderboardRow({ entry, compact, testID }: LeaderboardRowProps) {
  const { rank, name, score, movement, isYou } = entry;
  const avatarSize = compact ? 24 : 28;

  return (
    <View
      testID={testID}
      style={[
        styles.row,
        isYou && styles.youRow,
      ]}
    >
      <Text
        style={[
          styles.rank,
          rank <= 3 ? styles.rankGold : styles.rankMuted,
        ]}
      >
        {rank}
      </Text>
      <Avatar name={name} rank={rank} size={avatarSize} isYou={isYou} />
      <View style={styles.nameContainer}>
        <Text
          style={[styles.name, isYou && styles.youName]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {isYou && <Text style={styles.youBadge}>YOU</Text>}
      </View>
      {movement !== 0 && (
        <Text
          style={[
            styles.movement,
            { color: movement > 0 ? colors.green : colors.red },
          ]}
        >
          {movement > 0 ? `\u25B2${movement}` : `\u25BC${Math.abs(movement)}`}
        </Text>
      )}
      <Text style={styles.score}>{score.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  youRow: {
    backgroundColor: w(0.08),
    borderColor: w(0.08),
  },
  rank: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 13,
    width: 18,
    textAlign: 'center',
  },
  rankGold: {
    color: colors.gold,
  },
  rankMuted: {
    color: w(0.25),
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: w(0.65),
  },
  youName: {
    fontFamily: fonts.outfit.bold,
    color: '#fff',
  },
  youBadge: {
    fontSize: 8,
    color: colors.blue,
    fontFamily: fonts.outfit.bold,
  },
  movement: {
    fontSize: 11,
    fontFamily: fonts.outfit.bold,
  },
  score: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 12,
    color: colors.gold,
  },
});
