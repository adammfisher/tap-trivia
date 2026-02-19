const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro only resolves from TapTrivia/node_modules, not parent directories
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Don't watch parent directory files
config.watchFolders = [__dirname];

module.exports = config;
