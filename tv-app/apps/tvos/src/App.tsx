import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, AppStateStatus, StyleSheet, View } from 'react-native';
import SilentAudioPlayer from './SilentAudioPlayer';
import { TVStateProvider, useTVState } from './contexts/TVStateContext';
import { SetupButton } from './components/SetupButton';
import { GradientBackground } from './components/GradientBackground';

// Screens
import { SetupScreen } from './screens/SetupScreen';
import { IdleScreen } from './screens/IdleScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GetReadyScreen } from './screens/GetReadyScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { PlayingScreen } from './screens/PlayingScreen';
import { RevealScreen } from './screens/RevealScreen';
import { BetweenScreen } from './screens/BetweenScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { BetweenPodiumScreen } from './screens/BetweenPodiumScreen';
import { BetweenStandingsScreen } from './screens/BetweenStandingsScreen';
import { BetweenNationalScreen } from './screens/BetweenNationalScreen';
import { BetweenHypeScreen } from './screens/BetweenHypeScreen';

// Screens that should fade between each other (idle rotation + between-game)
const FADE_SCREENS = new Set([
  'idle', 'lobby', 'results',
  'between-podium', 'between-standings', 'between-national', 'between-hype',
]);

function getScreen(screenName: string): React.ReactNode {
  switch (screenName) {
    case 'setup': return <SetupScreen />;
    case 'idle': return <IdleScreen />;
    case 'lobby': return <LobbyScreen />;
    case 'getready': return <GetReadyScreen />;
    case 'category': return <CategoryScreen />;
    case 'playing': return <PlayingScreen />;
    case 'reveal': return <RevealScreen />;
    case 'between': return <BetweenScreen />;
    case 'leaderboard': return <LeaderboardScreen />;
    case 'results': return <ResultsScreen />;
    case 'between-podium': return <BetweenPodiumScreen />;
    case 'between-standings': return <BetweenStandingsScreen />;
    case 'between-national': return <BetweenNationalScreen />;
    case 'between-hype': return <BetweenHypeScreen />;
    default: return <SetupScreen />;
  }
}

function ScreenRouter() {
  const { state } = useTVState();

  // Cross-dissolve: during transition, old screen stays visible underneath
  // while new screen fades in on top. Only mount the overlay layer during
  // an active transition to avoid double-render flashes from poll updates.
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [currentScreen, setCurrentScreen] = useState(state.screen);
  const [outgoingScreen, setOutgoingScreen] = useState<string | null>(null);
  const prevScreenRef = useRef(state.screen);
  const animatingRef = useRef(false);

  useEffect(() => {
    const prev = prevScreenRef.current;
    const next = state.screen;
    prevScreenRef.current = next;

    if (prev === next) return;

    // If mid-animation, snap to finish
    if (animatingRef.current) {
      fadeAnim.stopAnimation();
      setOutgoingScreen(null);
      setCurrentScreen(next);
      animatingRef.current = false;
      return;
    }

    // Cross-dissolve between idle/lobby/results rotation screens
    if (FADE_SCREENS.has(prev) && FADE_SCREENS.has(next)) {
      animatingRef.current = true;
      // Keep old screen as outgoing (rendered underneath)
      setOutgoingScreen(prev);
      // Set new screen as current (rendered on top, starts transparent)
      setCurrentScreen(next);
      fadeAnim.setValue(0);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        // Done — remove outgoing layer
        setOutgoingScreen(null);
        animatingRef.current = false;
      });
    } else {
      // Instant swap for game screens
      setOutgoingScreen(null);
      setCurrentScreen(next);
      fadeAnim.setValue(1);
    }
  }, [state.screen]);

  return (
    <>
      {/* Outgoing screen: only mounted during cross-dissolve, stays fully opaque */}
      {outgoingScreen != null && (
        <Animated.View style={styles.layer} pointerEvents="none">
          {getScreen(outgoingScreen)}
        </Animated.View>
      )}
      {/* Current screen: fades in during transition, full opacity otherwise */}
      <Animated.View style={[styles.layer, outgoingScreen != null ? { opacity: fadeAnim } : undefined]}>
        {getScreen(currentScreen)}
      </Animated.View>
      {currentScreen !== 'setup' && <SetupButton />}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0326' },
  layer: { ...StyleSheet.absoluteFillObject },
});

const App: React.FC = () => {
  // Silent audio for screensaver suppression
  useEffect(() => {
    SilentAudioPlayer.startSilentAudio();
    return () => {
      SilentAudioPlayer.stopSilentAudio();
    };
  }, []);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        SilentAudioPlayer.startSilentAudio();
      } else if (nextState === 'background') {
        SilentAudioPlayer.stopSilentAudio();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <GradientBackground style={styles.root}>
      <TVStateProvider>
        <ScreenRouter />
      </TVStateProvider>
    </GradientBackground>
  );
};

export default App;
