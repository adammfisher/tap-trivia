import React from 'react';
import { StyleSheet, View, Image, ViewStyle, StyleProp } from 'react-native';

interface Props {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Pre-rendered 1920×1080 PNG of the TapTrivia gradient
 * (150deg, #0f0326 → #1e0f4a → #3d1866 → #6b2358 → #a8334a).
 * Same approach as the Roku app — react-native-linear-gradient not available on Vega OS.
 */
export function GradientBackground({ style, children }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../assets/image/bg-gradient.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0326',
  },
});
