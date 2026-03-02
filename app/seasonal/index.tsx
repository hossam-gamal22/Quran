// app/seasonal/index.tsx
// الصفحة الرئيسية للمحتوى الموسمي - روح المسلم

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useSeasonal } from '@/contexts/SeasonalContext';
import { useSettings } from '@/contexts/SettingsContext';
import { SeasonInfo, SeasonType, getSeasonProgress } from '@/lib/seasonal-content';
import GlassCard from '@/components/ui/GlassCard';

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
  const progress = getSeasonProgress(season);

  return (
    <Animated.View entering={FadeInDown.duration(600)}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <LinearGradient
          colors={[season.color, adjustColor(season.color, -30)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeSeasonCard}
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
            <View style={styles.seasonBadge}>
              <MaterialCommunityIcons name={season.icon as any} size={24} color="#fff" />
              <Text style={styles.seasonBadgeText}>موسم نشط</Text>
            </View>

            <Text style={styles.activeSeasonName}>{season.nameAr}</Text>
            
            {greeting && (
              <Text style={styles.activeSeasonGreeting}>{greeting}</Text>
            )}

            {/* معلومات اليوم */}
            <View style={styles.dayInfoContainer}>
              <View style={styles.dayInfoItem}>
                <Text style={styles.dayInfoValue}>{season.currentDay}</Text>
                <Text style={styles.dayInfoLabel}>اليوم الحالي</Text>
              </View>
              <View style={styles.dayInfoDivider} />
              <View style={styles.dayInfoItem}>
                <Text style={styles.dayInfoValue}>{season.daysRemaining}</Text>
                <Text style={styles.dayInfoLabel}>يوم متبقي</Text>
              </View>
              <View style={styles.dayInfoDivider} />
              <View style={styles.dayInfoItem}>
                <Text style={styles.dayInfoValue}>{Math.round(progress)}%</Text>
                <Text style={styles.dayInfoLabel}>التقدم</Text>
              </View>
            </View>

            {/* شريط التقدم */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[styles.progressBarFill, { width: `${progress}%` }]}
                />
              </View>
            </View>

            {/* زر الدخول */}
            <View style={styles.enterButtonContainer}>
              <Text style={styles.enterButtonText}>ادخل للموسم</Text>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface UpcomingSeasonCardProps {
  season: SeasonInfo & { daysUntil: number };
  isDarkMode: boolean;
}

const UpcomingSeasonCard: React.FC<UpcomingSeasonCardProps> = ({ season, isDarkMode }) => {
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(500)}>
      <View style={[styles.upcomingCard, isDarkMode && styles.upcomingCardDark]}>
        <View style={[styles.upcomingIconContainer, { backgroundColor: `${season.color}20` }]}>
          <MaterialCommunityIcons name={season.icon as any} size={28} color={season.color} />
        </View>
        <View style={styles.upcomingContent}>
          <Text style={[styles.upcomingLabel, isDarkMode && styles.textMuted]}>
            الموسم القادم
          </Text>
          <Text style={[styles.upcomingName, isDarkMode && styles.textLight]}>
            {season.nameAr}
          </Text>
        </View>
        <View style={styles.upcomingDays}>
          <Text style={[styles.upcomingDaysValue, { color: season.color }]}>
            {season.daysUntil}
          </Text>
          <Text style={[styles.upcomingDaysLabel, isDarkMode && styles.textMuted]}>
            يوم
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
    description: string;
    virtues: string[];
    recommendedActions: string[];
  };
  seasonColor: string;
  isDarkMode: boolean;
}

