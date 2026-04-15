// app/widgets-gallery.tsx
// Widgets Gallery screen — showcases 3 categories of home-screen widgets

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { t, getLanguage } from '@/lib/i18n';
import { UniversalHeader } from '@/components/ui';
import { getSurahEnglishName } from '@/lib/quran-evidence';
import { DarkColors } from '@/constants/theme';
import { getLocalizedHijriDate } from '@/lib/hijri-date';
import { getCachedPrayerTimes, getNextPrayer, formatPrayerTime } from '@/lib/prayer-times';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { guardPremiumFeature } from '@/lib/premium-guard';
import { prepareVerseWidgetData, prepareDhikrWidgetData, prepareAzkarWidgetData, getWidgetSettings } from '@/lib/widget-data';
import type { VerseWidgetData, DhikrWidgetData, WidgetAzkarData } from '@/lib/widget-data';
import { requestAddWidget } from '@/lib/widget-add-helper';
import { getWidgetTheme, type WidgetTheme } from '@/components/widgets/android/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// -- Types --

type WidgetSize = 'small' | 'medium';

interface WidgetCategory {
  id: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  gradient: [string, string, ...string[]];
  deepLink: string;
  description: string;
}

// -- Constants --

function getCategories(): WidgetCategory[] {
  return [
  {
    id: 'prayer',
    title: t('widgets.prayerTimesTitle'),
    icon: 'mosque',
    gradient: ['#0d8e62', '#1d4a3a'],
    deepLink: 'rooh-almuslim://prayer',
    description: t('widgets.prayerTimesDesc'),
  },
  {
    id: 'ayah',
    title: t('widgets.dailyAyahTitle'),
    icon: 'book-open-page-variant',
    gradient: ['#1e3a5f', '#0d8e62'],
    deepLink: 'rooh-almuslim://daily-ayah',
    description: t('widgets.dailyAyahDesc'),
  },
  {
    id: 'dhikr',
    title: t('widgets.dailyDhikrTitle'),
    icon: 'hand-heart',
    gradient: ['#4a3d73', '#7c3aed'],
    deepLink: 'rooh-almuslim://azkar',
    description: t('widgets.dailyDhikrDesc'),
  },
  {
    id: 'azkar',
    title: t('widgets.azkarTitle'),
    icon: 'star-crescent',
    gradient: ['#4c1d95', '#5b21b6'],
    deepLink: 'rooh-almuslim://azkar/morning',
    description: t('widgets.azkarDesc'),
  },
  {
    id: 'hijri',
    title: t('widgets.hijriTitle'),
    icon: 'calendar-month',
    gradient: ['#92400e', '#b45309'],
    deepLink: 'rooh-almuslim://hijri',
    description: t('widgets.hijriDesc'),
  },
];
}

const WIDGET_PREVIEW_SIZE = {
  small: { width: 160, height: 160 },
  medium: { width: SCREEN_WIDTH - 80, height: 160 },
};

// Free widgets available to all users
const FREE_WIDGET_IDS = ['prayer'];

// Theme gradient context — lets preview components use the user's widget theme
const GalleryThemeContext = React.createContext<[string, string, ...string[]] | null>(null);
function useGalleryGradient(fallback: [string, string, ...string[]]): [string, string, ...string[]] {
  const ctx = React.useContext(GalleryThemeContext);
  return ctx || fallback;
}

// -- Sub-components --

function AyahPreview({ size }: { size: WidgetSize }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const dims = WIDGET_PREVIEW_SIZE[size];
  const gradient = useGalleryGradient(['#1e3a5f', '#0d8e62']);
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.widgetPreview, { width: dims.width, height: dims.height }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint={"systemThickMaterialDark" as any} style={StyleSheet.absoluteFill}>
          <View style={styles.previewContent}>
            <AyahPreviewText size={size} />
          </View>
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidOverlay]}>
          <View style={styles.previewContent}>
            <AyahPreviewText size={size} />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

