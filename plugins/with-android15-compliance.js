const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Config plugin to ensure Android 15 (API 35) compliance:
 * 
 * 1. Removes AudioRecordingService and AudioControlsService from manifest
 *    (prevents BOOT_COMPLETED + restricted foreground service type violation)
 * 2. Removes FOREGROUND_SERVICE_MICROPHONE permission (not needed - no recording)
 * 3. Adds resizeableActivity="true" for large screen device support
 */
module.exports = function withAndroid15Compliance(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const mainApp = manifest.manifest?.application?.[0];

    if (!mainApp) return config;

    // 1. Remove audio services that conflict with BOOT_COMPLETED on Android 15
    if (mainApp.service) {
      mainApp.service = mainApp.service.filter((service) => {
        const name = service.$?.['android:name'] || '';
        if (
          name.includes('AudioRecordingService') ||
          name.includes('AudioControlsService')
        ) {
          console.log(`[Android15Compliance] Removed service: ${name}`);
          return false;
        }
        return true;
      });
    }

    // 2. Remove FOREGROUND_SERVICE_MICROPHONE permission (not used)
    if (manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = manifest.manifest[
        'uses-permission'
      ].filter((perm) => {
        const name = perm.$?.['android:name'] || '';
        if (name === 'android.permission.FOREGROUND_SERVICE_MICROPHONE') {
          console.log('[Android15Compliance] Removed FOREGROUND_SERVICE_MICROPHONE permission');
          return false;
        }
        return true;
      });
    }

    // 3. Add resizeableActivity="true" to the main activity for large screen support
    if (mainApp.activity) {
      for (const activity of mainApp.activity) {
        if (
          activity.$?.['android:name'] === '.MainActivity' ||
          activity.$?.['android:name'] === '.MainApplication'
        ) {
          activity.$['android:resizeableActivity'] = 'true';
        }
      }
    }

    return config;
  });
};
