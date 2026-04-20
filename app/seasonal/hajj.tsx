// app/seasonal/hajj.tsx
// صفحة موسم الحج - روح المسلم

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeIn,
} from 'react-native-reanimated';

import { useSeasonal, useSeasonalProgress } from '@/contexts/SeasonalContext';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { getLanguage } from '@/lib/i18n';
import { getHijriDate, hijriToGregorian } from '@/lib/hijri-date';

import TranslatedText from '@/components/ui/TranslatedText';
import { useSeasonalCMS } from '@/lib/content-api';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const HAJJ_COLOR = '#5D4037';
const HAJJ_GRADIENT = ['#5D4037', '#3E2723'];
const ARAFAH_COLOR = '#1565C0';
const EID_COLOR = '#C62828';
const GREEN_ACCENT = '#2E7D32';

// أيام الحج ومناسكه
const HAJJ_DAYS = [
  {
    day: 8,
    name: 'يوم التروية',
    nameEn: 'Day of Tarwiyah',
    description: 'الإحرام من مكة والتوجه إلى منى',
    rituals: [
      { id: 'ihram', title: 'الإحرام', description: 'الإحرام من مكة للحج', icon: 'account-convert' },
      { id: 'mina', title: 'المبيت بمنى', description: 'التوجه إلى منى والمبيت فيها', icon: 'tent' },
      { id: 'prayers', title: 'الصلوات', description: 'صلاة الظهر والعصر والمغرب والعشاء قصراً', icon: 'mosque' },
    ],
    duas: ['لبيك اللهم لبيك، لبيك لا شريك لك لبيك، إن الحمد والنعمة لك والملك، لا شريك لك'],
  },
  {
    day: 9,
    name: 'يوم عرفة',
    nameEn: 'Day of Arafah',
    description: 'أعظم أيام الحج - الوقوف بعرفة',
    isSpecial: true,
    rituals: [
      { id: 'arafah', title: 'الوقوف بعرفة', description: 'الركن الأعظم من أركان الحج', icon: 'map-marker' },
      { id: 'dua', title: 'الدعاء', description: 'الإكثار من الدعاء والذكر', icon: 'hands-pray' },
      { id: 'muzdalifah', title: 'المبيت بمزدلفة', description: 'التوجه إلى مزدلفة بعد الغروب', icon: 'moon-waning-crescent' },
    ],
    duas: [
      'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير',
      'اللهم إنك عفو تحب العفو فاعف عني',
    ],
    virtues: [
      'أفضل يوم طلعت فيه الشمس',
      'يوم يعتق الله فيه أكثر عباده من النار',
      'صيامه لغير الحاج يكفر سنة ماضية وسنة قادمة',
    ],
  },
  {
    day: 10,
    name: 'يوم النحر',
    nameEn: 'Day of Sacrifice',
    description: 'عيد الأضحى المبارك - أعظم الأيام عند الله',
    isEid: true,
    rituals: [
      { id: 'rami', title: 'رمي جمرة العقبة', description: 'رمي سبع حصيات', icon: 'circle-multiple' },
      { id: 'nahr', title: 'ذبح الهدي', description: 'ذبح الأضحية', icon: 'cow' },
      { id: 'halq', title: 'الحلق أو التقصير', description: 'حلق الشعر أو تقصيره', icon: 'content-cut' },
      { id: 'tawaf', title: 'طواف الإفاضة', description: 'الطواف حول الكعبة', icon: 'rotate-360' },
      { id: 'sai', title: 'السعي', description: 'السعي بين الصفا والمروة', icon: 'walk' },
    ],
    duas: ['الله أكبر الله أكبر الله أكبر، لا إله إلا الله، الله أكبر الله أكبر ولله الحمد'],
  },
  {
    day: 11,
    name: 'أول أيام التشريق',
    nameEn: 'First Day of Tashreeq',
    description: 'المبيت بمنى ورمي الجمرات',
    rituals: [
      { id: 'rami_3', title: 'رمي الجمرات الثلاث', description: 'رمي الصغرى ثم الوسطى ثم الكبرى', icon: 'circle-multiple' },
      { id: 'mina_stay', title: 'المبيت بمنى', description: 'المبيت في منى', icon: 'tent' },
      { id: 'takbir', title: 'التكبير', description: 'الإكثار من التكبير', icon: 'bullhorn' },
    ],
    duas: ['الله أكبر الله أكبر لا إله إلا الله، الله أكبر الله أكبر ولله الحمد'],
  },
  {
    day: 12,
    name: 'ثاني أيام التشريق',
    nameEn: 'Second Day of Tashreeq',
    description: 'رمي الجمرات - يجوز التعجل',
    rituals: [
      { id: 'rami_3', title: 'رمي الجمرات الثلاث', description: 'رمي الصغرى ثم الوسطى ثم الكبرى', icon: 'circle-multiple' },
      { id: 'leave', title: 'التعجل أو البقاء', description: 'يجوز المغادرة قبل الغروب', icon: 'exit-run' },
    ],
    duas: ['الله أكبر الله أكبر لا إله إلا الله، الله أكبر الله أكبر ولله الحمد'],
  },
  {
    day: 13,
    name: 'ثالث أيام التشريق',
    nameEn: 'Third Day of Tashreeq',
    description: 'آخر أيام الحج للمتأخرين',
    rituals: [
      { id: 'rami_3', title: 'رمي الجمرات الثلاث', description: 'للمتأخرين فقط', icon: 'circle-multiple' },
      { id: 'tawaf_wada', title: 'طواف الوداع', description: 'آخر عهد بالبيت الحرام', icon: 'rotate-360' },
    ],
    duas: ['اللهم اجعله حجاً مبروراً وسعياً مشكوراً وذنباً مغفوراً'],
  },
];

