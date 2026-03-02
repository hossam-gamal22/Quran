@ -1,934 +0,0 @@
// app/widget-settings.tsx
// صفحة إعدادات الويدجت - روح المسلم

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import {
  WidgetSettings,
  defaultWidgetSettings,
  getWidgetSettings,
  saveWidgetSettings,
  requestWidgetUpdate,
} from '@/lib/widget-data';
import GlassCard from '@/components/ui/GlassCard';

// ========================================
// الثوابت
// ========================================

const ACCENT_COLORS = [
  { name: 'أخضر', value: '#2f7659' },
  { name: 'أزرق', value: '#3a7ca5' },
  { name: 'بنفسجي', value: '#5d4e8c' },
  { name: 'برتقالي', value: '#c17f59' },
  { name: 'أحمر', value: '#c0392b' },
  { name: 'ذهبي', value: '#d4a017' },
];

const REFRESH_INTERVALS = [
  { label: 'كل 30 دقيقة', value: 30 },
  { label: 'كل ساعة', value: 60 },
  { label: 'كل ساعتين', value: 120 },
  { label: 'كل 4 ساعات', value: 240 },
];

const AZKAR_CATEGORIES = [
  { key: 'morning', name: 'أذكار الصباح', icon: 'weather-sunny' },
  { key: 'evening', name: 'أذكار المساء', icon: 'weather-night' },
  { key: 'sleep', name: 'أذكار النوم', icon: 'sleep' },
  { key: 'wakeup', name: 'أذكار الاستيقاظ', icon: 'alarm' },
  { key: 'afterPrayer', name: 'أذكار بعد الصلاة', icon: 'mosque' },
  { key: 'misc', name: 'أذكار متنوعة', icon: 'bookmark-multiple' },
];

// ========================================
// مكونات فرعية
// ========================================

interface SettingSectionProps {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  children: React.ReactNode;
  index: number;
  isDarkMode?: boolean;
}

const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  icon,
  children,
  index,
  isDarkMode = false,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <View style={[styles.section, isDarkMode && styles.sectionDark]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={isDarkMode ? '#fff' : '#333'}
          />
          <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
            {title}
          </Text>
        </View>
        {children}
      </View>
    </Animated.View>
  );
};

interface SettingRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDarkMode?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  value,
  onValueChange,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, isDarkMode && styles.textLight]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.settingDescription, isDarkMode && styles.textMuted]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onValueChange(newValue);
        }}
        trackColor={{ false: '#ddd', true: '#2f7659' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );
};

