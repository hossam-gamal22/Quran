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
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import { WIDGET_THEMES, type WidgetTheme } from '@/components/widgets/android/shared';
import { guardPremiumFeature } from '@/lib/premium-guard';
import GlassCard from '@/components/ui/GlassCard';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { AppIcon } from '@/components/ui/AppIcon';
import { useSubscription } from '@/contexts/SubscriptionContext';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { UniversalHeader } from '@/components/ui';
// ========================================
// الثوابت
// ========================================

const ACCENT_COLORS = [
  { nameKey: 'widget.green', value: '#0d8e62' },
  { nameKey: 'widget.blue', value: '#3a7ca5' },
  { nameKey: 'widget.purple', value: '#5d4e8c' },
  { nameKey: 'widget.orange', value: '#c17f59' },
  { nameKey: 'widget.red', value: '#c0392b' },
  { nameKey: 'widget.gold', value: '#d4a017' },
];

const AZKAR_CATEGORIES = [
  { key: '1', nameKey: 'widget.morningAzkar', icon: 'weather-sunset-up' },
  { key: '1b', nameKey: 'widget.eveningAzkar', icon: 'weather-night' },
  { key: '2', nameKey: 'widget.sleepAzkar', icon: 'weather-night' },
  { key: '3', nameKey: 'widget.wakeupAzkar', icon: 'white-balance-sunny' },
  { key: '27', nameKey: 'widget.afterPrayerAzkar', icon: '🤲' },
  { key: '26', nameKey: 'widget.miscAzkar', icon: 'book-open-variant' },
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <View style={[styles.section, { backgroundColor: colors.card, elevation: colors.cardElevation ?? 2 }]}>
        <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}>
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={colors.text}
          />
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <View style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.settingInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.settingLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.settingDescription, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
        trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
        thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
        ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
      />
    </View>
  );
};

interface StylePickerProps {
  options: { key: string; label: string; subtitle?: string }[];
  selected: string;
  onSelect: (key: string) => void;
  isRTL?: boolean;
}

