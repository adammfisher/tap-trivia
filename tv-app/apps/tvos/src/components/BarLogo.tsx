import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { fonts, tvFontSizes } from '../theme/typography';
import { w } from '../theme/colors';

interface Props {
  logoUrl?: string | null;
  barName: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function BarLogo({ logoUrl, barName, size = 120, style }: Props) {
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={[{ width: size, height: size, borderRadius: size / 4 } as ImageStyle, style as any]}
        resizeMode="contain"
      />
    );
  }

  // Fallback: first letter in circle
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 4 }, style]}>
      <Text style={[styles.letter, { fontSize: size * 0.5 }]}>
        {(barName.charAt(0) || 'T').toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    fontFamily: fonts.fredoka.bold,
    color: w(0.6),
  },
});
