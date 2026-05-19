/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  testEnvironment: 'node',
  globals: {
    __DEV__: true,
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Override bundler-incompatible settings for Jest
          moduleResolution: 'node',
          noEmit: false,
          strict: false,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    // Map Amazon-specific modules to stubs
    '@amazon-devices/react-native-kepler': '<rootDir>/__mocks__/amazon-kepler.js',
    '@amazon-devices/react-native-w3cmedia': '<rootDir>/__mocks__/amazon-w3cmedia.js',
    '@amazon-devices/webview': '<rootDir>/__mocks__/amazon-webview.js',
    // Map tsconfig path aliases
    'react-native-linear-gradient': '<rootDir>/__mocks__/react-native-linear-gradient.js',
    'react-native-qrcode-svg': '<rootDir>/__mocks__/react-native-qrcode-svg.js',
    '@react-native-async-storage/async-storage': '<rootDir>/__mocks__/async-storage.js',
    // RN itself
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native/(.*)': '<rootDir>/__mocks__/react-native.js',
  },
  transformIgnorePatterns: ['node_modules'],
};
