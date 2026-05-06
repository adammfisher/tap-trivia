import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, BackHandler, AppState } from 'react-native';
import { WebView } from 'react-native-webview';

const TV_APP_URL = 'https://tv.taptrivia.tv?platform=firestickclassic';
const RETRY_INTERVAL_MS = 10000;
const HEARTBEAT_MS = 60_000;
const WATCHDOG_MS = 5 * 60_000;
const HARD_RELOAD_AFTER = 3; // consecutive watchdog reloads with no pong → hard reload via setSource

// Force the WebView viewport to 1920x1080, install a heartbeat that
// prevents page-level idle timeouts, and emit a liveness ping so the
// native side can detect a frozen WebView. Pong only fires once the
// app's main screen container is non-empty — guarantees the page has
// actually rendered, not just loaded a CSS-less shell.
const INJECTED_JS = `
  (function() {
    try {
      var meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.setAttribute('content', 'width=1920, initial-scale=1, user-scalable=no');
      } else {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=1920, initial-scale=1, user-scalable=no';
        document.head.appendChild(meta);
      }
    } catch (e) {}

    if (!window.__TAPTRIVIA_HEARTBEAT__) {
      window.__TAPTRIVIA_HEARTBEAT__ = true;
      setInterval(function() {
        try {
          var evt = new Event('mousemove');
          document.dispatchEvent(evt);
          var screen = document.getElementById('tt-screen');
          var rendered = screen && screen.children && screen.children.length > 0;
          if (rendered && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pong', t: Date.now() }));
          }
        } catch (e) {}
      }, ${HEARTBEAT_MS});
    }
    true;
  })();
  true;
`;

const App = () => {
  const webRef = useRef<WebView>(null);
  const lastPongRef = useRef<number>(Date.now());
  const consecutiveStuckRef = useRef<number>(0);
  const [sourceKey, setSourceKey] = useState<number>(0); // bump to force WebView remount
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // Reload if the WebView stops responding. Escalate after N consecutive misses
  // by remounting the WebView entirely (covers cases where reload() itself is stuck).
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastPongRef.current > WATCHDOG_MS) {
        consecutiveStuckRef.current += 1;
        if (consecutiveStuckRef.current >= HARD_RELOAD_AFTER) {
          consecutiveStuckRef.current = 0;
          setSourceKey((k) => k + 1);
        } else {
          webRef.current?.reload();
        }
        // Don't reset lastPongRef here — only a real pong should clear the timer.
      }
    }, WATCHDOG_MS);
    return () => clearInterval(id);
  }, []);

  // Reload when the app returns to foreground (covers HDMI handshake bounce)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        webRef.current?.reload();
      }
    });
    return () => sub.remove();
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setTimeout(() => {
      setHasError(false);
      webRef.current?.reload();
    }, RETRY_INTERVAL_MS);
  }, []);

  const handleMessage = useCallback((e: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg && msg.type === 'pong') {
        lastPongRef.current = Date.now();
      }
    } catch {
      // ignore non-JSON
    }
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
        key={sourceKey}
        ref={webRef}
        source={{ uri: TV_APP_URL }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserGesture={false}
        allowsInlineMediaPlayback={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        setBuiltInZoomControls={false}
        cacheEnabled={true}
        thirdPartyCookiesEnabled={true}
        androidLayerType="hardware"
        injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
        injectedJavaScript={INJECTED_JS}
        onMessage={handleMessage}
        userAgent="TapTrivia-FireTV/1.0"
        onLoad={() => {
          // Don't update lastPongRef on onLoad — that masks a stuck-but-loaded page.
          // Only a real pong from rendered content clears the watchdog.
          setHasError(false);
        }}
        onError={(e) => {
          console.error('[TapTrivia] Error:', e.nativeEvent.description);
          handleError();
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) handleError();
        }}
        onRenderProcessGone={() => {
          webRef.current?.reload();
        }}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080c' },
  webview: { flex: 1, backgroundColor: '#08080c' },
  errorContainer: { flex: 1, backgroundColor: '#08080c', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ffffff', fontSize: 32, fontWeight: '600', marginBottom: 12 },
  errorSubtext: { color: 'rgba(255,255,255,0.4)', fontSize: 18 },
});

export default App;
