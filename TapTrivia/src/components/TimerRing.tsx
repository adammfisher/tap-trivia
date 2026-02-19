import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getTimerColor, w } from '../theme/colors';
import { fonts } from '../theme/typography';

interface TimerRingProps {
  seconds: number;
  totalSeconds: number;
  size?: number;
  strokeWidth?: number;
}

export function TimerRing({
  seconds,
  totalSeconds,
  size = 58,
  strokeWidth = 3,
}: TimerRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = seconds / totalSeconds;
  const offset = circumference * (1 - pct);
  const color = getTimerColor(seconds, totalSeconds);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={w(0.08)}
          strokeWidth={strokeWidth}
        />
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
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text
          style={[
            styles.number,
            { fontSize: size * 0.32, color },
          ]}
        >
          {seconds}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: fonts.fredoka.bold,
    lineHeight: undefined,
  },
});
