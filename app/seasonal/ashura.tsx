// app/seasonal/ashura.tsx
// صفحة يوم عاشوراء - روح المسلم

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useSeasonal, useSeasonalProgress } from '@/contexts/SeasonalContext';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { AppIcon } from '@/components/ui/AppIcon';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { getLanguage } from '@/lib/i18n';
import TranslatedText from '@/components/ui/TranslatedText';

// ========================================
// الثوابت
// ========================================

const ASHURA_COLOR_LIGHT = '#4A4A4A';
const ASHURA_COLOR_DARK = '#9E9E9E';
const getAshuraColor = (isDark: boolean) => isDark ? ASHURA_COLOR_DARK : ASHURA_COLOR_LIGHT;

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
  { id: 'dua', icon: '🤲', title: 'الدعاء', subtitle: 'والاستغفار' },
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { t } = useSettings();
  const ashuraColor = getAshuraColor(isDarkMode);
  const isRTL = useIsRTL();
  const nameMap: Record<string, string> = {
    tasua: t('seasonal.ashura.tasua'),
    ashura: t('seasonal.ashura.ashuraDay'),
    eleventh: t('seasonal.ashura.eleventh'),
  };
  const virtueMap: Record<string, string> = {
    tasua: t('seasonal.ashura.tasuaVirtue'),
    ashura: t('seasonal.ashura.ashuraVirtue'),
    eleventh: t('seasonal.ashura.eleventhVirtue'),
  };
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <TouchableOpacity
        style={[
          styles.fastingCard,
          { backgroundColor: colors.card },
          day.isMain && styles.fastingCardMain,
          isFasted && { backgroundColor: isDarkMode ? 'rgba(13,142,98,0.15)' : '#e8f5e9' },
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onToggle();
        }}
        activeOpacity={0.8}
      >
        {/* Checkbox first in JSX so row-reverse puts it on RIGHT in RTL */}
        <View
          style={[
            styles.fastingCheckbox,
            { borderColor: colors.border },
            isFasted && styles.fastingCheckboxChecked,
          ]}
        >
          {isFasted && <MaterialCommunityIcons name="check" size={20} color="#fff" />}
        </View>

        <View style={styles.fastingContent}>
          <View style={[styles.fastingHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.fastingName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {nameMap[day.id] || day.name}
            </Text>
            {day.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>{t('seasonal.ashura.recommended')}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.fastingVirtue, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
            {virtueMap[day.id] || day.virtue}
          </Text>
        </View>

        <View
          style={[
            styles.fastingDayNumber,
            { backgroundColor: colors.surface },
            day.isMain && { backgroundColor: ashuraColor },
            isFasted && styles.fastingDayNumberFasted,
          ]}
        >
          <Text
            style={[
              styles.fastingDayNumberText,
              { color: colors.text },
              (day.isMain || isFasted) && styles.fastingDayNumberTextLight,
            ]}
          >
            {day.day}
          </Text>
          <Text
            style={[
              styles.fastingDayNumberLabel,
              { color: colors.textLight },
              (day.isMain || isFasted) && styles.fastingDayNumberTextLight,
            ]}
          >
            {t('seasonal.ashura.muharram')}
          </Text>
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { t } = useSettings();
  const ashuraColor = getAshuraColor(isDarkMode);
  const isRTL = useIsRTL();
  const titleMap: Record<string, string> = {
    'calendar-remove': t('seasonal.ashura.virtueExpiation'),
    'history': t('seasonal.ashura.virtueHistoric'),
    'star-outline': t('seasonal.ashura.virtueSunnah'),
    'hand-heart': t('seasonal.ashura.virtueGratitude'),
  };
  const descMap: Record<string, string> = {
    'calendar-remove': t('seasonal.ashura.virtueExpiationDesc'),
    'history': t('seasonal.ashura.virtueHistoricDesc'),
    'star-outline': t('seasonal.ashura.virtueSunnahDesc'),
    'hand-heart': t('seasonal.ashura.virtueGratitudeDesc'),
  };
  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 80).duration(400)}
      style={styles.virtueCardOuter}
    >
      <View style={[styles.virtueCard, { backgroundColor: colors.card }]}>
        <View style={[styles.virtueIcon, { backgroundColor: `${ashuraColor}15` }]}>
          <MaterialCommunityIcons name={virtue.icon as any} size={28} color={ashuraColor} />
        </View>
        <Text style={[styles.virtueTitle, { color: colors.text }]}>{titleMap[virtue.icon] || virtue.title}</Text>
        <Text style={[styles.virtueDesc, { color: colors.textLight }]}>{descMap[virtue.icon] || virtue.description}</Text>
      </View>
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { t } = useSettings();
  const isRTL = useIsRTL();
  const ashuraColor = getAshuraColor(isDarkMode);
  const titleMap: Record<string, string> = {
    fast_9: t('seasonal.ashura.actionFast9'),
    fast_10: t('seasonal.ashura.actionFast10'),
    dua: t('seasonal.ashura.actionDua'),
    sadaqa: t('seasonal.ashura.actionSadaqa'),
  };
  const subMap: Record<string, string> = {
    fast_9: t('seasonal.ashura.actionFast9Sub'),
    fast_10: t('seasonal.ashura.actionFast10Sub'),
    dua: t('seasonal.ashura.actionDuaSub'),
    sadaqa: t('seasonal.ashura.actionSadaqaSub'),
  };
  return (
    <TouchableOpacity
      style={[
        styles.actionItem,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
        isCompleted && { backgroundColor: isDarkMode ? 'rgba(13,142,98,0.12)' : '#f0fff4' },
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${ashuraColor}15` }, isCompleted && styles.actionIconCompleted]}>
        <AppIcon name={action.icon} size={22} color={isCompleted ? '#fff' : ashuraColor} />
      </View>
      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, { color: isCompleted && !isDarkMode ? '#1B5E20' : colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{titleMap[action.id] || action.title}</Text>
        <Text style={[styles.actionSubtitle, { color: isCompleted && !isDarkMode ? 'rgba(27,94,32,0.75)' : colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{subMap[action.id] || action.subtitle}</Text>
      </View>
      {isCompleted && (
        <MaterialCommunityIcons name="check-circle" size={24} color="#0d8e62" />
      )}
    </TouchableOpacity>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function AshuraScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { isDarkMode, settings, t } = useSettings();
  const { currentSeason, refreshSeasonalData } = useSeasonal();
  const { seasonalProgress, markDayCompleted } = useSeasonalProgress();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isArabic = getLanguage() === 'ar';
  const insets = useSafeAreaInsets();
  const ashuraColor = getAshuraColor(isDarkMode);

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('seasonal.ashura.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>{t('seasonal.ashura.subtitle')}</Text>
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
            tintColor={colors.text}
            colors={[getAshuraColor(isDarkMode)]}
          />
        }
      >
        {/* بطاقة الحديث */}
        <Animated.View entering={FadeIn.duration(500)}>
          <View style={[styles.hadithCard, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="format-quote-open" size={24} color={getAshuraColor(isDarkMode)} />
            {isArabic ? (
              <Text style={[styles.hadithText, { color: colors.text }]}>{ASHURA_INFO.hadith}</Text>
            ) : (
              <TranslatedText style={[styles.hadithText, { color: colors.text }]}>{ASHURA_INFO.hadith}</TranslatedText>
            )}
            <Text style={[styles.hadithSource, { color: colors.textLight }]}>
              {t('seasonal.ashura.hadithSource')}
            </Text>
          </View>
        </Animated.View>

        {/* الوصف */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.descCard, { backgroundColor: isDarkMode ? 'rgba(58,124,165,0.12)' : '#e3f2fd', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
            <Text style={[styles.descText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('seasonal.ashura.description')}
            </Text>
          </View>
        </Animated.View>

        {/* أيام الصيام */}
        <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('seasonal.ashura.fastingDays')}</Text>
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
        <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('seasonal.ashura.virtues')}</Text>
        <View style={[styles.virtuesGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {VIRTUES.map((virtue, index) => (
            <VirtueCard key={virtue.title} virtue={virtue} isDarkMode={isDarkMode} index={index} />
          ))}
        </View>

        {/* الأعمال المستحبة */}
        <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('seasonal.ashura.recommendedActions')}</Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card }]}>
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
          <View style={[styles.tipCard, { backgroundColor: isDarkMode ? 'rgba(192,123,16,0.12)' : '#fff8e1', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#c07b10" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: isDarkMode ? colors.text : '#5D4037', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('seasonal.ashura.tip')}</Text>
              <Text style={[styles.tipText, { color: isDarkMode ? colors.textLight : 'rgba(93,64,55,0.75)', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('seasonal.ashura.tipText')}
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

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // بطاقة الحديث
  hadithCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  hadithText: {
    fontSize: 18,
    fontFamily: fontBold(),
    textAlign: 'center',
    lineHeight: 32,
    marginVertical: 16,
  },
  hadithSource: {
    fontSize: 13,
    fontFamily: fontRegular(),
  },

  // الوصف
  descCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  descText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontRegular(),
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginTop: 24,
    marginBottom: 12,
  },

  // بطاقات الصيام
  fastingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  fastingCardMain: {
    borderWidth: 2,
    borderColor: ASHURA_COLOR_LIGHT,
  },
  fastingCardFasted: {
  },
  fastingDayNumber: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fastingDayNumberMain: {
    backgroundColor: ASHURA_COLOR_LIGHT,
  },
  fastingDayNumberFasted: {
    backgroundColor: '#0d8e62',
  },
  fastingDayNumberText: {
    fontSize: 20,
    fontFamily: fontBold(),
  },
  fastingDayNumberLabel: {
    fontSize: 9,
    fontFamily: fontRegular(),
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
    fontFamily: fontBold(),
  },
  recommendedBadge: {
    backgroundColor: '#0d8e62',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontFamily: fontMedium(),
    color: '#fff',
  },
  fastingVirtue: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 4,
  },
  fastingCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fastingCheckboxChecked: {
    backgroundColor: '#0d8e62',
    borderColor: '#0d8e62',
  },

  // الفضائل
  virtuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  virtueCardOuter: {
    width: '50%',
    padding: 6,
  },
  virtueCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minHeight: 150,
  },
  virtueIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  virtueTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
    textAlign: 'center',
    lineHeight: 24,
  },
  virtueDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },

  // الأعمال المستحبة
  actionsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  actionItemCompleted: {
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCompleted: {
    backgroundColor: '#0d8e62',
  },
  actionContent: {
    flex: 1,
    marginHorizontal: 14,
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
  },
  actionSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
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
