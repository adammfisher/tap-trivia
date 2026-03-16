import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, tvFontSizes } from '../theme/typography';
import { w } from '../theme/colors';

interface Props {
  visible: boolean;
}

export function ErrorOverlay({ visible }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Text style={styles.icon}>{'\u{1F4E1}'}</Text>
      <Text style={styles.title}>Connection Lost</Text>
      <Text style={styles.subtitle}>Reconnecting automatically...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 3, 38, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.fredoka.bold,
    fontSize: tvFontSizes.h2,
    color: '#ffffff',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.outfit.medium,
    fontSize: tvFontSizes.body,
    color: w(0.5),
  },
});
