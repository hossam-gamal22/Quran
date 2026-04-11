/**
 * Fix for react-native-reanimated 4.x + react-native-worklets:
 *
 * Two issues:
 * 1. reanimated's CMake build links against libworklets.so, but Gradle has no
 *    explicit task dependency on the worklets CMake build.
 * 2. react-native-worklets only defines a debug CMake buildType — release
 *    builds can't find libworklets.so because it's never built for release.
 *
 * This plugin:
 * - Adds task dependency so worklets always builds before reanimated
 * - Patches worklets' build.gradle to also build CMake for release
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GRADLE_FIX = `
// ─── Fix: react-native-worklets must build before react-native-reanimated ───
gradle.projectsEvaluated {
    def reanimatedProject = allprojects.find { it.name == "react-native-reanimated" }
    def workletsProject   = allprojects.find { it.name == "react-native-worklets" }
    if (reanimatedProject != null && workletsProject != null) {
        reanimatedProject.tasks
            .matching { it.name.startsWith("buildCMake") }
            .configureEach { reaTask ->
                workletsProject.tasks
                    .matching { it.name.startsWith("buildCMake") }
                    .forEach { wlTask -> reaTask.dependsOn(wlTask) }
            }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
`;

function patchWorkletsBuildGradle() {
  // Patch worklets build.gradle to add release buildType with CMake config
  // Without this, worklets only builds libworklets.so for debug, and
  // reanimated's release CMake fails with "libworklets.so missing"
  const workletsGradle = path.resolve(
    __dirname, '..', 'node_modules', 'react-native-worklets', 'android', 'build.gradle'
  );
  if (!fs.existsSync(workletsGradle)) return;

  let contents = fs.readFileSync(workletsGradle, 'utf8');
  if (contents.includes('// patched: release buildType')) return; // Already patched

  // Use brace-counting to find the closing brace of the buildTypes block,
  // then insert the release buildType before it.
  const buildTypesMatch = contents.match(/buildTypes\s*\{/);
  if (!buildTypesMatch) return;

  const startIdx = buildTypesMatch.index + buildTypesMatch[0].length;
  let depth = 1;
  let endIdx = startIdx;
  while (endIdx < contents.length && depth > 0) {
    if (contents[endIdx] === '{') depth++;
    else if (contents[endIdx] === '}') depth--;
    if (depth > 0) endIdx++;
  }
  // endIdx now points to the closing } of buildTypes
  const releaseBlock = `
        release {
            // patched: release buildType — ensures libworklets.so is built for release
            // Without this, reanimated's RelWithDebInfo CMake can't link against worklets
            externalNativeBuild {
                cmake {
                }
            }
        }
    `;
  contents = contents.slice(0, endIdx) + releaseBlock + contents.slice(endIdx);
  fs.writeFileSync(workletsGradle, contents, 'utf8');
  console.log('[with-reanimated-worklets-fix] Patched worklets build.gradle with release buildType');
}

module.exports = function withReanimatedWorkletsFix(config) {
  // Patch worklets native build config at plugin evaluation time
  patchWorkletsBuildGradle();

  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('react-native-worklets must build')) {
      return config; // Already applied
    }
    config.modResults.contents += GRADLE_FIX;
    return config;
  });
};
