import React, { useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getTimerColor } from '../theme/colors';
import { fonts } from '../theme/typography';
import { w } from '../theme/colors';

interface Props {
  seconds: number;
  totalSeconds: number;
  size?: number;
  strokeWidth?: number;
}

export const TimerRing = memo(function TimerRing({
  seconds,
  totalSeconds,
  size = 200,
  strokeWidth = 10,
}: Props) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = totalSeconds > 0 ? seconds / totalSeconds : 0;
  const offset = circumference * (1 - pct);
  const color = getTimerColor(seconds, totalSeconds);
  const numSize = Math.round(size * 0.32);
  const displaySeconds = Math.ceil(seconds);

  // Scale bounce on number change
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const prevSeconds = useRef(displaySeconds);
  const scaleAnimRef = useRef<RNAnimated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (displaySeconds !== prevSeconds.current) {
      prevSeconds.current = displaySeconds;
      if (scaleAnimRef.current) scaleAnimRef.current.stop();
      scaleAnim.setValue(1.5);
      const anim = RNAnimated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      });
      scaleAnimRef.current = anim;
      anim.start(() => { scaleAnimRef.current = null; });
    }
    return () => { if (scaleAnimRef.current) scaleAnimRef.current.stop(); };
  }, [displaySeconds, scaleAnim]);

  return (
    <View style={[styles.container, { width: size, height: size, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 12 }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={w(0.08)}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring — ticks once per second, no JS-thread animation */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <RNAnimated.Text
          style={[
            styles.number,
            {
              fontSize: numSize,
              color,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {displaySeconds}
        </RNAnimated.Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    fontFamily: fonts.fredoka.bold,
    textAlign: 'center',
  },
});
