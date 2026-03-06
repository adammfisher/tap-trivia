import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp, TextStyle } from 'react-native';

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
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const TRANSLATE_DISTANCE = 30; // larger for TV

export function FadeInView({
  delay = 0,
  duration = 400,
  direction = 'up',
  style,
  children,
}: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(
    direction === 'none' ? 0 : direction === 'down' ? -TRANSLATE_DISTANCE : TRANSLATE_DISTANCE,
  )).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ];
    if (direction !== 'none') {
      animations.push(
        Animated.timing(translate, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        }),
      );
    }
    const anim = Animated.parallel(animations);
    anim.start();
    return () => anim.stop();
  }, []);

  const transform: Animated.WithAnimatedObject<ViewStyle>['transform'] =
    direction === 'left'
      ? [{ translateX: translate }]
      : direction !== 'none'
        ? [{ translateY: translate }]
        : [];

  return (
    <Animated.View style={[style, { opacity, transform }]}>
      {children}
    </Animated.View>
  );
}

export function FadeInText({
  delay = 0,
  duration = 400,
  direction = 'up',
  style,
  children,
}: FadeInProps & { style?: StyleProp<TextStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(
    direction === 'none' ? 0 : direction === 'down' ? -TRANSLATE_DISTANCE : TRANSLATE_DISTANCE,
  )).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ];
    if (direction !== 'none') {
      animations.push(
        Animated.timing(translate, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        }),
      );
    }
    const anim = Animated.parallel(animations);
    anim.start();
    return () => anim.stop();
  }, []);

  const transform: Animated.WithAnimatedObject<TextStyle>['transform'] =
    direction === 'left'
      ? [{ translateX: translate }]
      : direction !== 'none'
        ? [{ translateY: translate }]
        : [];

  return (
    <Animated.Text style={[style, { opacity, transform }]}>
      {children}
    </Animated.Text>
  );
}

export function ZoomInView({
  delay = 0,
  duration = 600,
  spring = false,
  style,
  children,
}: ZoomInProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const opacityAnim = Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      delay,
      useNativeDriver: true,
    });

    const scaleAnim = spring
      ? Animated.sequence([
          Animated.delay(delay),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 12,
            stiffness: 180,
          }),
        ])
      : Animated.timing(scale, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        });

    const anim = Animated.parallel([opacityAnim, scaleAnim]);
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

export function ZoomInText({
  delay = 0,
  duration = 600,
  spring = false,
  style,
  children,
}: ZoomInProps & { style?: StyleProp<TextStyle> }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const opacityAnim = Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      delay,
      useNativeDriver: true,
    });

    const scaleAnim = spring
      ? Animated.sequence([
          Animated.delay(delay),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 12,
            stiffness: 180,
          }),
        ])
      : Animated.timing(scale, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        });

    const anim = Animated.parallel([opacityAnim, scaleAnim]);
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.Text style={[style, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.Text>
  );
}
