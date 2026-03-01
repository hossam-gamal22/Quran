// app/(tabs)/prayers.tsx
import React, { useState } from 'react';
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

interface PrayerItem {
  id: string;
  name: string;
  nameArabic: string;
  time: string;
  icon: string;
  isPrayed: boolean;
  isCurrent: boolean;
  notificationEnabled: boolean;
}

export default function PrayersScreen() {
  const [prayers, setPrayers] = useState<PrayerItem[]>([
    {
      id: 'fajr',
      name: 'Fajr',
      nameArabic: 'الفجر',
      time: '٠٤:٤٠',
      icon: 'sparkles',
      isPrayed: true,
      isCurrent: false,
      notificationEnabled: true,
    },
    {
      id: 'dhuhr',
      name: 'Dhuhr',
      nameArabic: 'الظهر',
      time: '١١:٥٨',
      icon: 'sunny',
      isPrayed: true,
      isCurrent: false,
      notificationEnabled: true,
    },
    {
      id: 'asr',
      name: 'Asr',
      nameArabic: 'العصر',
      time: '١٥:١٧',
      icon: 'partly-sunny',
      isPrayed: false,
      isCurrent: true,
      notificationEnabled: true,
    },
    {
      id: 'maghrib',
      name: 'Maghrib',
      nameArabic: 'المغرب',
      time: '١٧:٥٦',
      icon: 'cloudy-night',
      isPrayed: false,
      isCurrent: false,
      notificationEnabled: true,
    },
    {
      id: 'isha',
      name: 'Isha',
      nameArabic: 'العشاء',
      time: '١٩:٠٥',
      icon: 'moon',
      isPrayed: false,
      isCurrent: false,
      notificationEnabled: true,
    },
  ]);

  const hijriDate = '١ رمضان ١٤٤٧';
  const gregorianDate = 'اليوم، ١ مارس';
  const prayedCount = prayers.filter((p) => p.isPrayed).length;
  const currentPrayer = prayers.find((p) => p.isCurrent);
  const nextPrayer = prayers.find((p) => !p.isPrayed && !p.isCurrent);

  const togglePrayed = (id: string) => {
    setPrayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isPrayed: !p.isPrayed } : p))
    );
  };

  const toggleNotification = (id: string) => {
    setPrayers((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, notificationEnabled: !p.notificationEnabled } : p
      )
    );
  };

  const markAllAsPrayed = () => {
    setPrayers((prev) => prev.map((p) => ({ ...p, isPrayed: true })));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          {/* Date Navigation */}
          <View style={styles.dateNav}>
            <TouchableOpacity>
              <Ionicons name="chevron-back" size={24} color={Colors.textLight} />
            </TouchableOpacity>
            <View style={styles.dateCenter}>
              <Text style={styles.dateGregorian}>{gregorianDate}</Text>
              <Text style={styles.dateHijri}>{hijriDate}</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={24} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Current Prayer Info */}
          <View style={styles.currentPrayerSection}>
            <View style={styles.currentPrayerInfo}>
              <Text style={styles.nowLabel}>الآن</Text>
              <View style={styles.prayerNameRow}>
                <Text style={styles.currentPrayerName}>
                  {currentPrayer?.nameArabic}
                </Text>
                <Ionicons
                  name={currentPrayer?.icon as any}
                  size={24}
                  color={Colors.accent}
                />
              </View>
              <Text style={styles.currentPrayerTime}>{currentPrayer?.time}</Text>
              <Text style={styles.nextPrayerHint}>
                {nextPrayer?.nameArabic} بعد ٢ ساعة و ٢٦ دقيقة
              </Text>
            </View>

            {/* Progress Circle */}
            <View style={styles.progressContainer}>
              <View style={styles.progressCircle}>
                <View style={styles.progressInner}>
                  <Text style={styles.progressCount}>{prayedCount}/٥</Text>
                  <Text style={styles.progressLabel}>صلوات</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Prayers List */}
        <View style={styles.prayersList}>
          {prayers.map((prayer) => (
            <TouchableOpacity
              key={prayer.id}
              style={[
                styles.prayerCard,
                prayer.isCurrent && styles.prayerCardCurrent,
              ]}
              onPress={() => togglePrayed(prayer.id)}
              activeOpacity={0.7}
            >
              <View style={styles.prayerLeft}>
                <View
                  style={[
                    styles.checkbox,
                    prayer.isPrayed && styles.checkboxChecked,
                  ]}
                >
                  {prayer.isPrayed && (
                    <Ionicons name="checkmark" size={18} color={Colors.textLight} />
                  )}
                </View>
                <View style={styles.prayerInfo}>
                  <View style={styles.prayerNameContainer}>
                    <Text
                      style={[
                        styles.prayerName,
                        prayer.isPrayed && styles.prayerNamePrayed,
                      ]}
                    >
                      {prayer.nameArabic}
                    </Text>
                    <Ionicons
                      name={prayer.icon as any}
                      size={20}
                      color={prayer.isPrayed ? Colors.textMuted : Colors.primary}
                    />
                  </View>
                  {prayer.isCurrent && (
                    <View style={styles.nowBadge}>
                      <Text style={styles.nowBadgeText}>الآن</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.prayerRight}>
                <Text
                  style={[
                    styles.prayerTime,
                    prayer.isPrayed && styles.prayerTimePrayed,
                  ]}
                >
                  {prayer.time}
                </Text>
                <TouchableOpacity
                  style={styles.notificationBtn}
                  onPress={() => toggleNotification(prayer.id)}
                >
                  <Ionicons
                    name={
                      prayer.notificationEnabled
                        ? 'notifications'
                        : 'notifications-off'
                    }
                    size={20}
                    color={
                      prayer.notificationEnabled
                        ? Colors.primary
                        : Colors.textMuted
                    }
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mark All Button */}
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsPrayed}>
          <Text style={styles.markAllText}>تحديد الكل كمُصلّى</Text>
        </TouchableOpacity>

        {/* Extra Space */}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerCard: {
    backgroundColor: Colors.primaryDark,
    margin: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dateNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateGregorian: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '600',
  },
  dateHijri: {
    fontSize: 12,
    color: Colors.accent,
    marginTop: 2,
  },
  currentPrayerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPrayerInfo: {
    flex: 1,
  },
  nowLabel: {
    fontSize: 12,
    color: Colors.accent,
    backgroundColor: 'rgba(82, 183, 136, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  prayerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  currentPrayerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  currentPrayerTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  nextPrayerHint: {
    fontSize: 12,
    color: Colors.textLight,
    opacity: 0.7,
    marginTop: Spacing.xs,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    borderColor: Colors.accent,
    borderTopColor: 'rgba(82, 183, 136, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  progressInner: {
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
  },
  progressCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  progressLabel: {
    fontSize: 10,
    color: Colors.textLight,
    opacity: 0.7,
  },
  prayersList: {
    paddingHorizontal: Spacing.md,
  },
  prayerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  prayerCardCurrent: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  prayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  prayerInfo: {
    gap: 4,
  },
  prayerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  prayerNamePrayed: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  nowBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  nowBadgeText: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: '600',
  },
  prayerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  prayerTime: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  prayerTimePrayed: {
    color: Colors.textMuted,
  },
  notificationBtn: {
    padding: Spacing.xs,
  },
  markAllBtn: {
    backgroundColor: Colors.accent,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  markAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
});
