import { WebView } from "@amazon-devices/webview";
import { AudioPlayer, AudioContentType, AudioUsageType } from "@amazon-devices/react-native-w3cmedia";
import { useComponentInstance } from "@amazon-devices/react-native-kepler";
import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";

const TV_APP_URL = `https://tv.taptrivia.tv?platform=firestickvega&_v=${Date.now()}`;


// Patch PlayerSession.create() — undefined on Fire TV Stick hardware
try {
  const TurboModuleRegistry = require(
    "@amazon-devices/react-native-kepler/Libraries/TurboModule/TurboModuleRegistry"
  );
  const playerSessionTM = TurboModuleRegistry.getEnforcing("IPlayerSession");
  if (playerSessionTM && typeof playerSessionTM.create !== "function") {
    playerSessionTM.create = () => true;
  }
} catch (_) {}

// setPlaybackState every 15s as native-level keepalive
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
      timeRangeData: { minSeekMs: 0, maxSeekMs: 600000, trackPositionMs: 0 },
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
        playingState.timeRangeData.trackPositionMs += 15000;
        tm.setPlaybackState(playingState);
      } catch (_) {}
    }, 15000);
  }
} catch (_) {}

export const App = () => {
  const componentInstance = useComponentInstance();
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    let audio: AudioPlayer | null = null;

    const initAudio = async () => {
      try {
        // AudioPlayer with MUSIC content type + MEDIA usage — should register AUDIO_PLAYBACK session
        audio = new AudioPlayer(
          AudioContentType.CONTENT_TYPE_MUSIC,
          AudioUsageType.USAGE_MEDIA
        );
        playerRef.current = audio;
        console.log("[KEEPALIVE] AudioPlayer created (MUSIC/MEDIA)");

        // setMediaControlFocus BEFORE initialize (per Amazon sample)
        await audio.setMediaControlFocus(componentInstance);
        console.log("[KEEPALIVE] setMediaControlFocus done");

        await audio.initialize();
        console.log("[KEEPALIVE] AudioPlayer initialized");

        // Event listeners
        audio.addEventListener("playing", () => console.log("[KEEPALIVE] AUDIO PLAYING"));
        audio.addEventListener("pause", () => console.log("[KEEPALIVE] AUDIO PAUSED"));
        audio.addEventListener("error", () => console.log("[KEEPALIVE] AUDIO ERROR:", audio?.error));
        audio.addEventListener("loadedmetadata", () => console.log("[KEEPALIVE] METADATA LOADED, duration:", audio?.duration, "readyState:", audio?.readyState));
        audio.addEventListener("stalled", () => console.log("[KEEPALIVE] AUDIO STALLED"));
        audio.addEventListener("waiting", () => console.log("[KEEPALIVE] AUDIO WAITING"));
        // If ended fires despite our seek-back, restart immediately
        audio.addEventListener("ended", () => {
          console.log("[KEEPALIVE] AUDIO ENDED - restarting");
          try { audio?.play(); } catch (_e) {}
        });
        // Audio focus lost — screensaver or another app took audio focus
        audio.addEventListener("audiofocuslost", () => {
          console.log("[KEEPALIVE] AUDIO FOCUS LOST - attempting recovery");
        });
        audio.addEventListener("audiofocuspaused", () => {
          console.log("[KEEPALIVE] AUDIO FOCUS PAUSED - will resume when regained");
        });
        audio.addEventListener("audiofocusgranted", () => {
          console.log("[KEEPALIVE] AUDIO FOCUS GRANTED");
          try { audio?.play(); } catch (_e) {}
        });

        // Don't use loop=true — it tears down the audio stream and loses the AUDIO_PLAYBACK session.
        // Instead, seek back to 0 before the file ends to keep the stream alive continuously.
        audio.loop = false;
        audio.volume = 0.01;
        audio.muted = false;
        // CDN URL with immutable cache headers — fetched once per device, then cached
        audio.src = "https://tv.taptrivia.tv/silence.m4a?v=2";
        audio.load();
        console.log("[KEEPALIVE] audio.load() called");

        await audio.play();
        console.log("[KEEPALIVE] audio.play() resolved, paused:", audio.paused, "readyState:", audio.readyState);
      } catch (e: any) {
        console.log("[KEEPALIVE] AUDIO ERROR:", e?.message || e);
      }
    };

    initAudio();

    // Seek back to 0 every 30s — prevents the audio file from ending,
    // which would tear down the audio stream and lose the AUDIO_PLAYBACK session.
    const seekBack = setInterval(() => {
      try {
        if (audio && !audio.paused && audio.readyState >= 2 && !isNaN(audio.currentTime)) {
          console.log("[KEEPALIVE] Seeking to 0 (currentTime:", audio.currentTime, ")");
          audio.currentTime = 0;
        }
      } catch (_e) {}
    }, 30000);

    // Recovery: restart audio if it's dead (error, paused, or NaN currentTime)
    const recovery = setInterval(async () => {
      try {
        if (!audio) return;
        const dead = audio.error
          || audio.paused
          || isNaN(audio.currentTime)
          || audio.readyState === 0;
        if (dead) {
          console.log("[KEEPALIVE] Audio dead, restarting... error:", audio.error, "paused:", audio.paused, "currentTime:", audio.currentTime, "readyState:", audio.readyState);
          try { audio.pause(); audio.deinitialize(); } catch (_e) {}
          audio = null;
          playerRef.current = null;
          await initAudio();
        }
      } catch (_e) {}
    }, 45000);

    return () => {
      clearInterval(seekBack);
      clearInterval(recovery);
      if (audio) {
        try { audio.pause(); audio.deinitialize(); } catch (_e) {}
      }
    };
  }, [componentInstance]);

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: TV_APP_URL }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsDefaultMediaControl={true}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08080c" },
  webview: { flex: 1 },
});

export default App;
