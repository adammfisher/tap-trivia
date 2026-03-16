// R5: Animated.loop disabled — replaced with static View (last useNativeDriver usage)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

import { Logo } from '../components/Logo';
import { QRBadge } from '../components/QRBadge';
import { ZoomInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

const NUM_TICKS = 36;
const RING_SIZE = 280;
const TICK_W = 8;
const TICK_H = 14;
const TICK_RADIUS = 129; // translateY to center ticks on ring border

function CountdownTicks({ count }: { count: number }) {
  const activeTicks = Math.round((count / 3) * NUM_TICKS);
  return (
    <View style={s.tickOverlay} pointerEvents="none">
      {Array.from({ length: NUM_TICKS }).map((_, i) => {
        const angle = (i / NUM_TICKS) * 360;
        const active = i < activeTicks;
        return (
          <View
            key={i}
            style={[
              s.tick,
              { backgroundColor: active ? colors.blue : 'rgba(102,126,234,0.18)' },
              { transform: [{ rotate: `${angle}deg` }, { translateY: -TICK_RADIUS }] } as ViewStyle,
            ]}
          />
        );
      })}
    </View>
  );
}

export function GetReadyScreen() {
  const { state } = useTVState();
  const [count, setCount] = useState(3);

  useEffect(() => {
    setCount(3);
    const t1 = setTimeout(() => setCount(2), 1000);
    const t2 = setTimeout(() => setCount(1), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <>
      <View style={s.container}>
        <Logo size="lg" />

        {state.barName ? (
          <Text style={s.barName}>{state.barName}</Text>
        ) : null}

        <Text style={s.label}>GAME STARTING</Text>

        {/* Ring with depleting tick marks */}
        <View style={s.ringContainer}>
          <View style={s.ring}>
            <ZoomInText key={count} spring style={s.number}>
              {count}
            </ZoomInText>
          </View>
          <CountdownTicks count={count} />
        </View>

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
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 6,
    borderColor: 'rgba(102,126,234,0.12)',
    backgroundColor: 'rgba(102,126,234,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickOverlay: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    top: 0,
    left: 0,
  },
  tick: {
    position: 'absolute',
    top: RING_SIZE / 2 - TICK_H / 2,
    left: RING_SIZE / 2 - TICK_W / 2,
    width: TICK_W,
    height: TICK_H,
    borderRadius: 2,
  },
  number: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 144,
    color: '#f0f0f0',
  },
  sub: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 36,
    color: w(0.5),
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
