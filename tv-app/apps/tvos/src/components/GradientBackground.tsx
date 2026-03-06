import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { gradients } from '../theme/colors';

interface Props {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function GradientBackground({ style, children }: Props) {
  return (
    <LinearGradient
      colors={[...gradients.main]}
      locations={[0, 0.2, 0.45, 0.7, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
