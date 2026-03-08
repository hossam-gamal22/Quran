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
  I18nManager,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

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

const CATEGORIES: WidgetCategory[] = [
  {
    id: 'prayer',
    title: 'مواقيت الصلاة',
    icon: 'mosque',
    gradient: ['#2f7659', '#1d4a3a'],
    deepLink: 'rooh-almuslim://prayer',
    description: 'يعرض جميع مواقيت الصلاة مع تحديد القادمة وإمكانية تسجيل الإكمال',
  },
  {
    id: 'ayah',
    title: 'آية اليوم',
    icon: 'book-open-page-variant',
    gradient: ['#1e3a5f', '#2f7659'],
    deepLink: 'rooh-almuslim://daily-ayah',
    description: 'يعرض آية يومية متجددة مع اسم السورة ورقم الآية',
  },
  {
    id: 'dhikr',
    title: 'ذكر اليوم',
    icon: 'hand-heart',
    gradient: ['#5d4e8c', '#7c3aed'],
    deepLink: 'rooh-almuslim://azkar',
    description: 'يعرض ذكراً يومياً متجدداً مع فضله وعدد التكرار',
  },
  {
    id: 'azkar',
    title: 'أدعية وأذكار',
    icon: 'star-crescent',
    gradient: ['#4c1d95', '#5b21b6'],
    deepLink: 'rooh-almuslim://azkar/morning',
    description: 'يعرض أذكار وأدعية متنوعة تتجدد تلقائياً',
  },
  {
    id: 'hijri',
    title: 'التاريخ الهجري',
    icon: 'calendar-month',
    gradient: ['#92400e', '#b45309'],
    deepLink: 'rooh-almuslim://hijri',
    description: 'يعرض التاريخ الهجري مع التاريخ الميلادي',
  },
];

const WIDGET_PREVIEW_SIZE = {
  small: { width: 160, height: 160 },
  medium: { width: SCREEN_WIDTH - 80, height: 160 },
};

// -- Helpers --

function handleAddWidget() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  if (Platform.OS === 'ios') {
    Alert.alert(
      'إضافة ويدجت',
      'اضغط مطولاً على الشاشة الرئيسية ← (+) ← ابحث عن روح المسلم',
      [{ text: 'حسناً', style: 'default' }],
    );
  } else {
    Alert.alert('إضافة ويدجت', 'تم طلب إضافة الويدجت', [
      { text: 'حسناً', style: 'default' },
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
  return (
    <>
      <MaterialCommunityIcons
        name="book-open-page-variant"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <Text style={[styles.previewArabic, size === 'small' && styles.previewArabicSmall]}>
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </Text>
      <Text style={[styles.previewArabicSub, size === 'small' && styles.previewArabicSubSmall]}>
        الفاتحة - آية ١
      </Text>
      <Text style={styles.previewLabel}>آية اليوم</Text>
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
  const prayers = [
    { name: 'الفجر', time: '٤:٣٠', done: true },
    { name: 'الظهر', time: '١٢:١٥', done: false, isNext: true },
    { name: 'العصر', time: '٣:٤٥', done: false },
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
            الظهر
          </Text>
          <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 20, color: '#fff' }}>
            ١٢:١٥ م
          </Text>
          <Text style={styles.previewLabel}>الصلاة القادمة</Text>
        </>
      ) : (
        <View style={{ width: '100%', gap: 4 }}>
          {prayers.map((p) => (
            <View key={p.name} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons
                  name={p.done ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={14}
                  color={p.done ? '#4CAF50' : p.isNext ? '#FFD700' : 'rgba(255,255,255,0.5)'}
                />
                <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 13, color: p.isNext ? '#FFD700' : p.done ? 'rgba(255,255,255,0.5)' : '#fff' }}>
                  {p.name}
                </Text>
              </View>
              <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: p.isNext ? '#FFD700' : p.done ? 'rgba(255,255,255,0.5)' : '#fff' }}>
                {p.time}
              </Text>
            </View>
          ))}
          <Text style={styles.previewLabel}>مواقيت الصلاة</Text>
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
  return (
    <>
      <MaterialCommunityIcons
        name="hand-heart"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <Text style={[styles.previewArabic, size === 'small' && styles.previewArabicSmall]}>
        سبحان الله وبحمده
      </Text>
      <Text style={[styles.previewArabicSub, size === 'small' && styles.previewArabicSubSmall]}>
        ٣ مرات
      </Text>
      <Text style={styles.previewLabel}>ذكر اليوم</Text>
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
  return (
    <>
      <MaterialCommunityIcons
        name="hand-heart"
        size={size === 'small' ? 18 : 22}
        color="rgba(255,255,255,0.5)"
        style={styles.previewIcon}
      />
      <Text style={[styles.previewArabic, size === 'small' && styles.previewArabicSmall]}>
        سبحان الله وبحمده
      </Text>
      <Text style={[styles.previewArabicSub, size === 'small' && styles.previewArabicSubSmall]}>
        سبحان الله العظيم
      </Text>
      <Text style={styles.previewLabel}>أذكار</Text>
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
        رمضان 1447
      </Text>
      <Text style={styles.previewLabel}>التاريخ الهجري</Text>
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ayah');
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('small');

  const activeCategory = CATEGORIES.find((c) => c.id === activeTab) ?? CATEGORIES[0];

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'}
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>معرض الويدجت</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Horizontal widget thumbnails */}
      <Animated.View entering={FadeInRight.duration(500).delay(100)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailsContainer}
        >
          {CATEGORIES.map((cat) => (
            <WidgetThumbnail
              key={cat.id}
              category={cat}
              isSelected={activeTab === cat.id}
              onPress={() => onTabPress(cat.id)}
            />
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
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons
                name={activeCategory.icon as any}
                size={22}
                color="#3d9970"
              />
              <Text style={styles.cardTitle}>{activeCategory.title}</Text>
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

          <Text style={styles.cardDescription}>{activeCategory.description}</Text>

          {/* Size pills */}
          <View style={styles.sizePills}>
            <TouchableOpacity
              onPress={() => onSizeChange('small')}
              style={[styles.pill, selectedSize === 'small' && styles.pillActive]}
            >
              <Text style={[styles.pillText, selectedSize === 'small' && styles.pillTextActive]}>
                صغير
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSizeChange('medium')}
              style={[styles.pill, selectedSize === 'medium' && styles.pillActive]}
            >
              <Text style={[styles.pillText, selectedSize === 'medium' && styles.pillTextActive]}>
                متوسط
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
              style={styles.addButtonGradient}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
              <Text style={styles.addButtonText}>إضافة للشاشة الرئيسية</Text>
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
            style={styles.bottomLink}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="cog-outline" size={18} color="#3d9970" />
            <Text style={styles.bottomLinkText}>إعدادات الويدجت</Text>
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
              size={18}
              color="rgba(255,255,255,0.3)"
            />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// -- Styles --

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
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
    marginTop: 4,
    lineHeight: 26,
  },
  previewArabicSubSmall: {
    fontSize: 13,
    lineHeight: 22,
  },
  previewLabel: {
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Medium',
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
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
