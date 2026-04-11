// app/seasonal/mawlid.tsx
// صفحة ذكرى المولد النبوي - روح المسلم

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useSettings, useTranslation } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { getLanguage } from '@/lib/i18n';
// theme constants removed — using useColors() hook instead
import TranslatedText from '@/components/ui/TranslatedText';

// ========================================
// الثوابت
// ========================================

const MAWLID_COLOR = '#2E8B57';
const MAWLID_GRADIENT = ['#2E8B57', '#1D5A3A'];

const PROPHET_INFO = {
  name: 'محمد ﷺ',
  fullName: 'محمد بن عبدالله بن عبدالمطلب',
  birthDate: '12 ربيع الأول',
  birthPlace: 'مكة المكرمة',
  birthYear: 'عام الفيل (570م تقريباً)',
};

const PROPHET_NAMES = [
  { name: 'محمد', meaning: 'المحمود في السماء والأرض' },
  { name: 'أحمد', meaning: 'أكثر الناس حمداً لله' },
  { name: 'الماحي', meaning: 'الذي يمحو الله به الكفر' },
  { name: 'الحاشر', meaning: 'يُحشر الناس على قدمه' },
  { name: 'العاقب', meaning: 'آخر الأنبياء' },
  { name: 'المقفّي', meaning: 'الذي جاء بعد الأنبياء' },
];

const PROPHET_QUALITIES = [
  { icon: 'account-heart', title: 'الرحمة', description: 'وما أرسلناك إلا رحمة للعالمين' },
  { icon: 'shield-check', title: 'الصدق', description: 'كان يُلقّب بالصادق الأمين' },
  { icon: 'hand-heart', title: 'الكرم', description: 'أجود الناس وأكرمهم' },
  { icon: 'meditation', title: 'التواضع', description: 'كان أشد الناس تواضعاً' },
  { icon: 'emoticon-happy', title: 'البشاشة', description: 'كان بسّاماً ضحّاكاً' },
  { icon: 'arm-flex', title: 'الشجاعة', description: 'أشجع الناس قلباً' },
];

const SALAWAT = [
  {
    id: 'ibrahimiyah',
    title: 'الصلاة الإبراهيمية',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
    virtue: 'أفضل صيغ الصلاة على النبي ﷺ',
  },
  {
    id: 'short',
    title: 'الصلاة المختصرة',
    arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    virtue: 'من صلى عليّ صلاة صلى الله عليه بها عشراً',
  },
  {
    id: 'salam',
    title: 'السلام على النبي',
    arabic: 'السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ',
    virtue: 'من التشهد في الصلاة',
  },
];

const RECOMMENDED_ACTIONS = [
  { id: 'salawat', icon: 'heart', title: 'الإكثار من الصلاة على النبي ﷺ', color: '#e91e63' },
  { id: 'seerah', icon: 'book-open-variant', title: 'قراءة السيرة النبوية', color: '#3a7ca5' },
  { id: 'sunnah', icon: 'star', title: 'اتباع سنته ﷺ', color: '#c07b10' },
  { id: 'akhlaq', icon: 'account-heart', title: 'التخلق بأخلاقه ﷺ', color: '#0d8e62' },
];

// ========================================
// مكونات فرعية
// ========================================

interface ProphetNameCardProps {
  item: typeof PROPHET_NAMES[0];
  index: number;
  isDarkMode: boolean;
}

const ProphetNameCard: React.FC<ProphetNameCardProps> = ({ item, index, isDarkMode }) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isArabic = getLanguage() === 'ar';
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(400)}
      style={styles.nameCardOuter}
    >
      <View style={[styles.nameCard, { backgroundColor: isDarkMode ? 'rgba(46,139,87,0.1)' : 'rgba(46,139,87,0.06)', borderColor: isDarkMode ? 'rgba(46,139,87,0.2)' : 'rgba(46,139,87,0.12)' }]}>
        <View style={[styles.nameDecoLine, { backgroundColor: MAWLID_COLOR }]} />
        {isArabic ? (
          <Text style={[styles.nameText, { color: colors.text }]}>{item.name}</Text>
        ) : (
          <TranslatedText style={[styles.nameText, { color: colors.text }]}>{item.name}</TranslatedText>
        )}
        <View style={[styles.nameDivider, { backgroundColor: isDarkMode ? 'rgba(46,139,87,0.2)' : 'rgba(46,139,87,0.15)' }]} />
        {isArabic ? (
          <Text style={[styles.meaningText, { color: colors.textLight }]}>{item.meaning}</Text>
        ) : (
          <TranslatedText style={[styles.meaningText, { color: colors.textLight }]}>{item.meaning}</TranslatedText>
        )}
      </View>
    </Animated.View>
  );
};