const SpecialDayCard: React.FC<SpecialDayCardProps> = ({ day, seasonColor, isDarkMode }) => {
  return (
    <Animated.View entering={FadeIn.duration(500)}>
      <LinearGradient
        colors={isDarkMode ? ['#2a2a3e', '#1a1a2e'] : ['#fff8e1', '#fff3cd']}
        style={styles.specialDayCard}
      >
        <View style={styles.specialDayHeader}>
          <MaterialCommunityIcons name="star-four-points" size={24} color="#f5a623" />
          <Text style={[styles.specialDayTitle, isDarkMode && styles.textLight]}>
            يوم مميز: {day.nameAr}
          </Text>
        </View>
        <Text style={[styles.specialDayDesc, isDarkMode && styles.textMuted]}>
          {day.description}
        </Text>
        
        {day.virtues.length > 0 && (
          <View style={styles.virtuesContainer}>
            <Text style={[styles.virtuesTitle, isDarkMode && styles.textLight]}>الفضائل:</Text>
            {day.virtues.map((virtue, index) => (
              <View key={index} style={styles.virtueItem}>
                <MaterialCommunityIcons name="check-circle" size={16} color={seasonColor} />
                <Text style={[styles.virtueText, isDarkMode && styles.textMuted]}>{virtue}</Text>
              </View>
            ))}
          </View>
        )}

        {day.recommendedActions.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={[styles.actionsTitle, isDarkMode && styles.textLight]}>الأعمال المستحبة:</Text>
            {day.recommendedActions.map((action, index) => (
              <View key={index} style={styles.actionItem}>
                <MaterialCommunityIcons name="hand-pointing-right" size={16} color="#2f7659" />
                <Text style={[styles.actionText, isDarkMode && styles.textMuted]}>{action}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
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
  return (
    <Animated.View
      entering={FadeInRight.delay(index * 80).duration(400)}
      style={styles.gridItemContainer}
    >
      <TouchableOpacity
        style={[styles.gridItem, isDarkMode && styles.gridItemDark]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.gridIconBg, { backgroundColor: `${season.color}20` }]}>
          <MaterialCommunityIcons name={season.icon as any} size={28} color={season.color} />
        </View>
        <Text style={[styles.gridItemName, isDarkMode && styles.textLight]} numberOfLines={1}>
          {season.nameAr}
        </Text>
        {season.isActive && (
          <View style={[styles.activeDot, { backgroundColor: season.color }]} />
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
  return (
    <Animated.View entering={FadeInDown.duration(500)}>
      <View style={[styles.noSeasonCard, isDarkMode && styles.noSeasonCardDark]}>
        <MaterialCommunityIcons
          name="calendar-clock"
          size={60}
          color={isDarkMode ? '#444' : '#ddd'}
        />
        <Text style={[styles.noSeasonTitle, isDarkMode && styles.textLight]}>
          لا يوجد موسم نشط حالياً
        </Text>
        <Text style={[styles.noSeasonSubtitle, isDarkMode && styles.textMuted]}>
          استمر في عباداتك اليومية وانتظر المواسم القادمة
        </Text>
        {upcomingSeason && (
          <View style={styles.noSeasonUpcoming}>
            <Text style={[styles.noSeasonUpcomingText, isDarkMode && styles.textMuted]}>
              الموسم القادم: {upcomingSeason.nameAr} بعد {upcomingSeason.daysUntil} يوم
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
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const {
    isLoading,
    currentSeason,
    upcomingSeason,
    specialDay,
    dailyData,
    allSeasons,
    refreshSeasonalData,
  } = useSeasonal();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshSeasonalData();
    setIsRefreshing(false);
  }, [refreshSeasonalData]);

  const navigateToSeason = (seasonType: SeasonType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/seasonal/${seasonType}`);
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
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, isDarkMode && styles.headerDark]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons
            name="arrow-right"
            size={28}
            color={isDarkMode ? '#fff' : '#333'}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>المواسم الإسلامية</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDarkMode ? '#fff' : '#2f7659'}
            colors={['#2f7659']}
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
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
            جميع المواسم
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
          <LinearGradient
            colors={isDarkMode ? ['#1a2a1a', '#0d1a0d'] : ['#e8f5e9', '#c8e6c9']}
            style={styles.tipGradient}
          >
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#2f7659" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, isDarkMode && styles.textLight]}>نصيحة</Text>
              <Text style={[styles.tipText, isDarkMode && styles.textMuted]}>
                استغل المواسم الإسلامية في مضاعفة الأجر والتقرب إلى الله بالطاعات
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerDark: {
    backgroundColor: '#1a1a2e',
    borderBottomColor: '#2a2a3e',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
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
    gap: 6,
  },
  seasonBadgeText: {
    fontSize: 12,
    fontFamily: 'Cairo-Medium',
    color: '#fff',
  },
  activeSeasonName: {
    fontSize: 32,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    marginTop: 15,
  },
  activeSeasonGreeting: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  dayInfoLabel: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },

  // بطاقة الموسم القادم
  upcomingSection: {
    marginTop: 16,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  upcomingCardDark: {
    backgroundColor: '#1a1a2e',
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
    fontFamily: 'Cairo-Regular',
    color: '#999',
  },
  upcomingName: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  upcomingDays: {
    alignItems: 'center',
  },
  upcomingDaysValue: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
  },
  upcomingDaysLabel: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
  },

  // بطاقة اليوم المميز
  specialDaySection: {
    marginTop: 16,
  },
  specialDayCard: {
    borderRadius: 16,
    padding: 16,
  },
  specialDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  specialDayTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  specialDayDesc: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginBottom: 12,
  },
  virtuesContainer: {
    marginBottom: 12,
  },
  virtuesTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#333',
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
    fontFamily: 'Cairo-Regular',
    color: '#666',
    flex: 1,
  },
  actionsContainer: {},
  actionsTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#333',
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
    fontFamily: 'Cairo-Regular',
    color: '#666',
    flex: 1,
  },

  // بطاقة لا يوجد موسم
  noSeasonCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  noSeasonCardDark: {
    backgroundColor: '#1a1a2e',
  },
  noSeasonTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginTop: 15,
  },
  noSeasonSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#999',
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
    fontFamily: 'Cairo-Medium',
    color: '#666',
  },

  // شبكة المواسم
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#666',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  gridItemDark: {
    backgroundColor: '#1a1a2e',
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
    fontFamily: 'Cairo-Medium',
    color: '#333',
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
    fontFamily: 'Cairo-Bold',
    color: '#2f7659',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    lineHeight: 22,
  },

  bottomSpace: {
    height: 100,
  },
});
