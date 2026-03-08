import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

import { Logo } from '../components/Logo';
import { QRBadge } from '../components/QRBadge';
import { ZoomInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

export function GetReadyScreen() {
  const { state } = useTVState();
  const [count, setCount] = useState(3);

  // Pulsing ring animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setCount(3);
    const t1 = setTimeout(() => setCount(2), 1000);
    const t2 = setTimeout(() => setCount(1), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <>
      <View style={s.container}>
        <Logo size="lg" />

        {state.barName ? (
          <Text style={s.barName}>{state.barName}</Text>
        ) : null}

        <Text style={s.label}>GAME STARTING</Text>

        {/* Pulsing ring with number */}
        <Animated.View style={[s.ring, { transform: [{ scale: pulseAnim }] }]}>
          <ZoomInText key={count} spring style={s.number}>
            {count}
          </ZoomInText>
        </Animated.View>

        <Text style={s.sub}>Get ready!</Text>
        <Text style={s.info}>
          {state.totalQuestions} questions · Answer fast for more points
        </Text>

        {/* QR Badge (absolute bottom-left) */}
        <View style={s.qrBadge}>
          <QRBadge barCode={state.barCode} variant="inline" />
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barName: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 56,
    color: w(0.5),
    marginTop: 16,
  },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 32,
    color: w(0.4),
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: 72,
    marginBottom: 40,
  },
  ring: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 6,
    borderColor: colors.blue,
    backgroundColor: 'rgba(102,126,234,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 144,
    color: '#f0f0f0',
  },
  sub: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 36,
    color: '#ffffff',
    marginTop: 56,
  },
  info: {
    fontFamily: fonts.outfit.medium,
    fontSize: 28,
    color: w(0.4),
    marginTop: 12,
  },
  qrBadge: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    zIndex: 20,
  },
});