// العشر الأوائل من ذي الحجة
const FIRST_TEN_DAYS = [
  { day: 1, virtue: 'العمل الصالح فيها أحب إلى الله' },
  { day: 2, virtue: 'أيام معلومات يُذكر فيها اسم الله' },
  { day: 3, virtue: 'الإكثار من التكبير والتهليل' },
  { day: 4, virtue: 'الصيام والصدقة والذكر' },
  { day: 5, virtue: 'قراءة القرآن والاستغفار' },
  { day: 6, virtue: 'صلة الرحم وبر الوالدين' },
  { day: 7, virtue: 'الدعاء والتضرع إلى الله' },
  { day: 8, virtue: 'يوم التروية - بداية الحج' },
  { day: 9, virtue: 'يوم عرفة - أفضل الأيام' },
  { day: 10, virtue: 'يوم النحر - عيد الأضحى' },
];

// أدعية الحج
const HAJJ_DUAS = [
  {
    id: 'talbiyah',
    title: 'التلبية',
    arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
    occasion: 'طوال الحج',
  },
  {
    id: 'tawaf',
    title: 'دعاء الطواف',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    occasion: 'بين الركن اليماني والحجر الأسود',
  },
  {
    id: 'sai',
    title: 'دعاء السعي',
    arabic: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ',
    occasion: 'عند الصفا والمروة',
  },
  {
    id: 'arafah',
    title: 'دعاء عرفة',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    occasion: 'يوم عرفة',
  },
  {
    id: 'rami',
    title: 'دعاء رمي الجمرات',
    arabic: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ',
    occasion: 'عند رمي كل حصاة',
  },
  {
    id: 'takbir',
    title: 'التكبير',
    arabic: 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ لَا إِلَهَ إِلَّا اللَّهُ، اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ وَلِلَّهِ الْحَمْدُ',
    occasion: 'أيام التشريق',
  },
];

type HajjDuaType = typeof HAJJ_DUAS[number];
type HajjDayType = typeof HAJJ_DAYS[number];

// ========================================
// مكونات فرعية
// ========================================

interface HajjDayCardProps {
  dayInfo: typeof HAJJ_DAYS[0];
  isActive: boolean;
  isCompleted: boolean;
  onPress: () => void;
  isDarkMode: boolean;
  index: number;
}

