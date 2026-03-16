/**
 * TimerRing for Vega OS — no react-native-svg available.
 * Uses a circular View with borderColor for the ring effect.
 * Not as precise as SVG dasharray but visually similar.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  const color = getTimerColor(seconds, totalSeconds);
  const numSize = Math.round(size * 0.32);
  const displaySeconds = Math.ceil(seconds);

  // R3: spring animation disabled — plain Text only
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ring */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: w(0.08),
          },
        ]}
      />
      {/* Colored ring — full circle, opacity based on progress */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            opacity: totalSeconds > 0 ? seconds / totalSeconds : 0,
          },
        ]}
      />
      {/* Number */}
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text
          style={[
            styles.number,
            { fontSize: numSize, color },
          ]}
        >
          {displaySeconds}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
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
