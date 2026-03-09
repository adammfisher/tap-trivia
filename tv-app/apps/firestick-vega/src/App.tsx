import { WebView } from "@amazon-devices/webview";
import { AudioPlayer, AudioContentType, AudioUsageType } from "@amazon-devices/react-native-w3cmedia";
import { useComponentInstance } from "@amazon-devices/react-native-kepler";
import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";

const TV_APP_URL = `https://tv.taptrivia.tv?platform=firestickvega&_v=${Date.now()}`;

// ── Patch PlayerSession.create() — undefined on Fire TV Stick hardware ──
try {
  const TurboModuleRegistry = require(
    "@amazon-devices/react-native-kepler/Libraries/TurboModule/TurboModuleRegistry"
  );
  const playerSessionTM = TurboModuleRegistry.getEnforcing("IPlayerSession");
  if (playerSessionTM && typeof playerSessionTM.create !== "function") {
    playerSessionTM.create = () => true;
  }
} catch (_) {}

// ── setPlaybackState every 10s — tells OS we are actively playing media ──
try {
  const TurboModuleRegistry = require(
    "@amazon-devices/react-native-kepler/Libraries/TurboModule/TurboModuleRegistry"
  );
  const tm = TurboModuleRegistry.getEnforcing("IPlayerSession");
  if (tm && typeof tm.setPlaybackState === "function") {
    const playingState = {
      state: "PlayerStatePlaying",
      supportedMediaOps: 259,
      errorCode: "ErrorAppNone",
      errorCodeString: "",
      timeRangeData: { minSeekMs: 0, maxSeekMs: 3600000, trackPositionMs: 0 },
      audioFocus: "AudioFocusPrimary",
      currentPlaybackSpeed: 1,
      repeatMode: "PlayerRepeatModeNone",
      shuffleMode: "PlayerShuffleModeNone",
      trackRating: "PlayerRatingNone",
      audioTrackAvailableLanguages: ["English"],
      captionTrackInfo: [{ captionLanguage: "English", captionMimeType: "" }],
    };
    try { tm.setPlaybackState(playingState); } catch (_) {}
    setInterval(() => {
      try {
        playingState.timeRangeData.trackPositionMs += 10000;
        tm.setPlaybackState(playingState);
      } catch (_) {}
    }, 10000);
  }
} catch (_) {}

/** Wrap a promise with a timeout */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(timer); resolve(v); })
     .catch(e => { clearTimeout(timer); reject(e); });
  });
}

