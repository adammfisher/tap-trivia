import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GradientBackground } from '../components/GradientBackground';
import { SignageFullScreen } from '../signage/SignageFullScreen';
import { useTVState } from '../contexts/TVStateContext';

export function IdleScreen() {
  const { state } = useTVState();
  const { signageSlides, signageCurrentIndex, barCode, barName, logoUrl, secondsUntilNextGame } = state;

  return (
    <GradientBackground>
      <View style={styles.container}>
        <SignageFullScreen
          slides={signageSlides}
          currentIndex={signageCurrentIndex}
          barCode={barCode}
          barName={barName}
          logoUrl={logoUrl}
          secondsUntilNextGame={secondsUntilNextGame}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