interface QualityCardProps {
  quality: typeof PROPHET_QUALITIES[0];
  index: number;
  isDarkMode: boolean;
}

const QualityCard: React.FC<QualityCardProps> = ({ quality, index, isDarkMode }) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isArabic = getLanguage() === 'ar';
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(400)}
      style={styles.qualityCardContainer}
    >
      <View style={[styles.qualityCard, { backgroundColor: colors.card }]}>
        <View style={styles.qualityIcon}>
          <MaterialCommunityIcons name={quality.icon as any} size={28} color={MAWLID_COLOR} />
        </View>
        {isArabic ? (
          <Text style={[styles.qualityTitle, { color: colors.text }]}>{quality.title}</Text>
        ) : (
          <TranslatedText style={[styles.qualityTitle, { color: colors.text }]}>{quality.title}</TranslatedText>
        )}
        {isArabic ? (
          <Text style={[styles.qualityDesc, { color: colors.textLight }]}>{quality.description}</Text>
        ) : (
          <TranslatedText style={[styles.qualityDesc, { color: colors.textLight }]}>{quality.description}</TranslatedText>
        )}
      </View>
    </Animated.View>
  );
};

interface SalawatCardProps {
  salawat: typeof SALAWAT[0];
  onShare: () => void;
  isDarkMode: boolean;
  index: number;
}

