// app/(tabs)/quran.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

type TabType = 'read' | 'learn' | 'progress';
type ThemeType = 'modern' | 'paper' | 'dark';

interface Surah {
  number: number;
  name: string;
  nameArabic: string;
  ayahCount: number;
  revelationType: string;
}

interface RecentRead {
  surahName: string;
  surahNameArabic: string;
  ayah: number;
  date: string;
}

interface Reciter {
  id: string;
  name: string;
  nameArabic: string;
  downloaded: number;
  total: number;
}

export default function QuranScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('read');
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('modern');
  const [showThemes, setShowThemes] = useState(false);

  const recents: RecentRead[] = [
    { surahName: 'Al-Baqara', surahNameArabic: 'البَقَرَة', ayah: 26, date: 'الآن' },
    { surahName: 'Al-Fatiha', surahNameArabic: 'الفَاتِحَة', ayah: 3, date: 'أمس' },
    { surahName: 'Al-Baqara', surahNameArabic: 'البَقَرَة', ayah: 7, date: '٠٣/١٢' },
    { surahName: 'Al-Fatiha', surahNameArabic: 'الفَاتِحَة', ayah: 2, date: '٠٣/١٢' },
  ];

  const surahs: Surah[] = [
    { number: 1, name: 'Al-Fatiha', nameArabic: 'الفَاتِحَة', ayahCount: 7, revelationType: 'مكية' },
    { number: 2, name: 'Al-Baqara', nameArabic: 'البَقَرَة', ayahCount: 286, revelationType: 'مدنية' },
    { number: 3, name: 'Aal-Imran', nameArabic: 'آل عِمرَان', ayahCount: 200, revelationType: 'مدنية' },
    { number: 4, name: 'An-Nisa', nameArabic: 'النِّسَاء', ayahCount: 176, revelationType: 'مدنية' },
    { number: 5, name: 'Al-Maida', nameArabic: 'المَائِدَة', ayahCount: 120, revelationType: 'مدنية' },
    { number: 6, name: 'Al-Anam', nameArabic: 'الأَنعَام', ayahCount: 165, revelationType: 'مكية' },
    { number: 7, name: 'Al-Araf', nameArabic: 'الأَعرَاف', ayahCount: 206, revelationType: 'مكية' },
    { number: 8, name: 'Al-Anfal', nameArabic: 'الأَنفَال', ayahCount: 75, revelationType: 'مدنية' },
  ];

  const reciters: Reciter[] = [
    { id: '1', name: 'Abdul Rahman As-Sudais', nameArabic: 'عبدالرحمن السديس', downloaded: 0, total: 114 },
    { id: '2', name: 'Mishary Rashid Alafasy', nameArabic: 'مشاري راشد العفاسي', downloaded: 0, total: 114 },
    { id: '3', name: 'Saad Al-Ghamdi', nameArabic: 'سعد الغامدي', downloaded: 2, total: 114 },
  ];

  const themes: { key: ThemeType; label: string }[] = [
    { key: 'modern', label: 'عصري' },
    { key: 'paper', label: 'ورقي' },
    { key: 'dark', label: 'داكن' },
  ];

  const renderRecentItem = ({ item }: { item: RecentRead }) => (
    <TouchableOpacity style={styles.recentCard}>
      <Text style={styles.recentSurahArabic}>{item.surahNameArabic}</Text>
      <Text style={styles.recentSurah}>{item.surahName}</Text>
      <Text style={styles.recentAyah}>آية {item.ayah}</Text>
      <Text style={styles.recentDate}>{item.date}</Text>
    </TouchableOpacity>
  );

  const renderSurahItem = ({ item }: { item: Surah }) => (
    <TouchableOpacity style={styles.surahCard}>
      <View style={styles.surahNumber}>
        <Text style={styles.surahNumberText}>{item.number}</Text>
      </View>
      <View style={styles.surahInfo}>
        <Text style={styles.surahNameArabic}>{item.nameArabic}</Text>
        <Text style={styles.surahName}>{item.name}</Text>
      </View>
      <View style={styles.surahMeta}>
        <Text style={styles.surahAyahCount}>{item.ayahCount} آية</Text>
        <Text style={styles.surahType}>{item.revelationType}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderReciterItem = ({ item }: { item: Reciter }) => (
    <TouchableOpacity style={styles.reciterCard}>
      <View style={styles.reciterAvatar}>
        <Ionicons name="person" size={24} color={Colors.primary} />
      </View>
      <View style={styles.reciterInfo}>
        <Text style={styles.reciterName}>{item.nameArabic}</Text>
        <Text style={styles.reciterDownloaded}>
          {item.downloaded}/{item.total} تم التحميل
        </Text>
      </View>
      <TouchableOpacity style={styles.downloadBtn}>
        <Ionicons name="cloud-download-outline" size={24} color={Colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>القرآن الكريم</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="bookmark-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowThemes(!showThemes)}
          >
            <Ionicons name="color-palette-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="headset-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Theme Selector */}
      {showThemes && (
        <View style={styles.themesContainer}>
          <Text style={styles.themesTitle}>المظهر</Text>
          <View style={styles.themesRow}>
            {themes.map((theme) => (
              <TouchableOpacity
                key={theme.key}
                style={[
                  styles.themeOption,
                  selectedTheme === theme.key && styles.themeOptionActive,
                  theme.key === 'dark' && styles.themeOptionDark,
                ]}
                onPress={() => setSelectedTheme(theme.key)}
              >
                <Text
                  style={[
                    styles.themeText,
                    theme.key === 'dark' && styles.themeTextDark,
                  ]}
                >
                  بِسْمِ اللَّهِ
                </Text>
                <Text
                  style={[
                    styles.themeLabel,
                    selectedTheme === theme.key && styles.themeLabelActive,
                  ]}
                >
                  {theme.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'read' && styles.tabActive]}
          onPress={() => setActiveTab('read')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'read' && styles.tabTextActive,
            ]}
          >
            القراءة
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'learn' && styles.tabActive]}
          onPress={() => setActiveTab('learn')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'learn' && styles.tabTextActive,
            ]}
          >
            التعلم
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'progress' && styles.tabActive]}
          onPress={() => setActiveTab('progress')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'progress' && styles.tabTextActive,
            ]}
          >
            تقدمي
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'read' && (
          <>
            {/* Reading Goal */}
            <View style={styles.goalCard}>
              <View style={styles.goalInfo}>
                <Ionicons name="time-outline" size={20} color={Colors.primary} />
                <Text style={styles.goalText}>هدف القراءة: ٠/٥ دقائق</Text>
              </View>
              <View style={styles.goalProgress}>
                <View style={[styles.goalBar, { width: '0%' }]} />
              </View>
            </View>

            {/* Recents */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>القراءات الأخيرة</Text>
                <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={recents}
                renderItem={renderRecentItem}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={styles.recentsList}
              />
            </View>

            {/* Surah List */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>قائمة السور</Text>
                <TouchableOpacity style={styles.viewToggle}>
                  <Text style={styles.viewToggleText}>عرض: سورة</Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              {surahs.map((surah) => (
                <View key={surah.number}>{renderSurahItem({ item: surah })}</View>
              ))}
            </View>
          </>
        )}

        {activeTab === 'learn' && (
          <View style={styles.section}>
            {/* Reciters */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>القراء</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>عرض الكل</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.offlineNotice}>
              <Ionicons name="wifi-outline" size={20} color={Colors.error} />
              <Text style={styles.offlineText}>حمّل للاستماع بدون إنترنت</Text>
            </View>
            {reciters.map((reciter) => (
              <View key={reciter.id}>{renderReciterItem({ item: reciter })}</View>
            ))}
          </View>
        )}

        {activeTab === 'progress' && (
          <View style={styles.section}>
            <View style={styles.progressCard}>
              <Ionicons name="trophy" size={48} color={Colors.gold} />
              <Text style={styles.progressTitle}>تقدمك في القراءة</Text>
              <Text style={styles.progressStats}>٠ صفحة هذا الأسبوع</Text>
              <View style={styles.progressDetails}>
                <View style={styles.progressItem}>
                  <Text style={styles.progressNumber}>٠</Text>
                  <Text style={styles.progressLabel}>ختمات</Text>
                </View>
                <View style={styles.progressDivider} />
                <View style={styles.progressItem}>
                  <Text style={styles.progressNumber}>٠</Text>
                  <Text style={styles.progressLabel}>صفحات</Text>
                </View>
                <View style={styles.progressDivider} />
                <View style={styles.progressItem}>
                  <Text style={styles.progressNumber}>٠</Text>
                  <Text style={styles.progressLabel}>ساعات</Text>
                </View>
              </View>
            </View>
          </View>
        )}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  themesContainer: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  themesTitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  themesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  themeOption: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 90,
  },
  themeOptionActive: {
    borderColor: Colors.primary,
  },
  themeOptionDark: {
    backgroundColor: Colors.primaryDark,
  },
  themeText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  themeTextDark: {
    color: Colors.textLight,
  },
  themeLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  themeLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.textLight,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  goalText: {
    fontSize: 14,
    color: Colors.text,
  },
  goalProgress: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
  },
  goalBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.primary,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  viewToggleText: {
    fontSize: 12,
    color: Colors.primary,
  },
  recentsList: {
    gap: Spacing.sm,
  },
  recentCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minWidth: 100,
    alignItems: 'center',
  },
  recentSurahArabic: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: 4,
  },
  recentSurah: {
    fontSize: 12,
    color: Colors.textLight,
  },
  recentAyah: {
    fontSize: 12,
    color: Colors.textLight,
    opacity: 0.8,
    marginTop: 4,
  },
  recentDate: {
    fontSize: 10,
    color: Colors.textLight,
    opacity: 0.6,
    marginTop: 4,
  },
  surahCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  surahNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  surahNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  surahInfo: {
    flex: 1,
  },
  surahNameArabic: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  surahName: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  surahMeta: {
    alignItems: 'flex-end',
  },
  surahAyahCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  surahType: {
    fontSize: 10,
    color: Colors.primary,
    marginTop: 2,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FEE2E2',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  offlineText: {
    fontSize: 14,
    color: Colors.error,
  },
  reciterCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reciterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  reciterInfo: {
    flex: 1,
  },
  reciterName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  reciterDownloaded: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  downloadBtn: {
    padding: Spacing.sm,
  },
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  progressStats: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  progressDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
});
