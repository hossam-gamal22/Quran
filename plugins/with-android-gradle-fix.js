const { withSettingsGradle } = require("expo/config-plugins");

/**
 * Adds explicit plugin repositories to pluginManagement block in settings.gradle.
 * This ensures Kotlin/Gradle plugins resolve from mavenCentral() first,
 * avoiding "Tag mismatch" errors from the Gradle Plugin Portal CDN.
 */
module.exports = function withAndroidGradleFix(config) {
  return withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Only add if not already present
    if (contents.includes("pluginManagement") && !contents.includes("repositories {")) {
      config.modResults.contents = contents.replace(
        "pluginManagement {",
        `pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
`
      );
    }

    return config;
  });
};
