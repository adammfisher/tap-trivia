import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTVState } from '../contexts/TVStateContext';
import { fonts } from '../theme/typography';
import { w } from '../theme/colors';

export function SetupButton() {
  const { goToSetup } = useTVState();

  return (
    <TouchableOpacity
      style={s.btn}
      onPress={goToSetup}
      activeOpacity={0.7}
      hasTVPreferredFocus={false}
    >
      <Text style={s.arrow}>{'\u2190'}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    opacity: 0,
  },
  arrow: {
    fontFamily: fonts.outfit.medium,
    fontSize: 24,
    color: w(0.3),
  },
});
