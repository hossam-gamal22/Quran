// app/admin/ads.tsx
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
import { AdSettings } from '../../types/admin';

export default function AdsSettingsScreen() {
  const [settings, setSettings] = useState<AdSettings>({
    adsEnabled: true,
    bannerAdId: '',
    interstitialAdId: '',
    rewardedAdId: '',
    showBannerOnHome: true,
    showBannerOnQuran: false,
    showBannerOnAzkar: true,
    showBannerOnPrayers: true,
    interstitialFrequency: 5,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await adminService.getAdSettings();
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
      const success = await adminService.updateAdSettings(settings);
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

  const updateSetting = (key: keyof AdSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Toggle */}
        <View style={styles.mainToggle}>
          <View style={styles.toggleInfo}>
            <Ionicons
              name={settings.adsEnabled ? 'megaphone' : 'megaphone-outline'}
              size={32}
              color={settings.adsEnabled ? Colors.success : Colors.textMuted}
            />
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>الإعلانات</Text>
              <Text style={styles.toggleStatus}>
                {settings.adsEnabled ? 'مفعّلة' : 'معطّلة'}
              </Text>
            </View>
          </View>
          <Switch
            value={settings.adsEnabled}
            onValueChange={(value) => updateSetting('adsEnabled', value)}
            trackColor={{ false: Colors.border, true: Colors.accent }}
            thumbColor={settings.adsEnabled ? Colors.primary : Colors.textMuted}
          />
        </View>

        {/* Ad IDs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معرّفات الإعلانات</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Banner Ad ID</Text>
            <TextInput
              style={styles.input}
              value={settings.bannerAdId}
              onChangeText={(value) => updateSetting('bannerAdId', value)}
              placeholder="ca-app-pub-xxxxx/xxxxx"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Interstitial Ad ID</Text>
            <TextInput
              style={styles.input}
              value={settings.interstitialAdId}
              onChangeText={(value) => updateSetting('interstitialAdId', value)}
              placeholder="ca-app-pub-xxxxx/xxxxx"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Rewarded Ad ID</Text>
            <TextInput
              style={styles.input}
              value={settings.rewardedAdId}
              onChangeText={(value) => updateSetting('rewardedAdId', value)}
              placeholder="ca-app-pub-xxxxx/xxxxx"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Banner Placement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>مواضع Banner</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>الصفحة الرئيسية</Text>
            <Switch
              value={settings.showBannerOnHome}
              onValueChange={(value) => updateSetting('showBannerOnHome', value)}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>شاشة القرآن</Text>
            <Switch
              value={settings.showBannerOnQuran}
              onValueChange={(value) => updateSetting('showBannerOnQuran', value)}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>شاشة الأذكار</Text>
            <Switch
              value={settings.showBannerOnAzkar}
              onValueChange={(value) => updateSetting('showBannerOnAzkar', value)}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>شاشة الصلوات</Text>
            <Switch
              value={settings.showBannerOnPrayers}
              onValueChange={(value) => updateSetting('showBannerOnPrayers', value)}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>
        </View>

        {/* Interstitial Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إعدادات Interstitial</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              التكرار (كل كم دقيقة)
            </Text>
            <TextInput
              style={styles.input}
              value={String(settings.interstitialFrequency)}
              onChangeText={(value) =>
                updateSetting('interstitialFrequency', parseInt(value) || 5)
              }
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

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
  mainToggle: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toggleText: {},
  toggleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  toggleStatus: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  section: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    marginTop: 0,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchLabel: {
    fontSize: 14,
    color: Colors.text,
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
