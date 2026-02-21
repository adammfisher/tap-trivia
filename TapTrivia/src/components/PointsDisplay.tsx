import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPointsColor, w } from '../theme/colors';
import { fonts } from '../theme/typography';

interface PointsDisplayProps {
  points: number;
  maxPoints?: number;
  sublabel?: string;
}

export const PointsDisplay = memo(function PointsDisplay({ points, maxPoints = 1000, sublabel = 'Points Available' }: PointsDisplayProps) {
  const color = getPointsColor(points, maxPoints);
  const pct = points / maxPoints;

  return (
    <View style={styles.container}>
      <Text style={[styles.points, { color }]}>{points}</Text>
      <Text style={styles.sublabel}>{sublabel}</Text>
      <View style={styles.drainTrack}>
        <View style={[styles.drainFill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  points: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 48,
    lineHeight: 48,
  },
  sublabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: w(0.4),
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  drainTrack: {
    width: 180,
    height: 4,
    borderRadius: 2,
    backgroundColor: w(0.08),
    marginTop: 8,
    overflow: 'hidden',
  },
  drainFill: {
    height: '100%',
    borderRadius: 2,
  },
});
