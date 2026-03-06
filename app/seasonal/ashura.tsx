// app/seasonal/ashura.tsx
// صفحة يوم عاشوراء - روح المسلم

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useSeasonal, useSeasonalProgress } from '@/contexts/SeasonalContext';
import { useSettings } from '@/contexts/SettingsContext';

// ========================================
// الثوابت
// ========================================

const ASHURA_COLOR = '#4A4A4A';
const ASHURA_GRADIENT = ['#4A4A4A', '#2C2C2C'];

const ASHURA_INFO = {
  title: 'يوم عاشوراء',
  subtitle: 'العاشر من محرم',
  description: 'يوم نجّى الله فيه موسى عليه السلام وقومه من فرعون',
  hadith: 'صِيَامُ يَوْمِ عَاشُورَاءَ، أَحْتَسِبُ عَلَى اللَّهِ أَنْ يُكَفِّرَ السَّنَةَ الَّتِي قَبْلَهُ',
  source: 'رواه مسلم',
};

const FASTING_DAYS = [
  {
    id: 'tasua',
    day: 9,
    name: 'تاسوعاء',
    description: 'اليوم التاسع من محرم',
    virtue: 'صيامه مستحب مع عاشوراء للمخالفة',
    recommended: true,
  },
  {
    id: 'ashura',
    day: 10,
    name: 'عاشوراء',
    description: 'اليوم العاشر من محرم',
    virtue: 'صيامه يكفر سنة ماضية',
    recommended: true,
    isMain: true,
  },
  {
    id: 'eleventh',
    day: 11,
    name: 'الحادي عشر',
    description: 'اليوم الحادي عشر من محرم',
    virtue: 'يجوز صيامه مع عاشوراء',
    recommended: false,
  },
];

const VIRTUES = [
  {
    icon: 'calendar-remove',
    title: 'تكفير سنة',
    description: 'صيامه يكفر ذنوب سنة ماضية',
  },
  {
    icon: 'history',
    title: 'يوم تاريخي',
    description: 'نجّى الله فيه موسى وبني إسرائيل',
  },
  {
    icon: 'star-outline',
    title: 'سنة نبوية',
    description: 'كان النبي ﷺ يصومه ويأمر بصيامه',
  },
  {
    icon: 'hand-heart',
    title: 'شكر لله',
    description: 'صامه النبي ﷺ شكراً لله على نجاة موسى',
  },
];

const RECOMMENDED_ACTIONS = [
  { id: 'fast_9', icon: 'food-off', title: 'صيام التاسع', subtitle: 'للمخالفة' },
  { id: 'fast_10', icon: 'food-off', title: 'صيام العاشر', subtitle: 'الأساسي' },
  { id: 'dua', icon: 'hands-pray', title: 'الدعاء', subtitle: 'والاستغفار' },
  { id: 'sadaqa', icon: 'hand-coin', title: 'الصدقة', subtitle: 'والتوسعة على العيال' },
];

// ========================================
// مكونات فرعية
// ========================================

interface FastingDayCardProps {
  day: typeof FASTING_DAYS[0];
  isFasted: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
  index: number;
}

