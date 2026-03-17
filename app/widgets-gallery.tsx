// app/widgets-gallery.tsx
// Widgets Gallery screen — showcases 3 categories of home-screen widgets

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
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
import { t, getLanguage } from '@/lib/i18n';
import { UniversalHeader } from '@/components/ui';
import { toWesternNumerals, getSurahEnglishName } from '@/lib/quran-evidence';

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
    gradient: ['#2f7659', '#1d4a3a'],
    deepLink: 'rooh-almuslim://prayer',
    description: t('widgets.prayerTimesDesc'),
  },
  {
    id: 'ayah',
    title: t('widgets.dailyAyahTitle'),
    icon: 'book-open-page-variant',
    gradient: ['#1e3a5f', '#2f7659'],
    deepLink: 'rooh-almuslim://daily-ayah',
    description: t('widgets.dailyAyahDesc'),
  },
  {
    id: 'dhikr',
    title: t('widgets.dailyDhikrTitle'),
    icon: 'hand-heart',
    gradient: ['#5d4e8c', '#7c3aed'],
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

// -- Helpers --

function handleAddWidget() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  if (Platform.OS === 'ios') {
    Alert.alert(
      t('widgets.addWidget'),
      t('widgets.addWidgetIosInstructions'),
      [{ text: t('common.ok'), style: 'default' }],
    );
  } else {
    Alert.alert(t('widgets.addWidget'), t('widgets.addWidgetRequested'), [
      { text: t('common.ok'), style: 'default' },
    ]);
  }
}

// -- Sub-components --

