import { WebView } from "@amazon-devices/webview";
import { VideoPlayer, KeplerVideoSurfaceView } from "@amazon-devices/react-native-w3cmedia";
import { useComponentInstance } from "@amazon-devices/react-native-kepler";
import React, { useEffect, useRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";

const TV_APP_URL = `https://tv.taptrivia.tv?platform=firestickvega&_v=${Date.now()}`;

// Patch PlayerSession.create() to return true — the native TurboModule exists
// but create() is undefined on Fire TV Stick hardware. This enables the w3cmedia
// library's legacy path to call setPlaybackState(PLAYING), which registers a
// display power session with the idle manager and prevents forceDisplayOff.
try {
  const TurboModuleRegistry = require(
    "@amazon-devices/react-native-kepler/Libraries/TurboModule/TurboModuleRegistry"
  );
  const playerSessionTM = TurboModuleRegistry.getEnforcing("IPlayerSession");
  if (playerSessionTM && typeof playerSessionTM.create !== "function") {
    playerSessionTM.create = () => true;
  }
} catch (_) {}

// Also call setPlaybackState directly every 30s as a fallback keepalive
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
        playingState.timeRangeData.trackPositionMs += 30000;
        tm.setPlaybackState(playingState);
      } catch (_) {}
    }, 30000);
  }
} catch (_) {}

export const App = () => {
  const componentInstance = useComponentInstance();
  const playerRef = useRef<VideoPlayer | null>(null);

  const onSurfaceCreated = useCallback((event: any) => {
    const handle = event?.nativeEvent?.surfaceHandle;
    if (handle && playerRef.current) {
      playerRef.current.setSurfaceHandle(handle);
    }
  }, []);

  useEffect(() => {
    let video: VideoPlayer | null = null;

    const startKeepAlive = async () => {
      try {
        video = new VideoPlayer();
        playerRef.current = video;
        await video.initialize();
        await video.setMediaControlFocus(componentInstance);
        video.loop = true;
        video.volume = 0;
        video.muted = true;
        video.src = "asset://silence.mp4";
        await video.play();
      } catch (_) {}
    };

    startKeepAlive();

    return () => {
      if (video) {
        try { video.pause(); video.deinitialize(); } catch (_) {}
      }
    };
  }, [componentInstance]);

  return (
    <View style={styles.container}>
      <KeplerVideoSurfaceView
        style={styles.videoSurface}
        onSurfaceViewCreated={onSurfaceCreated}
      />
      <WebView
        source={{ uri: TV_APP_URL }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08080c" },
  webview: { flex: 1 },
  videoSurface: { width: 1, height: 1, position: "absolute", top: -1, left: -1 },
});

export default App;
