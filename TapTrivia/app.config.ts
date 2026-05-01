import { ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'dev';

const config: ExpoConfig = {
  name: IS_DEV ? 'TapTrivia Dev' : 'TapTrivia',
  slug: 'TapTrivia',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#0f0326',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: IS_DEV ? 'com.visudolabs.taptrivia.app.dev' : 'com.visudolabs.taptrivia.app',
    appleTeamId: 'NCJ5B632NP',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/Lightbulb.png',
      backgroundColor: '#0D0D0F',
    },
    splash: {
      image: './assets/splash.png',
      resizeMode: 'cover',
      backgroundColor: '#0f0326',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: IS_DEV ? 'tv.taptrivia.mobile.dev' : 'tv.taptrivia.mobile',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-font',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0f0326',
        image: './assets/splash.png',
        resizeMode: 'cover',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '6050c54c-dfc9-4de4-a74f-1c6649fd80e2',
    },
    // DEV_API_URL is set after terraform workspace dev is deployed
    apiBaseUrl: IS_DEV
      ? (process.env.DEV_API_URL ?? 'https://api.taptrivia.tv')
      : 'https://api.taptrivia.tv',
    appVariant: IS_DEV ? 'dev' : 'prod',
  },
  owner: 'adamm733',
};

export default config;
