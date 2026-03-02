const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// إضافة node_modules للـ watch folders
config.watchFolders = [path.resolve(__dirname, "node_modules")];

// إضافة extraNodeModules
config.resolver.extraNodeModules = {
  "expo-router": path.resolve(__dirname, "node_modules/expo-router"),
  "@expo/metro-runtime": path.resolve(__dirname, "node_modules/@expo/metro-runtime"),
};

module.exports = config;
