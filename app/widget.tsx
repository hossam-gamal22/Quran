// app/widget.tsx
// Glassify-style widget hub: replaces the old widget-settings.tsx + widgets-gallery.tsx pair.
// Tab 1 = Gallery (real previews of every variant). Tab 2 = Settings (minimal: permissions + how-to + about).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as BackgroundTask from 'expo-background-task';

import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader, NativeTabs } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { guardPremiumFeature } from '@/lib/premium-guard';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { t } from '@/lib/i18n';
import { requestAddWidget } from '@/lib/widget-add-helper';
import { updateWidgetData } from '@/lib/widget-data-bridge';
import {
  DaySimplePreview,
  DayThuluthPreview,
  DayDigitalPreview,
  MonthSimplePreview,
  MonthThuluthPreview,
  MonthElegantEnPreview,
  PrayerSimplePreview,
  PrayerTablePreview,
  PrayerNextPrevPreview,
  VersePreview,
  AzkarMorningPreview,
  AzkarEveningPreview,
  HijriPreview,
  DailyDhikrPreview,
} from '@/components/widgets/previews';
import type { PreviewSize, WidgetDateFormat } from '@/components/widgets/previews/shared';
import { formatDateSample } from '@/components/widgets/previews/shared';

// ────────────────────────────────────────────────────────
// Variant catalogue
// ────────────────────────────────────────────────────────

interface WidgetVariant {
  id: string;
  /** Native widget name on Android (used by requestAddWidget). null = iOS-only. */
  androidWidget: string | null;
  size: PreviewSize;
  Preview: React.FC<{ size: PreviewSize; language?: 'ar' | 'en' }>;
  labelAr: string;
  labelEn: string;
  isPremium: boolean;
  /** Force a specific render language regardless of app locale (e.g. "Month Elegant (En)" stays English in Arabic UI). */
  forcedLanguage?: 'ar' | 'en';
}

interface WidgetSection {
  id: string;
  titleAr: string;
  titleEn: string;
  variants: WidgetVariant[];
}

// Free tier matches lib/android-widget-task-handler.tsx FREE_WIDGET_NAMES.
// Prayer + Hijri (and the new generic Rooh tile / time variants) are free.
// Verse + Dhikr + Azkar are premium.

