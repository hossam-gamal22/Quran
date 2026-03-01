// app/(tabs)/prayer.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useTheme } from "@/lib/theme-provider";
import { IslamicBackground } from "@/components/ui/islamic-background";
import { GlassCard } from "@/components/ui/glass-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BORDER_RADIUS, SPACING, FONT_SIZES } from "@/constants/theme";
import { fetchPrayerTimesByCoords } from "@/lib/prayer-api";
import { getPrayerLocation, savePrayerLocation } from "@/lib/storage";

interface PrayerTime {
  name: string;
  nameAr: string;
  time: string;
  icon: string;
  color: string;
}

const PRAYER_INFO: Record<string, { nameAr: string; icon: string; color: string }> = {
  Fajr: { nameAr: "الفجر", icon: "sunrise.fill", color: "#7C4DFF" },
  Sunrise: { nameAr: "الشروق", icon: "sun.horizon.fill", color: "#FF6D00" },
  Dhuhr: { nameAr: "الظهر", icon: "sun.max.fill", color: "#FFB800" },
  Asr: { nameAr: "العصر", icon: "sun.min.fill", color: "#FF9500" },
  Maghrib: { nameAr: "المغرب", icon: "sunset.fill", color: "#E91E63" },
  Isha: { nameAr: "العشاء", icon: "moon.stars.fill", color: "#3F51B5" },
};

const PRAYER_ORDER = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

