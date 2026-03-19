const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer/expo")
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
  // Add buffer polyfill for React Native
  extraNodeModules: {
    ...resolver.extraNodeModules,
    buffer: require.resolve('buffer/'),
  },
  // Redirect native-only modules to empty shims on web
  resolveRequest: (context, moduleName, platform) => {
    if (platform === 'web') {
      const webShims = {
        'react-native-google-mobile-ads': 'lib/google-mobile-ads-shim.js',
        'react-native-track-player': 'lib/track-player-shim.js',
        'react-native-iap': 'lib/iap-shim.js',
      };
      if (webShims[moduleName]) {
        return {
          filePath: path.resolve(__dirname, webShims[moduleName]),
          type: 'sourceFile',
        };
      }
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
