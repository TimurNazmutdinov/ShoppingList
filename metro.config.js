const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// В release-сборке console.* удаляется при минификации (в разработке остаётся).
config.transformer.minifierConfig = { ...config.transformer.minifierConfig, compress: { drop_console: true } };

// Веб: expo-sqlite грузит wasm как ресурс.
config.resolver.assetExts.push('wasm');

module.exports = config;
