const mockStorage = {};
module.exports = {
  getItem: jest.fn((key) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key, value) => { mockStorage[key] = value; return Promise.resolve(); }),
  removeItem: jest.fn((key) => { delete mockStorage[key]; return Promise.resolve(); }),
  clear: jest.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); return Promise.resolve(); }),
  multiGet: jest.fn((keys) => Promise.resolve(keys.map(k => [k, mockStorage[k] ?? null]))),
  _mockStorage: mockStorage,
};
