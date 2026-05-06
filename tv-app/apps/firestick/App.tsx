import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';

const TV_APP_URL = 'https://tv.taptrivia.tv?platform=firestickclassic';

const App = () => {
  const webRef = useRef<WebView>(null);

  // Swallow back button so the user can never accidentally exit
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ uri: TV_APP_URL }}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserGesture={false}
        allowsInlineMediaPlayback
        cacheEnabled
        thirdPartyCookiesEnabled
        userAgent="TapTrivia-FireTV/1.0"
        onError={() => webRef.current?.reload()}
        onRenderProcessGone={() => webRef.current?.reload()}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080c' },
  webview: { flex: 1, backgroundColor: '#08080c' },
});

export default App;