export default function PrayerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [countdown, setCountdown] = useState("");
  const [cityName, setCityName] = useState("جارٍ تحديد الموقع...");
  const [hijriDate, setHijriDate] = useState("");

  const loadPrayerTimes = useCallback(async () => {
    try {
      let location = await getPrayerLocation();

      // طلب الموقع إذا لم يكن محفوظًا
      if (!location && Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
          ]);
          if (loc) {
            location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            await savePrayerLocation(location);
            
            // الحصول على اسم المدينة
            try {
              const geocode = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
              if (geocode.length > 0) {
                setCityName(geocode[0].city || geocode[0].region || "غير معروف");
              }
            } catch {}
          }
        }
      }

      // استخدام موقع افتراضي (مكة) إذا فشل كل شيء
      if (!location) {
        location = { latitude: 21.3891, longitude: 39.8579 };
        setCityName("مكة المكرمة");
      }

      // جلب أوقات الصلاة
      const data = await fetchPrayerTimesByCoords(location.latitude, location.longitude);
      
      if (data && data.timings) {
        const times: PrayerTime[] = PRAYER_ORDER.map((key) => ({
          name: key,
          nameAr: PRAYER_INFO[key].nameAr,
          time: data.timings[key]?.split(" ")[0] || "--:--",
          icon: PRAYER_INFO[key].icon,
          color: PRAYER_INFO[key].color,
        }));
        setPrayerTimes(times);

        // التاريخ الهجري
        if (data.date?.hijri) {
          const h = data.date.hijri;
          setHijriDate(`${h.day} ${h.month.ar} ${h.year}`);
        }

        // تحديد الصلاة القادمة
        findNextPrayer(times);
      }
    } catch (e) {
      console.log("Error loading prayer times:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const findNextPrayer = (times: PrayerTime[]) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const prayer of times) {
      if (prayer.name === "Sunrise") continue; // تخطي الشروق
      
      const [hours, minutes] = prayer.time.split(":").map(Number);
      const prayerMinutes = hours * 60 + minutes;

      if (prayerMinutes > currentMinutes) {
        setNextPrayer(prayer);
        return;
      }
    }
    
    // إذا انتهت كل الصلوات، الصلاة القادمة هي الفجر
    setNextPrayer(times[0]);
  };

  const updateCountdown = useCallback(() => {
    if (!nextPrayer) return;

    const now = new Date();
    const [hours, minutes] = nextPrayer.time.split(":").map(Number);
    
    let prayerDate = new Date();
    prayerDate.setHours(hours, minutes, 0, 0);

    // إذا كانت الصلاة في اليوم التالي
    if (prayerDate <= now) {
      prayerDate.setDate(prayerDate.getDate() + 1);
    }

    const diff = prayerDate.getTime() - now.getTime();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    setCountdown(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
  }, [nextPrayer]);

  useEffect(() => {
    loadPrayerTimes();
  }, [loadPrayerTimes]);

  useEffect(() => {
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrayerTimes();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <IslamicBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            جارٍ تحميل أوقات الصلاة...
          </Text>
        </View>
      </IslamicBackground>
    );
  }

  return (
    <IslamicBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + 10, paddingBottom: 120 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>أوقات الصلاة</Text>
          <View style={styles.locationRow}>
            <IconSymbol name="location.fill" size={14} color={colors.primary} />
            <Text style={[styles.cityName, { color: colors.muted }]}>{cityName}</Text>
          </View>
          {hijriDate && (
            <Text style={[styles.hijriDate, { color: colors.foregroundSecondary }]}>
              {hijriDate}
            </Text>
          )}
        </View>

        {/* Next Prayer Card */}
        {nextPrayer && (
          <GlassCard style={styles.nextPrayerCard} variant="solid">
            <Text style={[styles.nextPrayerLabel, { color: colors.muted }]}>
              الصلاة القادمة
            </Text>
            <View style={styles.nextPrayerContent}>
              <View style={[styles.nextPrayerIcon, { backgroundColor: `${nextPrayer.color}20` }]}>
                <IconSymbol name={nextPrayer.icon} size={32} color={nextPrayer.color} />
              </View>
              <View style={styles.nextPrayerInfo}>
                <Text style={[styles.nextPrayerName, { color: colors.foreground }]}>
                  {nextPrayer.nameAr}
                </Text>
                <Text style={[styles.nextPrayerTime, { color: colors.primary }]}>
                  {nextPrayer.time}
                </Text>
              </View>
            </View>
            <View style={[styles.countdownContainer, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.countdownLabel, { color: colors.muted }]}>متبقي</Text>
              <Text style={[styles.countdown, { color: colors.primary }]}>{countdown}</Text>
            </View>
          </GlassCard>
        )}

        {/* Prayer Times List */}
        <View style={styles.prayerListHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            مواقيت اليوم
          </Text>
        </View>

        <View style={styles.prayerList}>
          {prayerTimes.map((prayer) => {
            const isNext = nextPrayer?.name === prayer.name;
            
            return (
              <GlassCard
                key={prayer.name}
                style={[styles.prayerCard, isNext && { borderColor: colors.primary, borderWidth: 1 }]}
              >
                <View style={styles.prayerContent}>
                  <View style={[styles.prayerIcon, { backgroundColor: `${prayer.color}15` }]}>
                    <IconSymbol name={prayer.icon} size={24} color={prayer.color} />
                  </View>
                  <Text style={[styles.prayerName, { color: colors.foreground }]}>
                    {prayer.nameAr}
                  </Text>
                  <Text style={[styles.prayerTime, { color: isNext ? colors.primary : colors.foregroundSecondary }]}>
                    {prayer.time}
                  </Text>
                </View>
              </GlassCard>
            );
          })}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionWrapper}
            activeOpacity={0.8}
            onPress={() => router.push("/qibla" as any)}
          >
            <GlassCard style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol name="location.north.fill" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>القبلة</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionWrapper}
            activeOpacity={0.8}
            onPress={() => router.push("/hijri-calendar" as any)}
          >
            <GlassCard style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: `${colors.gold}15` }]}>
                <IconSymbol name="calendar" size={24} color={colors.gold} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>التقويم</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionWrapper}
            activeOpacity={0.8}
            onPress={() => router.push("/notifications-center" as any)}
          >
            <GlassCard style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: "#E91E6315" }]}>
                <IconSymbol name="bell.fill" size={24} color="#E91E63" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>التنبيهات</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </IslamicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    marginTop: 12,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES["3xl"],
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cityName: {
    fontSize: FONT_SIZES.sm,
  },
  hijriDate: {
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.xs,
  },

  // Next Prayer
  nextPrayerCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: "center",
  },
  nextPrayerLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
  },
  nextPrayerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  nextPrayerIcon: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  nextPrayerInfo: {
    alignItems: "flex-start",
  },
  nextPrayerName: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "700",
  },
  nextPrayerTime: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "600",
  },
  countdownContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  countdownLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: 2,
  },
  countdown: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  // Prayer List
  prayerListHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
  },
  prayerList: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  prayerCard: {
    padding: SPACING.md,
  },
  prayerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  prayerIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.md,
  },
  prayerName: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
  },
  prayerTime: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
  },

  // Actions
  actionsContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  actionWrapper: {
    flex: 1,
  },
  actionCard: {
    padding: SPACING.md,
    alignItems: "center",
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  actionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
});