interface ColorPickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
  isDarkMode?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onSelect,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.colorPicker}>
      {ACCENT_COLORS.map((color, index) => (
        <TouchableOpacity
          key={color.value}
          style={[
            styles.colorOption,
            { backgroundColor: color.value },
            selectedColor === color.value && styles.colorOptionSelected,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(color.value);
          }}
        >
          {selectedColor === color.value && (
            <MaterialCommunityIcons name="check" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

interface IntervalSelectorProps {
  selectedInterval: number;
  onSelect: (interval: number) => void;
  isDarkMode?: boolean;
}

const IntervalSelector: React.FC<IntervalSelectorProps> = ({
  selectedInterval,
  onSelect,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.intervalSelector}>
      {REFRESH_INTERVALS.map((interval) => (
        <TouchableOpacity
          key={interval.value}
          style={[
            styles.intervalOption,
            isDarkMode && styles.intervalOptionDark,
            selectedInterval === interval.value && styles.intervalOptionSelected,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(interval.value);
          }}
        >
          <Text
            style={[
              styles.intervalText,
              isDarkMode && styles.textMuted,
              selectedInterval === interval.value && styles.intervalTextSelected,
            ]}
          >
            {interval.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

interface CategorySelectorProps {
  selectedCategories: string[];
  onToggle: (category: string) => void;
  isDarkMode?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategories,
  onToggle,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.categorySelector}>
      {AZKAR_CATEGORIES.map((category, index) => {
        const isSelected = selectedCategories.includes(category.key);
        return (
          <Animated.View
            key={category.key}
            entering={FadeInRight.delay(index * 50).duration(300)}
          >
            <TouchableOpacity
              style={[
                styles.categoryOption,
                isDarkMode && styles.categoryOptionDark,
                isSelected && styles.categoryOptionSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle(category.key);
              }}
            >
              <MaterialCommunityIcons
                name={category.icon as any}
                size={20}
                color={isSelected ? '#fff' : isDarkMode ? '#aaa' : '#666'}
              />
              <Text
                style={[
                  styles.categoryText,
                  isDarkMode && styles.textMuted,
                  isSelected && styles.categoryTextSelected,
                ]}
              >
                {category.name}
              </Text>
              {isSelected && (
                <MaterialCommunityIcons name="check" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function WidgetSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<WidgetSettings>(defaultWidgetSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const isDarkMode = false;

  // تحميل الإعدادات
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const savedSettings = await getWidgetSettings();
    setSettings(savedSettings);
    setIsLoading(false);
  };

  // تحديث الإعدادات
  const updateSettings = useCallback((updates: Partial<WidgetSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const updatePrayerWidget = useCallback(
    (updates: Partial<WidgetSettings['prayerWidget']>) => {
      setSettings((prev) => ({
        ...prev,
        prayerWidget: { ...prev.prayerWidget, ...updates },
      }));
      setHasChanges(true);
    },
    []
  );

  const updateAzkarWidget = useCallback(
    (updates: Partial<WidgetSettings['azkarWidget']>) => {
      setSettings((prev) => ({
        ...prev,
        azkarWidget: { ...prev.azkarWidget, ...updates },
      }));
      setHasChanges(true);
    },
    []
  );

  const updateHijriWidget = useCallback(
    (updates: Partial<WidgetSettings['hijriWidget']>) => {
      setSettings((prev) => ({
        ...prev,
        hijriWidget: { ...prev.hijriWidget, ...updates },
      }));
      setHasChanges(true);
    },
    []
  );

  // تبديل فئة الأذكار
  const toggleAzkarCategory = useCallback((category: string) => {
    setSettings((prev) => {
      const categories = prev.azkarWidget.categories.includes(category)
        ? prev.azkarWidget.categories.filter((c) => c !== category)
        : [...prev.azkarWidget.categories, category];
      
      // يجب اختيار فئة واحدة على الأقل
      if (categories.length === 0) {
        Alert.alert('تنبيه', 'يجب اختيار فئة واحدة على الأقل');
        return prev;
      }
      
      return {
        ...prev,
        azkarWidget: { ...prev.azkarWidget, categories },
      };
    });
    setHasChanges(true);
  }, []);

  // حفظ الإعدادات
  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveWidgetSettings(settings);
    await requestWidgetUpdate();
    setHasChanges(false);
    Alert.alert('تم الحفظ', 'تم حفظ إعدادات الويدجت بنجاح');
  };

  // إعادة تعيين الإعدادات
  const handleReset = () => {
    Alert.alert(
      'إعادة التعيين',
      'هل تريد إعادة تعيين جميع إعدادات الويدجت إلى الافتراضية؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة تعيين',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setSettings(defaultWidgetSettings);
            setHasChanges(true);
          },
        },
      ]
    );
  };

  // تحديث الويدجت يدوياً
  const handleRefreshWidget = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await requestWidgetUpdate();
    Alert.alert('تم التحديث', 'تم تحديث الويدجت بنجاح');
  };

  return (
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.containerDark]}
      edges={['top']}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* الهيدر */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="arrow-right"
            size={24}
            color={isDarkMode ? '#fff' : '#333'}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
          إعدادات الويدجت
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <MaterialCommunityIcons
            name="refresh"
            size={24}
            color={isDarkMode ? '#fff' : '#333'}
          />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* معاينة الويدجت */}
        <Animated.View entering={FadeInDown.delay(50).duration(500)}>
          <LinearGradient
            colors={[settings.prayerWidget.accentColor, '#1d4a3a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.widgetPreview}
          >
            <View style={styles.previewContent}>
              <MaterialCommunityIcons name="widgets" size={32} color="#fff" />
              <Text style={styles.previewTitle}>معاينة الويدجت</Text>
              <Text style={styles.previewSubtitle}>
                {Platform.OS === 'ios' ? 'iOS' : 'Android'} Widget
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* تفعيل الويدجت */}
        <SettingSection
          title="الإعدادات العامة"
          icon="cog"
          index={0}
          isDarkMode={isDarkMode}
        >
          <SettingRow
            label="تفعيل الويدجت"
            description="تفعيل أو تعطيل جميع الويدجت"
            value={settings.enabled}
            onValueChange={(value) => updateSettings({ enabled: value })}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* ويدجت الصلاة */}
        <SettingSection
          title="ويدجت مواقيت الصلاة"
          icon="mosque"
          index={1}
          isDarkMode={isDarkMode}
        >
          <SettingRow
            label="تفعيل"
            value={settings.prayerWidget.enabled}
            onValueChange={(value) => updatePrayerWidget({ enabled: value })}
            isDarkMode={isDarkMode}
          />
          <SettingRow
            label="عرض جميع الصلوات"
            description="عرض قائمة بجميع مواقيت الصلاة"
            value={settings.prayerWidget.showAllPrayers}
            onValueChange={(value) => updatePrayerWidget({ showAllPrayers: value })}
            isDarkMode={isDarkMode}
          />
          <SettingRow
            label="عرض التاريخ الهجري"
            value={settings.prayerWidget.showHijriDate}
            onValueChange={(value) => updatePrayerWidget({ showHijriDate: value })}
            isDarkMode={isDarkMode}
          />
          <SettingRow
            label="عرض الموقع"
            value={settings.prayerWidget.showLocation}
            onValueChange={(value) => updatePrayerWidget({ showLocation: value })}
            isDarkMode={isDarkMode}
          />

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textLight]}>
              اللون الأساسي
            </Text>
          </View>
          <ColorPicker
            selectedColor={settings.prayerWidget.accentColor}
            onSelect={(color) => updatePrayerWidget({ accentColor: color })}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* ويدجت الأذكار */}
        <SettingSection
          title="ويدجت الأذكار"
          icon="hand-heart"
          index={2}
          isDarkMode={isDarkMode}
        >
          <SettingRow
            label="تفعيل"
            value={settings.azkarWidget.enabled}
            onValueChange={(value) => updateAzkarWidget({ enabled: value })}
            isDarkMode={isDarkMode}
          />
          <SettingRow
            label="عرض الترجمة"
            description="عرض ترجمة الذكر بالإنجليزية"
            value={settings.azkarWidget.showTranslation}
            onValueChange={(value) => updateAzkarWidget({ showTranslation: value })}
            isDarkMode={isDarkMode}
          />
          <SettingRow
            label="تحديث تلقائي"
            description="تحديث الذكر تلقائياً"
            value={settings.azkarWidget.autoRefresh}
            onValueChange={(value) => updateAzkarWidget({ autoRefresh: value })}
            isDarkMode={isDarkMode}
          />

          {settings.azkarWidget.autoRefresh && (
            <>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, isDarkMode && styles.textLight]}>
                  فترة التحديث
                </Text>
              </View>
              <IntervalSelector
                selectedInterval={settings.azkarWidget.refreshInterval}
                onSelect={(interval) =>
                  updateAzkarWidget({ refreshInterval: interval })
                }
                isDarkMode={isDarkMode}
              />
            </>
          )}

          <View style={[styles.settingRow, { marginTop: 15 }]}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textLight]}>
              فئات الأذكار
            </Text>
          </View>
          <CategorySelector
            selectedCategories={settings.azkarWidget.categories}
            onToggle={toggleAzkarCategory}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* ويدجت التاريخ الهجري */}
        <SettingSection
          title="ويدجت التاريخ الهجري"
          icon="calendar-month"
          index={3}
          isDarkMode={isDarkMode}
        >
          <SettingRow
            label="تفعيل"
            value={settings.hijriWidget.enabled}
            onValueChange={(value) => updateHijriWidget({ enabled: value })}
            isDarkMode={isDarkMode}
          />
          <SettingRow
            label="عرض التاريخ الميلادي"
            description="عرض التاريخ الميلادي مع الهجري"
            value={settings.hijriWidget.showGregorian}
            onValueChange={(value) => updateHijriWidget({ showGregorian: value })}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* أزرار الإجراءات */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          style={styles.actionsContainer}
        >
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshWidget}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#2f7659" />
            <Text style={styles.refreshButtonText}>تحديث الويدجت الآن</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ملاحظة */}
        <Animated.View entering={FadeInDown.delay(450).duration(500)}>
          <GlassCard style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color="#3a7ca5"
              />
              <Text style={[styles.noteTitle, isDarkMode && styles.textLight]}>
                ملاحظة
              </Text>
            </View>
            <Text style={[styles.noteText, isDarkMode && styles.textMuted]}>
              لإضافة الويدجت إلى الشاشة الرئيسية:{'\n'}
              {Platform.OS === 'ios'
                ? '• اضغط مطولاً على الشاشة الرئيسية\n• اضغط على زر (+)\n• ابحث عن "روح المسلم"'
                : '• اضغط مطولاً على الشاشة الرئيسية\n• اختر "Widgets"\n• ابحث عن "روح المسلم"'}
            </Text>
          </GlassCard>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* زر الحفظ */}
      {hasChanges && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.saveButtonContainer}
        >
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <LinearGradient
              colors={['#2f7659', '#1d4a3a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#11151c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    textAlign: 'center',
  },
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 15,
  },
  // معاينة الويدجت
  widgetPreview: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  previewContent: {
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    marginTop: 10,
  },
  previewSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  // الأقسام
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 15,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionDark: {
    backgroundColor: '#1a1a2e',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  // صف الإعداد
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'Cairo-Medium',
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 2,
  },
  // اختيار الألوان
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  // اختيار الفترة
  intervalSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  intervalOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  intervalOptionDark: {
    backgroundColor: '#252540',
  },
  intervalOptionSelected: {
    borderColor: '#2f7659',
    backgroundColor: '#2f765915',
  },
  intervalText: {
    fontSize: 13,
    fontFamily: 'Cairo-Medium',
    color: '#666',
  },
  intervalTextSelected: {
    color: '#2f7659',
  },
  // اختيار الفئات
  categorySelector: {
    gap: 10,
    marginTop: 10,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryOptionDark: {
    backgroundColor: '#252540',
  },
  categoryOptionSelected: {
    borderColor: '#2f7659',
    backgroundColor: '#2f7659',
  },
  categoryText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    color: '#666',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  // أزرار الإجراءات
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#2f765915',
    borderWidth: 2,
    borderColor: '#2f7659',
  },
  refreshButtonText: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: '#2f7659',
  },
  // الملاحظة
  noteCard: {
    marginHorizontal: 16,
    marginTop: 15,
    padding: 20,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  noteTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  noteText: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    lineHeight: 22,
  },
  // زر الحفظ
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  bottomSpace: {
    height: 100,
  },
});