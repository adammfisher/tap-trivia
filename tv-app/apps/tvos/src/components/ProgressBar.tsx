import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme/colors';

interface Props {
  progress: number; // 0-1
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ progress, height = 8, style }: Props) {
  return (
    <View style={[styles.track, { height }, style]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