function AyahPreviewText({ size }: { size: WidgetSize }) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const styles = useScaledStyles(_styles, colors.fs);
  const lang = getLanguage();
  const isAr = lang === 'ar';

  // Fetch real daily verse data with fallback
  const [verseData, setVerseData] = React.useState<VerseWidgetData | null>(null);
  React.useEffect(() => {
    prepareVerseWidgetData(lang).then(setVerseData).catch(() => {});
  }, [lang]);

  const arabicText = verseData?.arabic || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
  const surahRef = verseData
    ? (isAr
        ? `${verseData.surahName} - آية ${verseData.numberInSurah}`
        : `${verseData.surahNameEn} - ${t('quran.verseOfDay')} ${verseData.numberInSurah}`)
    : (isAr ? 'الفاتحة - آية ١' : `${getSurahEnglishName(1)} - ${t('quran.verseOfDay')} 1`);

  return (
    <View style={{ flex: 1, width: '100%' }}>
      <MaterialCommunityIcons
        name="book-open-page-variant"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingTop: 26 }}>
        <Text
          style={[styles.previewArabic, size === 'small' && styles.previewArabicSmall, !isAr && { fontSize: size === 'small' ? 11 : 13, lineHeight: size === 'small' ? 16 : 18 }]}
          numberOfLines={size === 'small' ? 3 : 4}
        >
          {arabicText}
        </Text>
        <Text style={[styles.previewArabicSub, size === 'small' && styles.previewArabicSubSmall, !isAr && { fontSize: size === 'small' ? 9 : 11, lineHeight: size === 'small' ? 14 : 16 }]} numberOfLines={1}>
          {surahRef}
        </Text>
      </View>
      <Text style={styles.previewLabel}>{t('widgets.dailyAyahTitle')}</Text>
    </View>
  );
}

function PrayerPreview({ size }: { size: WidgetSize }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const dims = WIDGET_PREVIEW_SIZE[size];
  const gradient = useGalleryGradient(['#0d8e62', '#1d4a3a']);
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.widgetPreview, { width: dims.width, height: dims.height }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint={"systemThickMaterialDark" as any} style={StyleSheet.absoluteFill}>
          <View style={styles.previewContent}>
            <PrayerPreviewText size={size} />
          </View>
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidOverlay]}>
          <View style={styles.previewContent}>
            <PrayerPreviewText size={size} />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

function PrayerPreviewText({ size }: { size: WidgetSize }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const lang = getLanguage();
  const isAr = lang === 'ar';

  // Dynamic prayer data
  const [cachedTimes, setCachedTimes] = React.useState<any>(null);
  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0]!;
    getCachedPrayerTimes(today).then(times => { if (times) setCachedTimes(times); });
  }, []);
  const nextPrayer = cachedTimes ? getNextPrayer(cachedTimes) : null;

  const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const displayPrayers = PRAYER_KEYS.slice(0, 3).map(key => {
    const time = cachedTimes ? (cachedTimes[key] || '') : '';
    const isNext = nextPrayer?.name === key;
    const now = new Date();
    let done = false;
    if (time && !isNext) {
      const [h, m] = time.split(':').map(Number);
      const pDate = new Date(); pDate.setHours(h, m, 0, 0);
      done = now > pDate;
    }
    return { name: t(`prayer.${key}`), time: time ? formatPrayerTime(time, false) : '--:--', done, isNext };
  });
  return (
    <View style={{ flex: 1, width: '100%' }}>
      <MaterialCommunityIcons
        name="mosque"
        size={size === 'small' ? 16 : 20}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      {size === 'small' ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 26 }}>
          <Text style={[styles.previewArabic, styles.previewArabicSmall]}>
            {nextPrayer ? t(`prayer.${nextPrayer.name}`) : t('prayer.dhuhr')}
          </Text>
          <Text style={{ fontFamily: fontBold(), fontSize: 20, color: '#fff' }}>
            {nextPrayer ? formatPrayerTime(nextPrayer.time, false) : '--:--'}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', width: '100%', gap: 4, paddingTop: 26 }}>
          {displayPrayers.map((p) => (
            <View key={p.name} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons
                  name={p.done ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={14}
                  color={p.done ? '#4CAF50' : p.isNext ? '#FFD700' : 'rgba(255,255,255,0.5)'}
                />
                <Text style={{ fontFamily: fontMedium(), fontSize: 12, color: p.isNext ? '#FFD700' : p.done ? 'rgba(255,255,255,0.5)' : '#fff' }}>
                  {p.name}
                </Text>
              </View>
              <Text style={{ fontFamily: fontRegular(), fontSize: 11, color: p.isNext ? '#FFD700' : p.done ? 'rgba(255,255,255,0.5)' : '#fff' }}>
                {p.time}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.previewLabel}>{size === 'small' ? t('widgets.nextPrayer') : t('widgets.prayerTimesTitle')}</Text>
    </View>
  );
}

function DhikrPreview({ size }: { size: WidgetSize }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const dims = WIDGET_PREVIEW_SIZE[size];
  const gradient = useGalleryGradient(['#4a3d73', '#7c3aed']);
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.widgetPreview, { width: dims.width, height: dims.height }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint={"systemThickMaterialDark" as any} style={StyleSheet.absoluteFill}>
          <View style={styles.previewContent}>
            <DhikrPreviewText size={size} />
          </View>
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidOverlay]}>
          <View style={styles.previewContent}>
            <DhikrPreviewText size={size} />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