function AyahPreview({ size }: { size: WidgetSize }) {
  const dims = WIDGET_PREVIEW_SIZE[size];
  return (
    <LinearGradient
      colors={['#1e3a5f', '#2f7659']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.widgetPreview, { width: dims.width, height: dims.height }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
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
  const lang = getLanguage();
  const isAr = lang === 'ar';
  const surahRef = isAr ? 'الفاتحة - آية ١' : `${getSurahEnglishName(1)} - ${t('quran.verseOfDay')} 1`;
  return (
    <>
      <MaterialCommunityIcons
        name="book-open-page-variant"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <Text
        style={[styles.previewArabic, size === 'small' && styles.previewArabicSmall, !isAr && { fontSize: size === 'small' ? 11 : 13, lineHeight: size === 'small' ? 16 : 18 }]}
        numberOfLines={size === 'small' ? 3 : 4}
      >
        {isAr
          ? 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'
          : 'In the name of Allāh, the Entirely Merciful, the Especially Merciful.'}
      </Text>
      <Text style={[styles.previewArabicSub, size === 'small' && styles.previewArabicSubSmall, !isAr && { fontSize: size === 'small' ? 9 : 11, lineHeight: size === 'small' ? 14 : 16 }]}>
        {surahRef}
      </Text>
      <Text style={styles.previewLabel}>{t('widgets.dailyAyahTitle')}</Text>
    </>
  );
}

function PrayerPreview({ size }: { size: WidgetSize }) {
  const dims = WIDGET_PREVIEW_SIZE[size];
  return (
    <LinearGradient
      colors={['#2f7659', '#1d4a3a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.widgetPreview, { width: dims.width, height: dims.height }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
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
  const isRTL = useIsRTL();
  const lang = getLanguage();
  const isAr = lang === 'ar';
  const prayers = [
    { name: t('prayer.fajr'), time: isAr ? '٤:٣٠' : '4:30', done: true },
    { name: t('prayer.dhuhr'), time: isAr ? '١٢:١٥' : '12:15', done: false, isNext: true },
    { name: t('prayer.asr'), time: isAr ? '٣:٤٥' : '3:45', done: false },
  ];
  return (
    <>
      <MaterialCommunityIcons
        name="mosque"
        size={size === 'small' ? 16 : 20}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      {size === 'small' ? (
        <>
          <Text style={[styles.previewArabic, styles.previewArabicSmall]}>
            {t('prayer.dhuhr')}
          </Text>
          <Text style={{ fontFamily: fontBold(), fontSize: 20, color: '#fff' }}>
            {isAr ? '١٢:١٥ م' : '12:15 PM'}
          </Text>
          <Text style={styles.previewLabel}>{t('widgets.nextPrayer')}</Text>
        </>
      ) : (
        <View style={{ width: '100%', gap: 4 }}>
          {prayers.map((p) => (
            <View key={p.name} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons
                  name={p.done ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={14}
                  color={p.done ? '#4CAF50' : p.isNext ? '#FFD700' : 'rgba(255,255,255,0.5)'}
                />
                <Text style={{ fontFamily: fontMedium(), fontSize: 13, color: p.isNext ? '#FFD700' : p.done ? 'rgba(255,255,255,0.5)' : '#fff' }}>
                  {p.name}
                </Text>
              </View>
              <Text style={{ fontFamily: fontRegular(), fontSize: 12, color: p.isNext ? '#FFD700' : p.done ? 'rgba(255,255,255,0.5)' : '#fff' }}>
                {p.time}
              </Text>
            </View>
          ))}
          <Text style={styles.previewLabel}>{t('widgets.prayerTimesTitle')}</Text>
        </View>
      )}
    </>
  );
}

function DhikrPreview({ size }: { size: WidgetSize }) {
  const dims = WIDGET_PREVIEW_SIZE[size];
  return (
    <LinearGradient
      colors={['#5d4e8c', '#7c3aed']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.widgetPreview, { width: dims.width, height: dims.height }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
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
  const lang = getLanguage();
  const isAr = lang === 'ar';
  return (
    <>
      <MaterialCommunityIcons
        name="hand-heart"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <Text style={[styles.previewArabic, size === 'small' && styles.previewArabicSmall]}>
        {isAr ? 'سبحان الله وبحمده' : 'SubhanAllah wa bihamdihi'}
      </Text>
      <Text style={[styles.previewArabicSub, size === 'small' && styles.previewArabicSubSmall]}>
        {isAr ? '٣ مرات' : `3 ${t('azkar.times')}`}
      </Text>
      <Text style={styles.previewLabel}>{t('widgets.dailyDhikrTitle')}</Text>
    </>
  );
}

function AzkarPreview({ size }: { size: WidgetSize }) {
  const dims = WIDGET_PREVIEW_SIZE[size];
  return (
    <LinearGradient
      colors={['#4c1d95', '#5b21b6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.widgetPreview, { width: dims.width, height: dims.height }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
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
  const lang = getLanguage();
  const isAr = lang === 'ar';
  return (
    <>
      <MaterialCommunityIcons
        name="hand-heart"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <Text style={[styles.previewArabic, size === 'small' && styles.previewArabicSmall]}>
        {isAr ? 'سبحان الله وبحمده' : 'SubhanAllah wa bihamdihi'}
      </Text>
      <Text style={[styles.previewArabicSub, size === 'small' && styles.previewArabicSubSmall]}>
        {isAr ? 'سبحان الله العظيم' : 'SubhanAllah al-Azeem'}
      </Text>
      <Text style={styles.previewLabel}>{t('widgets.azkarTitle')}</Text>
    </>
  );
}

function HijriPreview({ size }: { size: WidgetSize }) {
  const dims = WIDGET_PREVIEW_SIZE[size];
  return (
    <LinearGradient
      colors={['#92400e', '#b45309']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.widgetPreview, { width: dims.width, height: dims.height }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
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
  const lang = getLanguage();
  const isAr = lang === 'ar';
  return (
    <>
      <MaterialCommunityIcons
        name="calendar-month"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <Text style={[styles.hijriDay, size === 'small' && styles.hijriDaySmall]}>15</Text>
      <Text style={[styles.hijriMonth, size === 'small' && styles.hijriMonthSmall]}>
        {isAr ? 'رمضان ١٤٤٧' : 'Ramadan 1447'}
      </Text>
      <Text style={styles.previewLabel}>{t('widgets.hijriTitle')}</Text>
    </>
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
}: {
  category: WidgetCategory;
  isSelected: boolean;
  onPress: () => void;
}) {
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
    </TouchableOpacity>
  );
}

// -- Main Screen --

export default function WidgetsGalleryScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { settings } = useSettings();
  const categories = getCategories();
  const [activeTab, setActiveTab] = useState('ayah');
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('small');

  const activeCategory = categories.find((c) => c.id === activeTab) ?? categories[0];

  const onTabPress = useCallback((id: string) => {
    Haptics.selectionAsync();
    setActiveTab(id);
  }, []);

  const onSizeChange = useCallback((size: WidgetSize) => {
    Haptics.selectionAsync();
    setSelectedSize(size);
  }, []);

  const PreviewComponent = PREVIEW_MAP[activeCategory.id];

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      {/* Header */}
      <UniversalHeader
        title={t('widgets.galleryTitle')}
        titleColor="#fff"
        backColor="#fff"
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
                color="#3d9970"
              />
              <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{activeCategory.title}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/widget-settings');
              }}
              hitSlop={12}
              style={styles.gearButton}
            >
              <MaterialCommunityIcons name="cog" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{activeCategory.description}</Text>

          {/* Size pills */}
          <View style={[styles.sizePills, { flexDirection: 'row' }]}>
            <TouchableOpacity
              onPress={() => onSizeChange('small')}
              style={[styles.pill, selectedSize === 'small' && styles.pillActive]}
            >
              <Text style={[styles.pillText, selectedSize === 'small' && styles.pillTextActive]}>
                {t('widgets.sizeSmall')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSizeChange('medium')}
              style={[styles.pill, selectedSize === 'medium' && styles.pillActive]}
            >
              <Text style={[styles.pillText, selectedSize === 'medium' && styles.pillTextActive]}>
                {t('widgets.sizeMedium')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add button */}
          <TouchableOpacity
            onPress={handleAddWidget}
            activeOpacity={0.8}
            style={styles.addButton}
          >
            <LinearGradient
              colors={['#2f7659', '#3d9970']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.addButtonGradient, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
              <Text style={styles.addButtonText}>{t('widgets.addToHomeScreen')}</Text>
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
            <MaterialCommunityIcons name="cog-outline" size={18} color="#3d9970" />
            <Text style={[styles.bottomLinkText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.widgetSettings')}</Text>
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-left' : 'chevron-right'}
              size={18}
              color="rgba(255,255,255,0.3)"
            />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

// -- Styles --

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
    borderColor: '#22C55E',
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
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
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 4,
    lineHeight: 26,
  },
  previewArabicSubSmall: {
    fontSize: 13,
    lineHeight: 22,
  },
  previewLabel: {
    fontFamily: fontRegular(),
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    position: 'absolute',
    bottom: 8,
    left: 12,
  },

  // Hijri-specific
  hijriDay: {
    fontFamily: 'Amiri',
    fontSize: 42,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 48,
  },
  hijriDaySmall: {
    fontSize: 32,
    lineHeight: 38,
  },
  hijriMonth: {
    fontFamily: 'Amiri',
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 2,
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
  },
  gearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDescription: {
    fontFamily: fontRegular(),
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: {
    backgroundColor: 'rgba(61,153,112,0.2)',
    borderColor: 'rgba(61,153,112,0.5)',
  },
  pillText: {
    fontFamily: fontMedium(),
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
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
    color: 'rgba(255,255,255,0.6)',
  },
});