const FastingDayCard: React.FC<FastingDayCardProps> = ({
  day,
  isFasted,
  onToggle,
  isDarkMode,
  index,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <TouchableOpacity
        style={[
          styles.fastingCard,
          isDarkMode && styles.fastingCardDark,
          day.isMain && styles.fastingCardMain,
          isFasted && styles.fastingCardFasted,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onToggle();
        }}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.fastingDayNumber,
            day.isMain && styles.fastingDayNumberMain,
            isFasted && styles.fastingDayNumberFasted,
          ]}
        >
          <Text
            style={[
              styles.fastingDayNumberText,
              (day.isMain || isFasted) && styles.fastingDayNumberTextLight,
            ]}
          >
            {day.day}
          </Text>
          <Text
            style={[
              styles.fastingDayNumberLabel,
              (day.isMain || isFasted) && styles.fastingDayNumberTextLight,
            ]}
          >
            محرم
          </Text>
        </View>

        <View style={styles.fastingContent}>
          <View style={styles.fastingHeader}>
            <Text style={[styles.fastingName, isDarkMode && styles.textLight]}>
              {day.name}
            </Text>
            {day.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>مستحب</Text>
              </View>
            )}
          </View>
          <Text style={[styles.fastingVirtue, isDarkMode && styles.textMuted]}>
            {day.virtue}
          </Text>
        </View>

        <View
          style={[
            styles.fastingCheckbox,
            isFasted && styles.fastingCheckboxChecked,
          ]}
        >
          {isFasted && <MaterialCommunityIcons name="check" size={20} color="#fff" />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface VirtueCardProps {
  virtue: typeof VIRTUES[0];
  isDarkMode: boolean;
  index: number;
}

const VirtueCard: React.FC<VirtueCardProps> = ({ virtue, isDarkMode, index }) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 80).duration(400)}
      style={[styles.virtueCard, isDarkMode && styles.virtueCardDark]}
    >
      <View style={styles.virtueIcon}>
        <MaterialCommunityIcons name={virtue.icon as any} size={24} color={ASHURA_COLOR} />
      </View>
      <Text style={[styles.virtueTitle, isDarkMode && styles.textLight]}>{virtue.title}</Text>
      <Text style={[styles.virtueDesc, isDarkMode && styles.textMuted]}>{virtue.description}</Text>
    </Animated.View>
  );
};

interface ActionItemProps {
  action: typeof RECOMMENDED_ACTIONS[0];
  isCompleted: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
}

