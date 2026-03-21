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
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
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
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { UniversalHeader } from '@/components/ui';
// ========================================
// الثوابت
// ========================================

const ACCENT_COLORS = [
  { nameKey: 'widget.green', value: '#22C55E' },
  { nameKey: 'widget.blue', value: '#3a7ca5' },
  { nameKey: 'widget.purple', value: '#5d4e8c' },
  { nameKey: 'widget.orange', value: '#c17f59' },
  { nameKey: 'widget.red', value: '#c0392b' },
  { nameKey: 'widget.gold', value: '#d4a017' },
];

const AZKAR_CATEGORIES = [
  { key: 'morning', nameKey: 'widget.morningAzkar', icon: 'weather-sunny' },
  { key: 'evening', nameKey: 'widget.eveningAzkar', icon: 'weather-night' },
  { key: 'sleep', nameKey: 'widget.sleepAzkar', icon: 'sleep' },
  { key: 'wakeup', nameKey: 'widget.wakeupAzkar', icon: 'alarm' },
  { key: 'afterPrayer', nameKey: 'widget.afterPrayerAzkar', icon: 'mosque' },
  { key: 'misc', nameKey: 'widget.miscAzkar', icon: 'bookmark-multiple' },
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
  isRTL?: boolean;
}

const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  icon,
  children,
  index,
  isDarkMode = false,
  isRTL = false,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <View style={[styles.section, isDarkMode && styles.sectionDark]}>
        <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={isDarkMode ? '#fff' : '#333'}
          />
          <Text style={[styles.sectionTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
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
  isRTL?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  value,
  onValueChange,
  isDarkMode = false,
  isRTL = false,
}) => {
  return (
    <View style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.settingInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.settingLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.settingDescription, { color: isDarkMode ? '#999' : '#666', textAlign: isRTL ? 'right' : 'left' }]}>
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
        trackColor={{ false: '#ddd', true: '#22C55E' }}
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
  const isRTL = useIsRTL();
  return (
    <View style={[styles.colorPicker, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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

interface CategorySelectorProps {
  selectedCategories: string[];
  onToggle: (category: string) => void;
  isDarkMode?: boolean;
  isRTL?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategories,
  onToggle,
  isDarkMode = false,
  isRTL = false,
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
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
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
                {t(category.nameKey)}
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

  const { settings: appSettings, isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();

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

  const updateVerseWidget = useCallback(
    (updates: Partial<WidgetSettings['verseWidget']>) => {
      setSettings((prev) => ({
        ...prev,
        verseWidget: { ...prev.verseWidget, ...updates },
      }));
      setHasChanges(true);
    },
    []
  );

  const updateDhikrWidget = useCallback(
    (updates: Partial<WidgetSettings['dhikrWidget']>) => {
      setSettings((prev) => ({
        ...prev,
        dhikrWidget: { ...prev.dhikrWidget, ...updates },
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
        Alert.alert(t('common.warning'), t('widgets.selectAtLeastOneCategory'));
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
    Alert.alert(t('common.savedSuccess'), t('widgets.settingsSaved'));
  };

  // إعادة تعيين الإعدادات
  const handleReset = () => {
    Alert.alert(
      t('widgets.reset'),
      t('widgets.resetConfirm'),
      [
        { text: t('widgets.cancel'), style: 'cancel' },
        {
          text: t('widgets.reset'),
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
    Alert.alert(t('common.success'), t('widgets.widgetUpdated'));
  };

  return (
    <BackgroundWrapper backgroundKey={appSettings.display.appBackground} backgroundUrl={appSettings.display.appBackgroundUrl} opacity={appSettings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.containerDark, { backgroundColor: 'transparent' }]}
      edges={['top']}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* الهيدر */}
      <UniversalHeader
        title={t('widgets.widgetSettingsTitle')}
        titleColor={colors.text}
        rightActions={[{ icon: 'refresh', onPress: handleReset, color: colors.text }]}
        style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}
      />

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
              <Text style={styles.previewTitle}>{t('widgets.widgetPreview')}</Text>
              <Text style={styles.previewSubtitle}>
                {Platform.OS === 'ios' ? 'iOS' : 'Android'} Widget
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* تفعيل الويدجت */}
        <SettingSection
          title={t('widgets.generalSettings')}
          icon="cog"
          index={0}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        >
          <SettingRow
            label={t('widgets.enableWidgets')}
            description={t('widgets.enableWidgetsDesc')}
            value={settings.enabled}
            onValueChange={(value) => updateSettings({ enabled: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
        </SettingSection>

        {/* ويدجت الصلاة */}
        <SettingSection
          title={t('widgets.prayerTimesWidget')}
          icon="mosque"
          index={1}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        >
          <SettingRow
            label={t('widgets.enable')}
            value={settings.prayerWidget.enabled}
            onValueChange={(value) => updatePrayerWidget({ enabled: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
          <SettingRow
            label={t('widgets.showAllPrayers')}
            description={t('widgets.showAllPrayersDesc')}
            value={settings.prayerWidget.showAllPrayers}
            onValueChange={(value) => updatePrayerWidget({ showAllPrayers: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
          <SettingRow
            label={t('widgets.showHijriDate')}
            value={settings.prayerWidget.showHijriDate}
            onValueChange={(value) => updatePrayerWidget({ showHijriDate: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
          <SettingRow
            label={t('widgets.showLocation')}
            value={settings.prayerWidget.showLocation}
            onValueChange={(value) => updatePrayerWidget({ showLocation: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
          <SettingRow
            label={t('widgets.trackPrayerCompletion')}
            description={t('widgets.trackPrayerCompletionDesc')}
            value={settings.prayerWidget.showCompletion}
            onValueChange={(value) => updatePrayerWidget({ showCompletion: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />

          <View style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.settingLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('widgets.accentColor')}
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
          title={t('widgets.azkarWidget')}
          icon="hand-heart"
          index={2}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        >
          <SettingRow
            label={t('widgets.enable')}
            value={settings.azkarWidget.enabled}
            onValueChange={(value) => updateAzkarWidget({ enabled: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
          <SettingRow
            label={t('widgets.showTranslation')}
            description={t('widgets.showTranslationDesc')}
            value={settings.azkarWidget.showTranslation}
            onValueChange={(value) => updateAzkarWidget({ showTranslation: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />

          <View style={[styles.settingRow, { marginTop: 15, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.settingLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('widgets.azkarCategories')}
            </Text>
          </View>
          <CategorySelector
            selectedCategories={settings.azkarWidget.categories}
            onToggle={toggleAzkarCategory}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
        </SettingSection>

        {/* ويدجت التاريخ الهجري */}
        <SettingSection
          title={t('widgets.hijriWidget')}
          icon="calendar-month"
          index={3}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        >
          <SettingRow
            label={t('widgets.enable')}
            value={settings.hijriWidget.enabled}
            onValueChange={(value) => updateHijriWidget({ enabled: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
          <SettingRow
            label={t('widgets.showGregorianDate')}
            description={t('widgets.showGregorianDateDesc')}
            value={settings.hijriWidget.showGregorian}
            onValueChange={(value) => updateHijriWidget({ showGregorian: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
        </SettingSection>

        {/* ويدجت آية اليوم */}
        <SettingSection
          title={t('widgets.verseWidget')}
          icon="book-open-page-variant"
          index={4}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        >
          <SettingRow
            label={t('widgets.enable')}
            value={settings.verseWidget.enabled}
            onValueChange={(value) => updateVerseWidget({ enabled: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
          <SettingRow
            label={t('widgets.showVerseTranslation')}
            description={t('widgets.showVerseTranslationDesc')}
            value={settings.verseWidget.showTranslation}
            onValueChange={(value) => updateVerseWidget({ showTranslation: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
        </SettingSection>

        {/* ويدجت ذكر اليوم */}
        <SettingSection
          title={t('widgets.dhikrWidget')}
          icon="hand-heart"
          index={5}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        >
          <SettingRow
            label={t('widgets.enable')}
            value={settings.dhikrWidget.enabled}
            onValueChange={(value) => updateDhikrWidget({ enabled: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
          <SettingRow
            label={t('widgets.showDhikrTranslation')}
            description={t('widgets.showDhikrTranslationDesc')}
            value={settings.dhikrWidget.showTranslation}
            onValueChange={(value) => updateDhikrWidget({ showTranslation: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
          <SettingRow
            label={t('widgets.showVirtue')}
            description={t('widgets.showVirtueDesc')}
            value={settings.dhikrWidget.showBenefit}
            onValueChange={(value) => updateDhikrWidget({ showBenefit: value })}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
        </SettingSection>

        {/* أزرار الإجراءات */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          style={styles.actionsContainer}
        >
          <TouchableOpacity
            style={[styles.refreshButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleRefreshWidget}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#22C55E" />
            <Text style={styles.refreshButtonText}>{t('widgets.updateWidgetNow')}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ملاحظة */}
        <Animated.View entering={FadeInDown.delay(450).duration(500)}>
          <GlassCard style={styles.noteCard}>
            <View style={[styles.noteHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color="#3a7ca5"
              />
              <Text style={[styles.noteTitle, { color: colors.text }]}>
                {t('widgets.note')}
              </Text>
            </View>
            <Text style={[styles.noteText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('widgets.addToHomeScreen')}:{'\n'}
              {Platform.OS === 'ios'
                ? `• ${t('widgets.addWidgetIosInstructions')}\n• ${t('common.appName')}`
                : `• ${t('widgets.addWidgetIosInstructions')}\n• ${t('common.appName')}`}
            </Text>
          </GlassCard>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* زر الحفظ */}
      {hasChanges && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.saveButtonContainer, { backgroundColor: isDarkMode ? 'rgba(17,21,28,0.95)' : 'rgba(255,255,255,0.95)', borderTopColor: colors.border }]}
        >
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <LinearGradient
              colors={['#22C55E', '#1d4a3a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.saveButtonGradient, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>{t('widgets.saveChanges')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
    </BackgroundWrapper>
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
    fontFamily: fontBold(),
    color: '#fff',
    marginTop: 10,
  },
  previewSubtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  // الأقسام
  section: {
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
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
  },
  // صف الإعداد
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 15,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: fontMedium(),
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: fontRegular(),
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryOptionDark: {
    backgroundColor: '#252540',
  },
  categoryOptionSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E',
  },
  categoryText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontMedium(),
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
    backgroundColor: '#22C55E15',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  refreshButtonText: {
    fontSize: 15,
    fontFamily: fontBold(),
    color: '#22C55E',
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
    fontFamily: fontBold(),
  },
  noteText: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 22,
  },
  // زر الحفظ
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
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
    fontFamily: fontBold(),
    color: '#fff',
  },
  bottomSpace: {
    height: 100,
  },
});