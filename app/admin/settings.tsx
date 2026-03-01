// app/admin/settings.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { AppSettings } from '../../types/admin';

export default function AppSettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'رُوح المسلم',
    appVersion: '1.0.0',
    maintenanceMode: false,
    maintenanceMessage: 'التطبيق تحت الصيانة، سنعود قريباً إن شاء الله',
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
        Alert.alert('تم', 'تم حفظ الإعدادات بنجاح');
      } else {
        Alert.alert('خطأ', 'فشل في حفظ الإعدادات');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات التطبيق</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>اسم التطبيق</Text>
            <TextInput
              style={styles.input}
              value={settings.appName}
              onChangeText={(value) => updateSetting('appName', value)}
              placeholder="رُوح المسلم"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>إصدار التطبيق</Text>
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
          <Text style={styles.sectionTitle}>وضع الصيانة</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons
                name="construct"
                size={24}
                color={settings.maintenanceMode ? Colors.warning : Colors.textMuted}
              />
              <View>
                <Text style={styles.switchLabel}>تفعيل وضع الصيانة</Text>
                <Text style={styles.switchHint}>
                  سيتم منع المستخدمين من استخدام التطبيق
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
            <Text style={styles.inputLabel}>رسالة الصيانة</Text>
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
          <Text style={styles.sectionTitle}>إجبار التحديث</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons
                name="download"
                size={24}
                color={settings.forceUpdate ? Colors.error : Colors.textMuted}
              />
              <View>
                <Text style={styles.switchLabel}>إجبار التحديث</Text>
                <Text style={styles.switchHint}>
                  سيُطلب من المستخدمين تحديث التطبيق
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
            <Text style={styles.inputLabel}>الحد الأدنى للإصدار المطلوب</Text>
            <TextInput
              style={styles.input}
              value={settings.minVersion}
              onChangeText={(value) => updateSetting('minVersion', value)}
              placeholder="1.0.0"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.inputHint}>
              المستخدمون بإصدار أقل سيُجبرون على التحديث
            </Text>
          </View>
        </View>

        {/* Warning Card */}
        {(settings.maintenanceMode || settings.forceUpdate) && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={24} color={Colors.warning} />
            <Text style={styles.warningText}>
              {settings.maintenanceMode && settings.forceUpdate
                ? 'وضع الصيانة وإجبار التحديث مفعّلان!'
                : settings.maintenanceMode
                ? 'وضع الصيانة مفعّل - المستخدمون لن يتمكنوا من استخدام التطبيق'
                : 'إجبار التحديث مفعّل - المستخدمون سيُطلب منهم التحديث'}
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
              <Text style={styles.saveBtnText}>حفظ الإعدادات</Text>
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
