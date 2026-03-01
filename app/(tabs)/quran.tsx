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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import {
  fetchSurahs,
  fetchSurah,
  fetchSurahWithTranslation,
  RECITERS,
  SURAH_NAMES_AR,
  TAFSIR_EDITIONS,
  Surah,
  Ayah,
} from '../../lib/quran-api';
import {
  shareAyah,
  shareSurah,
  shareVerseOfDay,
  copyToClipboard,
  formatAyahForShare,
  ShareContent,
} from '../../lib/share-service';

// ===============================
// الأنواع
// ===============================
type TabType = 'surah' | 'juz' | 'bookmarks' | 'search';

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
  pageNumber?: number;
  timestamp: number;
}

interface SearchResult {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  highlightedText?: string;
}

// ===============================
// المكون الرئيسي
// ===============================
export default function QuranScreen() {
  const router = useRouter();
  
  // الحالة الأساسية
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('surah');
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [filteredSurahs, setFilteredSurahs] = useState<Surah[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // الإشارات المرجعية والقراءة الأخيرة
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [lastRead, setLastRead] = useState<LastRead | null>(null);
  
  // القارئ المختار
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0]);
  const [showReciterModal, setShowReciterModal] = useState(false);
  
  // البحث المتقدم
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // المشاركة
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [shareType, setShareType] = useState<'surah' | 'ayah'>('surah');
  
  // آية اليوم
  const [verseOfDay, setVerseOfDay] = useState<{
    surah: string;
    ayahNumber: number;
    text: string;
    surahNumber: number;
  } | null>(null);

  // ===============================
  // تحميل البيانات
  // ===============================
  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setLoading(true);
      
      // جلب السور
      const surahsData = await fetchSurahs();
      setSurahs(surahsData);
      setFilteredSurahs(surahsData);
      
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
        if (reciter) setSelectedReciter(reciter);
      }
      
      // تحميل آية اليوم
      await loadVerseOfDay(surahsData);
      
    } catch (error) {
      console.error('Error loading Quran data:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadVerseOfDay = async (surahsList: Surah[]) => {
    try {
      // اختيار آية عشوائية بناءً على اليوم
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
      
      const randomSurahIndex = dayOfYear % surahsList.length;
      const randomSurah = surahsList[randomSurahIndex];
      const randomAyah = (dayOfYear % randomSurah.numberOfAyahs) + 1;
      
      // جلب الآية
      const surahData = await fetchSurah(randomSurah.number);
      if (surahData && surahData.ayahs) {
        const ayah = surahData.ayahs.find((a: Ayah) => a.numberInSurah === randomAyah);
        if (ayah) {
          setVerseOfDay({
            surah: randomSurah.name,
            surahNumber: randomSurah.number,
            ayahNumber: randomAyah,
            text: ayah.text,
          });
        }
      }
    } catch (error) {
      console.error('Error loading verse of day:', error);
    }
  };

  // ===============================
  // اختيار القارئ
  // ===============================
  const selectReciter = async (reciter: typeof RECITERS[0]) => {
    setSelectedReciter(reciter);
    await AsyncStorage.setItem('quran_reciter', reciter.identifier);
    setShowReciterModal(false);
  };

  // ===============================
  // الإشارات المرجعية
  // ===============================
  const addBookmark = async (surahNumber: number, surahName: string, ayahNumber: number, ayahText: string) => {
    const newBookmark: BookmarkItem = {
      id: `${surahNumber}-${ayahNumber}-${Date.now()}`,
      surahNumber,
      surahName,
      ayahNumber,
      ayahText,
      timestamp: Date.now(),
    };
    
    const updatedBookmarks = [newBookmark, ...bookmarks];
    setBookmarks(updatedBookmarks);
    await AsyncStorage.setItem('quran_bookmarks', JSON.stringify(updatedBookmarks));
    Alert.alert('تم الحفظ', 'تمت إضافة الإشارة المرجعية ✓');
  };

  const removeBookmark = async (bookmarkId: string) => {
    const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    setBookmarks(updatedBookmarks);
    await AsyncStorage.setItem('quran_bookmarks', JSON.stringify(updatedBookmarks));
  };

  // ===============================
  // البحث المتقدم
  // ===============================
  const handleAdvancedSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // البحث في الآيات (يمكن استخدام API للبحث)
      const results: SearchResult[] = [];
      
      // هنا يمكن إضافة بحث حقيقي عبر API
      // للتبسيط، سنبحث في أسماء السور
      surahs.forEach(surah => {
        if (surah.name.includes(query)) {
          results.push({
            surahNumber: surah.number,
            surahName: surah.name,
            ayahNumber: 1,
            ayahText: `سورة ${surah.name} - ${surah.numberOfAyahs} آية`,
          });
        }
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // ===============================
  // المشاركة
  // ===============================
  const handleShareSurah = async (surah: Surah) => {
    await shareSurah(
      surah.name,
      surah.number,
      surah.numberOfAyahs,
      surah.revelationType
    );
  };

  const handleShareAyah = async (
    ayahText: string,
    surahName: string,
    ayahNumber: number
  ) => {
    await shareAyah(ayahText, surahName, ayahNumber);
  };

  const handleShareVerseOfDay = async () => {
    if (verseOfDay) {
      await shareVerseOfDay(
        verseOfDay.text,
        verseOfDay.surah,
        verseOfDay.ayahNumber
      );
    }
  };

  const handleCopyAyah = async (ayahText: string, surahName: string, ayahNumber: number) => {
    const text = formatAyahForShare(ayahText, surahName, ayahNumber, undefined, { includeAppName: true });
    const success = await copyToClipboard(text);
    if (success) {
      Alert.alert('تم النسخ', 'تم نسخ الآية إلى الحافظة ✓');
    }
  };

  const openShareModal = (item: any, type: 'surah' | 'ayah') => {
    setSelectedItem(item);
    setShareType(type);
    setShowShareModal(true);
  };

  // ===============================
  // فتح السورة
  // ===============================
  const openSurah = (surahNumber: number) => {
    router.push(`/surah/${surahNumber}?reciter=${selectedReciter.identifier}`);
  };

  // ===============================
  // عرض عنصر السورة
  // ===============================
  const renderSurahItem = ({ item }: { item: Surah }) => (
    <TouchableOpacity
      style={styles.surahItem}
      onPress={() => openSurah(item.number)}
      onLongPress={() => openShareModal(item, 'surah')}
    >
      <View style={styles.surahLeft}>
        <View style={styles.surahNumber}>
          <Text style={styles.surahNumberText}>{item.number}</Text>
        </View>
        
        <View style={styles.surahInfo}>
          <Text style={styles.surahName}>{item.name}</Text>
          <Text style={styles.surahDetails}>
            {item.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} • {item.numberOfAyahs} آية
          </Text>
        </View>
      </View>
      
      <View style={styles.surahRight}>
        {/* زر المشاركة */}
        <TouchableOpacity
          style={styles.surahAction}
          onPress={() => handleShareSurah(item)}
        >
          <Ionicons name="share-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
        
        <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
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
    >
      <View style={styles.juzNumber}>
        <Text style={styles.juzNumberText}>{juzNumber}</Text>
      </View>
      <Text style={styles.juzName}>الجزء {juzNumber}</Text>
      <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
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
          <Text style={styles.bookmarkSurah}>{item.surahName}</Text>
          <Text style={styles.bookmarkAyahNum}>آية {item.ayahNumber}</Text>
        </View>
        <Text style={styles.bookmarkText} numberOfLines={2}>
          {item.ayahText}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.bookmarkActions}>
        {/* مشاركة */}
        <TouchableOpacity
          style={styles.bookmarkAction}
          onPress={() => handleShareAyah(item.ayahText, item.surahName, item.ayahNumber)}
        >
          <Ionicons name="share-outline" size={18} color={Colors.primary} />
        </TouchableOpacity>
        
        {/* نسخ */}
        <TouchableOpacity
          style={styles.bookmarkAction}
          onPress={() => handleCopyAyah(item.ayahText, item.surahName, item.ayahNumber)}
        >
          <Ionicons name="copy-outline" size={18} color={Colors.secondary} />
        </TouchableOpacity>
        
        {/* حذف */}
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
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل القرآن الكريم...</Text>
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
        <Text style={styles.headerTitle}>القرآن الكريم</Text>
        
        <View style={styles.headerActions}>
          {/* اختيار القارئ */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowReciterModal(true)}
          >
            <Ionicons name="mic" size={22} color={Colors.primary} />
          </TouchableOpacity>
          
          {/* البحث */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setActiveTab('search')}
          >
            <Ionicons name="search" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* آية اليوم */}
      {verseOfDay && activeTab === 'surah' && (
        <TouchableOpacity
          style={styles.verseOfDayCard}
          onPress={() => openSurah(verseOfDay.surahNumber)}
          onLongPress={handleShareVerseOfDay}
        >
          <View style={styles.verseOfDayHeader}>
            <View style={styles.verseOfDayBadge}>
              <Ionicons name="sunny" size={16} color={Colors.gold} />
              <Text style={styles.verseOfDayBadgeText}>آية اليوم</Text>
            </View>
            
            <View style={styles.verseOfDayActions}>
              <TouchableOpacity onPress={handleShareVerseOfDay}>
                <Ionicons name="share-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.verseOfDayText} numberOfLines={3}>
            ﴿ {verseOfDay.text} ﴾
          </Text>
          
          <Text style={styles.verseOfDayRef}>
            {verseOfDay.surah} - آية {verseOfDay.ayahNumber}
          </Text>
        </TouchableOpacity>
      )}

      {/* القراءة الأخيرة */}
      {lastRead && activeTab === 'surah' && (
        <TouchableOpacity
          style={styles.lastReadCard}
          onPress={() => router.push(`/surah/${lastRead.surahNumber}?ayah=${lastRead.ayahNumber}`)}
        >
          <View style={styles.lastReadIcon}>
            <Ionicons name="bookmark" size={24} color={Colors.primary} />
          </View>
          
          <View style={styles.lastReadInfo}>
            <Text style={styles.lastReadLabel}>متابعة القراءة</Text>
            <Text style={styles.lastReadSurah}>
              {lastRead.surahName} - آية {lastRead.ayahNumber}
            </Text>
          </View>
          
          <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* القارئ المختار */}
      <TouchableOpacity
        style={styles.reciterCard}
        onPress={() => setShowReciterModal(true)}
      >
        <Ionicons name="mic" size={20} color={Colors.secondary} />
        <Text style={styles.reciterName}>{selectedReciter.name}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* شريط البحث */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن سورة..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* التبويبات */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'surah' && styles.tabActive]}
          onPress={() => setActiveTab('surah')}
        >
          <Ionicons 
            name="book" 
            size={18} 
            color={activeTab === 'surah' ? Colors.primary : Colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'surah' && styles.tabTextActive]}>
            السور
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'juz' && styles.tabActive]}
          onPress={() => setActiveTab('juz')}
        >
          <Ionicons 
            name="layers" 
            size={18} 
            color={activeTab === 'juz' ? Colors.primary : Colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'juz' && styles.tabTextActive]}>
            الأجزاء
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookmarks' && styles.tabActive]}
          onPress={() => setActiveTab('bookmarks')}
        >
          <Ionicons 
            name="bookmarks" 
            size={18} 
            color={activeTab === 'bookmarks' ? Colors.primary : Colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'bookmarks' && styles.tabTextActive]}>
            المحفوظات
          </Text>
          {bookmarks.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{bookmarks.length}</Text>
            </View>
          )}
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
              <Ionicons name="bookmarks-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>لا توجد إشارات مرجعية</Text>
              <Text style={styles.emptySubtext}>
                اضغط مطولاً على أي آية لحفظها
              </Text>
            </View>
          }
        />
      )}

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
              <Text style={styles.modalTitle}>اختر القارئ</Text>
              <TouchableOpacity onPress={() => setShowReciterModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
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
                  <View style={styles.reciterItemLeft}>
                    <Ionicons 
                      name="mic" 
                      size={24} 
                      color={selectedReciter.identifier === reciter.identifier ? Colors.primary : Colors.textMuted} 
                    />
                    <Text style={[
                      styles.reciterItemName,
                      selectedReciter.identifier === reciter.identifier && styles.reciterItemNameActive
                    ]}>
                      {reciter.name}
                    </Text>
                  </View>
                  
                  {selectedReciter.identifier === reciter.identifier && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* نافذة المشاركة */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowShareModal(false)}
        >
          <View style={styles.shareModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {shareType === 'surah' ? 'مشاركة السورة' : 'مشاركة الآية'}
              </Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <>
                {/* معاينة */}
                <View style={styles.sharePreview}>
                  {shareType === 'surah' ? (
                    <>
                      <Text style={styles.sharePreviewTitle}>
                        سورة {selectedItem.name}
                      </Text>
                      <Text style={styles.sharePreviewSubtitle}>
                        {selectedItem.numberOfAyahs} آية • {selectedItem.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.sharePreviewText} numberOfLines={3}>
                      ﴿ {selectedItem.text} ﴾
                    </Text>
                  )}
                </View>

                {/* خيارات المشاركة */}
                <View style={styles.shareOptionsGrid}>
                  {/* مشاركة */}
                  <TouchableOpacity
                    style={styles.shareOptionItem}
                    onPress={() => {
                      if (shareType === 'surah') {
                        handleShareSurah(selectedItem);
                      } else {
                        handleShareAyah(selectedItem.text, selectedItem.surahName, selectedItem.ayahNumber);
                      }
                      setShowShareModal(false);
                    }}
                  >
                    <View style={[styles.shareOptionIcon, { backgroundColor: Colors.primary + '20' }]}>
                      <Ionicons name="share-social" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.shareOptionText}>مشاركة</Text>
                  </TouchableOpacity>

                  {/* نسخ */}
                  <TouchableOpacity
                    style={styles.shareOptionItem}
                    onPress={async () => {
                      if (shareType === 'surah') {
                        const text = `📖 سورة ${selectedItem.name}\n${selectedItem.numberOfAyahs} آية`;
                        await copyToClipboard(text);
                      } else {
                        await handleCopyAyah(selectedItem.text, selectedItem.surahName, selectedItem.ayahNumber);
                      }
                      setShowShareModal(false);
                    }}
                  >
                    <View style={[styles.shareOptionIcon, { backgroundColor: Colors.secondary + '20' }]}>
                      <Ionicons name="copy" size={24} color={Colors.secondary} />
                    </View>
                    <Text style={styles.shareOptionText}>نسخ</Text>
                  </TouchableOpacity>

                  {/* واتساب */}
                  <TouchableOpacity
                    style={styles.shareOptionItem}
                    onPress={() => {
                      if (shareType === 'surah') {
                        handleShareSurah(selectedItem);
                      } else {
                        handleShareAyah(selectedItem.text, selectedItem.surahName, selectedItem.ayahNumber);
                      }
                      setShowShareModal(false);
                    }}
                  >
                    <View style={[styles.shareOptionIcon, { backgroundColor: '#25D366' + '20' }]}>
                      <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                    </View>
                    <Text style={styles.shareOptionText}>واتساب</Text>
                  </TouchableOpacity>

                  {/* حفظ */}
                  {shareType === 'ayah' && (
                    <TouchableOpacity
                      style={styles.shareOptionItem}
                      onPress={() => {
                        addBookmark(
                          selectedItem.surahNumber,
                          selectedItem.surahName,
                          selectedItem.ayahNumber,
                          selectedItem.text
                        );
                        setShowShareModal(false);
                      }}
                    >
                      <View style={[styles.shareOptionIcon, { backgroundColor: Colors.gold + '20' }]}>
                        <Ionicons name="bookmark" size={24} color={Colors.gold} />
                      </View>
                      <Text style={styles.shareOptionText}>حفظ</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
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
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
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
    fontFamily: 'Cairo-Bold',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glass,
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontFamily: 'Cairo-SemiBold',
    color: Colors.gold,
  },
  verseOfDayActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  verseOfDayText: {
    fontSize: 20,
    fontFamily: 'Amiri-Regular',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: Spacing.sm,
  },
  verseOfDayRef: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
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
    marginLeft: Spacing.md,
  },
  lastReadInfo: {
    flex: 1,
  },
  lastReadLabel: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
  },
  lastReadSurah: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: Colors.text,
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
    fontFamily: 'Cairo-SemiBold',
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
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-SemiBold',
    color: Colors.textMuted,
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
    fontFamily: 'Cairo-Bold',
    color: '#FFF',
  },

  // قائمة السور
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
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
  surahLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  surahNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  surahNumberText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
  },
  surahInfo: {
    flex: 1,
  },
  surahName: {
    fontSize: 18,
    fontFamily: 'Amiri-Bold',
    color: Colors.text,
  },
  surahDetails: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
  },
  surahRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  surahAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginLeft: Spacing.md,
  },
  juzNumberText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
  },
  juzName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    color: Colors.text,
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
    fontFamily: 'Cairo-Bold',
    color: Colors.primary,
  },
  bookmarkAyahNum: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
  },
  bookmarkText: {
    fontSize: 16,
    fontFamily: 'Amiri-Regular',
    color: Colors.text,
    lineHeight: 28,
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
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Cairo-SemiBold',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
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
    fontFamily: 'Cairo-Bold',
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
  reciterItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  reciterItemName: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
  },
  reciterItemNameActive: {
    fontFamily: 'Cairo-Bold',
    color: Colors.primary,
  },

  // نافذة المشاركة
  shareModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sharePreview: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  sharePreviewTitle: {
    fontSize: 20,
    fontFamily: 'Amiri-Bold',
    color: Colors.text,
  },
  sharePreviewSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  sharePreviewText: {
    fontSize: 18,
    fontFamily: 'Amiri-Regular',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 32,
  },
  shareOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  shareOptionItem: {
    alignItems: 'center',
    width: '25%',
    marginBottom: Spacing.md,
  },
  shareOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  shareOptionText: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
  },
});
