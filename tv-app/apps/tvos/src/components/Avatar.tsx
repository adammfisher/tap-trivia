import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { initials, avatarGradient } from '../utils/avatar';
import { fonts } from '../theme/typography';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface Props {
  name: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}

// Match web avatar sizes
const SIZES: Record<AvatarSize, { dim: number; font: number }> = {
  xs: { dim: 44, font: 16 },
  sm: { dim: 52, font: 18 },
  md: { dim: 72, font: 26 },
  lg: { dim: 88, font: 32 },
  xl: { dim: 96, font: 36 },
  '2xl': { dim: 112, font: 40 },
  '3xl': { dim: 120, font: 44 },
};

export function Avatar({ name, size = 'md', style }: Props) {
  const safeName = name || 'Player';
  const s = SIZES[size];
  const [c1, c2] = avatarGradient(safeName);

  return (
    <LinearGradient
      colors={[c1, c2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          width: s.dim,
          height: s.dim,
          borderRadius: s.dim / 2,
          borderWidth: 4,
          borderColor: 'rgba(255,255,255,0.2)',
        },
        style,
      ]}
    >
      <Text style={[styles.letter, { fontSize: s.font }]}>
        {initials(safeName)}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    fontFamily: fonts.fredoka.bold,
    color: '#ffffff',
    textAlign: 'center',
  },
});
