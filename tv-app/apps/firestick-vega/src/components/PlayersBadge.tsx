import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../theme/typography';

interface Props {
  count: number;
}

export function PlayersBadge({ count }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.icon}>{'\uD83D\uDC65'}</Text>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 32,
    gap: 12,
  },
  icon: {
    fontSize: 28,
  },
  count: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 28,
    color: '#ffffff',
  },
});
