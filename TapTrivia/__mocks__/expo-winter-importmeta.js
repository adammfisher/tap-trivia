// Mock for expo/src/winter/ImportMetaRegistry
// Prevents "import outside of scope" errors during Jest teardown
module.exports = {
  ImportMetaRegistry: {
    get url() {
      return null;
    },
  },
};
