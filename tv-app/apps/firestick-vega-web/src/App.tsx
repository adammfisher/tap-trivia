/**
 * TapTrivia TV — Vega OS WebView App
 *
 * Loads tv.taptrivia.tv in a WebView.
 *
 * KEEPALIVE STRATEGY (identical to native app):
 * AudioPlayer.play(silence.wav) via @amazon-devices/react-native-w3cmedia registers
 * an AUDIO_PLAYBACK session (weight 130) with the Vega OS idle manager, preventing
 * it from backgrounding the app. This is the PRIMARY keepalive mechanism.
 * SilentAudioPlayer (PlayerSession every 30s) is a backup layer.
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
    let disposed = false;
    let attempts = 0;

    const init = async () => {
      if (disposed || attempts >= 5) return;
      attempts++;
      console.log(`[AUDIO] init attempt #${attempts}`);
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
        console.log('[AUDIO] playing');
      } catch (e: any) {
        console.log('[AUDIO] init failed:', e?.message);
        try { audio?.pause(); (audio as any)?.deinitialize(); } catch (_) {}
        audio = null;
      }
    };

    const recover = async () => {
      if (disposed) return;
      if (!audio || audio.error || audio.paused || isNaN(audio.currentTime) || audio.readyState === 0) {
        console.log('[AUDIO] recovering...');
        try { audio?.pause(); (audio as any)?.deinitialize(); } catch (_) {}
        audio = null;
        await new Promise(r => setTimeout(r, 3000));
        if (!disposed) await init();
      }
    };

    init();
    seekTimer = setInterval(() => {
      try { if (audio && !audio.paused && audio.readyState >= 2) audio.currentTime = 0; } catch (_) {}
    }, 30000);
    recoveryTimer = setInterval(recover, 45000);

    return () => {
      disposed = true;
      clearInterval(seekTimer);
      clearInterval(recoveryTimer);
      try { audio?.pause(); (audio as any)?.deinitialize(); } catch (_) {}
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
