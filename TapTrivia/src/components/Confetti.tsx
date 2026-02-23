import { useEffect, useRef, useMemo, memo } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { colors } from '../theme/colors';

const CONFETTI_COLORS = [colors.gold, colors.red, colors.green, colors.blue, colors.purple, '#ff6b81'];

interface ConfettiPieceProps {
  color: string;
  leftPercent: number;
  delay: number;
  size: number;
}

function ConfettiPiece({ color, leftPercent, delay, size }: ConfettiPieceProps) {
  const translateY = useRef(new Animated.Value(-10)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 1500 + Math.random() * 1000;
    const delayMs = delay * 1000;

    const anim = Animated.parallel([
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration - 100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(translateY, {
          toValue: 400,
          duration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(rotate, {
          toValue: 720,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, opacity, translateY, rotate]);

  const rotateInterpolation = rotate.interpolate({
    inputRange: [0, 720],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: -10,
        left: `${leftPercent}%` as unknown as number,
        width: size,
        height: size * 1.4,
        backgroundColor: color,
        borderRadius: 2,
        opacity,
        transform: [
          { translateY },
          { rotate: rotateInterpolation },
        ],
      }}
    />
  );
}

export const Confetti = memo(function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 12 }).map((_, i) => ({
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      leftPercent: 5 + i * 8,
      delay: i * 0.12,
      size: 4 + Math.random() * 5,
    })),
  []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} {...p} />
      ))}
    </View>
  );
});
