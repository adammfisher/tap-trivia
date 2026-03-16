/**
 * JS-driven animations — useNativeDriver: false throughout.
 * Native driver fills KeplerScript's animation heap and causes JSReactThread timeout kills.
 * JS-driven animations update style props via the JS bridge — safe on Kepler.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, ViewStyle, StyleProp, TextStyle } from 'react-native';

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

function directionOffset(direction: Direction): { translateY?: number; translateX?: number } {
  switch (direction) {
    case 'up':   return { translateY: 24 };
    case 'down': return { translateY: -24 };
    case 'left': return { translateX: 24 };
    default:     return {};
  }
}

export function FadeInView({ delay = 0, duration = 300, direction = 'none', style, children }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(directionOffset(direction).translateY ?? directionOffset(direction).translateX ?? 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: false }),
      Animated.timing(offset, { toValue: 0, duration, delay, useNativeDriver: false }),
    ]).start();
  }, []);

  const dir = directionOffset(direction);
  const transform = dir.translateY !== undefined
    ? [{ translateY: offset }]
    : dir.translateX !== undefined
    ? [{ translateX: offset }]
    : [];

  return (
    <Animated.View style={[style, { opacity }, transform.length ? { transform } : {}]}>
      {children}
    </Animated.View>
  );
}

export function FadeInText({ delay = 0, duration = 300, style, children }: FadeInProps & { style?: StyleProp<TextStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: false }).start();
  }, []);

  return (
    <Animated.Text style={[style, { opacity }]}>
      {children}
    </Animated.Text>
  );
}

export function ZoomInView({ delay = 0, duration = 300, spring = false, style, children }: ZoomInProps) {
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const anim = spring
      ? Animated.spring(scale, { toValue: 1, useNativeDriver: false, tension: 180, friction: 10 })
      : Animated.timing(scale, { toValue: 1, duration, delay, useNativeDriver: false });
    anim.start();
  }, []);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

export function ZoomInText({ delay = 0, duration = 300, spring = false, style, children }: ZoomInProps & { style?: StyleProp<TextStyle> }) {
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = spring
      ? Animated.spring(scale, { toValue: 1, useNativeDriver: false, tension: 180, friction: 10 })
      : Animated.timing(scale, { toValue: 1, duration, delay, useNativeDriver: false });
    anim.start();
  }, []);

  return (
    <Animated.Text style={[style, { transform: [{ scale }] }]}>
      {children}
    </Animated.Text>
  );
}
