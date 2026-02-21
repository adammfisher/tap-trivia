import { memo } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { fonts } from '../theme/typography';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 17,
  md: 22,
  lg: 32,
};

export const Logo = memo(function Logo({ size = 'md' }: LogoProps) {
  const fontSize = sizes[size];
  return (
    <View style={styles.row}>
      <Text style={[styles.tap, { fontSize }]}>Tap</Text>
      <Text style={[styles.trivia, { fontSize, color: '#ffd200' }]}>Trivia</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tap: {
    fontFamily: fonts.fredoka.bold,
    color: '#fff',
    letterSpacing: -0.5,
  },
  trivia: {
    fontFamily: fonts.fredoka.bold,
    letterSpacing: -0.5,
  },
});
