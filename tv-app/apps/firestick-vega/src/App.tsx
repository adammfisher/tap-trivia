import { WebView } from "@amazon-devices/webview";
import React, { useRef, useState, useCallback } from "react";
import { View, StyleSheet, Text } from "react-native";

const TV_APP_URL = `https://tv.taptrivia.tv?platform=firestickvega&_v=${Date.now()}`;
const RETRY_INTERVAL_MS = 10000;

export const App = () => {
  const webRef = useRef<any>(null);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
    setTimeout(() => {
      setHasError(false);
    }, RETRY_INTERVAL_MS);
  }, []);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Connecting to TapTrivia...</Text>
        <Text style={styles.errorSubtext}>Retrying automatically</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        hasTVPreferredFocus={true}
        source={{ uri: TV_APP_URL }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        onLoadStart={(event: any) => {
          console.log("[TapTrivia] Loading:", event.nativeEvent.url);
        }}
        onLoad={(event: any) => {
          console.log("[TapTrivia] Loaded:", event.nativeEvent.url);
          setHasError(false);
        }}
        onError={(event: any) => {
          console.error("[TapTrivia] Error:", event.nativeEvent.url);
          handleError();
        }}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08080c",
  },
  webview: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#08080c",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "600",
    marginBottom: 12,
  },
  errorSubtext: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 18,
  },
});

export default App;
