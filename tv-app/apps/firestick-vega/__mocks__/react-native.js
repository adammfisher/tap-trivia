module.exports = {
  StyleSheet: { create: (s) => s, flatten: (s) => s },
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  TouchableOpacity: 'TouchableOpacity',
  Animated: {
    Value: jest.fn(() => ({ interpolate: jest.fn(), setValue: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    View: 'Animated.View',
    createAnimatedComponent: (c) => c,
    loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  },
  Platform: { OS: 'android', select: (obj) => obj.android ?? obj.default },
  AppState: { addEventListener: jest.fn(), removeEventListener: jest.fn() },
  Dimensions: { get: jest.fn(() => ({ width: 1920, height: 1080 })) },
};
