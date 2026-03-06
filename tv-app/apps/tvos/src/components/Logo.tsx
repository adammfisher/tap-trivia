import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { fonts } from '../theme/typography';
import { colors } from '../theme/colors';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: StyleProp<ViewStyle>;
}

const SIZES = {
  sm: 34,
  md: 44,
  lg: 64,
  xl: 88,
};

export function Logo({ size = 'md', style }: Props) {
  const fontSize = SIZES[size];
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.tap, { fontSize }]}>Tap</Text>
      <Text style={[styles.trivia, { fontSize }]}>Trivia</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tap: {
    fontFamily: fonts.fredoka.bold,
    color: '#f0f0f0',
  },
  trivia: {
    fontFamily: fonts.fredoka.bold,
    color: colors.gold,
  },
});
