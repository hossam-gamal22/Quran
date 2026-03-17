// components/ui/MaintenanceGuard.tsx
// يعرض شاشة صيانة حاجزة أو تحديث إلزامي

import React from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { useAppConfig } from '@/lib/app-config-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSettings } from '@/contexts/SettingsContext';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';

function isVersionLessThan(current: string, min: string): boolean {
  const c = current.split('.').map(Number);
  const m = min.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] || 0) < (m[i] || 0)) return true;
    if ((c[i] || 0) > (m[i] || 0)) return false;
  }
  return false;
}

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { config } = useAppConfig();
  const { t } = useSettings();

  // Maintenance mode
  if (config.maintenanceMode) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="wrench" size={64} color="#FF9500" />
        <Text style={styles.title}>{t('common.maintenance') || 'Maintenance'}</Text>
        <Text style={styles.message}>
          {t('common.maintenanceDesc') || 'App is currently in maintenance mode. We will be back soon!'}
        </Text>
      </View>
    );
  }

  // Force update
  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  if (config.forceUpdate && config.minVersion && isVersionLessThan(currentVersion, config.minVersion)) {
    const storeUrl = Platform.OS === 'ios' ? config.downloadLinks?.ios : config.downloadLinks?.android;
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="cellphone-arrow-down" size={64} color="#007AFF" />
        <Text style={styles.title}>{t('common.updateRequired') || 'Update Required'}</Text>
        <Text style={styles.message}>
          {t('common.updateDesc') || 'Please update the app to continue using it.'}
        </Text>
        {storeUrl ? (
          <Text style={styles.link} onPress={() => Linking.openURL(storeUrl)}>
            {t('common.updateNow') || 'Update Now'}
          </Text>
        ) : null}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#11151c',
    padding: 32,
  },
  title: {
    fontFamily: fontBold(),
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
  },
  message: {
    fontFamily: fontRegular(),
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 26,
  },
  link: {
    fontFamily: fontSemiBold(),
    fontSize: 18,
    color: '#007AFF',
    marginTop: 24,
    textDecorationLine: 'underline',
  },
});
