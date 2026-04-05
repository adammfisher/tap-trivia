/**
 * TapTrivia TV — Vega OS WebView App
 *
 * Loads tv.taptrivia.tv in a WebView. The web TV app handles all game
 * screens, signage, and polling. This native wrapper only provides the
 * keepalive mechanism to prevent the Vega OS idle manager from killing the app.
 *
 * KEEPALIVE STRATEGY:
 * AudioPlayer.play(silence.wav) via @amazon-devices/react-native-w3cmedia registers
 * an AUDIO_PLAYBACK session (weight 130) with the Vega OS idle manager, preventing
 * it from backgrounding the app. This is the PRIMARY keepalive mechanism.
 * SilentAudioPlayer (PlayerSession every 30s) is a backup layer.
 * A 2-min forced refresh re-registers the session if silently lost.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from '@amazon-devices/webview';
import { AudioPlayer, AudioContentType, AudioUsageType } from '@amazon-devices/react-native-w3cmedia';
import { useComponentInstance } from '@amazon-devices/react-native-kepler';
import SilentAudioPlayer from './SilentAudioPlayer';

const TV_URL = 'https://tv.taptrivia.tv';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
  });
}

export const App: React.FC = () => {
  const componentInstance = useComponentInstance();
  const webViewRef = useRef<any>(null);

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

    // Forced re-init every 2 min — re-registers session if lost (e.g., after
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
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: TV_URL }}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        onLoadStart={(e: any) => console.log('[WEBVIEW] loadStart:', e?.nativeEvent?.url)}
        onLoad={(e: any) => console.log('[WEBVIEW] loaded:', e?.nativeEvent?.url)}
        onError={(e: any) => console.log('[WEBVIEW] error:', e?.nativeEvent?.code, e?.nativeEvent?.description)}
        onHttpError={(e: any) => console.log('[WEBVIEW] httpError:', e?.nativeEvent?.statusCode, e?.nativeEvent?.description)}
      />
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0326',
  },
});
