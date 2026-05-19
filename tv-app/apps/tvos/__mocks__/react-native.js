module.exports = {
  StyleSheet: { create: (s) => s, flatten: (s) => s },
  View: 'View', Text: 'Text', Image: 'Image', TouchableOpacity: 'TouchableOpacity',
  Animated: {
    Value: jest.fn(() => ({ interpolate: jest.fn(), setValue: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    View: 'Animated.View',
    createAnimatedComponent: (c) => c,
    sequence: jest.fn(() => ({ start: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
  },
  Platform: { OS: 'ios', select: (obj) => obj.ios ?? obj.default },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Dimensions: { get: jest.fn(() => ({ width: 1920, height: 1080 })) },
};
