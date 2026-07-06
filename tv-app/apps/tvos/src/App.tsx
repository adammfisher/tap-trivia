import React, { useRef, useState, useEffect } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import { TVStateProvider, useTVState } from './contexts/TVStateContext';
import { SetupButton } from './components/SetupButton';
import { GradientBackground } from './components/GradientBackground';
import { fonts } from './theme/typography';

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
import { RoundCompleteScreen } from './screens/RoundCompleteScreen';
import { PlayTapTriviaScreen } from './screens/PlayTapTriviaScreen';
import { ComingUpScreen } from './screens/ComingUpScreen';

// Screens that should fade between each other (idle rotation + between-game)
const FADE_SCREENS = new Set([
  'idle', 'lobby', 'results',
  'between-podium', 'between-standings', 'between-national', 'between-hype',
  'round-complete', 'play-taptrivia', 'coming-up',
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
    case 'round-complete': return <RoundCompleteScreen />;
    case 'play-taptrivia': return <PlayTapTriviaScreen />;
    case 'coming-up': return <ComingUpScreen />;
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
      <NextPill />
    </>
  );
}

// Persistent "TRIVIA STARTS IN M:SS" notch pill — overlays the waiting screens,
// hidden during live gameplay. Mirrors the web + Roku TV apps.
const PILL_SCREENS = new Set<string>([
  'idle', 'lobby', 'results',
  'between-podium', 'between-standings', 'between-national', 'between-hype',
  'round-complete', 'play-taptrivia', 'coming-up',
]);

function NextPill() {
  const { state } = useTVState();
  const secs = state.secondsUntilNextGame || 0;
  if (!PILL_SCREENS.has(state.screen) || secs <= 0 || secs > 16 * 60) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return (
    <View pointerEvents="none" style={pill.wrap}>
      <View style={pill.pill}>
        <View style={pill.dot} />
        <Text style={pill.label}>TRIVIA STARTS IN</Text>
        <Text style={pill.time}>{m}:{s < 10 ? '0' : ''}{s}</Text>
      </View>
    </View>
  );
}

const pill = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 46,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: 'rgba(15,3,38,0.93)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#00d4aa' },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.62)',
  },
  time: { fontFamily: fonts.fredoka.bold, fontSize: 38, color: '#ffd200' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0326' },
  layer: { ...StyleSheet.absoluteFillObject },
});

const App: React.FC = () => {
  // isIdleTimerDisabled = true is set natively in AppDelegate to suppress the tvOS screensaver
  return (
    <GradientBackground style={styles.root}>
      <TVStateProvider>
        <ScreenRouter />
      </TVStateProvider>
    </GradientBackground>
  );
};

export default App;
