const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withProximitySensor(config) {
  // Android proximity sensor doesn't need extra permissions
  return withAndroidManifest(config, (config) => {
    return config;
  });
};
