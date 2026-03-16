/**
 * TimerRing for Vega OS — no react-native-svg available.
 * Uses 36 radial tick marks that deplete as time runs out.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { getTimerColor } from '../theme/colors';
import { fonts } from '../theme/typography';
import { w } from '../theme/colors';

const NUM_TICKS = 36;

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
  const radius = size / 2;

  const tickW = Math.max(3, Math.round(size * 0.04));
  const tickH = Math.max(8, Math.round(size * 0.09));
  const tickRadius = radius - tickH / 2 - 1;

  const activeTicks = totalSeconds > 0 ? Math.round((seconds / totalSeconds) * NUM_TICKS) : 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Tick marks */}
      {Array.from({ length: NUM_TICKS }).map((_, i) => {
        const angle = (i / NUM_TICKS) * 360;
        const active = i < activeTicks;
        return (
          <View
            key={i}
            style={[
              {
                position: 'absolute',
                top: radius - tickH / 2,
                left: radius - tickW / 2,
                width: tickW,
                height: tickH,
                borderRadius: Math.round(tickW / 2),
                backgroundColor: active ? color : w(0.1),
                transform: [{ rotate: `${angle}deg` }, { translateY: -tickRadius }],
              } as ViewStyle,
            ]}
          />
        );
      })}
      {/* Number */}
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.number, { fontSize: numSize, color }]}>
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    fontFamily: fonts.fredoka.bold,
    textAlign: 'center',
  },
});
