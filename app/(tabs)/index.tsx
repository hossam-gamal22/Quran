// app/(tabs)/index.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export default function TodayScreen() {
  const hijriDate = '١ رمضان ١٤٤٧';
  const gregorianDate = 'اليوم، ١ مارس';
  const nextPrayer = 'العصر';
  const nextPrayerTime = '١٥:١٧';
  const remainingTime = 'بعد ٢ ساعة و ٢٦ دقيقة';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>السلام عليكم</Text>
            <Text style={styles.dateHijri}>{hijriDate}</Text>
            <Text style={styles.dateGregorian}>{gregorianDate}</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={24} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Next Prayer Card */}
        <View style={styles.prayerCard}>
          <View style={styles.prayerCardContent}>
            <View>
              <Text style={styles.prayerLabel}>الصلاة القادمة</Text>
              <Text style={styles.prayerName}>{nextPrayer}</Text>
              <Text style={styles.prayerTime}>{nextPrayerTime}</Text>
              <Text style={styles.remainingTime}>{remainingTime}</Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressText}>٢/٥</Text>
              <Text style={styles.progressLabel}>صلوات</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>الوصول السريع</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="book" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.actionLabel}>القرآن</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#FFF8E1' }]}>
                <Ionicons name="sunny" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.actionLabel}>أذكار الصباح</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="moon" size={28} color="#3B82F6" />
              </View>
              <Text style={styles.actionLabel}>أذكار المساء</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="compass" size={28} color="#EC4899" />
              </View>
              <Text style={styles.actionLabel}>القبلة</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Verse */}
        <View style={styles.verseCard}>
          <Text style={styles.verseTitle}>آية اليوم</Text>
          <Text style={styles.verseText}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </Text>
          <Text style={styles.verseTranslation}>
            In the name of Allah, the Most Gracious, the Most Merciful
          </Text>
          <Text style={styles.verseReference}>سورة الفاتحة - آية ١</Text>
        </View>

        {/* Daily Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>إنجازات اليوم</Text>
          <View style={styles.progressCards}>
            <View style={styles.progressCard}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
              <Text style={styles.progressNumber}>٢</Text>
              <Text style={styles.progressDesc}>صلوات</Text>
            </View>
            <View style={styles.progressCard}>
              <Ionicons name="book" size={32} color={Colors.primary} />
              <Text style={styles.progressNumber}>١٥</Text>
              <Text style={styles.progressDesc}>دقيقة قراءة</Text>
            </View>
            <View style={styles.progressCard}>
              <Ionicons name="heart" size={32} color={Colors.error} />
              <Text style={styles.progressNumber}>٣٣</Text>
              <Text style={styles.progressDesc}>ذكر</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
    textAlign: 'right',
  },
  dateHijri: {
    fontSize: 16,
    color: Colors.accent,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  dateGregorian: {
    fontSize: 14,
    color: Colors.textLight,
    opacity: 0.8,
    textAlign: 'right',
  },
  settingsBtn: {
    padding: Spacing.sm,
  },
  prayerCard: {
    backgroundColor: Colors.cardDark,
    margin: Spacing.md,
    marginTop: -Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  prayerCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prayerLabel: {
    fontSize: 14,
    color: Colors.accent,
  },
  prayerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  prayerTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  remainingTime: {
    fontSize: 12,
    color: Colors.textLight,
    opacity: 0.7,
    marginTop: Spacing.xs,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  progressLabel: {
    fontSize: 10,
    color: Colors.textLight,
    opacity: 0.7,
  },
  quickActions: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  verseCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  verseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  verseText: {
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: Spacing.md,
  },
  verseTranslation: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  verseReference: {
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
  },
  progressSection: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  progressCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  progressDesc: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
