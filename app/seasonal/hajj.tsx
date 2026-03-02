// app/seasonal/hajj.tsx
// صفحة موسم الحج - روح المسلم

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useSeasonal, useSeasonalProgress } from '@/contexts/SeasonalContext';
import { useSettings } from '@/contexts/SettingsContext';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const HAJJ_COLOR = '#8B4513';
const HAJJ_GRADIENT = ['#8B4513', '#5D2E0C'];
const DHUL_HIJJAH_COLOR = '#DAA520';

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
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <TouchableOpacity
        style={[
          styles.hajjDayCard,
          isDarkMode && styles.hajjDayCardDark,
          isActive && styles.hajjDayCardActive,
          dayInfo.isSpecial && styles.hajjDayCardSpecial,
          dayInfo.isEid && styles.hajjDayCardEid,
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
          <Text style={styles.dayNumberText}>{dayInfo.day}</Text>
          <Text style={styles.dayNumberLabel}>ذو الحجة</Text>
        </View>

        {/* المحتوى */}
        <View style={styles.dayContent}>
          <View style={styles.dayHeader}>
            <Text style={[styles.dayName, isDarkMode && styles.textLight]}>
              {dayInfo.name}
            </Text>
            {isCompleted && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#2f7659" />
            )}
          </View>
          <Text style={[styles.dayDescription, isDarkMode && styles.textMuted]}>
            {dayInfo.description}
          </Text>
          <View style={styles.ritualsPreview}>
            {dayInfo.rituals.slice(0, 3).map((ritual) => (
              <View key={ritual.id} style={styles.ritualBadge}>
                <MaterialCommunityIcons
                  name={ritual.icon as any}
                  size={14}
                  color={dayInfo.isSpecial ? '#DAA520' : HAJJ_COLOR}
                />
              </View>
            ))}
            {dayInfo.rituals.length > 3 && (
              <Text style={[styles.moreRituals, isDarkMode && styles.textMuted]}>
                +{dayInfo.rituals.length - 3}
              </Text>
            )}
          </View>
        </View>

        {/* السهم */}
        <MaterialCommunityIcons
          name="chevron-left"
          size={24}
          color={isDarkMode ? '#666' : '#ccc'}
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
  return (
    <View style={[styles.tenDaysContainer, isDarkMode && styles.tenDaysContainerDark]}>
      <Text style={[styles.tenDaysTitle, isDarkMode && styles.textLight]}>
        العشر الأوائل من ذي الحجة
      </Text>
      <Text style={[styles.tenDaysSubtitle, isDarkMode && styles.textMuted]}>
        ما من أيام العمل الصالح فيها أحب إلى الله من هذه الأيام
      </Text>
      <View style={styles.tenDaysGrid}>
        {FIRST_TEN_DAYS.map((day) => {
          const isCompleted = completedDays.includes(day.day);
          const isCurrent = day.day === currentDay;
          const isArafah = day.day === 9;
          const isEid = day.day === 10;

          return (
            <TouchableOpacity
              key={day.day}
              style={[
                styles.tenDayItem,
                isDarkMode && styles.tenDayItemDark,
                isCompleted && styles.tenDayItemCompleted,
                isCurrent && styles.tenDayItemCurrent,
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
                  isDarkMode && styles.textLight,
                  (isCompleted || isCurrent || isArafah || isEid) && styles.tenDayNumberActive,
                ]}
              >
                {day.day}
              </Text>
              {isCompleted && (
                <MaterialCommunityIcons name="check" size={12} color="#fff" />
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
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400)}>
      <TouchableOpacity
        style={[styles.duaCard, isDarkMode && styles.duaCardDark]}
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
          <Text style={[styles.duaTitle, isDarkMode && styles.textLight]}>{dua.title}</Text>
          <Text style={[styles.duaOccasion, isDarkMode && styles.textMuted]}>{dua.occasion}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-left" size={20} color={isDarkMode ? '#666' : '#ccc'} />
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
  if (!dayInfo) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.ritualModal, isDarkMode && styles.ritualModalDark]}
        >
          {/* Header */}
          <LinearGradient
            colors={dayInfo.isSpecial ? ['#DAA520', '#B8860B'] : HAJJ_GRADIENT}
            style={styles.ritualModalHeader}
          >
            <View style={styles.ritualModalDay}>
              <Text style={styles.ritualModalDayNumber}>{dayInfo.day}</Text>
              <Text style={styles.ritualModalDayLabel}>ذو الحجة</Text>
            </View>
            <View style={styles.ritualModalInfo}>
              <Text style={styles.ritualModalName}>{dayInfo.name}</Text>
              <Text style={styles.ritualModalDesc}>{dayInfo.description}</Text>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.ritualModalContent} showsVerticalScrollIndicator={false}>
            {/* المناسك */}
            <Text style={[styles.ritualSectionTitle, isDarkMode && styles.textLight]}>
              المناسك والأعمال
            </Text>
            {dayInfo.rituals.map((ritual, index) => (
              <Animated.View
                key={ritual.id}
                entering={FadeInRight.delay(index * 100).duration(400)}
                style={[styles.ritualItem, isDarkMode && styles.ritualItemDark]}
              >
                <View style={[styles.ritualItemIcon, { backgroundColor: `${HAJJ_COLOR}20` }]}>
                  <MaterialCommunityIcons name={ritual.icon as any} size={24} color={HAJJ_COLOR} />
                </View>
                <View style={styles.ritualItemContent}>
                  <Text style={[styles.ritualItemTitle, isDarkMode && styles.textLight]}>
                    {ritual.title}
                  </Text>
                  <Text style={[styles.ritualItemDesc, isDarkMode && styles.textMuted]}>
                    {ritual.description}
                  </Text>
                </View>
              </Animated.View>
            ))}

            {/* الفضائل */}
            {dayInfo.virtues && (
              <>
                <Text style={[styles.ritualSectionTitle, isDarkMode && styles.textLight]}>
                  الفضائل
                </Text>
                <View style={[styles.virtuesCard, isDarkMode && styles.virtuesCardDark]}>
                  {dayInfo.virtues.map((virtue, index) => (
                    <View key={index} style={styles.virtueItem}>
                      <MaterialCommunityIcons name="star" size={16} color="#DAA520" />
                      <Text style={[styles.virtueText, isDarkMode && styles.textMuted]}>
                        {virtue}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* الأدعية */}
            {dayInfo.duas && (
              <>
                <Text style={[styles.ritualSectionTitle, isDarkMode && styles.textLight]}>
                  الأدعية المأثورة
                </Text>
                {dayInfo.duas.map((dua, index) => (
                  <View key={index} style={[styles.duaBox, isDarkMode && styles.duaBoxDark]}>
                    <Text style={[styles.duaBoxText, isDarkMode && styles.textLight]}>{dua}</Text>
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
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const { currentSeason, refreshSeasonalData } = useSeasonal();
  const { seasonalProgress, markDayCompleted } = useSeasonalProgress();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<typeof HAJJ_DAYS[0] | null>(null);
  const [selectedDua, setSelectedDua] = useState<typeof HAJJ_DUAS[0] | null>(null);

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
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={HAJJ_COLOR}
      />

      {/* Header */}
      <LinearGradient colors={HAJJ_GRADIENT} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name="arrow-right" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>موسم الحج</Text>
          <Text style={styles.headerSubtitle}>
            {isHajjSeason ? `ذو الحجة - اليوم ${currentDay}` : 'ذو الحجة'}
          </Text>
        </View>
        <View style={styles.headerPlaceholder} />

        {/* زخرفة الكعبة */}
        <View style={styles.kaabaDecoration}>
          <MaterialCommunityIcons name="kaaba" size={80} color="rgba(255,255,255,0.15)" />
        </View>
      </LinearGradient>

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

        {/* أيام الحج */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
          مناسك الحج
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
        <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
          أدعية الحج
        </Text>
        <View style={styles.duasContainer}>
          {HAJJ_DUAS.map((dua, index) => (
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
          <View style={[styles.tipCard, isDarkMode && styles.tipCardDark]}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#DAA520" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, isDarkMode && styles.textLight]}>لغير الحاج</Text>
              <Text style={[styles.tipText, isDarkMode && styles.textMuted]}>
                صيام يوم عرفة يكفر سنة ماضية وسنة قادمة. أكثر من الذكر والتكبير في هذه الأيام المباركة.
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
            style={[styles.duaModal, isDarkMode && styles.duaModalDark]}
          >
            <View style={styles.duaModalHeader}>
              <Text style={[styles.duaModalTitle, isDarkMode && styles.textLight]}>
                {selectedDua?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDua(null)}>
                <MaterialCommunityIcons name="close" size={24} color={isDarkMode ? '#fff' : '#333'} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.duaModalArabic, isDarkMode && styles.textLight]}>
              {selectedDua?.arabic}
            </Text>
            <View style={styles.duaModalOccasion}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={HAJJ_COLOR} />
              <Text style={[styles.duaModalOccasionText, isDarkMode && styles.textMuted]}>
                {selectedDua?.occasion}
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 10,
    overflow: 'hidden',
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
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  headerPlaceholder: {
    width: 40,
  },
  kaabaDecoration: {
    position: 'absolute',
    bottom: -10,
    left: 20,
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
    padding: 16,
  },

  // العشر الأوائل
  tenDaysContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  tenDaysContainerDark: {
    backgroundColor: '#1a1a2e',
  },
  tenDaysTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    textAlign: 'center',
  },
  tenDaysSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
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
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenDayItemDark: {
    backgroundColor: '#2a2a3e',
  },
  tenDayItemCompleted: {
    backgroundColor: '#2f7659',
  },
  tenDayItemCurrent: {
    backgroundColor: HAJJ_COLOR,
  },
  tenDayItemArafah: {
    backgroundColor: '#DAA520',
  },
  tenDayItemEid: {
    backgroundColor: '#e91e63',
  },
  tenDayNumber: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  tenDayNumberActive: {
    color: '#fff',
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },

  // بطاقات أيام الحج
  hajjDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  hajjDayCardDark: {
    backgroundColor: '#1a1a2e',
  },
  hajjDayCardActive: {
    borderWidth: 2,
    borderColor: HAJJ_COLOR,
  },
  hajjDayCardSpecial: {
    borderWidth: 2,
    borderColor: '#DAA520',
  },
  hajjDayCardEid: {
    borderWidth: 2,
    borderColor: '#e91e63',
  },
  dayNumber: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: `${HAJJ_COLOR}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberActive: {
    backgroundColor: HAJJ_COLOR,
  },
  dayNumberSpecial: {
    backgroundColor: '#DAA520',
  },
  dayNumberEid: {
    backgroundColor: '#e91e63',
  },
  dayNumberText: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: HAJJ_COLOR,
  },
  dayNumberLabel: {
    fontSize: 8,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  dayDescription: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 4,
  },
  ritualsPreview: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
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
    fontFamily: 'Cairo-Medium',
    color: '#999',
    alignSelf: 'center',
  },

  // أدعية الحج
  duasContainer: {
    gap: 10,
  },
  duaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  duaCardDark: {
    backgroundColor: '#1a1a2e',
  },
  duaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${HAJJ_COLOR}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  duaTitle: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  duaOccasion: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
  },

  // النصيحة
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#fff8e1',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  tipCardDark: {
    backgroundColor: '#2a2a1e',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  ritualModalDark: {
    backgroundColor: '#1a1a2e',
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
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  ritualModalDayLabel: {
    fontSize: 9,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  ritualModalInfo: {
    flex: 1,
    marginHorizontal: 14,
  },
  ritualModalName: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  ritualModalDesc: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
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
  },
  ritualSectionTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  ritualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  ritualItemDark: {
    backgroundColor: '#2a2a3e',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  ritualItemDesc: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 2,
  },
  virtuesCard: {
    backgroundColor: '#fffde7',
    borderRadius: 14,
    padding: 14,
  },
  virtuesCardDark: {
    backgroundColor: '#2a2a1e',
  },
  virtueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  virtueText: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    flex: 1,
  },
  duaBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  duaBoxDark: {
    backgroundColor: '#2a2a3e',
  },
  duaBoxText: {
    fontSize: 16,
    fontFamily: 'Cairo-Medium',
    color: '#333',
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
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  duaModalDark: {
    backgroundColor: '#1a1a2e',
  },
  duaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  duaModalTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  duaModalArabic: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  duaModalOccasion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  duaModalOccasionText: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },

  bottomSpace: {
    height: 100,
  },
});
