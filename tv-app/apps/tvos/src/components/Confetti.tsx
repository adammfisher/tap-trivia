import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const CONFETTI_COLORS = ['#ffd200', '#00d4aa', '#ff4757', '#667eea', '#764ba2', '#f7971e'];
const PIECE_COUNT = 40;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function ConfettiPiece({ index }: { index: number }) {
  const fall = useRef(new Animated.Value(-50)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const left = Math.random() * SCREEN_W;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 10 + Math.random() * 14;
  const delay = Math.random() * 2000;
  const duration = 3000 + Math.random() * 2000;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(fall, {
        toValue: SCREEN_H + 100,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(drift, {
        toValue: (Math.random() - 0.5) * 200,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 360 * (1 + Math.random()),
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration * 0.8,
        delay: delay + duration * 0.5,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left,
          width: size,
          height: size * 0.6,
          backgroundColor: color,
          opacity,
          transform: [
            { translateY: fall },
            { translateX: drift },
            { rotate: spin },
          ],
        },
      ]}
    />
  );
}

export function Confetti() {
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PIECE_COUNT }, (_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  piece: {
    position: 'absolute',
    top: -20,
    borderRadius: 3,
  },
});