const SECTIONS_IOS: WidgetSection[] = [
  {
    id: 'dateTime',
    titleAr: 'الوقت والتاريخ',
    titleEn: 'Time & Date',
    variants: [
      { id: 'daySimpleS', androidWidget: null, size: 'small', Preview: DaySimplePreview, labelAr: 'اليوم', labelEn: 'Day Simple', isPremium: false },
      { id: 'daySimpleM', androidWidget: null, size: 'medium', Preview: DaySimplePreview, labelAr: 'اليوم', labelEn: 'Day Simple', isPremium: false },
      { id: 'dayThuluthS', androidWidget: null, size: 'small', Preview: DayThuluthPreview, labelAr: 'اليوم - ثلث', labelEn: 'Day Thuluth', isPremium: false, forcedLanguage: 'ar' },
      { id: 'dayThuluthM', androidWidget: null, size: 'medium', Preview: DayThuluthPreview, labelAr: 'اليوم - ثلث', labelEn: 'Day Thuluth', isPremium: true, forcedLanguage: 'ar' },
      { id: 'dayDigitalS', androidWidget: null, size: 'small', Preview: DayDigitalPreview, labelAr: 'اليوم - رقمي', labelEn: 'Day Digital', isPremium: false },
      { id: 'monthSimpleS', androidWidget: null, size: 'small', Preview: MonthSimplePreview, labelAr: 'الشهر', labelEn: 'Month Simple', isPremium: false },
      { id: 'monthThuluthM', androidWidget: null, size: 'medium', Preview: MonthThuluthPreview, labelAr: 'الشهر - ثلث', labelEn: 'Month Thuluth', isPremium: true, forcedLanguage: 'ar' },
      { id: 'monthElegantM', androidWidget: null, size: 'medium', Preview: MonthElegantEnPreview, labelAr: 'الشهر - أنيق', labelEn: 'Month Elegant (En)', isPremium: true, forcedLanguage: 'en' },
    ],
  },
  {
    id: 'prayer',
    titleAr: 'الصلاة',
    titleEn: 'Prayer',
    variants: [
      { id: 'prayerSimpleS', androidWidget: null, size: 'small', Preview: PrayerSimplePreview, labelAr: 'الصلاة القادمة', labelEn: 'Prayer Simple', isPremium: false },
      { id: 'prayerTableS', androidWidget: null, size: 'small', Preview: PrayerTablePreview, labelAr: 'جدول الصلاة', labelEn: 'Prayer Table', isPremium: false },
      { id: 'prayerTableM', androidWidget: null, size: 'medium', Preview: PrayerTablePreview, labelAr: 'جدول الصلاة', labelEn: 'Prayer Table', isPremium: false },
      { id: 'prayerTableL', androidWidget: null, size: 'large', Preview: PrayerTablePreview, labelAr: 'جدول الصلاة', labelEn: 'Prayer Table', isPremium: false },
      { id: 'prayerNextPrevM', androidWidget: null, size: 'medium', Preview: PrayerNextPrevPreview, labelAr: 'الصلاة السابقة والقادمة', labelEn: 'Next & Previous', isPremium: false },
    ],
  },
  {
    id: 'verse',
    titleAr: 'القرآن',
    titleEn: 'Quran',
    variants: [
      { id: 'verseS', androidWidget: null, size: 'small', Preview: VersePreview, labelAr: 'آية اليوم', labelEn: 'Verse of Day', isPremium: true },
      { id: 'verseM', androidWidget: null, size: 'medium', Preview: VersePreview, labelAr: 'آية اليوم', labelEn: 'Verse of Day', isPremium: true },
      { id: 'verseL', androidWidget: null, size: 'large', Preview: VersePreview, labelAr: 'آية اليوم', labelEn: 'Verse of Day', isPremium: true },
    ],
  },
  {
    id: 'azkar',
    titleAr: 'الأذكار',
    titleEn: 'Adhkar',
    variants: [
      { id: 'azkarMorningS', androidWidget: null, size: 'small', Preview: AzkarMorningPreview, labelAr: 'أذكار الصباح', labelEn: 'Morning Adhkar', isPremium: true },
      { id: 'azkarMorningM', androidWidget: null, size: 'medium', Preview: AzkarMorningPreview, labelAr: 'أذكار الصباح', labelEn: 'Morning Adhkar', isPremium: true },
      { id: 'azkarEveningS', androidWidget: null, size: 'small', Preview: AzkarEveningPreview, labelAr: 'أذكار المساء', labelEn: 'Evening Adhkar', isPremium: true },
      { id: 'azkarEveningM', androidWidget: null, size: 'medium', Preview: AzkarEveningPreview, labelAr: 'أذكار المساء', labelEn: 'Evening Adhkar', isPremium: true },
    ],
  },
];