function DhikrPreviewText({ size }: { size: WidgetSize }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const lang = getLanguage();
  const isAr = lang === 'ar';

  // Fetch real daily dhikr data with fallback
  const [dhikrData, setDhikrData] = React.useState<DhikrWidgetData | null>(null);
  React.useEffect(() => {
    prepareDhikrWidgetData(lang).then(setDhikrData).catch(() => {});
  }, [lang]);

  const dhikrText = dhikrData?.arabic || (isAr ? 'سبحان الله وبحمده' : 'SubhanAllah wa bihamdihi');
  const countText = dhikrData
    ? (isAr ? `${dhikrData.count} ${dhikrData.timesLabel || t('azkar.times')}` : `${dhikrData.count} ${dhikrData.timesLabel || t('azkar.times')}`)
    : (isAr ? '٣ مرات' : `3 ${t('azkar.times')}`);

  return (
    <View style={{ flex: 1, width: '100%' }}>
      <MaterialCommunityIcons
        name="hand-heart"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingTop: 26 }}>
        <Text
          style={[styles.previewArabic, size === 'small' && styles.previewArabicSmall]}
          numberOfLines={size === 'small' ? 3 : 4}
        >
          {dhikrText}
        </Text>
        <Text style={[styles.previewArabicSub, size === 'small' && styles.previewArabicSubSmall]} numberOfLines={1}>
          {countText}
        </Text>
      </View>
      <Text style={styles.previewLabel}>{t('widgets.dailyDhikrTitle')}</Text>
    </View>
  );
}

function AzkarPreview({ size }: { size: WidgetSize }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const dims = WIDGET_PREVIEW_SIZE[size];
  const gradient = useGalleryGradient(['#4c1d95', '#5b21b6']);
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.widgetPreview, { width: dims.width, height: dims.height }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint={"systemThickMaterialDark" as any} style={StyleSheet.absoluteFill}>
          <View style={styles.previewContent}>
            <AzkarPreviewText size={size} />
          </View>
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidOverlay]}>
          <View style={styles.previewContent}>
            <AzkarPreviewText size={size} />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

function AzkarPreviewText({ size }: { size: WidgetSize }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const lang = getLanguage();
  const isAr = lang === 'ar';

  // Fetch real azkar data with fallback
  const [azkarData, setAzkarData] = React.useState<WidgetAzkarData | null>(null);
  React.useEffect(() => {
    prepareAzkarWidgetData(lang).then(setAzkarData).catch(() => {});
  }, [lang]);

  const zikrText = azkarData?.randomZikr?.text || (isAr ? 'سبحان الله وبحمده' : 'SubhanAllah wa bihamdihi');
  const subText = azkarData?.randomZikr
    ? (azkarData.randomZikr.categoryName || (isAr ? 'أذكار' : 'Adhkar'))
    : (isAr ? 'سبحان الله العظيم' : 'SubhanAllah al-Azeem');

  return (
    <View style={{ flex: 1, width: '100%' }}>
      <MaterialCommunityIcons
        name="hand-heart"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingTop: 26 }}>
        <Text
          style={[styles.previewArabic, size === 'small' && styles.previewArabicSmall]}
          numberOfLines={size === 'small' ? 3 : 4}
        >
          {zikrText}
        </Text>
        <Text style={[styles.previewArabicSub, size === 'small' && styles.previewArabicSubSmall]} numberOfLines={1}>
          {subText}
        </Text>
      </View>
      <Text style={styles.previewLabel}>{t('widgets.azkarTitle')}</Text>
    </View>
  );
}

function HijriPreview({ size }: { size: WidgetSize }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const dims = WIDGET_PREVIEW_SIZE[size];
  const gradient = useGalleryGradient(['#92400e', '#b45309']);
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.widgetPreview, { width: dims.width, height: dims.height }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint={"systemThickMaterialDark" as any} style={StyleSheet.absoluteFill}>
          <View style={styles.previewContent}>
            <HijriPreviewText size={size} />
          </View>
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidOverlay]}>
          <View style={styles.previewContent}>
            <HijriPreviewText size={size} />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

