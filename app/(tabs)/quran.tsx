// app/(tabs)/quran.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme-provider";
import { IslamicBackground } from "@/components/ui/islamic-background";
import { GlassCard } from "@/components/ui/glass-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BORDER_RADIUS, SPACING, FONT_SIZES } from "@/constants/theme";
import { fetchSurahs, ARABIC_SURAH_NAMES } from "@/lib/quran-api";

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

const REVELATION_TYPE: Record<string, string> = {
  Meccan: "مكية",
  Medinan: "مدنية",
};

export default function QuranScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [filteredSurahs, setFilteredSurahs] = useState<Surah[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"surahs" | "juz">("surahs");

  const loadSurahs = useCallback(async () => {
    try {
      const data = await fetchSurahs();
      setSurahs(data);
      setFilteredSurahs(data);
    } catch (e) {
      console.log("Error loading surahs:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSurahs();
  }, [loadSurahs]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSurahs(surahs);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = surahs.filter(
        (s) =>
          s.name.includes(searchQuery) ||
          s.englishName.toLowerCase().includes(query) ||
          ARABIC_SURAH_NAMES[s.number - 1]?.includes(searchQuery) ||
          s.number.toString() === searchQuery
      );
      setFilteredSurahs(filtered);
    }
  }, [searchQuery, surahs]);

  const renderSurahItem = ({ item }: { item: Surah }) => {
    const arabicName = ARABIC_SURAH_NAMES[item.number - 1] || item.name;
    
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/surah/${item.number}` as any)}
      >
        <GlassCard style={styles.surahCard}>
          <View style={styles.surahContent}>
            {/* رقم السورة */}
            <View style={[styles.surahNumber, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.surahNumberText, { color: colors.primary }]}>
                {item.number}
              </Text>
            </View>

            {/* معلومات السورة */}
            <View style={styles.surahInfo}>
              <Text style={[styles.surahName, { color: colors.foreground }]}>
                {arabicName}
              </Text>
              <Text style={[styles.surahMeta, { color: colors.muted }]}>
                {REVELATION_TYPE[item.revelationType]} • {item.numberOfAyahs} آية
              </Text>
            </View>

            {/* اسم السورة بالعربي المزخرف */}
            <Text style={[styles.surahArabicName, { color: colors.foregroundSecondary }]}>
              {item.name}
            </Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const renderJuzItem = ({ item }: { item: number }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/juz/${item}` as any)}
    >
      <GlassCard style={styles.juzCard}>
        <View style={[styles.juzNumber, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.juzNumberText, { color: colors.primary }]}>{item}</Text>
        </View>
        <Text style={[styles.juzTitle, { color: colors.foreground }]}>
          الجزء {item}
        </Text>
      </GlassCard>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <IslamicBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            جارٍ تحميل السور...
          </Text>
        </View>
      </IslamicBackground>
    );
  }

  return (
    <IslamicBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>القرآن الكريم</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <GlassCard style={styles.searchCard}>
            <View style={styles.searchContent}>
              <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="ابحث عن سورة..."
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                textAlign="right"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <GlassCard style={styles.tabsCard}>
            <View style={styles.tabsContent}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "surahs" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveTab("surahs")}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === "surahs" ? "#FFFFFF" : colors.muted },
                  ]}
                >
                  السور
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "juz" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveTab("juz")}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === "juz" ? "#FFFFFF" : colors.muted },
                  ]}
                >
                  الأجزاء
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        {/* Content */}
        {activeTab === "surahs" ? (
          <FlatList
            data={filteredSurahs}
            keyExtractor={(item) => item.number.toString()}
            renderItem={renderSurahItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          />
        ) : (
          <FlatList
            data={Array.from({ length: 30 }, (_, i) => i + 1)}
            keyExtractor={(item) => item.toString()}
            renderItem={renderJuzItem}
            numColumns={3}
            contentContainerStyle={styles.juzListContent}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.juzRow}
          />
        )}
      </View>
    </IslamicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  title: {
    fontSize: FONT_SIZES["3xl"],
    fontWeight: "700",
  },

  // Search
  searchContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  searchCard: {
    padding: 0,
  },
  searchContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    paddingVertical: 8,
  },

  // Tabs
  tabsContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  tabsCard: {
    padding: 4,
  },
  tabsContent: {
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },

  // Surah List
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 120,
  },
  surahCard: {
    padding: SPACING.md,
  },
  surahContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  surahNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.md,
  },
  surahNumberText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  surahInfo: {
    flex: 1,
  },
  surahName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    marginBottom: 2,
  },
  surahMeta: {
    fontSize: FONT_SIZES.xs,
  },
  surahArabicName: {
    fontSize: FONT_SIZES.arabic,
    fontWeight: "500",
  },

  // Juz List
  juzListContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 120,
  },
  juzRow: {
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  juzCard: {
    width: "100%",
    padding: SPACING.md,
    alignItems: "center",
  },
  juzNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  juzNumberText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
  },
  juzTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
});
