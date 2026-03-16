const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration for Vega OS TapTrivia native app.
 * Redirects unavailable npm packages to local shims.
 */
const shimDir = path.resolve(__dirname, 'src/shims');

const config = {
  projectRoot: __dirname,
  resolver: {
    // Redirect unavailable packages to local shims
    extraNodeModules: {
      'react-native-linear-gradient': path.join(shimDir, 'react-native-linear-gradient'),
      'react-native-qrcode-svg': path.join(shimDir, 'react-native-qrcode-svg'),
      '@react-native-async-storage/async-storage': path.join(shimDir, 'async-storage'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