function HijriPreviewText({ size }: { size: WidgetSize }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const lang = getLanguage();
  const isAr = lang === 'ar';
  const hijri = React.useMemo(() => {
    try { return getLocalizedHijriDate(); } catch { return null; }
  }, []);
  return (
    <View style={{ flex: 1, width: '100%' }}>
      <MaterialCommunityIcons
        name="calendar-month"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 24 }}>
        <Text style={[styles.hijriDay, size === 'small' && styles.hijriDaySmall]}>{hijri ? String(hijri.day) : '1'}</Text>
        <Text style={[styles.hijriMonth, size === 'small' && styles.hijriMonthSmall]}>
          {hijri ? `${hijri.monthName} ${hijri.year}` : (isAr ? 'محرم 1447' : 'Muharram 1447')}
        </Text>
      </View>
      <Text style={styles.previewLabel}>{t('widgets.hijriTitle')}</Text>
    </View>
  );
}

const PREVIEW_MAP: Record<string, React.FC<{ size: WidgetSize }>> = {
  prayer: PrayerPreview,
  ayah: AyahPreview,
  dhikr: DhikrPreview,
  azkar: AzkarPreview,
  hijri: HijriPreview,
};

// -- Widget Thumbnail --

function WidgetThumbnail({
  category,
  isSelected,
  onPress,
  isLocked,
}: {
  category: WidgetCategory;
  isSelected: boolean;
  onPress: () => void;
  isLocked?: boolean;
}) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const PreviewComponent = PREVIEW_MAP[category.id];
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.thumbnail,
        isSelected
          ? styles.thumbnailSelected
          : styles.thumbnailUnselected,
      ]}
    >
      {PreviewComponent && <PreviewComponent size="small" />}
      {isLocked && (
        <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 4 }}>
          <MaterialCommunityIcons name="lock" size={12} color="#f59e0b" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// -- Main Screen --

