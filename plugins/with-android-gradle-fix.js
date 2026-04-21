const { withSettingsGradle, withProjectBuildGradle } = require("expo/config-plugins");

/**
 * Forces JVM target 17 for all Kotlin compile tasks across all subprojects.
 * Fixes "Inconsistent JVM-target compatibility" errors caused by older Expo modules
 * (e.g. expo-dynamic-app-icon) that default to JVM 11 while the rest of the
 * project compiles with JVM 17.
 */
function withJvmTargetFix(config) {
  return withProjectBuildGradle(config, (config) => {
    const marker = "// rooh: force JVM 17 for all subprojects";
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents += `

${marker}
gradle.projectsEvaluated {
  rootProject.subprojects { project ->
    if (project.plugins.hasPlugin("kotlin-android") || project.plugins.hasPlugin("org.jetbrains.kotlin.android")) {
      project.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
          jvmTarget = "17"
        }
      }
      if (project.extensions.findByName("android") != null) {
        project.android {
          compileOptions {
            sourceCompatibility JavaVersion.VERSION_17
            targetCompatibility JavaVersion.VERSION_17
          }
        }
      }
    }
  }
}
`;
    }
    return config;
  });
}

module.exports = function withAndroidGradleFix(config) {
  config = withJvmTargetFix(config);
  return withSettingsGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Only add if not already present
    if (contents.includes("pluginManagement") && !contents.includes("repositories {")) {
      contents = contents.replace(
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

    // Fix rootProject.name: Arabic characters break autolinking BuildConfig
    contents = contents.replace(
      /rootProject\.name\s*=\s*'[^']*'/,
      "rootProject.name = 'rooh-almuslim'"
    );

    config.modResults.contents = contents;
    return config;
  });
};
