// app/admin/daily-content.tsx
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

interface DailyOverride {
  enabled: boolean;
  arabicText: string;
  translation?: string;
  source?: string;
  surahNumber?: number;
  ayahNumber?: number;
}

interface DailyContentConfig {
  ayah: DailyOverride;
  hadith: DailyOverride;
  dua: DailyOverride;
  dhikr: DailyOverride;
  quote: DailyOverride;
  updatedAt?: string;
}

const DEFAULT_CONFIG: DailyContentConfig = {
  ayah: { enabled: false, arabicText: '' },
  hadith: { enabled: false, arabicText: '' },
  dua: { enabled: false, arabicText: '' },
  dhikr: { enabled: false, arabicText: '' },
  quote: { enabled: false, arabicText: '' },
};

const CONTENT_SECTIONS = [
  { key: 'ayah' as const, title: 'آية اليوم', icon: 'book', color: '#22C55E', hasReference: true },
  { key: 'hadith' as const, title: 'حديث اليوم', icon: 'document-text', color: '#3B82F6', hasReference: false },
  { key: 'dua' as const, title: 'دعاء اليوم', icon: 'hand-left', color: '#8B5CF6', hasReference: false },
  { key: 'dhikr' as const, title: 'ذكر اليوم', icon: 'repeat', color: '#F59E0B', hasReference: false },
  { key: 'quote' as const, title: 'حكمة اليوم', icon: 'chatbubble-ellipses', color: '#EC4899', hasReference: false },
];

export default function DailyContentScreen() {
  const isRTL = useIsRTL();
  const [config, setConfig] = useState<DailyContentConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const snap = await getDoc(doc(db, 'appConfig', 'dailyContent'));
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() as DailyContentConfig });
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
      await setDoc(doc(db, 'appConfig', 'dailyContent'), {
        ...config,
        updatedAt: new Date().toISOString(),
      });
      Alert.alert('تم', 'تم حفظ إعدادات المحتوى اليومي');
    } catch {
      Alert.alert('خطأ', 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (key: keyof DailyContentConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: { ...(prev[key] as DailyOverride), [field]: value },
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
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>عند تفعيل التجاوز، سيتم عرض النص المحدد بدلاً من المحتوى التلقائي اليومي.</Text>
        </View>

        {CONTENT_SECTIONS.map(section => {
          const sectionData = config[section.key] as DailyOverride;
          return (
            <View key={section.key} style={styles.section}>
              {/* Section Header */}
              <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }]}>
                  <View style={[styles.iconCircle, { backgroundColor: section.color + '20' }]}>
                    <Ionicons name={section.icon as any} size={18} color={section.color} />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <Switch
                  value={sectionData.enabled}
                  onValueChange={v => updateSection(section.key, 'enabled', v)}
                  trackColor={{ true: section.color }}
                />
              </View>

              {sectionData.enabled && (
                <View style={{ marginTop: Spacing.sm }}>
                  <Text style={styles.inputLabel}>النص العربي *</Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    value={sectionData.arabicText}
                    onChangeText={v => updateSection(section.key, 'arabicText', v)}
                    multiline
                    placeholder="اكتب النص هنا..."
                    placeholderTextColor={Colors.textMuted}
                  />

                  <Text style={styles.inputLabel}>الترجمة (اختياري)</Text>
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top', textAlign: 'left', writingDirection: 'ltr' }]}
                    value={sectionData.translation || ''}
                    onChangeText={v => updateSection(section.key, 'translation', v)}
                    multiline
                    placeholder="Translation..."
                    placeholderTextColor={Colors.textMuted}
                  />

                  <Text style={styles.inputLabel}>المصدر / المرجع</Text>
                  <TextInput
                    style={styles.input}
                    value={sectionData.source || ''}
                    onChangeText={v => updateSection(section.key, 'source', v)}
                    placeholder="مثال: صحيح البخاري"
                    placeholderTextColor={Colors.textMuted}
                  />

                  {section.hasReference && (
                    <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>رقم السورة</Text>
                        <TextInput
                          style={styles.input}
                          value={sectionData.surahNumber ? String(sectionData.surahNumber) : ''}
                          onChangeText={v => updateSection(section.key, 'surahNumber', parseInt(v) || undefined)}
                          keyboardType="number-pad"
                          placeholder="1-114"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>رقم الآية</Text>
                        <TextInput
                          style={styles.input}
                          value={sectionData.ayahNumber ? String(sectionData.ayahNumber) : ''}
                          onChangeText={v => updateSection(section.key, 'ayahNumber', parseInt(v) || undefined)}
                          keyboardType="number-pad"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator color={Colors.textLight} />
          ) : (
            <>
              <Ionicons name="save" size={20} color={Colors.textLight} />
              <Text style={styles.saveBtnText}>حفظ الإعدادات</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primary + '10', margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.primary + '30' },
  infoText: { flex: 1, fontSize: 13, color: Colors.primary, writingDirection: 'rtl', textAlign: 'right' },
  section: { backgroundColor: Colors.surface, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.md, elevation: 2, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionHeader: { justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  iconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  inputLabel: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.xs, marginTop: Spacing.sm, textAlign: 'right', writingDirection: 'rtl' },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.sm, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border, textAlign: 'right', writingDirection: 'rtl' },
  saveBtn: { backgroundColor: Colors.primary, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.textLight },
});
