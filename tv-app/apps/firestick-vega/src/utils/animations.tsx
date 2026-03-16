/**
 * STRIPPED: All animations disabled for memory/stability isolation test (R3).
 * All components are plain View/Text passthroughs — no Animated.Value, no useNativeDriver.
 * This removes ALL native animation nodes system-wide.
 */
import React from 'react';
import { View, Text, ViewStyle, StyleProp, TextStyle } from 'react-native';

type Direction = 'up' | 'down' | 'left' | 'none';

interface FadeInProps {
  delay?: number;
  duration?: number;
  direction?: Direction;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

interface ZoomInProps {
  delay?: number;
  duration?: number;
  spring?: boolean;
  style?: StyleProp<ViewStyle | TextStyle>;
  children: React.ReactNode;
}

export function FadeInView({ style, children }: FadeInProps) {
  return <View style={style}>{children}</View>;
}

export function FadeInText({ style, children }: FadeInProps & { style?: StyleProp<TextStyle> }) {
  return <Text style={style}>{children}</Text>;
}

export function ZoomInView({ style, children }: ZoomInProps) {
  return <View style={style}>{children}</View>;
}

export function ZoomInText({ style, children }: ZoomInProps & { style?: StyleProp<TextStyle> }) {
  return <Text style={style}>{children}</Text>;
}
