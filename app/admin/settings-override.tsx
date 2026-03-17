// app/admin/settings-override.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useIsRTL } from '@/hooks/use-is-rtl';

interface SettingsOverrideConfig {
  display: {
    forceLanguage?: string;
    defaultFontSize?: string;
    forceTheme?: string;
    maintenanceMessage?: string;
  };
  prayer: {
    defaultCalculationMethod?: string;
    defaultMadhab?: string;
    adjustments?: { [key: string]: number };
  };
  notifications: {
    forceDisableAll?: boolean;
    maxDailyNotifications?: number;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
  features: {
    [key: string]: boolean;
  };
  updatedAt?: string;
}

const DEFAULT_CONFIG: SettingsOverrideConfig = {
  display: {},
  prayer: {},
  notifications: {},
  features: {},
};

const CALCULATION_METHODS = [
  { key: 'MuslimWorldLeague', label: 'رابطة العالم الإسلامي' },
  { key: 'Egyptian', label: 'الهيئة المصرية' },
  { key: 'Karachi', label: 'جامعة كراتشي' },
  { key: 'UmmAlQura', label: 'أم القرى' },
  { key: 'Dubai', label: 'دبي' },
  { key: 'MoonsightingCommittee', label: 'لجنة رؤية الهلال' },
  { key: 'NorthAmerica', label: 'ISNA (أمريكا الشمالية)' },
  { key: 'Kuwait', label: 'الكويت' },
  { key: 'Qatar', label: 'قطر' },
  { key: 'Singapore', label: 'سنغافورة' },
  { key: 'Turkey', label: 'ديانت (تركيا)' },
  { key: 'Tehran', label: 'معهد الجيوفيزياء (طهران)' },
];

const FEATURE_FLAGS = [
  { key: 'showAds', label: 'عرض الإعلانات', icon: 'megaphone' },
  { key: 'showSubscription', label: 'عرض الاشتراك المميز', icon: 'star' },
  { key: 'showStories', label: 'عرض القصص', icon: 'book' },
  { key: 'showDailyContent', label: 'عرض المحتوى اليومي', icon: 'today' },
  { key: 'showSeasonalThemes', label: 'عرض المناسبات الموسمية', icon: 'color-palette' },
  { key: 'showWidgets', label: 'عرض الودجات', icon: 'grid' },
  { key: 'showWorshipTracker', label: 'عرض تتبع العبادات', icon: 'analytics' },
  { key: 'showKhatma', label: 'عرض الختمة', icon: 'ribbon' },
  { key: 'showHajjUmrah', label: 'عرض الحج والعمرة', icon: 'location' },
  { key: 'showCompanions', label: 'عرض الصحابة', icon: 'people' },
  { key: 'showSeerah', label: 'عرض السيرة', icon: 'trail-sign' },
  { key: 'showRuqya', label: 'عرض الرقية', icon: 'shield-checkmark' },
  { key: 'showNames', label: 'عرض أسماء الله', icon: 'sparkles' },
];

export default function SettingsOverrideScreen() {
  const isRTL = useIsRTL();
  const [config, setConfig] = useState<SettingsOverrideConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['features']));

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const snap = await getDoc(doc(db, 'appConfig', 'settingsOverride'));
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() as SettingsOverrideConfig });
      }
    } catch {
      Alert.alert('خطأ', 'فشل تحميل الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'appConfig', 'settingsOverride'), {
        ...config,
        updatedAt: new Date().toISOString(),
      });
      Alert.alert('تم', 'تم حفظ إعدادات التجاوز');
    } catch {
      Alert.alert('خطأ', 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const updateFeature = (key: string, value: boolean) => {
    setConfig(prev => ({
      ...prev,
      features: { ...prev.features, [key]: value },
    }));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.infoText}>هذه الإعدادات تتجاوز إعدادات المستخدم المحلية. استخدمها بحذر.</Text>
        </View>

        {/* Feature Flags */}
        <TouchableOpacity style={styles.sectionHeaderBtn} onPress={() => toggleSection('features')} activeOpacity={0.7}>
          <Text style={styles.sectionTitle}>التحكم في الميزات</Text>
          <Ionicons name={expandedSections.has('features') ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        {expandedSections.has('features') && (
          <View style={styles.sectionBody}>
            {FEATURE_FLAGS.map(ff => (
              <View key={ff.key} style={[styles.featureRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }]}>
                  <Ionicons name={ff.icon as any} size={18} color={Colors.primary} />
                  <Text style={styles.featureLabel}>{ff.label}</Text>
                </View>
                <Switch
                  value={config.features[ff.key] !== false}
                  onValueChange={v => updateFeature(ff.key, v)}
                  trackColor={{ true: Colors.primary }}
                />
              </View>
            ))}
          </View>
        )}

        {/* Display Settings */}
        <TouchableOpacity style={styles.sectionHeaderBtn} onPress={() => toggleSection('display')} activeOpacity={0.7}>
          <Text style={styles.sectionTitle}>إعدادات العرض</Text>
          <Ionicons name={expandedSections.has('display') ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        {expandedSections.has('display') && (
          <View style={styles.sectionBody}>
            <Text style={styles.inputLabel}>رسالة الصيانة (تترك فارغة لإلغاء)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={config.display.maintenanceMessage || ''}
              onChangeText={v => setConfig(p => ({ ...p, display: { ...p.display, maintenanceMessage: v || undefined } }))}
              multiline
              placeholder="أدخل رسالة الصيانة..."
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        )}

        {/* Notification Overrides */}
        <TouchableOpacity style={styles.sectionHeaderBtn} onPress={() => toggleSection('notifications')} activeOpacity={0.7}>
          <Text style={styles.sectionTitle}>إعدادات الإشعارات</Text>
          <Ionicons name={expandedSections.has('notifications') ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        {expandedSections.has('notifications') && (
          <View style={styles.sectionBody}>
            <View style={[styles.featureRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.featureLabel}>تعطيل جميع الإشعارات</Text>
              <Switch
                value={config.notifications.forceDisableAll || false}
                onValueChange={v => setConfig(p => ({ ...p, notifications: { ...p.notifications, forceDisableAll: v } }))}
                trackColor={{ true: '#EF4444' }}
              />
            </View>
            <Text style={styles.inputLabel}>الحد الأقصى للإشعارات اليومية</Text>
            <TextInput
              style={styles.input}
              value={config.notifications.maxDailyNotifications ? String(config.notifications.maxDailyNotifications) : ''}
              onChangeText={v => setConfig(p => ({ ...p, notifications: { ...p.notifications, maxDailyNotifications: parseInt(v) || undefined } }))}
              keyboardType="number-pad"
              placeholder="بلا حد"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        )}

        {/* Prayer Defaults */}
        <TouchableOpacity style={styles.sectionHeaderBtn} onPress={() => toggleSection('prayer')} activeOpacity={0.7}>
          <Text style={styles.sectionTitle}>إعدادات الصلاة</Text>
          <Ionicons name={expandedSections.has('prayer') ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        {expandedSections.has('prayer') && (
          <View style={styles.sectionBody}>
            <Text style={styles.inputLabel}>طريقة الحساب الافتراضية</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
              {CALCULATION_METHODS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodBtn, config.prayer.defaultCalculationMethod === m.key && styles.methodBtnActive]}
                  onPress={() => setConfig(p => ({ ...p, prayer: { ...p.prayer, defaultCalculationMethod: m.key } }))}
                >
                  <Text style={[styles.methodBtnText, config.prayer.defaultCalculationMethod === m.key && styles.methodBtnTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator color={Colors.textLight} />
          ) : (
            <>
              <Ionicons name="save" size={20} color={Colors.textLight} />
              <Text style={styles.saveBtnText}>حفظ إعدادات التجاوز</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FEF3C720', margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: '#F59E0B30' },
  infoText: { flex: 1, fontSize: 13, color: '#B45309', writingDirection: 'rtl', textAlign: 'right' },
  sectionHeaderBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.md, marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, elevation: 2, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, writingDirection: 'rtl' },
  sectionBody: { backgroundColor: Colors.surface, marginHorizontal: Spacing.md, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderBottomLeftRadius: BorderRadius.lg, borderBottomRightRadius: BorderRadius.lg },
  featureRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  featureLabel: { fontSize: 14, color: Colors.text },
  inputLabel: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.xs, marginTop: Spacing.sm, textAlign: 'right', writingDirection: 'rtl' },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.sm, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border, textAlign: 'right', writingDirection: 'rtl' },
  methodBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.xs },
  methodBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  methodBtnText: { fontSize: 12, color: Colors.textMuted },
  methodBtnTextActive: { color: Colors.primary, fontWeight: '600' },
  saveBtn: { backgroundColor: Colors.primary, margin: Spacing.md, marginTop: Spacing.xl, padding: Spacing.md, borderRadius: BorderRadius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.textLight },
});
