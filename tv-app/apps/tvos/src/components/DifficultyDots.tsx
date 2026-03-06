import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';

interface Props {
  level: number; // 1, 2, or 3
}

const LABELS = ['Easy', 'Medium', 'Hard'];
const COLORS = [colors.green, colors.gold, colors.red];

export function DifficultyDots({ level }: Props) {
  const color = COLORS[Math.min(level, 3) - 1] || colors.green;

  return (
    <View style={styles.container}>
      {[1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i <= level ? color : w(0.1),
            },
          ]}
        />
      ))}
      <Text style={[styles.label, { color: w(0.4) }]}>
        {LABELS[Math.min(level, 3) - 1]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  label: {
    fontFamily: fonts.outfit.medium,
    fontSize: 26,
    marginLeft: 4,
  },
});
