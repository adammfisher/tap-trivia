/**
 * LinearGradient shim for Vega OS (KeplerScript).
 * react-native-linear-gradient is not available on Kepler.
 *
 * The looping bg-gradient.mp4 video provides the main purple→pink gradient,
 * so when colors match BG_GRADIENT (starts with #0f0326) we render transparent
 * to let the video show through. For all other gradients (answer cards, avatars,
 * progress bars) we use the first color as a solid background.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

interface Props {
  colors: readonly string[] | string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

// The app's main background gradient starts with this color
const BG_GRADIENT_FIRST = '#0f0326';

function LinearGradient({ colors, style, children }: Props) {
  // If this is the main BG gradient, render transparent (video bg handles it)
  const isBgGradient = colors.length > 0 && colors[0] === BG_GRADIENT_FIRST;
  const bg = isBgGradient ? undefined : (colors.length > 0 ? { backgroundColor: colors[0] as string } : undefined);
  return (
    <View style={[bg, style]}>
      {children}
    </View>
  );
}

export default LinearGradient;
