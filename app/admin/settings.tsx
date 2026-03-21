// app/admin/settings.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { AppSettings } from '../../types/admin';
import { t } from '@/lib/i18n';
import { useIsRTL } from '@/hooks/use-is-rtl';
export default function AppSettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'رُوح المسلم',
    appVersion: '1.0.0',
    maintenanceMode: false,
    maintenanceMessage: t('admin.defaultMaintenanceMsg'),
    forceUpdate: false,
    minVersion: '1.0.0',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await adminService.getAppSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const success = await adminService.updateAppSettings(settings);
      if (success) {
        Alert.alert(t('common.done'), t('admin.settingsSaved'));
      } else {
        Alert.alert(t('common.error'), t('admin.saveFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.unexpectedError'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.appInfo')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('admin.appNameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={settings.appName}
              onChangeText={(value) => updateSetting('appName', value)}
              placeholder="رُوح المسلم"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('admin.appVersionLabel')}</Text>
            <TextInput
              style={styles.input}
              value={settings.appVersion}
              onChangeText={(value) => updateSetting('appVersion', value)}
              placeholder="1.0.0"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Maintenance Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.maintenanceMode')}</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons
                name="construct"
                size={24}
                color={settings.maintenanceMode ? Colors.warning : Colors.textMuted}
              />
              <View>
                <Text style={styles.switchLabel}>{t('admin.enableMaintenance')}</Text>
                <Text style={styles.switchHint}>
                  {t('admin.maintenanceHint')}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.maintenanceMode}
              onValueChange={(value) => updateSetting('maintenanceMode', value)}
              trackColor={{ false: Colors.border, true: Colors.warning }}
              thumbColor={settings.maintenanceMode ? Colors.textLight : Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('admin.maintenanceMessage')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={settings.maintenanceMessage}
              onChangeText={(value) => updateSetting('maintenanceMessage', value)}
              placeholder="التطبيق تحت الصيانة..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Force Update */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.forceUpdate')}</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons
                name="download"
                size={24}
                color={settings.forceUpdate ? Colors.error : Colors.textMuted}
              />
              <View>
                <Text style={styles.switchLabel}>{t('admin.forceUpdate')}</Text>
                <Text style={styles.switchHint}>
                  {t('admin.forceUpdateHint')}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.forceUpdate}
              onValueChange={(value) => updateSetting('forceUpdate', value)}
              trackColor={{ false: Colors.border, true: Colors.error }}
              thumbColor={settings.forceUpdate ? Colors.textLight : Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('admin.minVersionLabel')}</Text>
            <TextInput
              style={styles.input}
              value={settings.minVersion}
              onChangeText={(value) => updateSetting('minVersion', value)}
              placeholder="1.0.0"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.inputHint}>
              {t('admin.minVersionHint')}
            </Text>
          </View>
        </View>

        {/* Warning Card */}
        {(settings.maintenanceMode || settings.forceUpdate) && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={24} color={Colors.warning} />
            <Text style={styles.warningText}>
              {settings.maintenanceMode && settings.forceUpdate
                ? t('admin.bothEnabledWarning')
                : settings.maintenanceMode
                ? t('admin.maintenanceWarning')
                : t('admin.forceUpdateWarning')}
            </Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={saveSettings}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.textLight} />
          ) : (
            <>
              <Ionicons name="save" size={20} color={Colors.textLight} />
              <Text style={styles.saveBtnText}>{t('admin.saveSettings')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  switchHint: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  warningCard: {
    backgroundColor: '#FFF8E1',
    margin: Spacing.md,
    marginTop: 0,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.warning,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
});
