/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    __DEV__: true,
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        moduleResolution: 'node',
        allowImportingTsExtensions: false,
        noEmit: false,
        strict: false,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        jsx: 'react',
      },
    }],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native/(.*)': '<rootDir>/__mocks__/react-native.js',
    'react-native-video': '<rootDir>/__mocks__/react-native-video.js',
    'react-native-qrcode-svg': '<rootDir>/__mocks__/react-native-qrcode-svg.js',
    'react-native-svg': '<rootDir>/__mocks__/react-native-svg.js',
    'react-native-linear-gradient': '<rootDir>/__mocks__/react-native-linear-gradient.js',
    '@react-native-async-storage/async-storage': '<rootDir>/__mocks__/async-storage.js',
  },
  transformIgnorePatterns: ['node_modules'],
};
