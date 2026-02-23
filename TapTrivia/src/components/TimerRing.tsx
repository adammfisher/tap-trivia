import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useEffect, useRef, memo } from 'react';
import { getTimerColor, colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';

const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

interface TimerRingProps {
  seconds: number;
  totalSeconds: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  /** Enable pulsing glow effect — renders web-style solid ring (used on category countdown) */
  pulse?: boolean;
}

export const TimerRing = memo(function TimerRing({
  seconds,
  totalSeconds,
  size = 58,
  strokeWidth = 3,
  label,
  pulse = false,
}: TimerRingProps) {
  // ── Shared animation refs ──
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const prevSeconds = useRef(seconds);

  // ── SVG ring mode (non-pulse) ──
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = seconds / totalSeconds;
  const targetOffset = circumference * (1 - pct);
  const color = getTimerColor(seconds, totalSeconds);
  const animatedOffset = useRef(new RNAnimated.Value(targetOffset)).current;

  // ── Pulse mode refs ──
  const pulseAnim = useRef(new RNAnimated.Value(0)).current;

  // Smooth ring offset animation (SVG mode only)
  useEffect(() => {
    if (pulse) return;
    const anim = RNAnimated.timing(animatedOffset, {
      toValue: targetOffset,
      duration: 300,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [pulse, targetOffset, animatedOffset]);

  // Pulsing glow loop (pulse mode — matches web's ringPulse 1.5s ease-in-out infinite)
  // Uses native driver since we only animate transform (scale) + opacity
  useEffect(() => {
    if (!pulse) return;
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseAnim]);

  // Scale bounce on number change (matches web's countdownNum: scale(2) → scale(1))
  const scaleAnimRef = useRef<RNAnimated.CompositeAnimation | null>(null);
  useEffect(() => {
    if (seconds !== prevSeconds.current) {
      prevSeconds.current = seconds;
      if (scaleAnimRef.current) scaleAnimRef.current.stop();
      scaleAnim.setValue(2);
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
  }, [seconds, scaleAnim]);

  // ── Pulse mode: web-style solid ring with outward-expanding glow ──
  // Matches CSS: @keyframes ringPulse {
  //   0%,100% { box-shadow: 0 0 0 0 rgba(102,126,234,0.4); }
  //   50%     { box-shadow: 0 0 0 12px rgba(102,126,234,0); }
  // }
  if (pulse) {
    const MAX_GLOW = 12;
    // Scale a ring outward from 1× to expand 12px beyond the circle on each side
    const glowScale = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1 + (MAX_GLOW * 2) / size],
    });
    const glowOpacity = pulseAnim.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0.4, 0.2, 0],
    });

    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Sonar-ping glow: thin ring that scales outward and fades */}
        <RNAnimated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: colors.blue,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        />
        {/* Solid blue ring with glass background (web: border 3px solid #667eea, bg surface-glass) */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: colors.blue,
            backgroundColor: w(0.06),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* White number with scale bounce (web: color #f0f0f0, animation countdownNum) */}
          <RNAnimated.Text
            style={[
              styles.number,
              {
                fontSize: size * 0.4,
                color: '#f0f0f0',
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {label ?? seconds}
          </RNAnimated.Text>
        </View>
      </View>
    );
  }

  // ── SVG ring mode: depleting stroke for gameplay timers ──
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={w(0.08)}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <RNAnimated.Text
          style={[
            styles.number,
            {
              fontSize: size * 0.32,
              color,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {label ?? seconds}
        </RNAnimated.Text>
      </View>
    </View>
  );
});

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
