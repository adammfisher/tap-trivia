import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';

interface Props {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const bgVideo = require('../../assets/bg-gradient.mp4');

const GRADIENT_COLORS = ['#0f0326', '#1e0f4a', '#3d1866', '#6b2358', '#a8334a'];

export function GradientBackground({ style, children }: Props) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Video
        source={bgVideo}
        style={styles.video}
        repeat={true}
        muted={true}
        resizeMode="cover"
        disableFocus={true}
        playInBackground={true}
        playWhenInactive={true}
        preventsDisplaySleepDuringVideoPlayback={true}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0326',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});