// On Android, only the variants that map to real registered widgets in
// lib/android-widget-task-handler.tsx are addable. We map them here.
const SECTIONS_ANDROID: WidgetSection[] = [
  {
    id: 'prayer',
    titleAr: 'الصلاة',
    titleEn: 'Prayer',
    variants: [
      { id: 'prayerSmall', androidWidget: 'PrayerTimesSmall', size: 'small', Preview: PrayerSimplePreview, labelAr: 'الصلاة القادمة', labelEn: 'Next Prayer', isPremium: false },
      { id: 'prayerMedium', androidWidget: 'PrayerTimesMedium', size: 'medium', Preview: PrayerSimplePreview, labelAr: 'مواقيت الصلاة', labelEn: 'Prayer Times', isPremium: false },
      { id: 'prayerLarge', androidWidget: 'PrayerTimesLarge', size: 'large', Preview: PrayerTablePreview, labelAr: 'جدول الصلاة الكامل', labelEn: 'Full Prayer Table', isPremium: false },
    ],
  },
  {
    id: 'hijri',
    titleAr: 'التاريخ الهجري',
    titleEn: 'Hijri Date',
    variants: [
      { id: 'hijriSmall', androidWidget: 'HijriDateSmall', size: 'small', Preview: HijriPreview, labelAr: 'الهجري', labelEn: 'Hijri', isPremium: false },
      { id: 'hijriMedium', androidWidget: 'HijriDateMedium', size: 'medium', Preview: HijriPreview, labelAr: 'الهجري', labelEn: 'Hijri', isPremium: false },
    ],
  },
  {
    id: 'verse',
    titleAr: 'آية اليوم',
    titleEn: 'Verse of Day',
    variants: [
      { id: 'verseSmall', androidWidget: 'DailyVerseSmall', size: 'small', Preview: VersePreview, labelAr: 'آية اليوم', labelEn: 'Verse of Day', isPremium: true },
      { id: 'verseMedium', androidWidget: 'DailyVerseMedium', size: 'medium', Preview: VersePreview, labelAr: 'آية اليوم', labelEn: 'Verse of Day', isPremium: true },
    ],
  },
  {
    id: 'dhikr',
    titleAr: 'الذكر اليومي',
    titleEn: 'Daily Dhikr',
    variants: [
      { id: 'dhikrSmall', androidWidget: 'DailyDhikrSmall', size: 'small', Preview: DailyDhikrPreview, labelAr: 'الذكر اليومي', labelEn: 'Daily Dhikr', isPremium: true },
      { id: 'dhikrMedium', androidWidget: 'DailyDhikrMedium', size: 'medium', Preview: DailyDhikrPreview, labelAr: 'الذكر اليومي', labelEn: 'Daily Dhikr', isPremium: true },
    ],
  },
  {
    id: 'azkar',
    titleAr: 'الأذكار',
    titleEn: 'Adhkar',
    variants: [
      { id: 'azkarSmall', androidWidget: 'AzkarProgressSmall', size: 'small', Preview: AzkarMorningPreview, labelAr: 'أذكار', labelEn: 'Adhkar', isPremium: true },
      { id: 'azkarMedium', androidWidget: 'AzkarProgressMedium', size: 'medium', Preview: AzkarMorningPreview, labelAr: 'أذكار', labelEn: 'Adhkar', isPremium: true },
    ],
  },
];

// ────────────────────────────────────────────────────────
// Main screen
// ────────────────────────────────────────────────────────

export default function WidgetHubScreen() {
  const router = useRouter();
  const { settings, isDarkMode } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const { isPremium } = useSubscription();
  const [tab, setTab] = useState<'gallery' | 'settings'>('gallery');
  const [howToOpen, setHowToOpen] = useState(false);

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />

        <UniversalHeader
          title={t('widgetPage.title')}
          titleColor={colors.text}
          rightActions={[
            {
              icon: tab === 'gallery' ? 'cog-outline' : 'view-grid-outline',
              onPress: () => {
                Haptics.selectionAsync();
                setTab(tab === 'gallery' ? 'settings' : 'gallery');
              },
              color: colors.text,
            },
          ]}
        />

        <View style={styles.tabsWrap}>
          <NativeTabs
            tabs={[
              { key: 'gallery', label: t('widgetPage.gallery') },
              { key: 'settings', label: t('widgetPage.settings') },
            ]}
            selected={tab}
            onSelect={(k) => setTab(k as any)}
            indicatorColor={colors.primary}
          />
        </View>

        {tab === 'gallery' ? (
          <GalleryTab
            isRTL={isRTL}
            isPremium={isPremium}
            onAddWidget={(variant) => {
              if (variant.isPremium && !isPremium) {
                if (!guardPremiumFeature('premium_widgets', router, isPremium)) return;
              }
              if (Platform.OS === 'android' && variant.androidWidget) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                requestAddWidget(variant.androidWidget, variant.size === 'large' ? 'medium' : (variant.size as any));
              } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                requestAddWidget(variant.id, 'small');
              }
            }}
          />
        ) : (
          <SettingsTab
            isRTL={isRTL}
            onShowHowTo={() => setHowToOpen(true)}
          />
        )}

        <HowToAddModal visible={howToOpen} onClose={() => setHowToOpen(false)} isRTL={isRTL} />
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ────────────────────────────────────────────────────────
// Gallery tab
// ────────────────────────────────────────────────────────