export default function WidgetsGalleryScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { settings } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { isPremium } = useSubscription();
  const categories = getCategories();
  const [activeTab, setActiveTab] = useState('prayer');
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('small');
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme | null>(null);

  useEffect(() => {
    getWidgetSettings().then(s => {
      setWidgetTheme(getWidgetTheme(s.widgetTheme));
    }).catch(() => {});
  }, []);

  const activeCategory = categories.find((c) => c.id === activeTab) ?? categories[0];
  const isActiveWidgetLocked = !isPremium && !FREE_WIDGET_IDS.includes(activeCategory.id);

  const onTabPress = useCallback((id: string) => {
    Haptics.selectionAsync();
    setActiveTab(id);
  }, []);

  const onSizeChange = useCallback((size: WidgetSize) => {
    Haptics.selectionAsync();
    setSelectedSize(size);
  }, []);

  const PreviewComponent = PREVIEW_MAP[activeCategory.id];

  const themeGradient: [string, string, ...string[]] | null = widgetTheme
    ? [widgetTheme.gradient.from, widgetTheme.gradient.to]
    : null;

  return (
    <GalleryThemeContext.Provider value={themeGradient}>
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      {/* Header */}
      <UniversalHeader
        title={t('widgets.galleryTitle')}
        titleColor={colors.text}
        backColor={colors.text}
      />

      {/* Horizontal widget thumbnails */}
      <Animated.View entering={FadeInRight.duration(500).delay(100)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailsContainer}
          style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
        >
          {categories.map((cat) => (
            <View key={cat.id} style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>
              <WidgetThumbnail
                category={cat}
                isSelected={activeTab === cat.id}
                onPress={() => onTabPress(cat.id)}
                isLocked={!isPremium && !FREE_WIDGET_IDS.includes(cat.id)}
              />
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Selected widget detail */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Large preview */}
        <Animated.View
          key={activeCategory.id}
          entering={FadeInDown.duration(400).springify()}
          style={styles.largePreviewArea}
        >
          {PreviewComponent && <PreviewComponent size={selectedSize} />}
        </Animated.View>

        {/* Info */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.detailInfo}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.cardTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons
                name={activeCategory.icon as any}
                size={22}
                color="#0d8e62"
              />
              <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{activeCategory.title}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/widget-settings');
              }}
              hitSlop={12}
              style={styles.gearButton}
            >
              <MaterialCommunityIcons name="cog" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardDescription, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{activeCategory.description}</Text>

          {/* Size pills */}
          <View style={[styles.sizePills, { flexDirection: 'row' }]}>
            <TouchableOpacity
              onPress={() => onSizeChange('small')}
              style={[styles.pill, selectedSize === 'small' && styles.pillActive]}
            >
              <Text style={[styles.pillText, { color: selectedSize === 'small' ? colors.text : colors.textLight }]}>
                {t('widgets.sizeSmall')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSizeChange('medium')}
              style={[styles.pill, selectedSize === 'medium' && styles.pillActive]}
            >
              <Text style={[styles.pillText, { color: selectedSize === 'medium' ? colors.text : colors.textLight }]}>
                {t('widgets.sizeMedium')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add button */}
          <TouchableOpacity
            onPress={() => {
              if (isActiveWidgetLocked) {
                guardPremiumFeature('premium_widgets', router, isPremium);
                return;
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              requestAddWidget(activeCategory.id, selectedSize);
            }}
            activeOpacity={0.8}
            style={styles.addButton}
          >
            <LinearGradient
              colors={isActiveWidgetLocked ? ['rgba(13,142,98,0.5)', 'rgba(13,142,98,0.5)'] : ['#0d8e62', '#0d8e62']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.addButtonGradient, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <MaterialCommunityIcons name={isActiveWidgetLocked ? 'lock' : 'plus-circle-outline'} size={20} color="#fff" />
              <Text style={styles.addButtonText}>
                {isActiveWidgetLocked ? t('subscription.upgradeToPremium') : t('widgets.addToHomeScreen')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom link */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/widget-settings');
            }}
            style={[styles.bottomLink, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="cog-outline" size={18} color="#0d8e62" />
            <Text style={[styles.bottomLinkText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.widgetSettings')}</Text>
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-left' : 'chevron-right'}
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
    </BackgroundWrapper>
    </GalleryThemeContext.Provider>
  );
}

// -- Styles --

const _styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkColors.background,
  },


  // Tabs – replaced by thumbnail strip
  thumbnailsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  thumbnail: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  thumbnailSelected: {
    borderWidth: 2,
    borderColor: '#0d8e62',
    opacity: 1,
  },
  thumbnailUnselected: {
    borderWidth: 0,
    opacity: 0.7,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Large preview (shown for selected widget)
  largePreviewArea: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },

  // Detail info (below large preview)
  detailInfo: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },

  // Widget Preview
  widgetPreview: {
    borderRadius: 20,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 20px rgba(0,0,0,0.4)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 8,
        }),
  },
  androidOverlay: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  previewContent: {
    flex: 1,
  },
  previewIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  previewArabic: {
    fontFamily: 'Amiri',
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 30,
  },
  previewArabicSmall: {
    fontSize: 15,
    lineHeight: 24,
  },
  previewArabicSub: {
    fontFamily: 'Amiri',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 2,
    lineHeight: 22,
  },
  previewArabicSubSmall: {
    fontSize: 11,
    lineHeight: 18,
  },
  previewLabel: {
    fontFamily: fontRegular(),
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 14,
    includeFontPadding: false,
    paddingBottom: 6,
    paddingHorizontal: 10,
  },

  // Hijri-specific
  hijriDay: {
    fontFamily: 'Amiri',
    fontSize: 38,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 44,
    includeFontPadding: false,
  },
  hijriDaySmall: {
    fontSize: 26,
    lineHeight: 32,
  },
  hijriMonth: {
    fontFamily: 'Amiri',
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 30,
    includeFontPadding: false,
  },
  hijriMonthSmall: {
    fontSize: 14,
  },

  // Card Info
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: fontBold(),
    fontSize: 18,
    color: '#fff',
    lineHeight: 30,
    includeFontPadding: false,
  },
  gearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(128,128,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDescription: {
    fontFamily: fontRegular(),
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 16,
  },

  // Size pills
  sizePills: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
  },
  pillActive: {
    backgroundColor: 'rgba(61,153,112,0.2)',
    borderColor: 'rgba(61,153,112,0.5)',
  },
  pillText: {
    fontFamily: fontMedium(),
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 22,
    includeFontPadding: false,
  },
  pillTextActive: {
    color: '#fff',
  },

  // Add button
  addButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addButtonText: {
    fontFamily: fontBold(),
    fontSize: 15,
    color: '#fff',
    lineHeight: 26,
    includeFontPadding: false,
  },

  // Bottom link
  bottomLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  bottomLinkText: {
    fontFamily: fontMedium(),
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
    includeFontPadding: false,
  },
});
// Module-level alias for sub-components; main component shadows with useScaledStyles
const styles = _styles;