export const App = () => {
  const componentInstance = useComponentInstance();
  const webViewRef = useRef<any>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  // ── Native AudioPlayer keepalive ──
  // Plays silence.m4a to register an audio session, preventing idle manager.
  // If it fails (GStreamer errors on this hardware are common), the PlayerSession
  // setPlaybackState loop above + WebView-side keepalive act as fallbacks.
  useEffect(() => {
    let audio: AudioPlayer | null = null;
    let seekBackTimer: ReturnType<typeof setInterval>;
    let recoveryTimer: ReturnType<typeof setInterval>;
    let disposed = false;
    let initAttempts = 0;
    const MAX_INIT_ATTEMPTS = 5;

    const initAudio = async () => {
      if (disposed || initAttempts >= MAX_INIT_ATTEMPTS) return;
      initAttempts++;
      console.log(`[KEEPALIVE] Init attempt #${initAttempts}`);

      try {
        audio = new AudioPlayer(
          AudioContentType.CONTENT_TYPE_MUSIC,
          AudioUsageType.USAGE_MEDIA
        );
        playerRef.current = audio;

        await withTimeout(audio.setMediaControlFocus(componentInstance), 5000);
        await withTimeout(audio.initialize(), 10000);
        console.log("[KEEPALIVE] AudioPlayer initialized");

        audio.addEventListener("playing", () => console.log("[KEEPALIVE] AUDIO PLAYING"));
        audio.addEventListener("error", () => console.log("[KEEPALIVE] AUDIO ERROR:", audio?.error));
        audio.addEventListener("ended", () => {
          console.log("[KEEPALIVE] AUDIO ENDED - restarting");
          try { audio?.play(); } catch (_e) {}
        });
        audio.addEventListener("audiofocusgranted", () => {
          try { audio?.play(); } catch (_e) {}
        });

        audio.loop = false;
        audio.volume = 0.01;
        audio.muted = false;
        // WAV (PCM) works reliably on this GStreamer; M4A (AAC) causes errors
        const sources = [
          "https://tv.taptrivia.tv/silence.wav",
          "https://tv.taptrivia.tv/silence.m4a?v=3",
        ];
        audio.src = sources[(initAttempts - 1) % sources.length];
        audio.load();

        await withTimeout(audio.play(), 10000);
        console.log("[KEEPALIVE] audio.play() OK, readyState:", audio.readyState);
      } catch (e: any) {
        console.log("[KEEPALIVE] INIT ERROR:", e?.message || e);
        // Cleanup failed instance
        if (audio) {
          try { audio.pause(); } catch (_) {}
          try { (audio as any).deinitialize(); } catch (_) {}
        }
        audio = null;
        playerRef.current = null;
      }
    };

    const recover = async () => {
      if (disposed) return;
      if (!audio) {
        await initAudio();
        return;
      }
      const dead = audio.error
        || audio.paused
        || isNaN(audio.currentTime)
        || audio.readyState === 0;
      if (dead) {
        console.log("[KEEPALIVE] Audio dead, error:", audio.error, "paused:", audio.paused, "ct:", audio.currentTime, "rs:", audio.readyState);
        try { audio.pause(); } catch (_) {}
        try { (audio as any).deinitialize(); } catch (_) {}
        audio = null;
        playerRef.current = null;
        // Wait for GStreamer to release resources
        await new Promise(r => setTimeout(r, 3000));
        if (!disposed) await initAudio();
      }
    };

    initAudio();

    // Seek back to 0 every 30s
    seekBackTimer = setInterval(() => {
      try {
        if (audio && !audio.paused && audio.readyState >= 2 && !isNaN(audio.currentTime)) {
          audio.currentTime = 0;
        }
      } catch (_e) {}
    }, 30000);

    // Recovery every 45s
    recoveryTimer = setInterval(recover, 45000);

    return () => {
      disposed = true;
      clearInterval(seekBackTimer);
      clearInterval(recoveryTimer);
      if (audio) {
        try { audio.pause(); (audio as any).deinitialize(); } catch (_) {}
      }
    };
  }, [componentInstance]);

  // ── WebView-side keepalive (belt & suspenders) ──
  const onWebViewLoad = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          if (window.__ttKeepalive) return;
          window.__ttKeepalive = true;
          try {
            var audio = new Audio('/silence.m4a');
            audio.loop = true;
            audio.volume = 0.01;
            audio.play().then(function() {
              console.log('[KEEPALIVE-WV] Silent audio playing');
            }).catch(function(e) {
              console.log('[KEEPALIVE-WV] Audio play failed:', e.message);
            });
            setInterval(function() {
              if (audio.paused || audio.ended) {
                audio.currentTime = 0;
                audio.play().catch(function(){});
              }
            }, 30000);
          } catch(e) {}
          try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            gain.gain.value = 0.001;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            console.log('[KEEPALIVE-WV] Oscillator started');
            setInterval(function() {
              if (ctx.state === 'suspended') ctx.resume();
            }, 30000);
          } catch(e) {}
          try {
            if (navigator.mediaSession) {
              navigator.mediaSession.playbackState = 'playing';
              setInterval(function() {
                navigator.mediaSession.playbackState = 'playing';
              }, 15000);
            }
          } catch(e) {}
        })();
        true;
      `);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: TV_APP_URL }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsDefaultMediaControl={true}
        style={styles.webview}
        onLoad={onWebViewLoad}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08080c" },
  webview: { flex: 1 },
});

export default App;
