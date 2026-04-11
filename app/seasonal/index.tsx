// app/seasonal/index.tsx
// الصفحة الرئيسية للمحتوى الموسمي - روح المسلم

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight, FadeIn } from 'react-native-reanimated';

import { useSeasonal } from '@/contexts/SeasonalContext';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { SeasonInfo, SeasonType, getSeasonProgress } from '@/lib/seasonal-content';
import GlassCard from '@/components/ui/GlassCard';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getLanguage } from '@/lib/i18n';
import TranslatedText from '@/components/ui/TranslatedText';
import { UniversalHeader } from '@/components/ui';

const getSeasonName = (season: { nameAr: string; nameEn: string }) => {
  return getLanguage() === 'ar' ? season.nameAr : season.nameEn;
};

const { width } = Dimensions.get('window');

// ========================================
// مكونات فرعية
// ========================================

interface ActiveSeasonCardProps {
  season: SeasonInfo;
  greeting: string;
  onPress: () => void;
  isDarkMode: boolean;
}

const ActiveSeasonCard: React.FC<ActiveSeasonCardProps> = ({
  season,
  greeting,
  onPress,
  isDarkMode,
}) => {
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const progress = getSeasonProgress(season);

  return (
    <Animated.View entering={FadeInDown.duration(600)}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View
          style={[styles.activeSeasonCard, { backgroundColor: `${season.color}CC` }]}
        >
          {/* الخلفية الزخرفية */}
          <View style={styles.decorativePattern}>
            <MaterialCommunityIcons
              name={season.icon as any}
              size={150}
              color="rgba(255,255,255,0.1)"
              style={styles.decorativeIcon}
            />
          </View>

          {/* المحتوى */}
          <View style={styles.activeSeasonContent}>
            <View style={[styles.seasonBadge, { alignSelf: isRTL ? 'flex-end' : 'flex-start', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name={season.icon as any} size={24} color="#fff" />
              <Text style={styles.seasonBadgeText}>{t('seasonal.activeSeason')}</Text>
            </View>

            <Text style={styles.activeSeasonName}>{getSeasonName(season)}</Text>
            
            {greeting && (
              <Text style={styles.activeSeasonGreeting}>{greeting}</Text>
            )}

            {/* معلومات اليوم */}
            <View style={[styles.dayInfoContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.dayInfoItem}>
                <Text style={styles.dayInfoValue}>{season.currentDay}</Text>
                <Text style={styles.dayInfoLabel}>{t('seasonal.currentDay')}</Text>
              </View>
              <View style={styles.dayInfoDivider} />
              <View style={styles.dayInfoItem}>
                <Text style={styles.dayInfoValue}>{season.daysRemaining}</Text>
                <Text style={styles.dayInfoLabel}>{t('seasonal.daysRemaining')}</Text>
              </View>
              <View style={styles.dayInfoDivider} />
              <View style={styles.dayInfoItem}>
                <Text style={styles.dayInfoValue}>{Math.round(progress)}%</Text>
                <Text style={styles.dayInfoLabel}>{t('seasonal.progress')}</Text>
              </View>
            </View>

            {/* شريط التقدم */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarBg, isRTL && { transform: [{ scaleX: -1 }] }]}>
                <Animated.View
                  style={[styles.progressBarFill, { width: `${progress}%` }]}
                />
              </View>
            </View>

            {/* زر الدخول */}
            <View style={[styles.enterButtonContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.enterButtonText}>{t('seasonal.enterSeason')}</Text>
              <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={20} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface UpcomingSeasonCardProps {
  season: SeasonInfo & { daysUntil: number };
  isDarkMode: boolean;
}

const UpcomingSeasonCard: React.FC<UpcomingSeasonCardProps> = ({ season, isDarkMode }) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(500)}>
      <View style={[styles.upcomingCard, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.upcomingIconContainer}>
          <MaterialCommunityIcons name={season.icon as any} size={28} color={season.color} />
        </View>
        <View style={styles.upcomingContent}>
          <Text style={[styles.upcomingLabel, { color: colors.textLight }]}>
            {t('seasonal.nextSeason')}
          </Text>
          <Text style={[styles.upcomingName, { color: colors.text }]}>
            {getSeasonName(season)}
          </Text>
        </View>
        <View style={styles.upcomingDays}>
          <Text style={[styles.upcomingDaysValue, { color: season.color }]}>
            {season.daysUntil}
          </Text>
          <Text style={[styles.upcomingDaysLabel, { color: colors.textLight }]}>
            {t('seasonal.day')}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

interface SpecialDayCardProps {
  day: {
    day: number;
    nameAr: string;
    nameEn?: string;
    description: string;
    virtues: string[];
    recommendedActions: string[];
  };
  seasonColor: string;
  isDarkMode: boolean;
}

const SpecialDayCard: React.FC<SpecialDayCardProps> = ({ day, seasonColor, isDarkMode }) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  return (
    <Animated.View entering={FadeIn.duration(500)}>
      <View style={styles.starAboveCardWrapper}>
        <View style={styles.starAboveCard}>
          <MaterialCommunityIcons name="star-four-points" size={24} color="#c07b10" />
        </View>
        <View
          style={[styles.specialDayCard, { backgroundColor: isDarkMode ? 'rgba(42,42,62,0.85)' : 'rgba(255,248,225,0.85)' }]}
        >
          <View style={[styles.specialDayHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.specialDayTitle, { color: isDarkMode ? colors.text : '#5D4037' }]}>
              {t('seasonal.specialDay')}: {getLanguage() === 'ar' ? day.nameAr : day.nameEn}
            </Text>
          </View>
        <Text style={[styles.specialDayDesc, { color: isDarkMode ? colors.textLight : 'rgba(93,64,55,0.75)' }]}>
          {day.description}
        </Text>
        
        {day.virtues.length > 0 && (
          <View style={styles.virtuesContainer}>
            <Text style={[styles.virtuesTitle, { color: isDarkMode ? colors.text : '#5D4037' }]}>{t('seasonal.ashura.virtues')}:</Text>
            {day.virtues.map((virtue, index) => (
              <View key={index} style={[styles.virtueItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="check-circle" size={16} color={seasonColor} />
                <Text style={[styles.virtueText, { color: isDarkMode ? colors.textLight : 'rgba(93,64,55,0.75)' }]}>{virtue}</Text>
              </View>
            ))}
          </View>
        )}

        {day.recommendedActions.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={[styles.actionsTitle, { color: isDarkMode ? colors.text : '#5D4037' }]}>{t('seasonal.ashura.recommendedActions')}:</Text>
            {day.recommendedActions.map((action, index) => (
              <View key={index} style={[styles.actionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="hand-pointing-right" size={16} color="#0d8e62" />
                <Text style={[styles.actionText, { color: isDarkMode ? colors.textLight : 'rgba(93,64,55,0.75)' }]}>{action}</Text>
              </View>
            ))}
          </View>
        )}
        </View>
      </View>
    </Animated.View>
  );
};

interface SeasonGridItemProps {
  season: SeasonInfo;
  onPress: () => void;
  index: number;
  isDarkMode: boolean;
}

const SeasonGridItem: React.FC<SeasonGridItemProps> = ({ season, onPress, index, isDarkMode }) => {
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <Animated.View
      entering={FadeInRight.delay(index * 80).duration(400)}
      style={styles.gridItemContainer}
    >
      <TouchableOpacity
        style={[styles.gridItem, { backgroundColor: colors.card }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.gridIconBg}>
          <MaterialCommunityIcons name={season.icon as any} size={28} color={season.color} />
        </View>
        <Text style={[styles.gridItemName, { color: colors.text }]} numberOfLines={1}>
          {getSeasonName(season)}
        </Text>
        {season.isActive && (
          <View style={[styles.activeDot, { backgroundColor: season.color }, isRTL ? { left: 8, right: undefined } : null]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

interface NoSeasonCardProps {
  upcomingSeason: (SeasonInfo & { daysUntil: number }) | null;
  isDarkMode: boolean;
}

const NoSeasonCard: React.FC<NoSeasonCardProps> = ({ upcomingSeason, isDarkMode }) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <Animated.View entering={FadeInDown.duration(500)}>
      <View style={[styles.noSeasonCard, { backgroundColor: colors.card }]}>
        <MaterialCommunityIcons
          name="calendar-clock"
          size={60}
          color={colors.textLight}
        />
        <Text style={[styles.noSeasonTitle, { color: colors.text }]}>
          {t('seasonal.noActiveSeason')}
        </Text>
        {getLanguage() === 'ar' ? (
          <Text style={[styles.noSeasonSubtitle, { color: colors.textLight }]}>
            استمر في عباداتك اليومية وانتظر المواسم القادمة
          </Text>
        ) : (
          <TranslatedText style={[styles.noSeasonSubtitle, { color: colors.textLight }]}>
            استمر في عباداتك اليومية وانتظر المواسم القادمة
          </TranslatedText>
        )}
        {upcomingSeason && (
          <View style={styles.noSeasonUpcoming}>
            <Text style={[styles.noSeasonUpcomingText, { color: colors.textLight }]}>
              {t('seasonal.nextSeason')}: {getSeasonName(upcomingSeason)} - {upcomingSeason.daysUntil} {t('seasonal.day')}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function SeasonalIndexScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { isDarkMode, settings } = useSettings();
  const {
    isLoading,
    currentSeason,
    upcomingSeason,
    specialDay,
    dailyData,
    allSeasons,
    refreshSeasonalData,
  } = useSeasonal();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshSeasonalData();
    setIsRefreshing(false);
  }, [refreshSeasonalData]);

  const navigateToSeason = (seasonType: SeasonType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/seasonal/${seasonType}` as any);
  };

  const handleActiveSeasonPress = () => {
    if (currentSeason) {
      navigateToSeason(currentSeason.type);
    }
  };

  // ترتيب المواسم: النشط أولاً، ثم حسب القرب
  const sortedSeasons = [...allSeasons].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return 0;
  });

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <UniversalHeader
        title={t('seasonal.islamicSeasons')}
        titleColor={colors.text}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={['#0d8e62']}
          />
        }
      >
        {/* الموسم النشط */}
        {currentSeason ? (
          <>
            <ActiveSeasonCard
              season={currentSeason}
              greeting={dailyData.greeting}
              onPress={handleActiveSeasonPress}
              isDarkMode={isDarkMode}
            />

            {/* اليوم المميز */}
            {specialDay && (
              <View style={styles.specialDaySection}>
                <SpecialDayCard
                  day={specialDay}
                  seasonColor={currentSeason.color}
                  isDarkMode={isDarkMode}
                />
              </View>
            )}
          </>
        ) : (
          <>
            <NoSeasonCard upcomingSeason={upcomingSeason} isDarkMode={isDarkMode} />

            {/* الموسم القادم */}
            {upcomingSeason && (
              <View style={styles.upcomingSection}>
                <UpcomingSeasonCard season={upcomingSeason} isDarkMode={isDarkMode} />
              </View>
            )}
          </>
        )}

        {/* جميع المواسم */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>
            {t('seasonal.allSeasons')}
          </Text>
          <View style={styles.seasonsGrid}>
            {sortedSeasons.map((season, index) => (
              <SeasonGridItem
                key={season.type}
                season={season}
                onPress={() => navigateToSeason(season.type)}
                index={index}
                isDarkMode={isDarkMode}
              />
            ))}
          </View>
        </Animated.View>

        {/* نصيحة */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.tipCard}>
          <View
            style={[styles.tipGradient, { backgroundColor: isDarkMode ? 'rgba(26,42,26,0.85)' : 'rgba(232,245,233,0.85)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#0d8e62" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>{t('seasonal.hajj.tipTitle')}</Text>
              <Text style={[styles.tipText, { color: colors.textLight }]}>
                استغل المواسم الإسلامية في مضاعفة الأجر والتقرب إلى الله بالطاعات
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
// دوال مساعدة
// ========================================

const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

// ========================================
// الأنماط
// ========================================

const _styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // بطاقة الموسم النشط
  activeSeasonCard: {
    borderRadius: 24,
    padding: 24,
    minHeight: 280,
    overflow: 'hidden',
  },
  decorativePattern: {
    position: 'absolute',
    top: -30,
    right: -30,
  },
  decorativeIcon: {
    opacity: 0.5,
  },
  activeSeasonContent: {
    flex: 1,
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
  },
  seasonBadgeText: {
    fontSize: 12,
    fontFamily: fontMedium(),
    color: '#fff',
  },
  activeSeasonName: {
    fontSize: 32,
    fontFamily: fontBold(),
    color: '#fff',
    marginTop: 15,
  },
  activeSeasonGreeting: {
    fontSize: 16,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  dayInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 15,
  },
  dayInfoItem: {
    alignItems: 'center',
  },
  dayInfoValue: {
    fontSize: 24,
    fontFamily: fontBold(),
    color: '#fff',
  },
  dayInfoLabel: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
  },
  dayInfoDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBarContainer: {
    marginTop: 15,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  enterButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  enterButtonText: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: '#fff',
  },

  // بطاقة الموسم القادم
  upcomingSection: {
    marginTop: 16,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
  },
  upcomingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  upcomingLabel: {
    fontSize: 12,
    fontFamily: fontRegular(),
  },
  upcomingName: {
    fontSize: 18,
    fontFamily: fontBold(),
  },
  upcomingDays: {
    alignItems: 'center',
  },
  upcomingDaysValue: {
    fontSize: 28,
    fontFamily: fontBold(),
  },
  upcomingDaysLabel: {
    fontSize: 12,
    fontFamily: fontRegular(),
  },

  // بطاقة اليوم المميز
  specialDaySection: {
    marginTop: 16,
  },
  starAboveCardWrapper: {
    marginTop: 20,
    alignItems: 'center',
  },
  starAboveCard: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245,166,35,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -20,
    zIndex: 1,
  },
  specialDayCard: {
    borderRadius: 16,
    padding: 16,
    paddingTop: 28,
  },
  specialDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  specialDayTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
  },
  specialDayDesc: {
    fontSize: 14,
    fontFamily: fontRegular(),
    marginBottom: 12,
  },
  virtuesContainer: {
    marginBottom: 12,
  },
  virtuesTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    marginBottom: 8,
  },
  virtueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  virtueText: {
    fontSize: 13,
    fontFamily: fontRegular(),
    flex: 1,
  },
  actionsContainer: {},
  actionsTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    fontFamily: fontRegular(),
    flex: 1,
  },

  // بطاقة لا يوجد موسم
  noSeasonCard: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  noSeasonTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginTop: 15,
  },
  noSeasonSubtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginTop: 8,
  },
  noSeasonUpcoming: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  noSeasonUpcomingText: {
    fontSize: 14,
    fontFamily: fontMedium(),
  },

  // شبكة المواسم
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    marginTop: 24,
    marginBottom: 12,
  },
  seasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItemContainer: {
    width: '33.33%',
    padding: 6,
  },
  gridItem: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  gridIconBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridItemName: {
    fontSize: 12,
    fontFamily: fontMedium(),
    textAlign: 'center',
  },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // بطاقة النصيحة
  tipCard: {
    marginTop: 24,
  },
  tipGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#0d8e62',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 22,
  },

  bottomSpace: {
    height: 100,
  },
});
