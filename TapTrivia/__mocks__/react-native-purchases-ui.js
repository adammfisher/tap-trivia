module.exports = {
  presentPaywallIfNeeded: jest.fn().mockResolvedValue({ userCancelled: true }),
};
