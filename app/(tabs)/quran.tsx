import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuran } from '../../contexts/QuranContext';
import { useColors } from '../../lib/theme-provider';
import GlassCard from '../../components/ui/GlassCard';
import AudioPlayerBar from '../../components/quran/AudioPlayerBar';
import {
  Spacing,
  BorderRadius,
  FONT_SIZES,
  Typography,
  Shadows,
} from '../../constants/theme';

// أرقام الصفحات لكل سورة
const SURAH_PAGES: { [key: number]: number } = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187,
  10: 208, 11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267,
  17: 282, 18: 293, 19: 305, 20: 312, 21: 322, 22: 332, 23: 342,
  24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404,
  31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446,
  38: 453, 39: 458, 40: 467, 41: 477, 42: 483, 43: 489, 44: 496,
  45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518, 51: 520,
  52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542,
  59: 545, 60: 549, 61: 551, 62: 553, 63: 554, 64: 556, 65: 558,
  66: 560, 67: 562, 68: 564, 69: 566, 70: 568, 71: 570, 72: 572,
  73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583,
  80: 585, 81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591,
  87: 591, 88: 592, 89: 593, 90: 594, 91: 595, 92: 595, 93: 596,
  94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599,
  101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602,
  107: 602, 108: 602, 109: 603, 110: 603, 111: 603, 112: 604,
  113: 604, 114: 604,
};

// تحويل الأرقام للعربية
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num
    .toString()
    .split('')
    .map((d) => arabicNumerals[parseInt(d)])
    .join('');
};

// أنواع السور
const getRevelationType = (type: string): string => {
  return type === 'Meccan' ? 'مكية' : 'مدنية';
};

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Reciter {
  identifier: string;
  name: string;
  englishName: string;
}

export default function QuranScreen() {
  const router = useRouter();
  const colors = useColors();
  const {
    surahs,
    reciters,
    isLoading,
    error,
    playbackState,
    currentReciter,
    setReciter,
  } = useQuran();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'read' | 'listen'>('read');
  const [showReciterModal, setShowReciterModal] = useState(false);

  // فلترة السور حسب البحث
  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahs;
    const query = searchQuery.toLowerCase().trim();
    return surahs.filter(
      (surah: Surah) =>
        surah.name.includes(query) ||
        surah.englishName.toLowerCase().includes(query) ||
        surah.number.toString() === query
    );
  }, [surahs, searchQuery]);

  // الحصول على اسم القارئ الحالي
  const currentReciterName = useMemo(() => {
    const reciter = reciters.find(
      (r: Reciter) => r.identifier === currentReciter
    );
    return reciter?.name || 'اختر قارئ';
  }, [reciters, currentReciter]);

  // فتح صفحة السورة
  const openSurah = useCallback(
    (surahNumber: number) => {
      router.push(`/surah/${surahNumber}`);
    },
    [router]
  );

  // اختيار قارئ
  const selectReciter = useCallback(
    (identifier: string) => {
      setReciter(identifier);
      setShowReciterModal(false);
    },
    [setReciter]
  );

  // عرض عنصر السورة
  const renderSurahItem = useCallback(
    ({ item }: { item: Surah }) => (
      <TouchableOpacity
        style={[styles.surahItem, { borderBottomColor: colors.border }]}
        onPress={() => openSurah(item.number)}
        activeOpacity={0.7}
      >
        {/* رقم السورة */}
        <View style={[styles.surahNumber, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.surahNumberText, { color: colors.primary }]}>
            {toArabicNumber(item.number)}
          </Text>
        </View>

        {/* معلومات السورة */}
        <View style={styles.surahInfo}>
          <Text style={[styles.surahName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.surahDetails, { color: colors.textSecondary }]}>
            {getRevelationType(item.revelationType)} • {toArabicNumber(item.numberOfAyahs)} آية
          </Text>
        </View>

        {/* رقم الصفحة */}
        <View style={styles.pageInfo}>
          <Text style={[styles.pageNumber, { color: colors.textSecondary }]}>
            ص {toArabicNumber(SURAH_PAGES[item.number] || 1)}
          </Text>
          <Ionicons
            name="chevron-back"
            size={20}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>
    ),
    [colors, openSurah]
  );

  // عرض عنصر القارئ
  const renderReciterItem = useCallback(
    ({ item }: { item: Reciter }) => (
      <TouchableOpacity
        style={[
          styles.reciterItem,
          { borderBottomColor: colors.border },
          item.identifier === currentReciter && {
            backgroundColor: colors.primary + '15',
          },
        ]}
        onPress={() => selectReciter(item.identifier)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.reciterName,
            { color: colors.text },
            item.identifier === currentReciter && { color: colors.primary },
          ]}
        >
          {item.name}
        </Text>
        {item.identifier === currentReciter && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    ),
    [colors, currentReciter, selectReciter]
  );

  // شاشة التحميل
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            جاري تحميل القرآن الكريم...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // شاشة الخطأ
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/quran')}
          >
            <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          القرآن الكريم
        </Text>
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.card }]}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* التبويبات */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'read' && {
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => setActiveTab('read')}
        >
          <Ionicons
            name="book-outline"
            size={20}
            color={activeTab === 'read' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'read' ? '#FFFFFF' : colors.textSecondary,
              },
            ]}
          >
            قراءة
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'listen' && {
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => setActiveTab('listen')}
        >
          <Ionicons
            name="headset-outline"
            size={20}
            color={activeTab === 'listen' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'listen' ? '#FFFFFF' : colors.textSecondary,
              },
            ]}
          >
            استماع
          </Text>
        </TouchableOpacity>
      </View>

      {/* اختيار القارئ (في وضع الاستماع) */}
      {activeTab === 'listen' && (
        <TouchableOpacity
          style={[styles.reciterSelector, { backgroundColor: colors.card }]}
          onPress={() => setShowReciterModal(true)}
        >
          <View style={styles.reciterSelectorContent}>
            <Ionicons name="person" size={20} color={colors.primary} />
            <Text style={[styles.reciterSelectorText, { color: colors.text }]}>
              {currentReciterName}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* البحث */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="ابحث عن سورة..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* قائمة السور */}
      <FlatList
        data={filteredSurahs}
        renderItem={renderSurahItem}
        keyExtractor={(item) => item.number.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              لا توجد نتائج للبحث
            </Text>
          </View>
        }
      />

      {/* شريط التشغيل */}
      <AudioPlayerBar />

      {/* Modal اختيار القارئ */}
      <Modal
        visible={showReciterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReciterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.background }]}
          >
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                اختر القارئ
              </Text>
              <TouchableOpacity onPress={() => setShowReciterModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* قائمة القراء */}
            <FlatList
              data={reciters}
              renderItem={renderReciterItem}
              keyExtractor={(item) => item.identifier}
              contentContainerStyle={styles.recitersList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  reciterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  reciterSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reciterSelectorText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    textAlign: 'right',
    paddingVertical: Platform.OS === 'ios' ? Spacing.xs : 0,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  surahItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  surahNumber: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  surahNumberText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  surahInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  surahName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  surahDetails: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  pageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pageNumber: {
    fontSize: FONT_SIZES.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  recitersList: {
    paddingBottom: Spacing.xl,
  },
  reciterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  reciterName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
});
