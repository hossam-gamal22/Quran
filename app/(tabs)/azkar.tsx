import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, DarkColors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/app';

// استيراد API الأذكار الجديد
import AzkarAPI, {
  getAllCategories,
  getAzkarByCategory,
  getCategoryName,
  getCategoryCompletionPercentage,
  AzkarCategory,
  AzkarCategoryType,
  Language,
} from '../../lib/azkar-api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// أيقونات الفئات
// ============================================

const CATEGORY_ICONS: Record<AzkarCategoryType, string> = {
  morning: 'sunny',
  evening: 'moon',
  sleep: 'bed',
  wakeup: 'alarm',
  after_prayer: 'checkmark-done',
  quran_duas: 'book',
  sunnah_duas: 'heart',
  ruqya: 'shield-checkmark',
};

// ============================================
// المكون الرئيسي
// ============================================

export default function AzkarScreen() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<AzkarCategory[]>([]);
  const [language, setLanguage] = useState<Language>('ar');
  const [isLoading, setIsLoading] = useState(true);
  
  // الأنيميشن
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      await Promise.all([
        loadSettings(),
        loadCategories(),
        loadProgress(),
      ]);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error initializing screen:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setDarkMode(parsed.darkMode ?? false);
        setViewMode(parsed.azkarViewMode ?? 'grid');
        setLanguage(parsed.language ?? 'ar');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const allCategories = getAllCategories();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProgress = async () => {
    try {
      const progressData: Record<string, number> = {};
      const allCategories = getAllCategories();
      
      for (const category of allCategories) {
        const percentage = await getCategoryCompletionPercentage(category.id);
        if (percentage > 0) {
          progressData[category.id] = percentage;
        }
      }
      
      setProgress(progressData);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const currentColors = darkMode ? DarkColors : Colors;

  const shareCategory = async (category: AzkarCategory) => {
    const categoryName = getCategoryName(category, language);
    const azkarCount = getAzkarByCategory(category.id).length;
    const shareText = `📿 ${categoryName}\n${azkarCount} أذكار\n\n${APP_CONFIG.getShareSignature()}`;
    
    try {
      await Share.share({ message: shareText });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const navigateToCategory = (categoryId: AzkarCategoryType) => {
    router.push(`/azkar/${categoryId}` as any);
  };

  // ============================================
  // عرض الشبكة
  // ============================================

  const renderGridItem = (category: AzkarCategory, index: number) => {
    const categoryName = getCategoryName(category, language);
    const azkarCount = getAzkarByCategory(category.id).length;
    const icon = CATEGORY_ICONS[category.id] || 'apps';
    
    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.gridItem, { backgroundColor: currentColors.surface }]}
        onPress={() => navigateToCategory(category.id)}
        onLongPress={() => shareCategory(category)}
        activeOpacity={0.7}
      >
        <View style={[styles.gridIconContainer, { backgroundColor: category.color + '15' }]}>
          <Ionicons name={icon as any} size={32} color={category.color} />
        </View>
        
        <Text style={[styles.gridTitle, { color: currentColors.text }]} numberOfLines={2}>
          {categoryName}
        </Text>
        
        <Text style={[styles.gridCount, { color: currentColors.textLight }]}>
          {azkarCount} {language === 'ar' ? 'ذكر' : 'items'}
        </Text>
        
        {/* شريط التقدم */}
        {progress[category.id] !== undefined && progress[category.id] > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress[category.id]}%`, backgroundColor: category.color }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: category.color }]}>
              {progress[category.id]}%
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ============================================
  // عرض القائمة
  // ============================================

  const renderListItem = (category: AzkarCategory) => {
    const categoryName = getCategoryName(category, language);
    const azkarCount = getAzkarByCategory(category.id).length;
    const icon = CATEGORY_ICONS[category.id] || 'apps';
    
    // وصف الفئة حسب النوع
    const getSubtitle = (): string => {
      const subtitles: Record<AzkarCategoryType, Record<Language, string>> = {
        morning: {
          ar: 'تقال بعد صلاة الفجر حتى طلوع الشمس',
          en: 'Said after Fajr prayer until sunrise',
          fr: 'Dit après la prière du Fajr jusqu\'au lever du soleil',
          ur: 'فجر کی نماز کے بعد سورج طلوع ہونے تک',
          id: 'Dibaca setelah shalat Subuh hingga matahari terbit',
          tr: 'Sabah namazından güneş doğana kadar okunur',
          de: 'Nach dem Fajr-Gebet bis zum Sonnenaufgang',
          hi: 'फज्र की नमाज़ के बाद सूर्योदय तक',
          bn: 'ফজরের নামাজের পর সূর্যোদয় পর্যন্ত',
          ms: 'Dibaca selepas solat Subuh hingga matahari terbit',
          ru: 'Читается после утренней молитвы до восхода солнца',
          es: 'Se dice después del Fajr hasta la salida del sol',
        },
        evening: {
          ar: 'تقال بعد صلاة العصر حتى غروب الشمس',
          en: 'Said after Asr prayer until sunset',
          fr: 'Dit après la prière d\'Asr jusqu\'au coucher du soleil',
          ur: 'عصر کی نماز کے بعد سورج غروب ہونے تک',
          id: 'Dibaca setelah shalat Ashar hingga matahari terbenam',
          tr: 'İkindi namazından güneş batana kadar okunur',
          de: 'Nach dem Asr-Gebet bis zum Sonnenuntergang',
          hi: 'अस्र की नमाज़ के बाद सूर्यास्त तक',
          bn: 'আসরের নামাজের পর সূর্যাস্ত পর্যন্ত',
          ms: 'Dibaca selepas solat Asar hingga matahari terbenam',
          ru: 'Читается после послеполуденной молитвы до заката',
          es: 'Se dice después del Asr hasta la puesta del sol',
        },
        sleep: {
          ar: 'تقال قبل النوم',
          en: 'Said before sleeping',
          fr: 'Dit avant de dormir',
          ur: 'سونے سے پہلے',
          id: 'Dibaca sebelum tidur',
          tr: 'Uyumadan önce okunur',
          de: 'Vor dem Schlafen',
          hi: 'सोने से पहले',
          bn: 'ঘুমানোর আগে',
          ms: 'Dibaca sebelum tidur',
          ru: 'Читается перед сном',
          es: 'Se dice antes de dormir',
        },
        wakeup: {
          ar: 'تقال عند الاستيقاظ من النوم',
          en: 'Said upon waking up',
          fr: 'Dit au réveil',
          ur: 'نیند سے بیدار ہونے پر',
          id: 'Dibaca saat bangun tidur',
          tr: 'Uyanınca okunur',
          de: 'Beim Aufwachen',
          hi: 'जागने पर',
          bn: 'ঘুম থেকে উঠে',
          ms: 'Dibaca ketika bangun tidur',
          ru: 'Читается при пробуждении',
          es: 'Se dice al despertar',
        },
        after_prayer: {
          ar: 'تقال بعد السلام من الصلاة المفروضة',
          en: 'Said after obligatory prayers',
          fr: 'Dit après les prières obligatoires',
          ur: 'فرض نماز کے بعد',
          id: 'Dibaca setelah shalat wajib',
          tr: 'Farz namazlardan sonra okunur',
          de: 'Nach den Pflichtgebeten',
          hi: 'फर्ज नमाज़ के बाद',
          bn: 'ফরজ নামাজের পর',
          ms: 'Dibaca selepas solat fardhu',
          ru: 'Читается после обязательных молитв',
          es: 'Se dice después de las oraciones obligatorias',
        },
        quran_duas: {
          ar: 'أدعية مأثورة من القرآن الكريم',
          en: 'Supplications from the Holy Quran',
          fr: 'Invocations du Saint Coran',
          ur: 'قرآن کریم سے دعائیں',
          id: 'Doa-doa dari Al-Quran',
          tr: 'Kur\'an-ı Kerim\'den dualar',
          de: 'Bittgebete aus dem Heiligen Koran',
          hi: 'पवित्र कुरान से दुआएं',
          bn: 'পবিত্র কুরআন থেকে দোয়া',
          ms: 'Doa-doa dari Al-Quran',
          ru: 'Мольбы из Священного Корана',
          es: 'Súplicas del Sagrado Corán',
        },
        sunnah_duas: {
          ar: 'أدعية مأثورة من السنة النبوية',
          en: 'Supplications from the Prophetic Sunnah',
          fr: 'Invocations de la Sunna prophétique',
          ur: 'سنت نبوی سے دعائیں',
          id: 'Doa-doa dari Sunnah Nabi',
          tr: 'Peygamber Sünnetinden dualar',
          de: 'Bittgebete aus der prophetischen Sunna',
          hi: 'पैगंबर की सुन्नत से दुआएं',
          bn: 'নবীর সুন্নাহ থেকে দোয়া',
          ms: 'Doa-doa dari Sunnah Nabi',
          ru: 'Мольбы из пророческой Сунны',
          es: 'Súplicas de la Sunna profética',
        },
        ruqya: {
          ar: 'آيات وأدعية الرقية الشرعية',
          en: 'Ruqyah verses and supplications',
          fr: 'Versets et invocations de Ruqya',
          ur: 'رقیہ شرعیہ کی آیات اور دعائیں',
          id: 'Ayat dan doa ruqyah syar\'iyyah',
          tr: 'Rukye ayetleri ve duaları',
          de: 'Ruqya-Verse und Bittgebete',
          hi: 'रुक़्या की आयतें और दुआएं',
          bn: 'রুকইয়াহ আয়াত ও দোয়া',
          ms: 'Ayat dan doa ruqyah syar\'iyyah',
          ru: 'Аяты и мольбы рукья',
          es: 'Versículos y súplicas de Ruqyah',
        },
      };
      
      return subtitles[category.id]?.[language] || subtitles[category.id]?.ar || '';
    };
    
    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.listItem, { backgroundColor: currentColors.surface }]}
        onPress={() => navigateToCategory(category.id)}
        onLongPress={() => shareCategory(category)}
        activeOpacity={0.7}
      >
        <View style={[styles.listIconContainer, { backgroundColor: category.color + '15' }]}>
          <Ionicons name={icon as any} size={28} color={category.color} />
        </View>
        
        <View style={styles.listContent}>
          <Text style={[styles.listTitle, { color: currentColors.text }]}>{categoryName}</Text>
          <Text style={[styles.listSubtitle, { color: currentColors.textLight }]} numberOfLines={1}>
            {getSubtitle()}
          </Text>
          <Text style={[styles.listCount, { color: category.color }]}>
            {azkarCount} {language === 'ar' ? 'ذكر' : 'items'}
          </Text>
          
          {/* شريط التقدم */}
          {progress[category.id] !== undefined && progress[category.id] > 0 && (
            <View style={styles.listProgressContainer}>
              <View style={styles.listProgressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progress[category.id]}%`, backgroundColor: category.color }
                  ]} 
                />
              </View>
              <Text style={[styles.listProgressText, { color: category.color }]}>
                {progress[category.id]}%
              </Text>
            </View>
          )}
        </View>
        
        <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
      </TouchableOpacity>
    );
  };

  // ============================================
  // إحصائيات سريعة
  // ============================================

  const renderStats = () => {
    const stats = AzkarAPI.getAzkarStats();
    
    return (
      <View style={[styles.statsContainer, { backgroundColor: currentColors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: currentColors.primary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: currentColors.textLight }]}>
            {language === 'ar' ? 'إجمالي الأذكار' : 'Total Azkar'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: currentColors.primary }]}>{stats.categoriesCount}</Text>
          <Text style={[styles.statLabel, { color: currentColors.textLight }]}>
            {language === 'ar' ? 'الأقسام' : 'Categories'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: currentColors.primary }]}>{stats.languagesSupported}</Text>
          <Text style={[styles.statLabel, { color: currentColors.textLight }]}>
            {language === 'ar' ? 'لغة' : 'Languages'}
          </Text>
        </View>
      </View>
    );
  };

  // ============================================
  // العرض
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* الهيدر */}
      <View style={[styles.header, { backgroundColor: currentColors.surface }]}>
        <TouchableOpacity 
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Ionicons 
            name={viewMode === 'grid' ? 'list' : 'grid'} 
            size={22} 
            color={currentColors.text} 
          />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>
          {language === 'ar' ? 'الأذكار' : 'Azkar'}
        </Text>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/tasbih')}
        >
          <Ionicons name="radio-button-on" size={22} color={currentColors.primary} />
        </TouchableOpacity>
      </View>

      {/* المحتوى */}
      <Animated.ScrollView 
        style={[styles.content, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}
      >
        {/* بانر علوي */}
        <View style={[styles.banner, { backgroundColor: currentColors.primary }]}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>📿 {language === 'ar' ? 'حافظ على أذكارك' : 'Keep your Azkar'}</Text>
            <Text style={styles.bannerSubtitle}>
              {language === 'ar' 
                ? '"من قال سبحان الله وبحمده في يوم مائة مرة حُطت خطاياه"'
                : '"Whoever says SubhanAllah wa bihamdihi 100 times, his sins will be forgiven"'}
            </Text>
          </View>
        </View>

        {/* الإحصائيات */}
        {renderStats()}

        {/* قائمة الأذكار */}
        {viewMode === 'grid' ? (
          <View style={styles.gridWrapper}>
            {categories.map((category, index) => renderGridItem(category, index))}
          </View>
        ) : (
          categories.map(renderListItem)
        )}

        {/* روابط سريعة */}
        <View style={styles.quickLinks}>
          <Text style={[styles.quickLinksTitle, { color: currentColors.text }]}>
            {language === 'ar' ? 'المزيد' : 'More'}
          </Text>
          
          <View style={styles.quickLinksRow}>
            <TouchableOpacity 
              style={[styles.quickLinkItem, { backgroundColor: currentColors.surface }]}
              onPress={() => router.push('/tasbih')}
            >
              <Ionicons name="radio-button-on" size={24} color="#8B5CF6" />
              <Text style={[styles.quickLinkText, { color: currentColors.text }]}>
                {language === 'ar' ? 'التسبيح' : 'Tasbih'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickLinkItem, { backgroundColor: currentColors.surface }]}
              onPress={() => navigateToCategory('ruqya')}
            >
              <Ionicons name="shield-checkmark" size={24} color="#EF4444" />
              <Text style={[styles.quickLinkText, { color: currentColors.text }]}>
                {language === 'ar' ? 'الرقية' : 'Ruqyah'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickLinkItem, { backgroundColor: currentColors.surface }]}
              onPress={() => router.push('/names')}
            >
              <Ionicons name="sparkles" size={24} color="#D4AF37" />
              <Text style={[styles.quickLinkText, { color: currentColors.text }]}>
                {language === 'ar' ? 'أسماء الله' : 'Names'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ============================================
// الأنماط
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
  },
  viewModeButton: {
    padding: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  banner: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerContent: {
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  bannerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  // Grid styles
  gridContainer: {
    paddingBottom: Spacing.xl,
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    ...Shadows.sm,
  },
  gridIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  gridTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  gridCount: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  progressContainer: {
    width: '100%',
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginTop: 4,
  },
  // List styles
  listContainer: {
    paddingBottom: Spacing.xl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  listIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  listTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    textAlign: 'right',
  },
  listSubtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    textAlign: 'right',
  },
  listCount: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  listProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  listProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  listProgressText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    minWidth: 35,
  },
  // Quick links
  quickLinks: {
    marginTop: Spacing.lg,
  },
  quickLinksTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  quickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickLinkItem: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xs,
    ...Shadows.sm,
  },
  quickLinkText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
    marginTop: Spacing.sm,
  },
});
