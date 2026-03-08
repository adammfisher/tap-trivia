import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTVState } from '../contexts/TVStateContext';
import { formatCountdown } from '../utils/format';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

/**
 * Persistent countdown bar overlay shown during between-game phases.
 * Positioned at top center. Turns gold + bright when ≤15s.
 */
export function CountdownBar() {
  const { state } = useTVState();
  const secs = state.secondsUntilNextGame;
  const urgent = secs > 0 && secs <= 15;

  return (
    <View style={[s.bar, urgent && s.barUrgent]}>
      <Text style={[s.label, urgent && s.labelUrgent]}>Next Game In</Text>
      <Text style={[s.value, urgent && s.valueUrgent]}>
        {formatCountdown(secs)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 10,
    backgroundColor: 'rgba(15,3,38,0.6)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 100,
  },
  barUrgent: {
    backgroundColor: 'rgba(61,24,102,0.8)',
    borderColor: 'rgba(255,210,0,0.3)',
  },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 22,
    color: w(0.5),
  },
  labelUrgent: {
    color: 'rgba(255,210,0,0.8)',
  },
  value: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 26,
    color: colors.gold,
  },
  valueUrgent: {
    color: colors.gold,
  },
});
