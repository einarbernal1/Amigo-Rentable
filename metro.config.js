const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts.push('cjs'); // <--- ESTA LÍNEA ES VITAL

module.exports = defaultConfig;