const ActionItem: React.FC<ActionItemProps> = ({ action, isCompleted, onToggle, isDarkMode }) => {
  return (
    <TouchableOpacity
      style={[
        styles.actionItem,
        isDarkMode && styles.actionItemDark,
        isCompleted && styles.actionItemCompleted,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, isCompleted && styles.actionIconCompleted]}>
        <MaterialCommunityIcons
          name={action.icon as any}
          size={22}
          color={isCompleted ? '#fff' : ASHURA_COLOR}
        />
      </View>
      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, isDarkMode && styles.textLight]}>{action.title}</Text>
        <Text style={[styles.actionSubtitle, isDarkMode && styles.textMuted]}>{action.subtitle}</Text>
      </View>
      {isCompleted && (
        <MaterialCommunityIcons name="check-circle" size={24} color="#2f7659" />
      )}
    </TouchableOpacity>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function AshuraScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const { currentSeason, refreshSeasonalData } = useSeasonal();
  const { seasonalProgress, markDayCompleted } = useSeasonalProgress();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fastedDays, setFastedDays] = useState<number[]>([]);
  const [completedActions, setCompletedActions] = useState<string[]>([]);

  const isAshuraActive = currentSeason?.type === 'ashura' || currentSeason?.type === 'muharram';
  const currentDay = currentSeason?.currentDay || 1;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshSeasonalData();
    setIsRefreshing(false);
  }, [refreshSeasonalData]);

  const toggleFastingDay = (day: number) => {
    setFastedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  const toggleAction = (actionId: string) => {
    setCompletedActions((prev) => {
      if (prev.includes(actionId)) {
        return prev.filter((id) => id !== actionId);
      }
      return [...prev, actionId];
    });
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={ASHURA_COLOR} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: `${ASHURA_COLOR}CC` }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{ASHURA_INFO.title}</Text>
          <Text style={styles.headerSubtitle}>{ASHURA_INFO.subtitle}</Text>
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
            colors={[ASHURA_COLOR]}
          />
        }
      >
        {/* بطاقة الحديث */}
        <Animated.View entering={FadeIn.duration(500)}>
          <View style={[styles.hadithCard, isDarkMode && styles.hadithCardDark]}>
            <MaterialCommunityIcons name="format-quote-open" size={24} color={ASHURA_COLOR} />
            <Text style={[styles.hadithText, isDarkMode && styles.textLight]}>
              {ASHURA_INFO.hadith}
            </Text>
            <Text style={[styles.hadithSource, isDarkMode && styles.textMuted]}>
              {ASHURA_INFO.source}
            </Text>
          </View>
        </Animated.View>

        {/* الوصف */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.descCard, isDarkMode && styles.descCardDark]}>
            <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
            <Text style={[styles.descText, isDarkMode && styles.textMuted]}>
              {ASHURA_INFO.description}
            </Text>
          </View>
        </Animated.View>

        {/* أيام الصيام */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>أيام الصيام</Text>
        {FASTING_DAYS.map((day, index) => (
          <FastingDayCard
            key={day.id}
            day={day}
            isFasted={fastedDays.includes(day.day)}
            onToggle={() => toggleFastingDay(day.day)}
            isDarkMode={isDarkMode}
            index={index}
          />
        ))}

        {/* الفضائل */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>فضائل عاشوراء</Text>
        <View style={styles.virtuesGrid}>
          {VIRTUES.map((virtue, index) => (
            <VirtueCard key={virtue.title} virtue={virtue} isDarkMode={isDarkMode} index={index} />
          ))}
        </View>

        {/* الأعمال المستحبة */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>الأعمال المستحبة</Text>
        <View style={[styles.actionsCard, isDarkMode && styles.actionsCardDark]}>
          {RECOMMENDED_ACTIONS.map((action) => (
            <ActionItem
              key={action.id}
              action={action}
              isCompleted={completedActions.includes(action.id)}
              onToggle={() => toggleAction(action.id)}
              isDarkMode={isDarkMode}
            />
          ))}
        </View>

        {/* نصيحة */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <View style={[styles.tipCard, isDarkMode && styles.tipCardDark]}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#f5a623" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, isDarkMode && styles.textLight]}>نصيحة</Text>
              <Text style={[styles.tipText, isDarkMode && styles.textMuted]}>
                يُستحب صيام يوم تاسوعاء (التاسع) مع عاشوراء (العاشر) للمخالفة، 
                كما قال النبي ﷺ: "لئن بقيت إلى قابل لأصومن التاسع"
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
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

  // بطاقة الحديث
  hadithCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  hadithCardDark: {
    backgroundColor: '#1a1a2e',
  },
  hadithText: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    textAlign: 'center',
    lineHeight: 32,
    marginVertical: 16,
  },
  hadithSource: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#999',
  },

  // الوصف
  descCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  descCardDark: {
    backgroundColor: '#1a2a3a',
  },
  descText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#333',
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },

  // بطاقات الصيام
  fastingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  fastingCardDark: {
    backgroundColor: '#1a1a2e',
  },
  fastingCardMain: {
    borderWidth: 2,
    borderColor: ASHURA_COLOR,
  },
  fastingCardFasted: {
    backgroundColor: '#e8f5e9',
  },
  fastingDayNumber: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fastingDayNumberMain: {
    backgroundColor: ASHURA_COLOR,
  },
  fastingDayNumberFasted: {
    backgroundColor: '#2f7659',
  },
  fastingDayNumberText: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  fastingDayNumberLabel: {
    fontSize: 9,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },
  fastingDayNumberTextLight: {
    color: '#fff',
  },
  fastingContent: {
    flex: 1,
    marginHorizontal: 14,
  },
  fastingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fastingName: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  recommendedBadge: {
    backgroundColor: '#2f7659',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontFamily: 'Cairo-Medium',
    color: '#fff',
  },
  fastingVirtue: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 4,
  },
  fastingCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fastingCheckboxChecked: {
    backgroundColor: '#2f7659',
    borderColor: '#2f7659',
  },

  // الفضائل
  virtuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  virtueCard: {
    width: '50%',
    padding: 6,
  },
  virtueCardDark: {},
  virtueIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${ASHURA_COLOR}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  virtueTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  virtueDesc: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 4,
  },

  // الأعمال المستحبة
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionsCardDark: {
    backgroundColor: '#1a1a2e',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionItemDark: {
    borderBottomColor: '#2a2a3e',
  },
  actionItemCompleted: {
    backgroundColor: '#f0fff4',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${ASHURA_COLOR}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCompleted: {
    backgroundColor: '#2f7659',
  },
  actionContent: {
    flex: 1,
    marginHorizontal: 14,
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  actionSubtitle: {
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
    marginTop: 24,
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

  bottomSpace: {
    height: 100,
  },
});