const HajjDayCard: React.FC<HajjDayCardProps> = ({
  dayInfo,
  isActive,
  isCompleted,
  onPress,
  isDarkMode,
  index,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const { t } = useSettings();
  const isArabicLang = getLanguage() === 'ar';
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <TouchableOpacity
        style={[
          styles.hajjDayCard,
          { backgroundColor: colors.card },
          isActive && styles.hajjDayCardActive,
          dayInfo.isSpecial && styles.hajjDayCardSpecial,
          dayInfo.isEid && styles.hajjDayCardEid,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        activeOpacity={0.8}
      >
        {/* رقم اليوم */}
        <View
          style={[
            styles.dayNumber,
            isActive && styles.dayNumberActive,
            dayInfo.isSpecial && styles.dayNumberSpecial,
            dayInfo.isEid && styles.dayNumberEid,
          ]}
        >
          <Text style={[
            styles.dayNumberText,
            (isActive || dayInfo.isSpecial || dayInfo.isEid) && { color: '#fff' },
          ]}>{dayInfo.day}</Text>
          <Text style={[
            styles.dayNumberLabel,
            (isActive || dayInfo.isSpecial || dayInfo.isEid) && { color: 'rgba(255,255,255,0.85)' },
          ]}>{t('seasonal.hajj.dhulHijjah')}</Text>
        </View>

        {/* المحتوى */}
        <View style={styles.dayContent}>
          <View style={[styles.dayHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {isArabicLang ? (
              <Text style={[styles.dayName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dayInfo.name}</Text>
            ) : (
              <Text style={[styles.dayName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dayInfo.nameEn || dayInfo.name}</Text>
            )}
            {isCompleted && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#0d8e62" />
            )}
          </View>
          {isArabicLang ? (
            <Text style={[styles.dayDescription, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dayInfo.description}</Text>
          ) : (
            <TranslatedText style={[styles.dayDescription, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dayInfo.description}</TranslatedText>
          )}
          <View style={[styles.ritualsPreview, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {dayInfo.rituals.slice(0, 3).map((ritual) => (
              <View key={ritual.id} style={styles.ritualBadge}>
                <MaterialCommunityIcons
                  name={ritual.icon as any}
                  size={14}
                  color={dayInfo.isSpecial ? ARAFAH_COLOR : HAJJ_COLOR}
                />
              </View>
            ))}
            {dayInfo.rituals.length > 3 && (
              <Text style={[styles.moreRituals, { color: colors.textLight }]}>
                +{dayInfo.rituals.length - 3}
              </Text>
            )}
          </View>
        </View>

        {/* السهم */}
        <MaterialCommunityIcons
          name={isRTL ? 'chevron-left' : 'chevron-right'}
          size={24}
          color={colors.icon}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

interface TenDaysProgressProps {
  currentDay: number;
  completedDays: number[];
  onDayPress: (day: number) => void;
  isDarkMode: boolean;
}

const TenDaysProgress: React.FC<TenDaysProgressProps> = ({
  currentDay,
  completedDays,
  onDayPress,
  isDarkMode,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { t } = useSettings();
  const isRTL = useIsRTL();

  // Get current Hijri year for Gregorian conversion
  const hijriYear = useMemo(() => getHijriDate().year, []);

  // Compute Gregorian dates for each of the 10 days of Dhul Hijjah
  const gregorianDates = useMemo(() => {
    return FIRST_TEN_DAYS.map((day) => {
      try {
        const gDate = hijriToGregorian(hijriYear, 12, day.day);
        return { day: gDate.getDate(), month: gDate.getMonth() + 1 };
      } catch {
        return null;
      }
    });
  }, [hijriYear]);

  return (
    <View style={[styles.tenDaysContainer, { backgroundColor: colors.card }]}>
      <Text style={[styles.tenDaysTitle, { color: colors.text }]}>
        {t('seasonal.hajj.tenDaysTitle')}
      </Text>
      <Text style={[styles.tenDaysSubtitle, { color: colors.textLight }]}>
        {t('seasonal.hajj.tenDaysSubtitle')}
      </Text>
      <View style={[styles.tenDaysGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {FIRST_TEN_DAYS.map((day, index) => {
          const isCompleted = completedDays.includes(day.day);
          const isCurrent = day.day === currentDay;
          const isArafah = day.day === 9;
          const isEid = day.day === 10;
          const gDate = gregorianDates[index];
          const hasHighlight = isCompleted || isCurrent || isArafah || isEid;

          return (
            <TouchableOpacity
              key={day.day}
              style={[
                styles.tenDayItem,
                { backgroundColor: colors.surface },
                isCompleted && styles.tenDayItemCompleted,
                isCurrent && !isArafah && !isEid && styles.tenDayItemCurrent,
                isArafah && styles.tenDayItemArafah,
                isEid && styles.tenDayItemEid,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDayPress(day.day);
              }}
            >
              <Text
                style={[
                  styles.tenDayNumber,
                  { color: colors.text },
                  hasHighlight && styles.tenDayNumberActive,
                ]}
              >
                {day.day}
              </Text>
              {gDate && (
                <Text
                  style={[
                    styles.tenDayGregorian,
                    { color: hasHighlight ? 'rgba(255,255,255,0.8)' : colors.textLight },
                  ]}
                >
                  {gDate.day}/{gDate.month}
                </Text>
              )}
              {isCompleted && (
                <MaterialCommunityIcons name="check" size={10} color="#fff" />
              )}
              {isArafah && !isCompleted && (
                <MaterialCommunityIcons name="star" size={10} color="#fff" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

interface DuaCardProps {
  dua: typeof HAJJ_DUAS[0];
  onPress: () => void;
  isDarkMode: boolean;
  index: number;
}

const DuaCard: React.FC<DuaCardProps> = ({ dua, onPress, isDarkMode, index }) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const isArabicLang = getLanguage() === 'ar';
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400)}>
      <TouchableOpacity
        style={[styles.duaCard, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.duaIcon}>
          <MaterialCommunityIcons name="hands-pray" size={20} color={HAJJ_COLOR} />
        </View>
        <View style={styles.duaContent}>
          {isArabicLang ? (
            <Text style={[styles.duaTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dua.title}</Text>
          ) : (
            <TranslatedText style={[styles.duaTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dua.title}</TranslatedText>
          )}
          {isArabicLang ? (
            <Text style={[styles.duaOccasion, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dua.occasion}</Text>
          ) : (
            <TranslatedText style={[styles.duaOccasion, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dua.occasion}</TranslatedText>
          )}
        </View>
        <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.icon} />
      </TouchableOpacity>
    </Animated.View>
  );
};

interface RitualDetailModalProps {
  dayInfo: typeof HAJJ_DAYS[0] | null;
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const RitualDetailModal: React.FC<RitualDetailModalProps> = ({
  dayInfo,
  visible,
  onClose,
  isDarkMode,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const { t } = useSettings();
  const isArabicLang = getLanguage() === 'ar';
  if (!dayInfo) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.ritualModal, { backgroundColor: colors.cardSolid }]}
        >
          {/* Header */}
          <View
            style={[styles.ritualModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }, { backgroundColor: dayInfo.isSpecial ? `${ARAFAH_COLOR}DD` : `${HAJJ_GRADIENT[0]}CC` }]}
          >
            <View style={styles.ritualModalDay}>
              <Text style={styles.ritualModalDayNumber}>{dayInfo.day}</Text>
              <Text style={styles.ritualModalDayLabel}>{t('seasonal.hajj.dhulHijjah')}</Text>
            </View>
            <View style={styles.ritualModalInfo}>
              {isArabicLang ? (
                <Text style={[styles.ritualModalName, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dayInfo.name}</Text>
              ) : (
                <Text style={[styles.ritualModalName, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dayInfo.nameEn || dayInfo.name}</Text>
              )}
              {isArabicLang ? (
                <Text style={[styles.ritualModalDesc, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dayInfo.description}</Text>
              ) : (
                <TranslatedText style={[styles.ritualModalDesc, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dayInfo.description}</TranslatedText>
              )}
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.ritualModalContent} showsVerticalScrollIndicator={false}>
            {/* المناسك */}
            <Text style={[styles.ritualSectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('seasonal.hajj.ritualsAndDeeds')}
            </Text>
            {dayInfo.rituals.map((ritual, index) => (
              <Animated.View
                key={ritual.id}
                entering={FadeInRight.delay(index * 100).duration(400)}
                style={[styles.ritualItem, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <View style={styles.ritualItemIcon}>
                  <MaterialCommunityIcons name={ritual.icon as any} size={24} color={HAJJ_COLOR} />
                </View>
                <View style={styles.ritualItemContent}>
                  {isArabicLang ? (
                    <Text style={[styles.ritualItemTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{ritual.title}</Text>
                  ) : (
                    <TranslatedText style={[styles.ritualItemTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{ritual.title}</TranslatedText>
                  )}
                  {isArabicLang ? (
                    <Text style={[styles.ritualItemDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{ritual.description}</Text>
                  ) : (
                    <TranslatedText style={[styles.ritualItemDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{ritual.description}</TranslatedText>
                  )}
                </View>
              </Animated.View>
            ))}

            {/* الفضائل */}
            {dayInfo.virtues && (
              <>
                <Text style={[styles.ritualSectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('seasonal.hajj.virtuesSection')}
                </Text>
                <View style={styles.virtuesStarWrapper}>
                  <View style={styles.virtuesStarCircle}>
                    <MaterialCommunityIcons name="star" size={16} color={ARAFAH_COLOR} />
                  </View>
                  <View style={[styles.virtuesCard, { backgroundColor: colors.card }]}>
                    {dayInfo.virtues.map((virtue, index) => (
                      <View key={index} style={[styles.virtueItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        {isArabicLang ? (
                          <Text style={[styles.virtueText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{virtue}</Text>
                        ) : (
                          <TranslatedText style={[styles.virtueText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{virtue}</TranslatedText>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* الأدعية */}
            {dayInfo.duas && (
              <>
                <Text style={[styles.ritualSectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('seasonal.hajj.duasSection')}
                </Text>
                {dayInfo.duas.map((dua, index) => (
                  <View key={index} style={[styles.duaBox, { backgroundColor: colors.card }]}>
                    {isArabicLang ? (
                      <Text style={[styles.duaBoxText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dua}</Text>
                    ) : (
                      <TranslatedText style={[styles.duaBoxText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{dua}</TranslatedText>
                    )}
                  </View>
                ))}
              </>
            )}

            <View style={styles.modalBottomSpace} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function HajjScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { isDarkMode, settings, t } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const language = getLanguage();
  const isArabic = language === 'ar';
  const insets = useSafeAreaInsets();
  const { currentSeason, refreshSeasonalData } = useSeasonal();
  const { seasonalProgress, markDayCompleted } = useSeasonalProgress();

  // CMS data with hardcoded fallback
  const { duas: hajjDuas } = useSeasonalCMS<HajjDuaType>('hajj', HAJJ_DUAS);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<HajjDayType | null>(null);
  const [selectedDua, setSelectedDua] = useState<HajjDuaType | null>(null);

  const isHajjSeason = currentSeason?.type === 'hajj' || currentSeason?.type === 'dhul_hijjah';
  const currentDay = currentSeason?.currentDay || 1;
  const completedDays = seasonalProgress?.completedDays || [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshSeasonalData();
    setIsRefreshing(false);
  }, [refreshSeasonalData]);

  const handleDayPress = useCallback((day: number) => {
    const dayInfo = HAJJ_DAYS.find((d) => d.day === day);
    if (dayInfo) {
      setSelectedDay(dayInfo);
    }
  }, []);

  const handleTenDayPress = useCallback((day: number) => {
    if (day <= currentDay && !completedDays.includes(day)) {
      markDayCompleted(day);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [currentDay, completedDays, markDayCompleted]);

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('seasonal.hajj.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
            {isHajjSeason ? `${t('seasonal.hajj.headerSubtitleWithDay')} ${currentDay}` : t('seasonal.hajj.headerSubtitle')}
          </Text>
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
            colors={[HAJJ_COLOR]}
          />
        }
      >
        {/* العشر الأوائل */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <TenDaysProgress
            currentDay={currentDay}
            completedDays={completedDays}
            onDayPress={handleTenDayPress}
            isDarkMode={isDarkMode}
          />
        </Animated.View>

        {/* مفتاح الألوان */}
        <View style={[styles.legendRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.legendDot, { backgroundColor: ARAFAH_COLOR }]} />
            <Text style={[styles.legendText, { color: colors.textLight }]}>عرفة</Text>
          </View>
          <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.legendDot, { backgroundColor: EID_COLOR }]} />
            <Text style={[styles.legendText, { color: colors.textLight }]}>العيد</Text>
          </View>
          <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.legendDot, { backgroundColor: GREEN_ACCENT }]} />
            <Text style={[styles.legendText, { color: colors.textLight }]}>مكتمل</Text>
          </View>
        </View>

        {/* أيام الحج */}
        <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t('seasonal.hajj.ritualsSection')}
        </Text>
        {HAJJ_DAYS.map((dayInfo, index) => (
          <HajjDayCard
            key={dayInfo.day}
            dayInfo={dayInfo}
            isActive={dayInfo.day === currentDay}
            isCompleted={completedDays.includes(dayInfo.day)}
            onPress={() => handleDayPress(dayInfo.day)}
            isDarkMode={isDarkMode}
            index={index}
          />
        ))}

        {/* أدعية الحج */}
        <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t('seasonal.hajj.hajjDuasSection')}
        </Text>
        <View style={styles.duasContainer}>
          {hajjDuas.map((dua, index) => (
            <DuaCard
              key={dua.id}
              dua={dua}
              onPress={() => setSelectedDua(dua)}
              isDarkMode={isDarkMode}
              index={index}
            />
          ))}
        </View>

        {/* نصيحة */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <View style={[styles.tipCard, { backgroundColor: isDarkMode ? 'rgba(192,123,16,0.12)' : '#fff8e1', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#F57F17" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: isDarkMode ? colors.text : '#5D4037', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('seasonal.hajj.tipTitle')}</Text>
              <Text style={[styles.tipText, { color: isDarkMode ? colors.textLight : 'rgba(93,64,55,0.75)', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('seasonal.hajj.tipText')}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Modal تفاصيل اليوم */}
      <RitualDetailModal
        dayInfo={selectedDay}
        visible={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        isDarkMode={isDarkMode}
      />

      {/* Modal الدعاء */}
      <Modal
        visible={selectedDua !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDua(null)}
      >
        <TouchableOpacity
          style={styles.duaModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedDua(null)}
        >
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.duaModal, { backgroundColor: colors.cardSolid }]}
          >
            <View style={[styles.duaModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {isArabic ? (
                <Text style={[styles.duaModalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{selectedDua?.title}</Text>
              ) : (
                <TranslatedText style={[styles.duaModalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{selectedDua?.title || ''}</TranslatedText>
              )}
              <TouchableOpacity onPress={() => setSelectedDua(null)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {isArabic ? (
              <Text style={[styles.duaModalArabic, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{selectedDua?.arabic}</Text>
            ) : (
              <TranslatedText style={[styles.duaModalArabic, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{selectedDua?.arabic || ''}</TranslatedText>
            )}
            <View style={[styles.duaModalOccasion, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={HAJJ_COLOR} />
              {isArabic ? (
                <Text style={[styles.duaModalOccasionText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{selectedDua?.occasion}</Text>
              ) : (
                <TranslatedText style={[styles.duaModalOccasionText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{selectedDua?.occasion || ''}</TranslatedText>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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
    fontSize: 24,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 36,
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
  kaabaDecoration: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // العشر الأوائل
  tenDaysContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  tenDaysTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    textAlign: 'center',
  },
  tenDaysSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  tenDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tenDayItem: {
    width: 56,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tenDayItemCompleted: {
    backgroundColor: GREEN_ACCENT,
  },
  tenDayItemCurrent: {
    backgroundColor: HAJJ_COLOR,
  },
  tenDayItemArafah: {
    backgroundColor: ARAFAH_COLOR,
  },
  tenDayItemEid: {
    backgroundColor: EID_COLOR,
  },
  tenDayNumber: {
    fontSize: 18,
    fontFamily: fontBold(),
  },
  tenDayNumberActive: {
    color: '#fff',
  },
  tenDayGregorian: {
    fontSize: 9,
    fontFamily: fontRegular(),
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginTop: 20,
    marginBottom: 12,
  },

  // بطاقات أيام الحج
  hajjDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  hajjDayCardActive: {
    borderWidth: 2,
    borderColor: HAJJ_COLOR,
  },
  hajjDayCardSpecial: {
    borderWidth: 2,
    borderColor: ARAFAH_COLOR,
  },
  hajjDayCardEid: {
    borderWidth: 2,
    borderColor: EID_COLOR,
  },
  dayNumber: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: `${HAJJ_COLOR}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberActive: {
    backgroundColor: HAJJ_COLOR,
  },
  dayNumberSpecial: {
    backgroundColor: ARAFAH_COLOR,
  },
  dayNumberEid: {
    backgroundColor: EID_COLOR,
  },
  dayNumberText: {
    fontSize: 22,
    fontFamily: fontBold(),
    color: HAJJ_COLOR,
  },
  dayNumberLabel: {
    fontSize: 8,
    fontFamily: fontRegular(),
    color: HAJJ_COLOR,
  },
  dayContent: {
    flex: 1,
    marginHorizontal: 14,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayName: {
    fontSize: 16,
    fontFamily: fontBold(),
  },
  dayDescription: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 4,
  },
  ritualsPreview: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  ritualBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${HAJJ_COLOR}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreRituals: {
    fontSize: 12,
    fontFamily: fontMedium(),
    alignSelf: 'center',
  },

  // أدعية الحج
  duasContainer: {
    gap: 10,
  },
  duaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
  },
  duaIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${HAJJ_COLOR}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaContent: {
    flex: 1,
    marginHorizontal: 14,
  },
  duaTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
    lineHeight: 24,
  },
  duaOccasion: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 20,
  },

  // النصيحة
  tipCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
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

  // Modal المناسك
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  ritualModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  ritualModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  ritualModalDay: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ritualModalDayNumber: {
    fontSize: 24,
    fontFamily: fontBold(),
    color: '#fff',
  },
  ritualModalDayLabel: {
    fontSize: 9,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
  },
  ritualModalInfo: {
    flex: 1,
    marginHorizontal: 14,
  },
  ritualModalName: {
    fontSize: 20,
    fontFamily: fontBold(),
    color: '#fff',
  },
  ritualModalDesc: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ritualModalContent: {
    padding: 20,
    paddingBottom: 60,
  },
  ritualSectionTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    marginTop: 16,
    marginBottom: 12,
  },
  ritualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  ritualItemIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ritualItemContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  ritualItemTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
  },
  ritualItemDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
  virtuesStarWrapper: {
    alignItems: 'center',
  },
  virtuesStarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${ARAFAH_COLOR}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -18,
    zIndex: 1,
  },
  virtuesCard: {
    borderRadius: 14,
    padding: 14,
    paddingTop: 26,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignSelf: 'stretch',
  },
  virtueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  virtueText: {
    fontSize: 15,
    fontFamily: fontMedium(),
    flex: 1,
    lineHeight: 24,
  },
  duaBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  duaBoxText: {
    fontSize: 16,
    fontFamily: fontMedium(),
    textAlign: 'center',
    lineHeight: 28,
  },
  modalBottomSpace: {
    height: 40,
  },

  // Modal الدعاء
  duaModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  duaModal: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  duaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  duaModalTitle: {
    fontSize: 20,
    fontFamily: fontBold(),
  },
  duaModalArabic: {
    fontSize: 20,
    fontFamily: fontBold(),
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 36,
    marginBottom: 16,
  },
  duaModalOccasion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  duaModalOccasionText: {
    fontSize: 13,
    fontFamily: fontRegular(),
  },

  // مفتاح الألوان
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontFamily: fontRegular(),
  },

  bottomSpace: {
    height: 100,
  },
});