const StylePicker: React.FC<StylePickerProps> = ({ options, selected, onSelect, isRTL }) => {
  const colors = useColors();
  return (
    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
      {options.map((opt) => {
        const active = selected === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(opt.key);
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: active ? '#0d8e62' : colors.border,
              backgroundColor: active ? '#0d8e6222' : colors.surface,
            }}
          >
            <Text style={{ color: colors.text, fontFamily: 'Cairo-SemiBold', fontSize: 13, textAlign: 'center' }}>{opt.label}</Text>
            {opt.subtitle ? (
              <Text style={{ color: colors.textLight, fontFamily: 'Cairo-Regular', fontSize: 10, textAlign: 'center', marginTop: 2 }}>{opt.subtitle}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
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
                !isSelected && { backgroundColor: colors.surface },
                isSelected && styles.categoryOptionSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle(category.key);
              }}
            >
              <AppIcon name={category.icon} size={20} color={isSelected ? '#fff' : colors.icon} />
              <Text
                style={[
                  styles.categoryText,
                  { color: isSelected ? '#fff' : colors.text },
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
  const { isPremium } = useSubscription();
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

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
    let changed = false;
    setSettings((prev) => {
      const categories = prev.azkarWidget.categories.includes(category)
        ? prev.azkarWidget.categories.filter((c) => c !== category)
        : [...prev.azkarWidget.categories, category];

      // يجب اختيار فئة واحدة على الأقل
      if (categories.length === 0) {
        Alert.alert(t('common.warning'), t('widgets.selectAtLeastOneCategory'));
        return prev;
      }

      changed = true;
      return {
        ...prev,
        azkarWidget: { ...prev.azkarWidget, categories },
      };
    });
    if (changed) setHasChanges(true);
  }, []);

  // حفظ الإعدادات
  const handleSave = async () => {
    try {
      await saveWidgetSettings(settings);
      await requestWidgetUpdate();
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.savedSuccess'), t('widgets.settingsSaved'));
    } catch (error) {
      console.warn('⚠️ Widget settings save failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('widgets.settingsSaveFailed'));
    }
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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (hasChanges) {
        await saveWidgetSettings(settings);
        setHasChanges(false);
      }
      await requestWidgetUpdate();
      Alert.alert(t('common.success'), t('widgets.widgetUpdated'));
    } catch (error) {
      console.warn('⚠️ Widget refresh failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('widgets.widgetUpdateFailed'));
    }
  };

  return (
    <BackgroundWrapper backgroundKey={appSettings.display.appBackground} backgroundUrl={appSettings.display.appBackgroundUrl} opacity={appSettings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      edges={['top']}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

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

        {/* مظهر الويدجت — Premium Theme Picker */}
        <SettingSection
          title={t('widgets.widgetTheme')}
          icon="palette"
          index={1}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        >
          <View style={styles.themePicker}>
            {WIDGET_THEMES.map((theme) => {
              const isSelected = settings.widgetTheme === theme.id;
              const isLocked = theme.isPremium && !isPremium;
              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeOption,
                    isSelected && styles.themeOptionSelected,
                  ]}
                  onPress={() => {
                    if (isLocked) {
                      guardPremiumFeature('widget_themes', router, isPremium);
                      return;
                    }
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateSettings({ widgetTheme: theme.id });
                  }}
                >
                  <LinearGradient
                    colors={[theme.gradient.from, theme.gradient.to]}
                    style={styles.themePreview}
                  >
                    <Text style={[styles.themePreviewText, { color: theme.textColor }]}>
                      بِسْمِ اللَّهِ
                    </Text>
                    {isLocked && (
                      <View style={styles.themeLockBadge}>
                        <MaterialCommunityIcons name="crown" size={12} color="#f0c654" />
                      </View>
                    )}
                    {isSelected && (
                      <View style={[styles.themeCheckBadge, { backgroundColor: theme.accentColor }]}>
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      </View>
                    )}
                  </LinearGradient>
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isSelected ? colors.primary : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {isRTL ? theme.nameAr : theme.nameEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SettingSection>

        {/* ويدجت الصلاة */}
        <SettingSection
          title={t('widgets.prayerTimesWidget')}
          icon="mosque"
          index={2}
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

          <View style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.settingLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isRTL ? 'تصميم الويدجت المتوسط (4×2)' : 'Medium widget design (4×2)'}
            </Text>
          </View>
          <StylePicker
            isRTL={isRTL}
            selected={settings.prayerWidget.style ?? 'pair'}
            onSelect={(key) => updatePrayerWidget({ style: key as 'pair' | 'table' | 'banner' })}
            options={[
              { key: 'pair', label: isRTL ? 'ثنائي' : 'Pair', subtitle: isRTL ? 'وقت + اسم' : 'Time + Name' },
              { key: 'table', label: isRTL ? 'جدول' : 'Table', subtitle: isRTL ? '٥ صلوات' : '5 prayers' },
              { key: 'banner', label: isRTL ? 'لافتتان' : 'Banner', subtitle: isRTL ? 'بطاقتان' : 'Two cards' },
            ]}
          />

          <View style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.settingLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isRTL ? 'تصميم الويدجت الصغير (2×2)' : 'Small widget design (2×2)'}
            </Text>
          </View>
          <StylePicker
            isRTL={isRTL}
            selected={settings.prayerWidget.smallStyle ?? 'compact'}
            onSelect={(key) => updatePrayerWidget({ smallStyle: key as 'compact' | 'simple' })}
            options={[
              { key: 'compact', label: isRTL ? 'مدمج' : 'Compact', subtitle: isRTL ? 'اسم + وقت + عداد' : 'Name + Time + Timer' },
              { key: 'simple', label: isRTL ? 'بسيط' : 'Simple', subtitle: isRTL ? 'وقت + اسم' : 'Time + Name' },
            ]}
          />
        </SettingSection>

        {/* ويدجت الأذكار */}
        <SettingSection
          title={t('widgets.azkarWidget')}
          icon="hand-heart"
          index={3}
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
            <Text style={[styles.settingLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
          index={4}
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
          index={5}
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
          index={6}
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
            <MaterialCommunityIcons name="refresh" size={20} color="#0d8e62" />
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
            <Text style={[styles.noteText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('widgets.addToHomeScreen')}:{'\n'}
              {Platform.OS === 'ios'
                ? `• ${t('widgets.addWidgetIosInstructions')}\n• ${t('common.appName')}`
                : `• ${t('widgets.addWidgetAndroidInstructions')}\n• ${t('common.appName')}`}
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
              colors={['#0d8e62', '#1d4a3a']}
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

const _styles = StyleSheet.create({
  container: {
    flex: 1,
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
    lineHeight: 30,
    includeFontPadding: false,
  },
  previewSubtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 28,
    includeFontPadding: false,
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
    lineHeight: 26,
    includeFontPadding: false,
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 20,
    includeFontPadding: false,
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
  categoryOptionSelected: {
    borderColor: '#0d8e62',
    backgroundColor: '#0d8e62',
  },
  categoryText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 24,
    includeFontPadding: false,
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
    backgroundColor: '#0d8e6215',
    borderWidth: 2,
    borderColor: '#0d8e62',
  },
  refreshButtonText: {
    fontSize: 15,
    fontFamily: fontBold(),
    color: '#0d8e62',
    lineHeight: 26,
    includeFontPadding: false,
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
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 28,
    includeFontPadding: false,
  },
  // اختيار المظهر
  themePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 5,
  },
  themeOption: {
    width: '30%' as any,
    alignItems: 'center' as const,
  },
  themeOptionSelected: {
    // handled by themeCheckBadge
  },
  themePreview: {
    width: '100%' as any,
    aspectRatio: 1.3,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
  themePreviewText: {
    fontSize: 14,
    fontFamily: fontBold(),
    includeFontPadding: false,
  },
  themeLockBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  themeCheckBadge: {
    position: 'absolute' as const,
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  themeLabel: {
    fontSize: 11,
    fontFamily: fontMedium(),
    textAlign: 'center' as const,
    marginTop: 5,
    includeFontPadding: false,
  },
  bottomSpace: {
    height: 100,
  },
});
