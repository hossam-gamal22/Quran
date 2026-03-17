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
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { t } from '@/lib/i18n';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { AdsConfig, DEFAULT_ADS_CONFIG, PRODUCTION_AD_IDS, AdScreenKey } from '@/lib/ads-config';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const FIRESTORE_PATH = 'config';
const FIRESTORE_DOC = 'ads-settings';

const BANNER_SCREENS: { key: AdScreenKey; label: string; icon: string }[] = [
  { key: 'home', label: 'الرئيسية', icon: 'home' },
  { key: 'quran', label: 'القرآن', icon: 'book-open-variant' },
  { key: 'azkar', label: 'الأذكار', icon: 'hands-pray' },
  { key: 'prayer', label: 'الصلاة', icon: 'mosque' },
  { key: 'tasbih', label: 'التسبيح', icon: 'counter' },
  { key: 'names', label: 'الأسماء الحسنى', icon: 'star-crescent' },
  { key: 'ruqya', label: 'الرقية', icon: 'shield-cross' },
  { key: 'hijri', label: 'التقويم الهجري', icon: 'calendar-month' },
  { key: 'seerah', label: 'السيرة', icon: 'book-open-page-variant' },
  { key: 'companions', label: 'الصحابة', icon: 'account-group' },
  { key: 'hajj_umrah', label: 'الحج والعمرة', icon: 'kabaddi' },
  { key: 'daily_ayah', label: 'آية اليوم', icon: 'format-quote-close' },
  { key: 'hadith', label: 'الأحاديث', icon: 'book-alphabet' },
  { key: 'ayat_universe', label: 'آيات كونية', icon: 'earth' },
  { key: 'hadith_sifat', label: 'صفات', icon: 'text-box-outline' },
  { key: 'duas', label: 'الأدعية', icon: 'hand-heart' },
  { key: 'surah', label: 'المصحف', icon: 'book-open-variant' },
  { key: 'tafsir', label: 'التفسير', icon: 'text-search' },
  { key: 'khatma', label: 'الختمة', icon: 'bookmark-check' },
  { key: 'worship', label: 'العبادات', icon: 'chart-line' },
];
export default function AdsSettingsScreen() {
  const [config, setConfig] = useState<AdsConfig>(DEFAULT_ADS_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isRTL = useIsRTL();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, FIRESTORE_PATH, FIRESTORE_DOC);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setConfig({ ...DEFAULT_ADS_CONFIG, ...docSnap.data() as Partial<AdsConfig> });
      }
    } catch (error) {
      console.error('Error loading ads settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, FIRESTORE_PATH, FIRESTORE_DOC);
      await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() }, { merge: true });
      Alert.alert(t('common.done'), t('admin.settingsSaved'));
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = <K extends keyof AdsConfig>(key: K, value: AdsConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateBannerScreen = (screen: string, value: boolean) => {
    setConfig(prev => ({
      ...prev,
      bannerScreens: { ...prev.bannerScreens, [screen]: value },
    }));
  };

  const updateAdUnitId = (type: 'bannerAdId' | 'interstitialAdId' | 'appOpenAdId', platform: 'ios' | 'android', value: string) => {
    setConfig(prev => ({
      ...prev,
      [type]: { ...prev[type], [platform]: value },
    }));
  };

  const resetToProduction = () => {
    Alert.alert(
      'إعادة تعيين',
      'إعادة تعيين جميع Ad Unit IDs للقيم الإنتاجية؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة تعيين',
          style: 'destructive',
          onPress: () => {
            setConfig(prev => ({
              ...prev,
              bannerAdId: { android: PRODUCTION_AD_IDS.android.banner, ios: PRODUCTION_AD_IDS.ios.banner },
              interstitialAdId: { android: PRODUCTION_AD_IDS.android.interstitial, ios: PRODUCTION_AD_IDS.ios.interstitial },
              appOpenAdId: { android: PRODUCTION_AD_IDS.android.appOpen, ios: PRODUCTION_AD_IDS.ios.appOpen },
            }));
          },
        },
      ]
    );
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
        {/* Master Toggle */}
        <View style={styles.mainToggle}>
          <View style={[styles.toggleInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons
              name={config.enabled ? 'advertisements' : 'advertisements-off'}
              size={32}
              color={config.enabled ? Colors.success : Colors.textMuted}
            />
            <View>
              <Text style={[styles.toggleTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('admin.adsTitle')}
              </Text>
              <Text style={[styles.toggleStatus, { textAlign: isRTL ? 'right' : 'left' }]}>
                {config.enabled ? t('admin.enabled') : t('admin.disabled')}
              </Text>
            </View>
          </View>
          <Switch
            value={config.enabled}
            onValueChange={(value) => updateConfig('enabled', value)}
            trackColor={{ false: Colors.border, true: Colors.accent }}
            thumbColor={config.enabled ? Colors.primary : Colors.textMuted}
          />
        </View>

        {/* ==================== Ad Unit IDs ==================== */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.sectionTitle}>Ad Unit IDs</Text>
            <TouchableOpacity onPress={resetToProduction} style={styles.resetBtn}>
              <Ionicons name="refresh" size={16} color={Colors.primary} />
              <Text style={styles.resetBtnText}>Production</Text>
            </TouchableOpacity>
          </View>

          {/* Banner IDs */}
          <Text style={styles.subTitle}>Banner</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>iOS</Text>
            <TextInput
              style={styles.input}
              value={config.bannerAdId.ios}
              onChangeText={(v) => updateAdUnitId('bannerAdId', 'ios', v)}
              placeholder="ca-app-pub-xxxxx/xxxxx"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Android</Text>
            <TextInput
              style={styles.input}
              value={config.bannerAdId.android}
              onChangeText={(v) => updateAdUnitId('bannerAdId', 'android', v)}
              placeholder="ca-app-pub-xxxxx/xxxxx"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          {/* Interstitial IDs */}
          <Text style={styles.subTitle}>Interstitial</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>iOS</Text>
            <TextInput
              style={styles.input}
              value={config.interstitialAdId.ios}
              onChangeText={(v) => updateAdUnitId('interstitialAdId', 'ios', v)}
              placeholder="ca-app-pub-xxxxx/xxxxx"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Android</Text>
            <TextInput
              style={styles.input}
              value={config.interstitialAdId.android}
              onChangeText={(v) => updateAdUnitId('interstitialAdId', 'android', v)}
              placeholder="ca-app-pub-xxxxx/xxxxx"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          {/* App Open IDs */}
          <Text style={styles.subTitle}>App Open</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>iOS</Text>
            <TextInput
              style={styles.input}
              value={config.appOpenAdId.ios}
              onChangeText={(v) => updateAdUnitId('appOpenAdId', 'ios', v)}
              placeholder="ca-app-pub-xxxxx/xxxxx"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Android</Text>
            <TextInput
              style={styles.input}
              value={config.appOpenAdId.android}
              onChangeText={(v) => updateAdUnitId('appOpenAdId', 'android', v)}
              placeholder="ca-app-pub-xxxxx/xxxxx"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* ==================== Banner Placement ==================== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.bannerPlacement')}</Text>
          {BANNER_SCREENS.map(({ key, label, icon }) => (
            <View key={key} style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.screenLabel, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name={icon as any} size={18} color={Colors.textMuted} />
                <Text style={styles.switchLabel}>{label}</Text>
              </View>
              <Switch
                value={config.bannerScreens[key] ?? false}
                onValueChange={(value) => updateBannerScreen(key, value)}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor={Colors.primary}
              />
            </View>
          ))}
        </View>

        {/* ==================== App Open Ad ==================== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Open Ad</Text>
          <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.switchLabel}>إعلان عند فتح التطبيق</Text>
            <Switch
              value={config.showAdOnAppOpen}
              onValueChange={(value) => updateConfig('showAdOnAppOpen', value)}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>
          <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.switchLabel}>إعلان عند تغيير نمط القبلة</Text>
            <Switch
              value={config.showAdOnQiblaStyleChange}
              onValueChange={(value) => updateConfig('showAdOnQiblaStyleChange', value)}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>
        </View>

        {/* ==================== Interstitial Settings ==================== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.interstitialSettings')}</Text>

          {/* Mode selector */}
          <Text style={styles.inputLabel}>Mode</Text>
          <View style={styles.modeRow}>
            {(['pages', 'time', 'session'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeBtn,
                  config.interstitialMode === mode && styles.modeBtnActive,
                ]}
                onPress={() => updateConfig('interstitialMode', mode)}
              >
                <Text style={[
                  styles.modeBtnText,
                  config.interstitialMode === mode && styles.modeBtnTextActive,
                ]}>
                  {mode === 'pages' ? 'عدد صفحات' : mode === 'time' ? 'وقت' : 'جلسة'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Frequency (pages mode) */}
          {config.interstitialMode === 'pages' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>عدد الصفحات بين الإعلانات</Text>
              <TextInput
                style={styles.input}
                value={String(config.interstitialFrequency)}
                onChangeText={(v) => updateConfig('interstitialFrequency', parseInt(v) || 5)}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          )}

          {/* Time interval (time mode) */}
          {config.interstitialMode === 'time' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>دقائق بين الإعلانات</Text>
              <TextInput
                style={styles.input}
                value={String(config.interstitialTimeInterval)}
                onChangeText={(v) => updateConfig('interstitialTimeInterval', parseInt(v) || 3)}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          )}

          {/* Session limit (session mode) */}
          {config.interstitialMode === 'session' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>حد الإعلانات في الجلسة</Text>
              <TextInput
                style={styles.input}
                value={String(config.interstitialSessionLimit)}
                onChangeText={(v) => updateConfig('interstitialSessionLimit', parseInt(v) || 2)}
                keyboardType="number-pad"
                placeholder="2"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          )}

          {/* First ad delay */}
          <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: Spacing.sm }]}>
            <Text style={styles.switchLabel}>تأخير أول إعلان</Text>
            <Switch
              value={config.delayFirstAd}
              onValueChange={(value) => updateConfig('delayFirstAd', value)}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>

          {config.delayFirstAd && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ثواني التأخير</Text>
              <TextInput
                style={styles.input}
                value={String(config.firstAdDelay)}
                onChangeText={(v) => updateConfig('firstAdDelay', parseInt(v) || 30)}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          )}
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
    alignItems: 'center',
    gap: Spacing.md,
  },
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
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  inputGroup: {
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  switchRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  screenLabel: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  switchLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  modeBtnText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  modeBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  resetBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
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