function GalleryTab({
  isRTL,
  isPremium,
  onAddWidget,
}: {
  isRTL: boolean;
  isPremium: boolean;
  onAddWidget: (variant: WidgetVariant) => void;
}) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const sections = Platform.OS === 'android' ? SECTIONS_ANDROID : SECTIONS_IOS;
  const ar = isRTL;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.galleryScroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.galleryHint, { color: colors.textLight, textAlign: ar ? 'right' : 'left', writingDirection: ar ? 'rtl' : 'ltr' }]}>
        {Platform.OS === 'ios' ? t('widgetPage.iosHint') : t('widgetPage.androidHint')}
      </Text>

      {sections.map((section) => {
        const filtered = ar
          ? section.variants.filter((v) => v.forcedLanguage !== 'en')
          : section.variants;
        const smalls = filtered.filter((v) => v.size === 'small');
        const mediums = filtered.filter((v) => v.size === 'medium');
        const larges = filtered.filter((v) => v.size === 'large');
        const smallPairs: WidgetVariant[][] = [];
        for (let i = 0; i < smalls.length; i += 2) smallPairs.push(smalls.slice(i, i + 2));
        return (
          <View key={section.id} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: ar ? 'right' : 'left', writingDirection: ar ? 'rtl' : 'ltr' }]}>
              {ar ? section.titleAr : section.titleEn}
            </Text>
            <View style={styles.sectionGrid}>
              {smallPairs.map((pair, idx) => (
                <View key={`smalls-${idx}`} style={styles.smallRow}>
                  {pair.map((variant) => (
                    <VariantCard
                      key={variant.id}
                      variant={variant}
                      isPremium={isPremium}
                      onPress={() => onAddWidget(variant)}
                      isRTL={ar}
                    />
                  ))}
                </View>
              ))}
              {mediums.map((variant) => (
                <View key={variant.id} style={styles.fullRow}>
                  <VariantCard variant={variant} isPremium={isPremium} onPress={() => onAddWidget(variant)} isRTL={ar} />
                </View>
              ))}
              {larges.map((variant) => (
                <View key={variant.id} style={styles.fullRow}>
                  <VariantCard variant={variant} isPremium={isPremium} onPress={() => onAddWidget(variant)} isRTL={ar} />
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function VariantCard({
  variant,
  isPremium,
  onPress,
  isRTL,
}: {
  variant: WidgetVariant;
  isPremium: boolean;
  onPress: () => void;
  isRTL: boolean;
}) {
  const colors = useColors();
  const locked = variant.isPremium && !isPremium;
  const Preview = variant.Preview;

  return (
    <View style={cardStyles.cell}>
      <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
        <View>
          <Preview size={variant.size} language={variant.forcedLanguage} />
          {locked ? (
            <View style={cardStyles.crownBadge}>
              <MaterialCommunityIcons name="crown" size={12} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
      </Pressable>
      <Text
        numberOfLines={1}
        style={[
          cardStyles.caption,
          { color: colors.textLight, textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' },
        ]}
      >
        {variant.forcedLanguage === 'en' ? variant.labelEn : isRTL ? variant.labelAr : variant.labelEn}
      </Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    marginBottom: 18,
  },
  caption: {
    fontFamily: fontMedium(),
    fontSize: 13,
    marginTop: 8,
    lineHeight: 20,
  },
  crownBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(212,160,23,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ────────────────────────────────────────────────────────
// Settings tab
// ────────────────────────────────────────────────────────

interface PermissionState {
  background: 'available' | 'restricted' | 'unknown';
  location: 'granted' | 'denied' | 'undetermined';
}

function SettingsTab({
  isRTL,
  onShowHowTo,
}: {
  isRTL: boolean;
  onShowHowTo: () => void;
}) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { settings, updateDisplay } = useSettings();
  const [perms, setPerms] = useState<PermissionState>({ background: 'unknown', location: 'undetermined' });

  useEffect(() => {
    (async () => {
      let background: PermissionState['background'] = 'unknown';
      try {
        const status = await BackgroundTask.getStatusAsync();
        background = status === BackgroundTask.BackgroundTaskStatus.Available ? 'available' : 'restricted';
      } catch {}
      let location: PermissionState['location'] = 'undetermined';
      try {
        const loc = await Location.getForegroundPermissionsAsync();
        location = loc.status === 'granted' ? 'granted' : loc.status === 'denied' ? 'denied' : 'undetermined';
      } catch {}
      setPerms({ background, location });
    })();
  }, []);

  // Persist + push fresh SharedWidgetData → forces iOS WidgetKit/Android
  // glance widgets to re-render with the new theme/language/etc. The
  // updateDisplay call updates the in-app reactive context (so previews
  // change instantly); updateWidgetData() flushes those values to App
  // Group UserDefaults / AsyncStorage so the home-screen widget picks them up.
  const applyWidgetSetting = useCallback(
    async (patch: Parameters<typeof updateDisplay>[0]) => {
      await updateDisplay(patch);
      try {
        await updateWidgetData();
      } catch {}
    },
    [updateDisplay],
  );

  // Live computed sample values for the date-format dropdown — mirrors Glassify
  // (e.g. "٢٠٢٦ / ٠٥ / ٠٩", "09 / 05 / 2026"). Recomputed once per mount.
  const dateFormatOptions = useMemo(() => {
    const today = new Date();
    const variants: Array<{ key: WidgetDateFormat; label: string }> = [
      { key: 'none', label: t('widgetPage.dateFormatNone') },
      { key: 'gregorian-ar', label: formatDateSample(today, 'gregorian-ar') },
      { key: 'hijri-ar', label: formatDateSample(today, 'hijri-ar') },
      { key: 'gregorian-en', label: formatDateSample(today, 'gregorian-en') },
      { key: 'hijri-en', label: formatDateSample(today, 'hijri-en') },
    ];
    return variants;
  }, []);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.settingsScroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Customize — Language is intentionally omitted: widgets always follow the
          app's main language (Arabic UI → Arabic widgets, otherwise English). */}
      <SettingsGroup title={t('widgetPage.customize')} isRTL={isRTL}>
        <WidgetOptionRow
          isRTL={isRTL}
          label={t('widgetPage.dayCalendar')}
          value={settings.display.widgetDayCalendar}
          options={[
            { key: 'auto', label: t('widgetPage.calendarAuto') },
            { key: 'gregorian', label: t('widgetPage.calendarGregorian') },
            { key: 'hijri', label: t('widgetPage.calendarHijri') },
          ]}
          onChange={(v) => applyWidgetSetting({ widgetDayCalendar: v as any })}
        />
        <WidgetOptionRow
          isRTL={isRTL}
          label={t('widgetPage.monthCalendar')}
          value={settings.display.widgetMonthCalendar}
          options={[
            { key: 'auto', label: t('widgetPage.calendarAuto') },
            { key: 'gregorian', label: t('widgetPage.calendarGregorian') },
            { key: 'hijri', label: t('widgetPage.calendarHijri') },
          ]}
          onChange={(v) => applyWidgetSetting({ widgetMonthCalendar: v as any })}
        />
        <WidgetOptionRow
          isRTL={isRTL}
          label={t('widgetPage.dateFormat')}
          value={settings.display.widgetDateFormat}
          options={dateFormatOptions}
          onChange={(v) => applyWidgetSetting({ widgetDateFormat: v as any })}
        />
        <WidgetOptionRow
          isRTL={isRTL}
          label={t('widgetPage.numerals')}
          value={settings.display.widgetNumerals}
          options={[
            { key: 'auto', label: t('widgetPage.numeralsAuto') },
            { key: 'arabic', label: t('widgetPage.numeralsArabic') },
            { key: 'western', label: t('widgetPage.numeralsWestern') },
          ]}
          onChange={(v) => applyWidgetSetting({ widgetNumerals: v as any })}
        />
        <WidgetOptionRow
          isRTL={isRTL}
          label={t('widgetPage.theme')}
          value={settings.display.widgetTheme}
          options={[
            { key: 'auto', label: t('widgetPage.themeAuto') },
            { key: 'dark', label: t('widgetPage.themeDark') },
            { key: 'light', label: t('widgetPage.themeLight') },
            { key: 'olive', label: t('widgetPage.themeOlive') },
            { key: 'green', label: t('widgetPage.themeGreen') },
            { key: 'blue', label: t('widgetPage.themeBlue') },
            { key: 'desert', label: t('widgetPage.themeDesert') },
            { key: 'slate', label: t('widgetPage.themeSlate') },
          ]}
          onChange={(v) => applyWidgetSetting({ widgetTheme: v as any })}
        />
      </SettingsGroup>

      {/* Permissions */}
      <SettingsGroup title={t('widgetPage.permissions')} isRTL={isRTL}>
        <SettingsRow
          isRTL={isRTL}
          label={t('widgetPage.backgroundRefresh')}
          onPress={() => {
            Haptics.selectionAsync();
            Linking.openSettings().catch(() => {});
          }}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PermStatusBadge status={perms.background === 'available' ? 'ok' : perms.background === 'restricted' ? 'warn' : 'pending'} />
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textLight} />
            </View>
          }
        />
        <SettingsRow
          isRTL={isRTL}
          label={t('widgetPage.locationAccess')}
          onPress={() => {
            Haptics.selectionAsync();
            Linking.openSettings().catch(() => {});
          }}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PermStatusBadge status={perms.location === 'granted' ? 'ok' : perms.location === 'denied' ? 'warn' : 'pending'} />
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textLight} />
            </View>
          }
        />
      </SettingsGroup>

      {/* How to add */}
      <SettingsGroup title={t('widgetPage.howToAddTitle')} isRTL={isRTL}>
        <SettingsRow
          isRTL={isRTL}
          label={t('widgetPage.howToAddRow')}
          onPress={onShowHowTo}
          right={<MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textLight} />}
        />
      </SettingsGroup>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function SettingsGroup({ title, children, isRTL }: { title: string; children: React.ReactNode; isRTL: boolean }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
        {title}
      </Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  label,
  right,
  onPress,
  isRTL,
}: {
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isRTL: boolean;
}) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.65}
      style={[
        styles.row,
        { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border },
      ]}
    >
      <Text style={[styles.rowLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
        {label}
      </Text>
      <View>{right}</View>
    </Wrapper>
  );
}

function PermStatusBadge({ status }: { status: 'ok' | 'warn' | 'pending' }) {
  const color = status === 'ok' ? '#22C55E' : status === 'warn' ? '#F59E0B' : 'rgba(150,150,150,0.5)';
  const icon = status === 'ok' ? 'check-circle' : status === 'warn' ? 'alert-circle' : 'circle-outline';
  return <MaterialCommunityIcons name={icon as any} size={20} color={color} />;
}

function WidgetOptionRow({
  isRTL,
  label,
  value,
  options,
  onChange,
}: {
  isRTL: boolean;
  label: string;
  value: string;
  options: { key: string; label: string }[];
  onChange: (key: string) => void;
}) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value) ?? options[0];
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.65}
        onPress={() => {
          Haptics.selectionAsync();
          setOpen(true);
        }}
        style={[
          styles.row,
          { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.rowLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {label}
        </Text>
        <Text style={{ fontFamily: fontMedium(), fontSize: 14, color: colors.primary }}>
          {current.label}
        </Text>
      </TouchableOpacity>
      <OptionPickerModal
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        options={options}
        value={value}
        onChange={(k) => {
          Haptics.selectionAsync();
          onChange(k);
          setOpen(false);
        }}
        isRTL={isRTL}
      />
    </>
  );
}

function OptionPickerModal({
  visible,
  onClose,
  title,
  options,
  value,
  onChange,
  isRTL,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  isRTL: boolean;
}) {
  const colors = useColors();
  const { isDarkMode } = useSettings();
  // Solid (non-translucent) surface so the page behind never bleeds through.
  const cardBg = isDarkMode ? '#1F1F22' : '#FFFFFF';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const divider = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.darkBackdrop} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            modalStyles.pickerCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <Text
            style={[
              modalStyles.pickerTitle,
              { color: colors.text, textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            {title}
          </Text>
          <View style={{ marginTop: 4 }}>
            {options.map((opt, idx) => {
              const selected = opt.key === value;
              const isLast = idx === options.length - 1;
              return (
                <TouchableOpacity
                  key={opt.key}
                  activeOpacity={0.6}
                  onPress={() => onChange(opt.key)}
                  style={[
                    modalStyles.pickerOption,
                    {
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      borderBottomColor: divider,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: selected ? fontSemiBold() : fontMedium(),
                      fontSize: 16,
                      color: selected ? colors.primary : colors.text,
                      textAlign: isRTL ? 'right' : 'left',
                      writingDirection: isRTL ? 'rtl' : 'ltr',
                    }}
                  >
                    {opt.label}
                  </Text>
                  {selected ? (
                    <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────
// How-to-add modal
// ────────────────────────────────────────────────────────

function HowToAddModal({ visible, onClose, isRTL }: { visible: boolean; onClose: () => void; isRTL: boolean }) {
  const colors = useColors();
  const steps = useMemo(
    () =>
      Platform.OS === 'ios'
        ? [t('widgets.widgetStep1'), t('widgets.widgetStep2Ios'), t('widgets.widgetStep3'), t('widgets.widgetStep4Ios'), t('widgets.widgetStep5Ios')]
        : [t('widgets.widgetStep1'), t('widgets.widgetStep2Android'), t('widgets.widgetStep3'), t('widgets.widgetStep4Android')],
    []
  );
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable style={[modalStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
          <Text style={[modalStyles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('widgetPage.howToAddTitle')}
          </Text>
          <View style={{ marginTop: 12 }}>
            {steps.map((step, idx) => (
              <View
                key={idx}
                style={[modalStyles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <View style={[modalStyles.stepBubble, { backgroundColor: colors.primary }]}>
                  <Text style={modalStyles.stepNum}>{idx + 1}</Text>
                </View>
                <Text style={[modalStyles.stepText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
          <TouchableOpacity onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: colors.primary }]}>
            <Text style={modalStyles.closeText}>{t('common.ok')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  /** Stronger backdrop for the picker so the page behind doesn't bleed through. */
  darkBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
  },
  title: {
    fontFamily: fontBold(),
    fontSize: 18,
    lineHeight: 26,
  },
  stepRow: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontFamily: fontBold(),
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  stepText: {
    flex: 1,
    fontFamily: fontMedium(),
    fontSize: 14,
    lineHeight: 22,
  },
  closeBtn: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeText: {
    fontFamily: fontBold(),
    fontSize: 15,
    color: '#FFFFFF',
  },
  pickerCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  pickerTitle: {
    fontFamily: fontBold(),
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
});

// ────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────

const _styles = StyleSheet.create({
  container: { flex: 1 },
  tabsWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  scrollView: { flex: 1 },
  galleryScroll: { paddingHorizontal: 16, paddingTop: 8 },
  galleryHint: {
    fontFamily: fontRegular(),
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 16,
  },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: fontBold(),
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 14,
  },
  sectionGrid: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
  },
  smallRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  fullRow: {
    alignItems: 'center',
  },
  // Settings
  settingsScroll: { paddingHorizontal: 16, paddingTop: 12 },
  group: { marginBottom: 18 },
  groupTitle: {
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 8,
    paddingHorizontal: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fontMedium(),
    fontSize: 15,
    lineHeight: 22,
  },
  rowValue: {
    fontFamily: fontMedium(),
    fontSize: 14,
  },
});
