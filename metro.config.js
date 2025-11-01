const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Permitir importação de arquivos .wasm no bundler web
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = config;