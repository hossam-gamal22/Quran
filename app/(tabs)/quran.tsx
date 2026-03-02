// app/(tabs)/quran.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useQuran } from '../../contexts/QuranContext';
import { AudioPlayerBar } from '../../components/quran/AudioPlayerBar';
import {
  RECITERS,
  SURAH_NAMES_AR,
} from '../../lib/quran-api';
import { copyToClipboard } from '../../lib/clipboard';

// ===============================
// الأنواع
// ===============================
type TabType = 'surah' | 'juz' | 'bookmarks';

interface BookmarkItem {
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  timestamp: number;
}

interface LastRead {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  timestamp: number;
}

// ===============================
// المكون الرئيسي
// ===============================
export default function QuranScreen() {
  const router = useRouter();
  
  // ✅ استخدام QuranContext - البيانات محملة مسبقاً
  const { 
    surahs, 
    reciters, 
    isLoading: quranLoading,
    playbackState,
    currentReciter,
    setReciter,
    resumePlayback,
  } = useQuran();
  
  // الحالة
  const [activeTab, setActiveTab] = useState<TabType>('surah');
  const [filteredSurahs, setFilteredSurahs] = useState(surahs);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [lastRead, setLastRead] = useState<LastRead | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0]);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [verseOfDay, setVerseOfDay] = useState<{
    surah: string;
    ayahNumber: number;
    text: string;
    surahNumber: number;
  } | null>(null);

  // ===============================
  // تحميل البيانات من الكاش
  // ===============================
  useEffect(() => {
    if (surahs.length > 0) {
      setFilteredSurahs(surahs);
      loadVerseOfDay();
    }
  }, [surahs]);

  useEffect(() => {
    loadSavedData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = surahs.filter(surah =>
        surah.name.includes(searchQuery) ||
        surah.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        surah.number.toString() === searchQuery
      );
      setFilteredSurahs(filtered);
    } else {
      setFilteredSurahs(surahs);
    }
  }, [searchQuery, surahs]);

  const loadSavedData = async () => {
    try {
      // تحميل الإشارات المرجعية
      const savedBookmarks = await AsyncStorage.getItem('quran_bookmarks');
      if (savedBookmarks) {
        setBookmarks(JSON.parse(savedBookmarks));
      }
      
      // تحميل القراءة الأخيرة
      const savedLastRead = await AsyncStorage.getItem('quran_last_read');
      if (savedLastRead) {
        setLastRead(JSON.parse(savedLastRead));
      }
      
      // تحميل القارئ المختار
      const savedReciter = await AsyncStorage.getItem('quran_reciter');
      if (savedReciter) {
        const reciter = RECITERS.find(r => r.identifier === savedReciter);
        if (reciter) {
          setSelectedReciter(reciter);
          setReciter(reciter.identifier);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const loadVerseOfDay = () => {
    if (surahs.length === 0) return;
    
    // اختيار آية عشوائية بناءً على اليوم
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    
    const randomSurahIndex = dayOfYear % surahs.length;
    const randomSurah = surahs[randomSurahIndex];
    const randomAyah = (dayOfYear % randomSurah.numberOfAyahs) + 1;
    
    // الحصول على نص الآية من الكاش
    const ayah = randomSurah.ayahs?.find(a => a.numberInSurah === randomAyah);
    if (ayah) {
      setVerseOfDay({
        surah: randomSurah.name,
        surahNumber: randomSurah.number,
        ayahNumber: randomAyah,
        text: ayah.text,
      });
    }
  };

  // ===============================
  // اختيار القارئ
  // ===============================
  const selectReciter = async (reciter: typeof RECITERS[0]) => {
    setSelectedReciter(reciter);
    setReciter(reciter.identifier);
    await AsyncStorage.setItem('quran_reciter', reciter.identifier);
    setShowReciterModal(false);
  };

  // ===============================
  // الإشارات المرجعية
  // ===============================
  const removeBookmark = async (bookmarkId: string) => {
    const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    setBookmarks(updatedBookmarks);
    await AsyncStorage.setItem('quran_bookmarks', JSON.stringify(updatedBookmarks));
  };

  // ===============================
  // فتح السورة
  // ===============================
  const openSurah = (surahNumber: number) => {
    router.push(`/surah/${surahNumber}`);
  };

  // ===============================
  // استكمال التلاوة
  // ===============================
  const handleResumePlayback = async () => {
    const resumed = await resumePlayback();
    if (!resumed) {
      Alert.alert('', 'لا يوجد تلاوة سابقة للاستكمال');
    }
  };

  // ===============================
  // عرض عنصر السورة
  // ===============================
  const renderSurahItem = ({ item }: { item: typeof surahs[0] }) => (
    <TouchableOpacity
      style={styles.surahItem}
      onPress={() => openSurah(item.number)}
      activeOpacity={0.7}
    >
      <View style={styles.surahRight}>
        <Ionicons name="chevron-back" size={20} color={Colors.textLight} />
      </View>
      
      <View style={styles.surahInfo}>
        <Text style={styles.surahName}>{item.name}</Text>
        <Text style={styles.surahDetails}>
          {item.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} • {item.numberOfAyahs} آية
        </Text>
      </View>
      
      <View style={styles.surahNumber}>
        <Text style={styles.surahNumberText}>{item.number}</Text>
      </View>
    </TouchableOpacity>
  );

  // ===============================
  // عرض عنصر الجزء
  // ===============================
  const renderJuzItem = (juzNumber: number) => (
    <TouchableOpacity
      key={juzNumber}
      style={styles.juzItem}
      onPress={() => router.push(`/juz/${juzNumber}`)}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={20} color={Colors.textLight} />
      <Text style={styles.juzName}>الجزء {juzNumber}</Text>
      <View style={styles.juzNumber}>
        <Text style={styles.juzNumberText}>{juzNumber}</Text>
      </View>
    </TouchableOpacity>
  );

  // ===============================
  // عرض عنصر الإشارة المرجعية
  // ===============================
  const renderBookmarkItem = ({ item }: { item: BookmarkItem }) => (
    <View style={styles.bookmarkItem}>
      <TouchableOpacity
        style={styles.bookmarkContent}
        onPress={() => router.push(`/surah/${item.surahNumber}?ayah=${item.ayahNumber}`)}
      >
        <View style={styles.bookmarkHeader}>
          <Text style={styles.bookmarkAyahNum}>آية {item.ayahNumber}</Text>
          <Text style={styles.bookmarkSurah}>{item.surahName}</Text>
        </View>
        <Text style={styles.bookmarkText} numberOfLines={2}>
          {item.ayahText}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.bookmarkActions}>
        <TouchableOpacity
          style={styles.bookmarkAction}
          onPress={() => copyToClipboard(item.ayahText)}
        >
          <Ionicons name="copy-outline" size={18} color={Colors.secondary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.bookmarkAction}
          onPress={() => removeBookmark(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ===============================
  // عرض التحميل
  // ===============================
  if (quranLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل القرآن الكريم...</Text>
        <Text style={styles.loadingSubtext}>يتم تحميل 114 سورة</Text>
      </SafeAreaView>
    );
  }

  // ===============================
  // العرض الرئيسي
  // ===============================
  return (
    <SafeAreaView style={styles.container}>
      {/* الرأس */}
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowReciterModal(true)}
          >
            <Ionicons name="mic" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.headerTitle}>القرآن الكريم</Text>
      </View>

      {/* آية اليوم */}
      {verseOfDay && activeTab === 'surah' && (
        <TouchableOpacity
          style={styles.verseOfDayCard}
          onPress={() => router.push(`/ayah-of-day?surah=${verseOfDay.surahNumber}&ayah=${verseOfDay.ayahNumber}`)}
          activeOpacity={0.8}
        >
          <View style={styles.verseOfDayHeader}>
            <View style={styles.verseOfDayBadge}>
              <Text style={styles.verseOfDayBadgeText}>آية اليوم</Text>
              <Ionicons name="sunny" size={16} color={Colors.gold} />
            </View>
          </View>
          
          <Text style={styles.verseOfDayText} numberOfLines={2}>
            ﴿ {verseOfDay.text} ﴾
          </Text>
          
          <Text style={styles.verseOfDayRef}>
            {verseOfDay.surah} - آية {verseOfDay.ayahNumber}
          </Text>
        </TouchableOpacity>
      )}

      {/* استكمال التلاوة */}
      {lastRead && activeTab === 'surah' && (
        <TouchableOpacity
          style={styles.lastReadCard}
          onPress={() => router.push(`/surah/${lastRead.surahNumber}?ayah=${lastRead.ayahNumber}`)}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.textLight} />
          
          <View style={styles.lastReadInfo}>
            <Text style={styles.lastReadSurah}>
              {lastRead.surahName} - آية {lastRead.ayahNumber}
            </Text>
            <Text style={styles.lastReadLabel}>متابعة القراءة</Text>
          </View>
          
          <View style={styles.lastReadIcon}>
            <Ionicons name="bookmark" size={24} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      )}

      {/* زر استكمال التلاوة */}
      {playbackState.currentSurah > 0 && activeTab === 'surah' && (
        <TouchableOpacity
          style={styles.resumeCard}
          onPress={handleResumePlayback}
        >
          <View style={styles.resumeInfo}>
            <Ionicons name="play-circle" size={24} color={Colors.primary} />
            <Text style={styles.resumeText}>استكمال التلاوة</Text>
          </View>
          <Text style={styles.resumeDetails}>
            {surahs.find(s => s.number === playbackState.currentSurah)?.name} - آية {playbackState.currentAyah}
          </Text>
        </TouchableOpacity>
      )}

      {/* القارئ المختار */}
      <TouchableOpacity
        style={styles.reciterCard}
        onPress={() => setShowReciterModal(true)}
      >
        <Ionicons name="chevron-down" size={16} color={Colors.textLight} />
        <Text style={styles.reciterName}>{selectedReciter.name}</Text>
        <Ionicons name="mic" size={20} color={Colors.secondary} />
      </TouchableOpacity>

      {/* شريط البحث */}
      <View style={styles.searchBar}>
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن سورة..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Ionicons name="search" size={20} color={Colors.textLight} />
      </View>

      {/* التبويبات */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookmarks' && styles.tabActive]}
          onPress={() => setActiveTab('bookmarks')}
        >
          {bookmarks.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{bookmarks.length}</Text>
            </View>
          )}
          <Text style={[styles.tabText, activeTab === 'bookmarks' && styles.tabTextActive]}>
            المحفوظات
          </Text>
          <Ionicons 
            name="bookmarks" 
            size={18} 
            color={activeTab === 'bookmarks' ? Colors.primary : Colors.textLight} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'juz' && styles.tabActive]}
          onPress={() => setActiveTab('juz')}
        >
          <Text style={[styles.tabText, activeTab === 'juz' && styles.tabTextActive]}>
            الأجزاء
          </Text>
          <Ionicons 
            name="layers" 
            size={18} 
            color={activeTab === 'juz' ? Colors.primary : Colors.textLight} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'surah' && styles.tabActive]}
          onPress={() => setActiveTab('surah')}
        >
          <Text style={[styles.tabText, activeTab === 'surah' && styles.tabTextActive]}>
            السور
          </Text>
          <Ionicons 
            name="book" 
            size={18} 
            color={activeTab === 'surah' ? Colors.primary : Colors.textLight} 
          />
        </TouchableOpacity>
      </View>

      {/* المحتوى */}
      {activeTab === 'surah' && (
        <FlatList
          data={filteredSurahs}
          renderItem={renderSurahItem}
          keyExtractor={item => item.number.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
        />
      )}

      {activeTab === 'juz' && (
        <ScrollView 
          style={styles.juzList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {Array.from({ length: 30 }, (_, i) => i + 1).map(juzNumber => 
            renderJuzItem(juzNumber)
          )}
        </ScrollView>
      )}

      {activeTab === 'bookmarks' && (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmarkItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bookmarks-outline" size={64} color={Colors.textLight} />
              <Text style={styles.emptyText}>لا توجد إشارات مرجعية</Text>
              <Text style={styles.emptySubtext}>
                اضغط مطولاً على أي آية لحفظها
              </Text>
            </View>
          }
        />
      )}

      {/* شريط المشغل */}
      <AudioPlayerBar />

      {/* نافذة اختيار القارئ */}
      <Modal
        visible={showReciterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReciterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReciterModal(false)}
        >
          <View style={styles.reciterModalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReciterModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textLight} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>اختر القارئ</Text>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {RECITERS.map(reciter => (
                <TouchableOpacity
                  key={reciter.identifier}
                  style={[
                    styles.reciterItem,
                    selectedReciter.identifier === reciter.identifier && styles.reciterItemActive
                  ]}
                  onPress={() => selectReciter(reciter)}
                >
                  {selectedReciter.identifier === reciter.identifier && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                  
                  <View style={styles.reciterItemRight}>
                    <Text style={[
                      styles.reciterItemName,
                      selectedReciter.identifier === reciter.identifier && styles.reciterItemNameActive
                    ]}>
                      {reciter.name}
                    </Text>
                    <Ionicons 
                      name="mic" 
                      size={24} 
                      color={selectedReciter.identifier === reciter.identifier ? Colors.primary : Colors.textLight} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ===============================
// الأنماط
// ===============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.textLight,
  },

  // الرأس
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // آية اليوم
  verseOfDayCard: {
    margin: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  verseOfDayHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.md,
  },
  verseOfDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.gold + '20',
    borderRadius: BorderRadius.full,
  },
  verseOfDayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gold,
  },
  verseOfDayText: {
    fontSize: 20,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: Spacing.sm,
  },
  verseOfDayRef: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },

  // القراءة الأخيرة
  lastReadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  lastReadIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastReadInfo: {
    flex: 1,
    marginRight: Spacing.md,
    alignItems: 'flex-end',
  },
  lastReadLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  lastReadSurah: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },

  // استكمال التلاوة
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  resumeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resumeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  resumeDetails: {
    fontSize: 12,
    color: Colors.textLight,
  },

  // القارئ
  reciterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.secondary + '10',
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  reciterName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // البحث
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'right',
  },

  // التبويبات
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
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
  tabActive: {
    backgroundColor: Colors.primary + '15',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  badgeCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },

  // قائمة السور
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 150,
  },
  surahItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  surahNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNumberText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  surahInfo: {
    flex: 1,
    marginRight: Spacing.md,
    alignItems: 'flex-end',
  },
  surahName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  surahDetails: {
    fontSize: 12,
    color: Colors.textLight,
  },
  surahRight: {
    padding: Spacing.xs,
  },

  // قائمة الأجزاء
  juzList: {
    flex: 1,
  },
  juzItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  juzNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  juzNumberText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  juzName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    marginRight: Spacing.md,
  },

  // الإشارات المرجعية
  bookmarkItem: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  bookmarkContent: {
    padding: Spacing.md,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  bookmarkSurah: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  bookmarkAyahNum: {
    fontSize: 12,
    color: Colors.textLight,
  },
  bookmarkText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 28,
    textAlign: 'right',
  },
  bookmarkActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bookmarkAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },

  // الحالة الفارغة
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },

  // النوافذ المنبثقة
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reciterModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  reciterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reciterItemActive: {
    backgroundColor: Colors.primary + '10',
  },
  reciterItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  reciterItemName: {
    fontSize: 16,
    color: Colors.text,
  },
  reciterItemNameActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
});
