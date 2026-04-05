/**
 * TapTrivia TV — Native Vega OS App
 *
 * KEEPALIVE STRATEGY:
 * AudioPlayer.play(silence.wav) via @amazon-devices/react-native-w3cmedia registers
 * an AUDIO_PLAYBACK session (weight 130) with the Vega OS idle manager, preventing
 * it from backgrounding the app. This is the PRIMARY keepalive mechanism.
 * SilentAudioPlayer (PlayerSession every 30s) is a backup layer.
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { AudioPlayer, AudioContentType, AudioUsageType } from '@amazon-devices/react-native-w3cmedia';
import { useComponentInstance } from '@amazon-devices/react-native-kepler';
import SilentAudioPlayer from './SilentAudioPlayer';
import { TVStateProvider, useTVState } from './contexts/TVStateContext';
import { SetupButton } from './components/SetupButton';
import { GradientBackground } from './components/GradientBackground';
import { ErrorBoundary } from './components/ErrorBoundary';

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

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
  });
}

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
  return (
    <>
      {getScreen(state.screen)}
      {state.screen !== 'setup' && <SetupButton />}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0326' },
});

export const App: React.FC = () => {
  const componentInstance = useComponentInstance();

  // Backup: PlayerSession heartbeat every 30s
  useEffect(() => {
    SilentAudioPlayer.startSilentAudio();
    return () => SilentAudioPlayer.stopSilentAudio();
  }, []);

  // Primary: AudioPlayer registers AUDIO_PLAYBACK session with idle manager
  useEffect(() => {
    let audio: AudioPlayer | null = null;
    let seekTimer: ReturnType<typeof setInterval>;
    let recoveryTimer: ReturnType<typeof setInterval>;
    let refreshTimer: ReturnType<typeof setInterval>;
    let disposed = false;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 10;

    const teardown = () => {
      try { audio?.pause(); (audio as any)?.deinitialize(); } catch (_) {}
      audio = null;
    };

    const init = async () => {
      if (disposed || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return;
      consecutiveFailures++;
      console.log(`[AUDIO] init attempt (consecutive failures: ${consecutiveFailures})`);
      try {
        audio = new AudioPlayer(AudioContentType.CONTENT_TYPE_MUSIC, AudioUsageType.USAGE_MEDIA);
        await withTimeout(audio.setMediaControlFocus(componentInstance), 5000);
        await withTimeout(audio.initialize(), 10000);

        audio.addEventListener('ended', () => { try { audio?.play(); } catch (_) {} });
        audio.addEventListener('error', () => console.log('[AUDIO] error:', audio?.error));

        audio.loop = false;
        audio.volume = 0.01;
        audio.src = 'https://tv.taptrivia.tv/silence.wav';
        audio.load();
        await withTimeout(audio.play(), 10000);
        consecutiveFailures = 0; // Reset on success
        console.log('[AUDIO] playing — session registered');
      } catch (e: any) {
        console.log('[AUDIO] init failed:', e?.message);
        teardown();
      }
    };

    const recover = async () => {
      if (disposed) return;
      if (!audio || audio.error || audio.paused || isNaN(audio.currentTime) || audio.readyState === 0) {
        console.log('[AUDIO] recovering...');
        teardown();
        await new Promise(r => setTimeout(r, 3000));
        if (!disposed) await init();
      } else {
        consecutiveFailures = 0;
      }
    };

    // Forced re-init every 4 min — re-registers session if lost (e.g., after
    // OS backgrounded the app for profile picker, system dialog, etc.).
    // Must be under the 5-min idle manager kill threshold.
    const refresh = async () => {
      if (disposed) return;
      console.log('[AUDIO] periodic session refresh');
      teardown();
      await new Promise(r => setTimeout(r, 1000));
      if (!disposed) await init();
    };

    init();
    seekTimer = setInterval(() => {
      try { if (audio && !audio.paused && audio.readyState >= 2) audio.currentTime = 0; } catch (_) {}
    }, 30000);
    recoveryTimer = setInterval(recover, 45000);
    refreshTimer = setInterval(refresh, 120000); // 2 min — well under 5-min idle kill

    return () => {
      disposed = true;
      clearInterval(seekTimer);
      clearInterval(recoveryTimer);
      clearInterval(refreshTimer);
      teardown();
    };
  }, [componentInstance]);

  return (
    <GradientBackground style={styles.root}>
      <TVStateProvider>
        <ErrorBoundary>
          <ScreenRouter />
        </ErrorBoundary>
      </TVStateProvider>
    </GradientBackground>
  );
};

export default App;
