import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface Props {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

// Background is the static LinearGradient ONLY. We intentionally do NOT overlay a
// <Video> (bg-gradient.mp4) here: on a real Apple TV that mp4 renders washed-out
// and low-contrast (a video color-range mismatch) and milky-whites the entire UI,
// while it silently no-ops in the tvOS simulator (so it looked fine there). The
// native tvOS screensaver is already suppressed via isIdleTimerDisabled in
// AppDelegate, so the video served no keepalive purpose on tvOS — it was a
// leftover of the Fire TV (Vega) media-session pattern.
// Contrast-boosted variant of the shared web/Roku gradient. The mid/bottom stops
// are pushed a bit deeper/richer so bright content (white cards, gold, QR) pops
// through the Apple TV 4K's HDR mapping. Top stop kept near the original #0f0326
// (not near-black) so the upper-left corner doesn't read too dark.
const GRADIENT_COLORS = ['#0d0628', '#160a3c', '#39125e', '#6a2052', '#b22f49'];

export function GradientBackground({ style, children }: Props) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={StyleSheet.absoluteFillObject}
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