const SalawatCard: React.FC<SalawatCardProps> = ({ salawat, onShare, isDarkMode, index }) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const isArabicLang = getLanguage() === 'ar';
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <View style={[styles.salawatCard, { backgroundColor: colors.card }]}>
        <View style={[styles.salawatHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {isArabicLang ? (
            <Text style={[styles.salawatTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{salawat.title}</Text>
          ) : (
            <TranslatedText style={[styles.salawatTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{salawat.title}</TranslatedText>
          )}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onShare();
            }}
          >
            <MaterialCommunityIcons name="share-variant" size={20} color={MAWLID_COLOR} />
          </TouchableOpacity>
        </View>
        {isArabicLang ? (
          <Text style={[styles.salawatArabic, { color: colors.text, writingDirection: 'rtl' }]}>{salawat.arabic}</Text>
        ) : (
          <TranslatedText style={[styles.salawatArabic, { color: colors.text }]}>{salawat.arabic}</TranslatedText>
        )}
        <View style={styles.salawatVirtueWrapper}>
          <View style={styles.salawatVirtueStarCircle}>
            <MaterialCommunityIcons name="star" size={14} color="#c07b10" />
          </View>
          <View style={styles.salawatVirtue}>
            {isArabicLang ? (
              <Text style={[styles.salawatVirtueText, { color: colors.textLight }]}>{salawat.virtue}</Text>
            ) : (
              <TranslatedText style={[styles.salawatVirtueText, { color: colors.textLight }]}>{salawat.virtue}</TranslatedText>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function MawlidScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { isDarkMode, settings } = useSettings();
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isArabicLang = getLanguage() === 'ar';
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [salawatCount, setSalawatCount] = useState(0);

  const prophetNames = useMemo(() => [
    { name: t('seasonal.mawlid.nameMuhammad'), meaning: t('seasonal.mawlid.nameMuhammadMeaning') },
    { name: t('seasonal.mawlid.nameAhmad'), meaning: t('seasonal.mawlid.nameAhmadMeaning') },
    { name: t('seasonal.mawlid.nameAlMahi'), meaning: t('seasonal.mawlid.nameAlMahiMeaning') },
    { name: t('seasonal.mawlid.nameAlHashir'), meaning: t('seasonal.mawlid.nameAlHashirMeaning') },
    { name: t('seasonal.mawlid.nameAlAqib'), meaning: t('seasonal.mawlid.nameAlAqibMeaning') },
    { name: t('seasonal.mawlid.nameAlMuqaffi'), meaning: t('seasonal.mawlid.nameAlMuqaffiMeaning') },
  ], [t]);

  const prophetQualities = useMemo(() => [
    { icon: 'account-heart', title: t('seasonal.mawlid.qualityMercy'), description: t('seasonal.mawlid.qualityMercyDesc') },
    { icon: 'shield-check', title: t('seasonal.mawlid.qualityHonesty'), description: t('seasonal.mawlid.qualityHonestyDesc') },
    { icon: 'hand-heart', title: t('seasonal.mawlid.qualityGenerosity'), description: t('seasonal.mawlid.qualityGenerosityDesc') },
    { icon: 'meditation', title: t('seasonal.mawlid.qualityHumility'), description: t('seasonal.mawlid.qualityHumilityDesc') },
    { icon: 'emoticon-happy', title: t('seasonal.mawlid.qualityCheerfulness'), description: t('seasonal.mawlid.qualityCheerfulnessDesc') },
    { icon: 'arm-flex', title: t('seasonal.mawlid.qualityBravery'), description: t('seasonal.mawlid.qualityBraveryDesc') },
  ], [t]);

  const salawatList = useMemo(() => [
    {
      id: 'ibrahimiyah',
      title: t('seasonal.mawlid.salawatIbrahimiyah'),
      arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
      virtue: t('seasonal.mawlid.salawatIbrahimiyahVirtue'),
    },
    {
      id: 'short',
      title: t('seasonal.mawlid.salawatShort'),
      arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
      virtue: t('seasonal.mawlid.salawatShortVirtue'),
    },
    {
      id: 'salam',
      title: t('seasonal.mawlid.salawatSalam'),
      arabic: 'السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ',
      virtue: t('seasonal.mawlid.salawatSalamVirtue'),
    },
  ], [t]);

  const recommendedActions = useMemo(() => [
    { id: 'salawat', icon: 'heart', title: t('seasonal.mawlid.actionSalawat'), color: '#e91e63' },
    { id: 'seerah', icon: 'book-open-variant', title: t('seasonal.mawlid.actionSeerah'), color: '#3a7ca5' },
    { id: 'sunnah', icon: 'star', title: t('seasonal.mawlid.actionSunnah'), color: '#c07b10' },
    { id: 'akhlaq', icon: 'account-heart', title: t('seasonal.mawlid.actionAkhlaq'), color: '#0d8e62' },
  ], [t]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // تحديث البيانات
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  const handleSalawat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSalawatCount((prev) => prev + 1);
  };

  const handleShareSalawat = async (salawat: typeof SALAWAT[0]) => {
    try {
      await Share.share({
        message: `${salawat.title}\n\n${salawat.arabic}\n\n${salawat.virtue}`,
        title: salawat.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('seasonal.mawlid.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>{t('seasonal.mawlid.birthDate')}</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
            colors={[MAWLID_COLOR]}
          />
        }
      >
        {/* بطاقة النبي ﷺ */}
        <Animated.View entering={FadeIn.duration(500)}>
          <View
            style={[styles.prophetCard, { backgroundColor: isDarkMode ? 'rgba(26,42,26,0.85)' : 'rgba(232,245,233,0.85)' }]}
          >
            <View style={styles.prophetIconContainer}>
              <MaterialCommunityIcons name="star-crescent" size={40} color={MAWLID_COLOR} />
            </View>
            <Text style={[styles.prophetName, { color: colors.text }]}>
              {t('seasonal.mawlid.prophetName')}
            </Text>
            <Text style={[styles.prophetFullName, { color: colors.textLight }]}>
              {t('seasonal.mawlid.prophetFullName')}
            </Text>
            <View style={[styles.prophetInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.prophetInfoItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="map-marker" size={16} color={MAWLID_COLOR} />
                <Text style={[styles.prophetInfoText, { color: colors.textLight }]}>
                  {t('seasonal.mawlid.birthPlace')}
                </Text>
              </View>
              <View style={[styles.prophetInfoItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="calendar" size={16} color={MAWLID_COLOR} />
                <Text style={[styles.prophetInfoText, { color: colors.textLight }]}>
                  {t('seasonal.mawlid.birthYear')}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* عداد الصلاة على النبي */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.counterCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.counterLabel, { color: colors.textLight }]}>
              {t('seasonal.mawlid.counterLabel')}
            </Text>
            <TouchableOpacity style={styles.counterButton} onPress={handleSalawat} activeOpacity={0.8}>
              <View style={[styles.counterButtonGradient, { backgroundColor: `${MAWLID_COLOR}CC` }]}>
                <Text style={styles.counterValue}>{salawatCount}</Text>
                <Text style={styles.counterButtonText}>{t('seasonal.mawlid.counterButton')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* أسماء النبي ﷺ */}
        <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('seasonal.mawlid.namesSection')}</Text>
        <View style={styles.namesGrid}>
          {prophetNames.map((item, index) => (
            <ProphetNameCard key={item.name} item={item} index={index} isDarkMode={isDarkMode} />
          ))}
        </View>

        {/* صفات النبي ﷺ */}
        <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('seasonal.mawlid.qualitiesSection')}</Text>
        <View style={styles.qualitiesGrid}>
          {prophetQualities.map((quality, index) => (
            <QualityCard key={quality.title} quality={quality} index={index} isDarkMode={isDarkMode} />
          ))}
        </View>

        {/* صيغ الصلاة على النبي */}
        <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t('seasonal.mawlid.salawatSection')}
        </Text>
        {salawatList.map((salawat, index) => (
          <SalawatCard
            key={salawat.id}
            salawat={salawat}
            onShare={() => handleShareSalawat(salawat)}
            isDarkMode={isDarkMode}
            index={index}
          />
        ))}

        {/* الأعمال المستحبة */}
        <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('seasonal.mawlid.todaySection')}</Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card }]}>
          {recommendedActions.map((action, index) => (
            <Animated.View
              key={action.id}
              entering={FadeInDown.delay(index * 80).duration(400)}
              style={[styles.actionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <View style={styles.actionIcon}>
                <MaterialCommunityIcons name={action.icon as any} size={22} color={action.color} />
              </View>
              {isArabicLang ? (
                <Text style={[styles.actionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{action.title}</Text>
              ) : (
                <TranslatedText style={[styles.actionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{action.title}</TranslatedText>
              )}
            </Animated.View>
          ))}
        </View>

        {/* نصيحة */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <View style={[styles.tipCard, { backgroundColor: isDarkMode ? 'rgba(192,123,16,0.12)' : '#fff8e1', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#c07b10" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('seasonal.mawlid.reminder')}</Text>
              <Text style={[styles.tipText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('seasonal.mawlid.reminderText')}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
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
  headerWrapper: {},
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    overflow: 'visible',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 34,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },
  headerPlaceholder: {
    width: 40,
  },
  headerDecoration: {
    position: 'absolute',
    top: 10,
    left: 20,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // بطاقة النبي
  prophetCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  prophetIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46,139,87,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  prophetName: {
    fontSize: 28,
    fontFamily: fontBold(),
  },
  prophetFullName: {
    fontSize: 14,
    fontFamily: fontRegular(),
    marginTop: 4,
  },
  prophetInfo: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
  },
  prophetInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prophetInfoText: {
    fontSize: 13,
    fontFamily: fontRegular(),
  },

  // عداد الصلاة
  counterCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  counterLabel: {
    fontSize: 16,
    fontFamily: fontMedium(),
    marginBottom: 12,
  },
  counterButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  counterButtonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 48,
    fontFamily: fontBold(),
    color: '#fff',
  },
  counterButtonText: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginTop: 24,
    marginBottom: 12,
  },

  // أسماء النبي
  namesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  nameCardOuter: {
    width: '50%',
    padding: 5,
  },
  nameCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  nameDecoLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  nameText: {
    fontSize: 22,
    fontFamily: fontBold(),
    textAlign: 'center',
    lineHeight: 34,
    includeFontPadding: false,
  },
  nameDivider: {
    width: 32,
    height: 2,
    borderRadius: 1,
    marginVertical: 6,
  },
  meaningText: {
    fontSize: 12,
    fontFamily: fontRegular(),
    textAlign: 'center',
    lineHeight: 20,
    includeFontPadding: false,
  },

  // صفات النبي
  qualitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  qualityCardContainer: {
    width: '50%',
    padding: 6,
  },
  qualityCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  qualityIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${MAWLID_COLOR}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  qualityTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
  },
  qualityDesc: {
    fontSize: 11,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginTop: 4,
  },

  // صيغ الصلاة
  salawatCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  salawatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  salawatTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${MAWLID_COLOR}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salawatArabic: {
    fontSize: 18,
    fontFamily: fontMedium(),
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 32,
    marginBottom: 12,
  },
  salawatVirtueWrapper: {
    alignItems: 'center',
  },
  salawatVirtueStarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245,166,35,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -14,
    zIndex: 1,
  },
  salawatVirtue: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,166,35,0.08)',
    borderRadius: 10,
    paddingTop: 18,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  salawatVirtueText: {
    fontSize: 12,
    fontFamily: fontRegular(),
  },

  // الأعمال
  actionsCard: {
    borderRadius: 16,
    padding: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontFamily: fontMedium(),
    flex: 1,
  },

  // النصيحة
  tipCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
  },
  tipText: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 22,
    marginTop: 4,
  },

  bottomSpace: {
    height: 100,
  },
});
