module.exports = {
  default: {
    getOfferings: jest.fn().mockResolvedValue({ current: null, all: {} }),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn().mockResolvedValue({ activeSubscriptions: [], entitlements: { active: {} } }),
    addCustomerInfoUpdateListener: jest.fn(() => jest.fn()),
    configure: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    setLogLevel: jest.fn(),
    getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  },
  LOG_LEVEL: { VERBOSE: 'VERBOSE', DEBUG: 'DEBUG' },
  PURCHASES_ERROR_CODE: {},
};
