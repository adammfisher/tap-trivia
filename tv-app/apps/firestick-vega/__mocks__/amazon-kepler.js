module.exports = {
  TimeoutManager: { setLifespan: jest.fn(), PERMANENT: 'PERMANENT' },
  PlayerSession: { create: jest.fn(), PLAYING: 'PLAYING' },
  UserInputManager: { addListener: jest.fn() },
};
