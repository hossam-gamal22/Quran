// app/(tabs)/azkar.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

type CategoryType = 'morning' | 'evening' | 'afterPrayer' | 'sleep' | 'general';

interface Dhikr {
  id: string;
  text: string;
  translation: string;
  count: number;
  currentCount: number;
  reward: string;
}

interface Category {
  id: CategoryType;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  totalAzkar: number;
}

export default function AzkarScreen() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [azkar, setAzkar] = useState<Dhikr[]>([
    {
      id: '1',
      text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
      translation: 'We have entered the morning and at this very time the whole kingdom belongs to Allah. All praise is due to Allah.',
      count: 1,
      currentCount: 0,
      reward: 'من قالها حين يصبح وحين يمسي كفته من كل شيء',
    },
    {
      id: '2',
      text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      translation: 'Glory and praise be to Allah',
      count: 100,
      currentCount: 0,
      reward: 'من قالها مائة مرة حين يصبح وحين يمسي لم يأت أحد يوم القيامة بأفضل مما جاء به',
    },
    {
      id: '3',
      text: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
      translation: 'None has the right to be worshipped but Allah alone, who has no partner.',
      count: 10,
      currentCount: 0,
      reward: 'كانت له عدل عشر رقاب، وكتبت له مائة حسنة',
    },
    {
      id: '4',
      text: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
      translation: 'I seek forgiveness from Allah and repent to Him',
      count: 100,
      currentCount: 0,
      reward: 'من لزم الاستغفار جعل الله له من كل ضيق مخرجاً',
    },
    {
      id: '5',
      text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
      translation: 'O Allah, send prayers and peace upon our Prophet Muhammad',
      count: 10,
      currentCount: 0,
      reward: 'من صلى عليّ صلاة واحدة صلى الله عليه بها عشراً',
    },
  ]);

  const categories: Category[] = [
    {
      id: 'morning',
      name: 'أذكار الصباح',
      icon: 'sunny',
      color: '#F59E0B',
      bgColor: '#FFF8E1',
      totalAzkar: 27,
    },
    {
      id: 'evening',
      name: 'أذكار المساء',
      icon: 'moon',
      color: '#3B82F6',
      bgColor: '#E3F2FD',
      totalAzkar: 25,
    },
    {
      id: 'afterPrayer',
      name: 'أذكار بعد الصلاة',
      icon: 'hand-left',
      color: '#22C55E',
      bgColor: '#E8F5E9',
      totalAzkar: 15,
    },
    {
      id: 'sleep',
      name: 'أذكار النوم',
      icon: 'bed',
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
      totalAzkar: 18,
    },
    {
      id: 'general',
      name: 'أذكار متنوعة',
      icon: 'apps',
      color: '#EC4899',
      bgColor: '#FCE4EC',
      totalAzkar: 30,
    },
  ];

  const incrementCount = (id: string) => {
    setAzkar((prev) =>
      prev.map((dhikr) => {
        if (dhikr.id === id && dhikr.currentCount < dhikr.count) {
          Vibration.vibrate(50);
          return { ...dhikr, currentCount: dhikr.currentCount + 1 };
        }
        return dhikr;
      })
    );
  };

  const resetCount = (id: string) => {
    setAzkar((prev) =>
      prev.map((dhikr) =>
        dhikr.id === id ? { ...dhikr, currentCount: 0 } : dhikr
      )
    );
  };

  const resetAll = () => {
    setAzkar((prev) => prev.map((dhikr) => ({ ...dhikr, currentCount: 0 })));
  };

  const completedCount = azkar.filter((d) => d.currentCount >= d.count).length;
  const totalProgress = azkar.reduce((acc, d) => acc + d.currentCount, 0);
  const totalTarget = azkar.reduce((acc, d) => acc + d.count, 0);

  if (selectedCategory) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons name="arrow-forward" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {categories.find((c) => c.id === selectedCategory)?.name}
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={resetAll}>
            <Ionicons name="refresh" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <View style={styles.progressHeader}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {completedCount}/{azkar.length} أذكار مكتملة
            </Text>
            <Text style={styles.progressSubtext}>
              {totalProgress}/{totalTarget} تسبيحة
            </Text>
          </View>
          <View style={styles.progressCircleSmall}>
            <Text style={styles.progressPercent}>
              {Math.round((totalProgress / totalTarget) * 100)}%
            </Text>
          </View>
        </View>

        {/* Azkar List */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {azkar.map((dhikr) => (
            <TouchableOpacity
              key={dhikr.id}
              style={[
                styles.dhikrCard,
                dhikr.currentCount >= dhikr.count && styles.dhikrCardCompleted,
              ]}
              onPress={() => incrementCount(dhikr.id)}
              onLongPress={() => resetCount(dhikr.id)}
              activeOpacity={0.7}
            >
              {/* Counter Badge */}
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>
                  {dhikr.currentCount}/{dhikr.count}
                </Text>
              </View>

              {/* Dhikr Text */}
              <Text style={styles.dhikrText}>{dhikr.text}</Text>

              {/* Translation */}
              <Text style={styles.dhikrTranslation}>{dhikr.translation}</Text>

              {/* Reward */}
              <View style={styles.rewardContainer}>
                <Ionicons name="gift-outline" size={16} color={Colors.primary} />
                <Text style={styles.rewardText}>{dhikr.reward}</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.dhikrProgress}>
                <View
                  style={[
                    styles.dhikrProgressBar,
                    {
                      width: `${(dhikr.currentCount / dhikr.count) * 100}%`,
                    },
                  ]}
                />
              </View>

              {/* Completed Check */}
              {dhikr.currentCount >= dhikr.count && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                </View>
              )}
            </TouchableOpacity>
          ))}

          <View style={{ height: Spacing.xxl * 2 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.mainHeader}>
        <Text style={styles.mainTitle}>الأذكار</Text>
        <Text style={styles.mainSubtitle}>حصّن يومك بذكر الله</Text>
      </View>

      {/* Daily Progress Card */}
      <View style={styles.dailyCard}>
        <View style={styles.dailyCardContent}>
          <View>
            <Text style={styles.dailyTitle}>إنجاز اليوم</Text>
            <Text style={styles.dailyStats}>٣٣ ذكر من أصل ٢٠٠</Text>
          </View>
          <View style={styles.dailyCircle}>
            <Ionicons name="heart" size={28} color={Colors.error} />
          </View>
        </View>
        <View style={styles.dailyProgress}>
          <View style={[styles.dailyProgressBar, { width: '16%' }]} />
        </View>
      </View>

      {/* Categories */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>الأقسام</Text>

        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => setSelectedCategory(category.id)}
            >
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: category.bgColor },
                ]}
              >
                <Ionicons
                  name={category.icon as any}
                  size={32}
                  color={category.color}
                />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>{category.totalAzkar} ذكر</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tasbih Counter */}
        <View style={styles.tasbihSection}>
          <Text style={styles.sectionTitle}>السبحة الإلكترونية</Text>
          <TouchableOpacity style={styles.tasbihCard}>
            <View style={styles.tasbihCircle}>
              <Text style={styles.tasbihCount}>٠</Text>
            </View>
            <Text style={styles.tasbihHint}>اضغط للعدّ</Text>
            <View style={styles.tasbihActions}>
              <TouchableOpacity style={styles.tasbihBtn}>
                <Ionicons name="refresh" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.tasbihBtn}>
                <Ionicons name="settings-outline" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainHeader: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'right',
  },
  mainSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  dailyCard: {
    backgroundColor: Colors.primaryDark,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dailyCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dailyTitle: {
    fontSize: 16,
    color: Colors.accent,
  },
  dailyStats: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  dailyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyProgress: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
  },
  dailyProgressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.sm,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: '1.5%',
    marginBottom: Spacing.md,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  tasbihSection: {
    marginTop: Spacing.lg,
  },
  tasbihCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tasbihCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tasbihCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  tasbihHint: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  tasbihActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  tasbihBtn: {
    padding: Spacing.sm,
  },
  // Dhikr Detail Screen Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  resetBtn: {
    padding: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  progressInfo: {},
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  progressSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  progressCircleSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  dhikrCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  dhikrCardCompleted: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: Colors.success,
  },
  counterBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  counterText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  dhikrText: {
    fontSize: 20,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 36,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  dhikrTranslation: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  rewardText: {
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
    flex: 1,
  },
  dhikrProgress: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  dhikrProgressBar: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  completedBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
});
