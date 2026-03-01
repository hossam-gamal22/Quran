// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme-provider";
import { IslamicBackground } from "@/components/ui/islamic-background";
import { GlassCard } from "@/components/ui/glass-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BORDER_RADIUS, SPACING, FONT_SIZES } from "@/constants/theme";
import { getLastRead } from "@/lib/storage";

// آية اليوم
const DAILY_VERSES = [
  { arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", translation: "Indeed, Allah is with the patient", surah: "البقرة", ayah: 153 },
  { arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", translation: "And whoever relies upon Allah – then He is sufficient for him", surah: "الطلاق", ayah: 3 },
  { arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ", translation: "So remember Me; I will remember you", surah: "البقرة", ayah: 152 },
  { arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا", translation: "And say: My Lord, increase me in knowledge", surah: "طه", ayah: 114 },
  { arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً", translation: "Our Lord, give us good in this world and good in the Hereafter", surah: "البقرة", ayah: 201 },
  { arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "Indeed, with hardship comes ease", surah: "الشرح", ayah: 6 },
  { arabic: "وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ", translation: "And Allah loves the doers of good", surah: "آل عمران", ayah: 134 },
];

// أقسام الأذكار
const ATHKAR_SECTIONS = [
  { id: "morning", title: "أذكار الصباح", icon: "sun.max.fill", color: "#FFB800", count: 27 },
  { id: "evening", title: "أذكار المساء", icon: "moon.fill", color: "#7C4DFF", count: 27 },
  { id: "sleep", title: "أذكار النوم", icon: "bed.double.fill", color: "#00BFA5", count: 15 },
  { id: "wakeup", title: "أذكار الاستيقاظ", icon: "alarm.fill", color: "#FF6D00", count: 8 },
  { id: "prayer", title: "أذكار بعد الصلاة", icon: "hands.sparkles.fill", color: "#2979FF", count: 12 },
  { id: "quran-duas", title: "أدعية من القرآن", icon: "book.fill", color: "#1B8A8A", count: 40 },
];

// الأدوات السريعة
const QUICK_TOOLS = [
  { id: "tasbih", title: "التسبيح", icon: "circle.grid.3x3.fill", route: "/tasbih" },
  { id: "names", title: "أسماء الله", icon: "star.fill", route: "/names" },
  { id: "ruqyah", title: "الرقية", icon: "shield.fill", route: "/ruqyah" },
  { id: "qibla", title: "القبلة", icon: "location.north.fill", route: "/qibla" },
];

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyVerse, setDailyVerse] = useState(DAILY_VERSES[0]);
  const [lastRead, setLastRead] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      // آية اليوم بناءً على التاريخ
      const today = new Date();
      const dayIndex = today.getDate() % DAILY_VERSES.length;
      setDailyVerse(DAILY_VERSES[dayIndex]);

      // آخر قراءة
      try {
        const lr = await getLastRead();
        setLastRead(lr);
      } catch {}
    } catch (e) {
      console.log("Error loading data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <IslamicBackground>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingBismillah, { color: colors.primary }]}>
            بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
          </Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>جارٍ التحميل...</Text>
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
          { paddingTop: insets.top + 10, paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.foreground }]}>أذكاري</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            حَصِّن نفسك بذكر الله
          </Text>
        </View>

        {/* آية اليوم */}
        <GlassCard style={styles.verseCard} variant="solid">
          <View style={styles.verseHeader}>
            <IconSymbol name="sparkles" size={18} color={colors.gold} />
            <Text style={[styles.verseLabel, { color: colors.gold }]}>آية اليوم</Text>
          </View>
          <Text style={[styles.verseArabic, { color: colors.foreground }]}>
            {dailyVerse.arabic}
          </Text>
          <Text style={[styles.verseTranslation, { color: colors.foregroundSecondary }]}>
            {dailyVerse.translation}
          </Text>
          <Text style={[styles.verseReference, { color: colors.muted }]}>
            سورة {dailyVerse.surah} - آية {dailyVerse.ayah}
          </Text>
        </GlassCard>

        {/* أقسام الأذكار */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الأذكار</Text>
        </View>

        <View style={styles.athkarGrid}>
          {ATHKAR_SECTIONS.map((section) => (
            <TouchableOpacity
              key={section.id}
              activeOpacity={0.8}
              onPress={() => router.push(`/athkar/${section.id}` as any)}
              style={styles.athkarItemWrapper}
            >
              <GlassCard style={styles.athkarCard}>
                <View
                  style={[
                    styles.athkarIconContainer,
                    { backgroundColor: `${section.color}20` },
                  ]}
                >
                  <IconSymbol name={section.icon} size={28} color={section.color} />
                </View>
                <Text style={[styles.athkarTitle, { color: colors.foreground }]}>
                  {section.title}
                </Text>
                <Text style={[styles.athkarCount, { color: colors.muted }]}>
                  {section.count} ذكر
                </Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* الأدوات السريعة */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أدوات سريعة</Text>
        </View>

        <View style={styles.toolsGrid}>
          {QUICK_TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              activeOpacity={0.8}
              onPress={() => router.push(tool.route as any)}
              style={styles.toolItemWrapper}
            >
              <GlassCard style={styles.toolCard}>
                <View
                  style={[
                    styles.toolIconContainer,
                    { backgroundColor: `${colors.primary}20` },
                  ]}
                >
                  <IconSymbol name={tool.icon} size={24} color={colors.primary} />
                </View>
                <Text style={[styles.toolTitle, { color: colors.foreground }]}>
                  {tool.title}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* آخر قراءة */}
        {lastRead && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                متابعة القراءة
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push(`/surah/${lastRead.surahNumber}?ayah=${lastRead.ayahNumber}` as any)
              }
            >
              <GlassCard style={styles.lastReadCard}>
                <View style={styles.lastReadContent}>
                  <View>
                    <Text style={[styles.lastReadSurah, { color: colors.foreground }]}>
                      {lastRead.surahName || `سورة ${lastRead.surahNumber}`}
                    </Text>
                    <Text style={[styles.lastReadAyah, { color: colors.muted }]}>
                      الآية {lastRead.ayahNumber}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.lastReadIconContainer,
                      { backgroundColor: `${colors.primary}20` },
                    ]}
                  >
                    <IconSymbol name="book.fill" size={24} color={colors.primary} />
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </>
        )}
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
  loadingBismillah: {
    fontSize: FONT_SIZES["3xl"],
    fontWeight: "600",
    textAlign: "center",
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    marginTop: 12,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  appName: {
    fontSize: FONT_SIZES["4xl"],
    fontWeight: "700",
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    marginTop: 4,
  },

  // Verse Card
  verseCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  verseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    gap: 8,
  },
  verseLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  verseArabic: {
    fontSize: FONT_SIZES.arabicLarge,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 50,
    marginBottom: SPACING.sm,
  },
  verseTranslation: {
    fontSize: FONT_SIZES.md,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  verseReference: {
    fontSize: FONT_SIZES.xs,
    textAlign: "center",
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
  },

  // Athkar Grid
  athkarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  athkarItemWrapper: {
    width: "48%",
  },
  athkarCard: {
    padding: SPACING.md,
    alignItems: "center",
  },
  athkarIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  athkarTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  athkarCount: {
    fontSize: FONT_SIZES.xs,
  },

  // Tools Grid
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  toolItemWrapper: {
    width: "23%",
  },
  toolCard: {
    padding: SPACING.sm,
    alignItems: "center",
  },
  toolIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  toolTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    textAlign: "center",
  },

  // Last Read
  lastReadCard: {
    marginBottom: SPACING.lg,
  },
  lastReadContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
  },
  lastReadSurah: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    marginBottom: 4,
  },
  lastReadAyah: {
    fontSize: FONT_SIZES.sm,
  },
  lastReadIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
