import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { FadeInView } from '../utils/animations';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';
import { formatNumber } from '../utils/format';
import type { TvLeaderboardEntry } from '../services/api';

interface Props {
  entries: TvLeaderboardEntry[];
}

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
const BAR_HEIGHTS = [260, 200, 160]; // 1st, 2nd, 3rd pedestal heights (web values)
const BAR_WIDTHS = [180, 150, 150];
const MEDAL_COLORS = [colors.gold, '#c0c0c0', '#cd7f32'];

function PodiumPlace({
  entry,
  place,
  delay,
}: {
  entry: TvLeaderboardEntry | undefined;
  place: number;
  delay: number;
}) {
  if (!entry) return <View style={styles.placeWrapper} />;

  const isFirst = place === 0;

  return (
    <FadeInView delay={delay} style={styles.placeWrapper}>
      {/* Avatar */}
      <Avatar
        name={entry.playerName}
        size={isFirst ? '2xl' : 'xl'}
        style={styles.avatar}
      />

      {/* Medal */}
      <Text style={styles.medal}>{MEDALS[place]}</Text>

      {/* Name */}
      <Text style={[styles.name, isFirst && styles.nameFirst]} numberOfLines={1}>
        {entry.playerName}
      </Text>

      {/* Score */}
      <Text style={[styles.score, isFirst && styles.scoreFirst, { color: MEDAL_COLORS[place] }]}>
        {formatNumber(entry.score)}
      </Text>

      {/* Pedestal bar */}
      <View
        style={[
          styles.pedestal,
          {
            height: BAR_HEIGHTS[place],
            width: BAR_WIDTHS[place],
            backgroundColor: isFirst ? 'rgba(255,210,0,0.15)' : 'rgba(255,255,255,0.08)',
            borderColor: isFirst ? 'rgba(255,210,0,0.21)' : 'rgba(255,255,255,0.06)',
          },
        ]}
      >
        <Text style={styles.pedestalRank}>{place + 1}</Text>
      </View>
    </FadeInView>
  );
}

export function Podium({ entries }: Props) {
  // Display order: 2nd, 1st, 3rd
  return (
    <View style={styles.container}>
      <PodiumPlace entry={entries[1]} place={1} delay={200} />
      <PodiumPlace entry={entries[0]} place={0} delay={0} />
      <PodiumPlace entry={entries[2]} place={2} delay={400} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 32,
  },
  placeWrapper: {
    alignItems: 'center',
  },
  medal: {
    fontSize: 40,
    marginBottom: 8,
  },
  avatar: {
    marginBottom: 8,
  },
  name: {
    fontFamily: fonts.outfit.bold,
    fontSize: 26,
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  nameFirst: {
    fontSize: 30,
  },
  score: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 34,
    marginBottom: 12,
  },
  scoreFirst: {
    fontSize: 44,
  },
  pedestal: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 2,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 16,
  },
  pedestalRank: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 56,
    color: w(0.15),
  },
});
