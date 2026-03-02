import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';

const TV_APP_URL = 'https://tv.taptrivia.tv';
const RETRY_INTERVAL_MS = 10000;

// Force the WebView viewport to 1920x1080 so the TV app renders at full HD
// then the WebView scales it down to fit the device screen
const VIEWPORT_JS = `
  (function() {
    var meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute('content', 'width=1920, initial-scale=1, user-scalable=no');
    } else {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=1920, initial-scale=1, user-scalable=no';
      document.head.appendChild(meta);
    }
  })();
  true;
`;

const App = () => {
  const webRef = useRef<WebView>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webRef.current) {
        webRef.current.goBack();
      }
      return true; // Never exit — bar owners don't want accidental closes
    });
    return () => backHandler.remove();
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setTimeout(() => setHasError(false), RETRY_INTERVAL_MS);
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
        source={{ uri: TV_APP_URL }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserGesture={false}
        allowsInlineMediaPlayback={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        setBuiltInZoomControls={false}
        injectedJavaScriptBeforeContentLoaded={VIEWPORT_JS}
        userAgent="TapTrivia-FireTV/1.0"
        onLoad={() => {
          console.log('[TapTrivia] Loaded');
          setHasError(false);
        }}
        onError={(e) => {
          console.error('[TapTrivia] Error:', e.nativeEvent.description);
          handleError();
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) handleError();
        }}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080c' },
  webview: { flex: 1 },
  errorContainer: { flex: 1, backgroundColor: '#08080c', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ffffff', fontSize: 32, fontWeight: '600', marginBottom: 12 },
  errorSubtext: { color: 'rgba(255,255,255,0.4)', fontSize: 18 },
});

export default App;
