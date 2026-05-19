/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 300000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/TapTrivia.app',
      build: 'xcodebuild -workspace ios/TapTrivia.xcworkspace -scheme TapTrivia -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,id=A7BD8C7F-A3AF-40DA-94EB-AA7E07D36ECF" -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO 2>&1 | /Users/adamfisher/.gem/ruby/2.6.0/bin/xcpretty; exit ${PIPESTATUS[0]}',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { id: 'A7BD8C7F-A3AF-40DA-94EB-AA7E07D36ECF' },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
  },
};
