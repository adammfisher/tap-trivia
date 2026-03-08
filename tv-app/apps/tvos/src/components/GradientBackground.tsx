import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Video from 'react-native-video';

interface Props {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const bgVideo = require('../../assets/bg-gradient.mp4');

export function GradientBackground({ style, children }: Props) {
  return (
    <View style={[styles.container, style]}>
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
