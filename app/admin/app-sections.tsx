// app/admin/app-sections.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useIsRTL } from '@/hooks/use-is-rtl';

interface SectionConfig {
  key: string;
  visible: boolean;
  order: number;
}

interface AppSectionsConfig {
  homeSections: SectionConfig[];
  tabVisibility: { [key: string]: boolean };
  quickAccessDefaults: string[];
  updatedAt?: string;
}

const HOME_SECTIONS = [
  { key: 'story', label: 'قصة اليوم', icon: 'book-outline' },
  { key: 'verse', label: 'آية اليوم', icon: 'document-text-outline' },
  { key: 'highlights', label: 'المقاطع المميزة', icon: 'star-outline' },
  { key: 'quickAccess', label: 'الوصول السريع', icon: 'grid-outline' },
  { key: 'azkar', label: 'الأذكار', icon: 'list-outline' },
  { key: 'duas', label: 'الأدعية', icon: 'hand-left-outline' },
  { key: 'worship', label: 'العبادات', icon: 'analytics-outline' },
  { key: 'hajjUmrah', label: 'الحج والعمرة', icon: 'location-outline' },
  { key: 'dailyDhikr', label: 'ذكر اليوم', icon: 'repeat-outline' },
  { key: 'hadith', label: 'حديث اليوم', icon: 'chatbubble-outline' },
];

const TABS = [
  { key: 'home', label: 'الرئيسية', icon: 'home-outline' },
  { key: 'quran', label: 'القرآن', icon: 'book-outline' },
  { key: 'tasbih', label: 'التسبيح', icon: 'repeat-outline' },
  { key: 'prayer', label: 'الصلاة', icon: 'time-outline' },
  { key: 'settings', label: 'الإعدادات', icon: 'settings-outline' },
];

const DEFAULT_CONFIG: AppSectionsConfig = {
  homeSections: HOME_SECTIONS.map((s, i) => ({ key: s.key, visible: true, order: i })),
  tabVisibility: Object.fromEntries(TABS.map(t => [t.key, true])),
  quickAccessDefaults: [],
};

export default function AppSectionsScreen() {
  const isRTL = useIsRTL();
  const [config, setConfig] = useState<AppSectionsConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const snap = await getDoc(doc(db, 'appConfig', 'appSections'));
      if (snap.exists()) {
        const data = snap.data() as AppSectionsConfig;
        setConfig({
          ...DEFAULT_CONFIG,
          ...data,
          homeSections: data.homeSections?.length ? data.homeSections : DEFAULT_CONFIG.homeSections,
        });
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
      await setDoc(doc(db, 'appConfig', 'appSections'), {
        ...config,
        updatedAt: new Date().toISOString(),
      });
      Alert.alert('تم', 'تم حفظ إعدادات الأقسام');
    } catch {
      Alert.alert('خطأ', 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const toggleHomeSection = (key: string) => {
    setConfig(prev => ({
      ...prev,
      homeSections: prev.homeSections.map(s =>
        s.key === key ? { ...s, visible: !s.visible } : s
      ),
    }));
  };

  const moveSection = (key: string, direction: 'up' | 'down') => {
    setConfig(prev => {
      const sections = [...prev.homeSections];
      const idx = sections.findIndex(s => s.key === key);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sections.length) return prev;
      // Swap orders
      const tmpOrder = sections[idx].order;
      sections[idx] = { ...sections[idx], order: sections[swapIdx].order };
      sections[swapIdx] = { ...sections[swapIdx], order: tmpOrder };
      // Swap positions
      [sections[idx], sections[swapIdx]] = [sections[swapIdx], sections[idx]];
      return { ...prev, homeSections: sections };
    });
  };

  const toggleTab = (key: string) => {
    setConfig(prev => ({
      ...prev,
      tabVisibility: { ...prev.tabVisibility, [key]: !prev.tabVisibility[key] },
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
        {/* Home Sections */}
        <Text style={styles.groupTitle}>أقسام الصفحة الرئيسية</Text>
        <Text style={styles.groupSubtitle}>تحكم في ظهور وترتيب الأقسام</Text>

        {config.homeSections.map((section, idx) => {
          const info = HOME_SECTIONS.find(s => s.key === section.key);
          if (!info) return null;
          return (
            <View key={section.key} style={[styles.sectionCard, !section.visible && styles.sectionCardHidden]}>
              <View style={[styles.sectionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Reorder */}
                <View style={styles.reorderBtns}>
                  <TouchableOpacity onPress={() => moveSection(section.key, 'up')} disabled={idx === 0} activeOpacity={0.7}>
                    <Ionicons name="chevron-up" size={18} color={idx === 0 ? Colors.border : Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveSection(section.key, 'down')} disabled={idx === config.homeSections.length - 1} activeOpacity={0.7}>
                    <Ionicons name="chevron-down" size={18} color={idx === config.homeSections.length - 1 ? Colors.border : Colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }]}>
                  <Ionicons name={info.icon as any} size={20} color={section.visible ? Colors.primary : Colors.textMuted} />
                  <Text style={[styles.sectionLabel, !section.visible && { color: Colors.textMuted }]}>{info.label}</Text>
                </View>

                {/* Toggle */}
                <Switch
                  value={section.visible}
                  onValueChange={() => toggleHomeSection(section.key)}
                  trackColor={{ true: Colors.primary }}
                />
              </View>
            </View>
          );
        })}

        {/* Tab Visibility */}
        <Text style={[styles.groupTitle, { marginTop: Spacing.xl }]}>التبويبات السفلية</Text>
        <Text style={styles.groupSubtitle}>تحكم في ظهور التبويبات (الحد الأدنى ٢)</Text>

        {TABS.map(tab => (
          <View key={tab.key} style={styles.sectionCard}>
            <View style={[styles.sectionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }]}>
                <Ionicons name={tab.icon as any} size={20} color={config.tabVisibility[tab.key] ? Colors.primary : Colors.textMuted} />
                <Text style={styles.sectionLabel}>{tab.label}</Text>
              </View>
              <Switch
                value={config.tabVisibility[tab.key] !== false}
                onValueChange={() => toggleTab(tab.key)}
                trackColor={{ true: Colors.primary }}
              />
            </View>
          </View>
        ))}

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
  groupTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginHorizontal: Spacing.md, marginTop: Spacing.md, writingDirection: 'rtl', textAlign: 'right' },
  groupSubtitle: { fontSize: 13, color: Colors.textMuted, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, writingDirection: 'rtl', textAlign: 'right' },
  sectionCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing.md, marginBottom: Spacing.xs, borderRadius: BorderRadius.lg, padding: Spacing.md, elevation: 1, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  sectionCardHidden: { opacity: 0.5 },
  sectionRow: { justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  sectionLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  reorderBtns: { gap: 2, alignItems: 'center' },
  saveBtn: { backgroundColor: Colors.primary, margin: Spacing.md, marginTop: Spacing.xl, padding: Spacing.md, borderRadius: BorderRadius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.textLight },
});
