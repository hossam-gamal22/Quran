// app/admin/daily-content.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useIsRTL } from '@/hooks/use-is-rtl';

interface DailyOverride {
  override: boolean;
  arabicText: string;
  translation?: string;
  source?: string;
  surahNumber?: number;
  ayahNumber?: number;
}

const DEFAULT_SECTION: DailyOverride = { override: false, arabicText: '' };

const CONTENT_SECTIONS = [
  { key: 'ayah' as const, title: 'آية اليوم', icon: 'book', color: '#0d8e62', hasReference: true },
  { key: 'hadith' as const, title: 'حديث اليوم', icon: 'document-text', color: '#3B82F6', hasReference: false },
  { key: 'dua' as const, title: 'دعاء اليوم', icon: 'hand-left', color: '#8B5CF6', hasReference: false },
  { key: 'quote' as const, title: 'حكمة اليوم', icon: 'chatbubble-ellipses', color: '#EC4899', hasReference: false },
];

type SectionKey = typeof CONTENT_SECTIONS[number]['key'];

export default function DailyContentScreen() {
  const isRTL = useIsRTL();
  const [sections, setSections] = useState<Record<SectionKey, DailyOverride>>({
    ayah: { ...DEFAULT_SECTION },
    hadith: { ...DEFAULT_SECTION },
    dua: { ...DEFAULT_SECTION },
    quote: { ...DEFAULT_SECTION },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const loaded: Record<string, DailyOverride> = {};
      for (const s of CONTENT_SECTIONS) {
        const snap = await getDoc(doc(db, 'dailyContent', s.key));
        if (snap.exists()) {
          const d = snap.data();
          loaded[s.key] = {
            override: d.override ?? false,
            arabicText: d.arabic || d.text || d.arabicText || '',
            translation: d.translation || '',
            source: d.source || d.narrator || d.reference || '',
            surahNumber: d.surah,
            ayahNumber: d.ayah,
          };
        } else {
          loaded[s.key] = { ...DEFAULT_SECTION };
        }
      }
      setSections(prev => ({ ...prev, ...loaded }));
    } catch {
      Alert.alert('خطأ', 'فشل تحميل الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const s of CONTENT_SECTIONS) {
        const sd = sections[s.key];
        // Build the Firestore document matching the web admin schema
        const firestoreData: Record<string, unknown> = {
          override: sd.override,
          updatedAt: new Date().toISOString(),
        };
        if (s.key === 'ayah') {
          firestoreData.surah = sd.surahNumber || 1;
          firestoreData.ayah = sd.ayahNumber || 1;
          firestoreData.text = sd.arabicText;
          firestoreData.surahName = '';
        } else if (s.key === 'hadith') {
          firestoreData.arabic = sd.arabicText;
          firestoreData.translation = sd.translation || '';
          firestoreData.narrator = sd.source || '';
          firestoreData.source = sd.source || '';
        } else if (s.key === 'dua') {
          firestoreData.arabic = sd.arabicText;
          firestoreData.translation = sd.translation || '';
          firestoreData.reference = sd.source || '';
        } else if (s.key === 'quote') {
          firestoreData.arabic = sd.arabicText;
          firestoreData.translation = sd.translation || '';
          firestoreData.author = '';
          firestoreData.source = sd.source || '';
        }
        await setDoc(doc(db, 'dailyContent', s.key), firestoreData, { merge: true });
      }
      Alert.alert('تم', 'تم حفظ إعدادات المحتوى اليومي');
    } catch {
      Alert.alert('خطأ', 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (key: SectionKey, field: string, value: any) => {
    setSections(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>عند تفعيل التجاوز، سيتم عرض النص المحدد بدلاً من المحتوى التلقائي اليومي.</Text>
        </View>

        {CONTENT_SECTIONS.map(section => {
          const sectionData = sections[section.key];
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
                  value={sectionData.override}
                  onValueChange={v => updateSection(section.key, 'override', v)}
                  trackColor={{ true: section.color }}
                />
              </View>

              {sectionData.override && (
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
