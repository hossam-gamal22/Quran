// app/(tabs)/surah/[id].tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  fetchSurah,
  fetchSurahWithTranslation,
  getSurahAudioUrl,
  getAyahAudioUrl,
  RECITERS,
  SURAH_NAMES_AR,
  TAFSIR_EDITIONS,
  Ayah,
  SurahDetail,
} from '@/lib/quran-api';
import {
  shareAyah,
  copyToClipboard,
  formatAyahForShare,
  ShareContent,
} from '@/lib/share-service';

// ===============================
// الثوابت والأنواع
// ===============================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ReadingMode = 'page' | 'scroll' | 'ayah';
type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

interface BookmarkItem {
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  timestamp: number;
}

interface AyahWithState extends Ayah {
  isPlaying?: boolean;
  isBookmarked?: boolean;
  isHighlighted?: boolean;
}

const FONT_SIZES: Record<FontSize, number> = {
  small: 20,
  medium: 26,
  large: 32,
  xlarge: 38,
};

const LINE_HEIGHTS: Record<FontSize, number> = {
  small: 36,
  medium: 46,
  large: 56,
  xlarge: 66,
};

// ===============================
// المكون الرئيسي
// ===============================
export default function SurahScreen() {
  const { id, ayah: initialAyah, reciter: initialReciter } = useLocalSearchParams<{
    id: string;
    ayah?: string;
    reciter?: string;
  }>();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // الحالة الأساسية
  const [loading, setLoading] = useState(true);
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [ayahs, setAyahs] = useState<AyahWithState[]>([]);
  const [translation, setTranslation] = useState<Record<number, string>>({});
  const [tafsir, setTafsir] = useState<Record<number, string>>({});

  // إعدادات القراءة
  const [readingMode, setReadingMode] = useState<ReadingMode>('scroll');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [showTranslation, setShowTranslation] = useState(false);
  const [showTafsir, setShowTafsir] = useState(false);
  const [nightMode, setNightMode] = useState(false);

  // التشغيل الصوتي
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingAyah, setCurrentPlayingAyah] = useState<number | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(
    RECITERS.find(r => r.identifier === initialReciter) || RECITERS[0]
  );
  const [audioProgress, setAudioProgress] = useState(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // الإشارات المرجعية
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [selectedAyah, setSelectedAyah] = useState<AyahWithState | null>(null);

  // النوافذ المنبثقة
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [showAyahModal, setShowAyahModal] = useState(false);
  const [showTafsirModal, setShowTafsirModal] = useState(false);

  // الرسوم المتحركة
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ===============================
  // تحميل البيانات
  // ===============================
  useEffect(() => {
    loadSurah();
    loadSettings();
    loadBookmarks();

    return () => {
      // تنظيف الصوت عند مغادرة الشاشة
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [id]);

  const loadSurah = async () => {
    try {
      setLoading(true);
      const surahNumber = parseInt(id);

      // جلب السورة
      const surahData = await fetchSurah(surahNumber);
      if (surahData) {
        setSurah(surahData);
        setAyahs(surahData.ayahs.map((a: Ayah) => ({ ...a, isPlaying: false, isBookmarked: false })));
      }

      // جلب الترجمة
      const translationData = await fetchSurahWithTranslation(surahNumber, 'ar.muyassar');
      if (translationData && translationData.ayahs) {
        const transMap: Record<number, string> = {};
        translationData.ayahs.forEach((a: any) => {
          transMap[a.numberInSurah] = a.text;
        });
        setTranslation(transMap);
      }

      // حفظ آخر قراءة
      await saveLastRead(surahNumber, surahData?.name || '', 1);

    } catch (error) {
      console.error('Error loading surah:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل السورة');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('quran_reading_settings');
      if (settings) {
        const { mode, size, trans, night } = JSON.parse(settings);
        if (mode) setReadingMode(mode);
        if (size) setFontSize(size);
        if (trans !== undefined) setShowTranslation(trans);
        if (night !== undefined) setNightMode(night);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem('quran_bookmarks');
      if (saved) {
        const allBookmarks: BookmarkItem[] = JSON.parse(saved);
        setBookmarks(allBookmarks);

        // تحديث حالة الآيات المحفوظة
        const surahNumber = parseInt(id);
        const surahBookmarks = allBookmarks.filter(b => b.surahNumber === surahNumber);
        
        setAyahs(prev => prev.map(a => ({
          ...a,
          isBookmarked: surahBookmarks.some(b => b.ayahNumber === a.numberInSurah)
        })));
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('quran_reading_settings', JSON.stringify({
        mode: readingMode,
        size: fontSize,
        trans: showTranslation,
        night: nightMode,
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const saveLastRead = async (surahNumber: number, surahName: string, ayahNumber: number) => {
    try {
      await AsyncStorage.setItem('quran_last_read', JSON.stringify({
        surahNumber,
        surahName,
        ayahNumber,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error saving last read:', error);
    }
  };

  // ===============================
  // التشغيل الصوتي
  // ===============================
  const playAyah = async (ayahNumber: number) => {
    try {
      // إيقاف أي صوت سابق
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }

      setIsLoadingAudio(true);
      setCurrentPlayingAyah(ayahNumber);

      const surahNumber = parseInt(id);
      const audioUrl = getAyahAudioUrl(selectedReciter.identifier, surahNumber, ayahNumber);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsPlaying(true);
      setIsLoadingAudio(false);

      // تحديث حالة الآية
      setAyahs(prev => prev.map(a => ({
        ...a,
        isPlaying: a.numberInSurah === ayahNumber
      })));

      // اهتزاز خفيف
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    } catch (error) {
      console.error('Error playing ayah:', error);
      setIsLoadingAudio(false);
      Alert.alert('خطأ', 'حدث خطأ أثناء تشغيل الصوت');
    }
  };

  const playSurah = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }

      setIsLoadingAudio(true);
      const surahNumber = parseInt(id);
      const audioUrl = getSurahAudioUrl(selectedReciter.identifier, surahNumber);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsPlaying(true);
      setIsLoadingAudio(false);

    } catch (error) {
      console.error('Error playing surah:', error);
      setIsLoadingAudio(false);
      Alert.alert('خطأ', 'حدث خطأ أثناء تشغيل السورة');
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
        // انتهى التشغيل - تشغيل الآية التالية
        if (currentPlayingAyah !== null && currentPlayingAyah < ayahs.length) {
          playAyah(currentPlayingAyah + 1);
        } else {
          stopPlayback();
        }
      }
      if (status.durationMillis) {
        setAudioProgress(status.positionMillis / status.durationMillis);
      }
    }
  };

  const togglePlayPause = async () => {
    if (soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } else {
      // بدء التشغيل من الآية الأولى
      playAyah(1);
    }
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayingAyah(null);
    setAudioProgress(0);
    setAyahs(prev => prev.map(a => ({ ...a, isPlaying: false })));
  };

  // ===============================
  // الإشارات المرجعية
  // ===============================
  const toggleBookmark = async (ayah: AyahWithState) => {
    const surahNumber = parseInt(id);
    const bookmarkId = `${surahNumber}-${ayah.numberInSurah}`;
    
    let updatedBookmarks: BookmarkItem[];
    const existingIndex = bookmarks.findIndex(
      b => b.surahNumber === surahNumber && b.ayahNumber === ayah.numberInSurah
    );

    if (existingIndex > -1) {
      // إزالة الإشارة
      updatedBookmarks = bookmarks.filter((_, i) => i !== existingIndex);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      // إضافة إشارة جديدة
      const newBookmark: BookmarkItem = {
        id: bookmarkId,
        surahNumber,
        surahName: surah?.name || '',
        ayahNumber: ayah.numberInSurah,
        ayahText: ayah.text,
        timestamp: Date.now(),
      };
      updatedBookmarks = [newBookmark, ...bookmarks];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setBookmarks(updatedBookmarks);
    await AsyncStorage.setItem('quran_bookmarks', JSON.stringify(updatedBookmarks));

    // تحديث حالة الآية
    setAyahs(prev => prev.map(a => ({
      ...a,
      isBookmarked: a.numberInSurah === ayah.numberInSurah ? !a.isBookmarked : a.isBookmarked
    })));
  };

  // ===============================
  // المشاركة والنسخ
  // ===============================
  const handleShareAyah = async (ayah: AyahWithState) => {
    await shareAyah(
      ayah.text,
      surah?.name || '',
      ayah.numberInSurah,
      translation[ayah.numberInSurah]
    );
    setShowAyahModal(false);
  };

  const handleCopyAyah = async (ayah: AyahWithState) => {
    const text = formatAyahForShare(
      ayah.text,
      surah?.name || '',
      ayah.numberInSurah,
      translation[ayah.numberInSurah],
      { includeAppName: true, includeTranslation: showTranslation }
    );
    const success = await copyToClipboard(text);
    if (success) {
      Alert.alert('تم النسخ', 'تم نسخ الآية إلى الحافظة ✓');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowAyahModal(false);
  };

  const handleShareMultipleAyahs = async (startAyah: number, endAyah: number) => {
    const selectedAyahs = ayahs.filter(
      a => a.numberInSurah >= startAyah && a.numberInSurah <= endAyah
    );
    
    let text = `📖 سورة ${surah?.name}\n\n`;
    selectedAyahs.forEach(a => {
      text += `﴿ ${a.text} ﴾ [${a.numberInSurah}]\n\n`;
    });
    text += `\n📱 تطبيق نور الهدى`;

    await copyToClipboard(text);
    Alert.alert('تم', 'تم نسخ الآيات المحددة');
  };

  // ===============================
  // فتح نافذة الآية
  // ===============================
  const openAyahModal = (ayah: AyahWithState) => {
    setSelectedAyah(ayah);
    setShowAyahModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // ===============================
  // جلب التفسير
  // ===============================
  const loadTafsir = async (ayahNumber: number) => {
    try {
      // يمكن جلب التفسير من API
      // للتبسيط، سنستخدم الترجمة الميسرة كتفسير
      if (translation[ayahNumber]) {
        setTafsir(prev => ({ ...prev, [ayahNumber]: translation[ayahNumber] }));
      }
    } catch (error) {
      console.error('Error loading tafsir:', error);
    }
  };

  // ===============================
  // عرض الآية
  // ===============================
  const renderAyah = (ayah: AyahWithState, index: number) => {
    const isCurrentlyPlaying = ayah.isPlaying;
    const isBookmarked = ayah.isBookmarked;

    return (
      <TouchableOpacity
        key={ayah.number}
        style={[
          styles.ayahContainer,
          isCurrentlyPlaying && styles.ayahPlaying,
          nightMode && styles.ayahContainerNight,
        ]}
        onPress={() => openAyahModal(ayah)}
        onLongPress={() => openAyahModal(ayah)}
        activeOpacity={0.7}
      >
        {/* رقم الآية وأيقونات الإجراءات */}
        <View style={styles.ayahHeader}>
          <View style={[styles.ayahNumber, { backgroundColor: Colors.primary }]}>
            <Text style={styles.ayahNumberText}>{ayah.numberInSurah}</Text>
          </View>

          <View style={styles.ayahActions}>
            {/* تشغيل */}
            <TouchableOpacity
              style={styles.ayahActionBtn}
              onPress={() => playAyah(ayah.numberInSurah)}
            >
              <Ionicons
                name={isCurrentlyPlaying ? 'pause' : 'play'}
                size={18}
                color={isCurrentlyPlaying ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>

            {/* مشاركة */}
            <TouchableOpacity
              style={styles.ayahActionBtn}
              onPress={() => handleShareAyah(ayah)}
            >
              <Ionicons name="share-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>

            {/* نسخ */}
            <TouchableOpacity
              style={styles.ayahActionBtn}
              onPress={() => handleCopyAyah(ayah)}
            >
              <Ionicons name="copy-outline" size={18} color={Colors.secondary} />
            </TouchableOpacity>

            {/* حفظ */}
            <TouchableOpacity
              style={styles.ayahActionBtn}
              onPress={() => toggleBookmark(ayah)}
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isBookmarked ? Colors.gold : Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* نص الآية */}
        <Text
          style={[
            styles.ayahText,
            { fontSize: FONT_SIZES[fontSize], lineHeight: LINE_HEIGHTS[fontSize] },
            nightMode && styles.ayahTextNight,
            isCurrentlyPlaying && styles.ayahTextPlaying,
          ]}
        >
          {ayah.text}
        </Text>

        {/* الترجمة */}
        {showTranslation && translation[ayah.numberInSurah] && (
          <View style={styles.translationContainer}>
            <Text style={[styles.translationText, nightMode && styles.translationTextNight]}>
              {translation[ayah.numberInSurah]}
            </Text>
          </View>
        )}

        {/* مؤشر السجدة */}
        {ayah.sajda && (
          <View style={styles.sajdaBadge}>
            <Ionicons name="arrow-down" size={14} color="#FFF" />
            <Text style={styles.sajdaText}>سجدة</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ===============================
  // عرض التحميل
  // ===============================
  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, nightMode && styles.containerNight]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, nightMode && styles.textNight]}>
          جاري تحميل السورة...
        </Text>
      </SafeAreaView>
    );
  }

  // ===============================
  // العرض الرئيسي
  // ===============================
  return (
    <SafeAreaView style={[styles.container, nightMode && styles.containerNight]}>
      {/* الرأس */}
      <View style={[styles.header, nightMode && styles.headerNight]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-forward" size={24} color={nightMode ? '#FFF' : Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, nightMode && styles.textNight]}>
            {surah?.name}
          </Text>
          <Text style={[styles.headerSubtitle, nightMode && styles.textMutedNight]}>
            {surah?.numberOfAyahs} آية • {surah?.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
          </Text>
        </View>

        <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={24} color={nightMode ? '#FFF' : Colors.text} />
        </TouchableOpacity>
      </View>

      {/* البسملة */}
      {surah && surah.number !== 1 && surah.number !== 9 && (
        <View style={[styles.bismillahContainer, nightMode && styles.bismillahNight]}>
          <Text style={[styles.bismillahText, nightMode && styles.textNight]}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </Text>
        </View>
      )}

      {/* قائمة الآيات */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.ayahsList}
        contentContainerStyle={styles.ayahsContent}
        showsVerticalScrollIndicator={false}
      >
        {ayahs.map((ayah, index) => renderAyah(ayah, index))}
        
        {/* نهاية السورة */}
        <View style={styles.endOfSurah}>
          <Text style={[styles.endOfSurahText, nightMode && styles.textMutedNight]}>
            ❁ انتهت سورة {surah?.name} ❁
          </Text>
          
          {/* أزرار التنقل */}
          <View style={styles.navigationButtons}>
            {parseInt(id) > 1 && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => router.replace(`/surah/${parseInt(id) - 1}`)}
              >
                <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                <Text style={styles.navButtonText}>السورة السابقة</Text>
              </TouchableOpacity>
            )}
            
            {parseInt(id) < 114 && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => router.replace(`/surah/${parseInt(id) + 1}`)}
              >
                <Text style={styles.navButtonText}>السورة التالية</Text>
                <Ionicons name="chevron-back" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* شريط التشغيل */}
      <View style={[styles.playerBar, nightMode && styles.playerBarNight]}>
        <TouchableOpacity onPress={() => setShowReciterModal(true)} style={styles.reciterBtn}>
          <Ionicons name="mic" size={20} color={Colors.secondary} />
          <Text style={[styles.reciterBtnText, nightMode && styles.textNight]} numberOfLines={1}>
            {selectedReciter.name}
          </Text>
        </TouchableOpacity>

        <View style={styles.playerControls}>
          <TouchableOpacity onPress={stopPlayback} style={styles.playerBtn}>
            <Ionicons name="stop" size={24} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlayPause}
            style={[styles.playerBtn, styles.playPauseBtn]}
          >
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#FFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => currentPlayingAyah && playAyah(currentPlayingAyah + 1)}
            style={styles.playerBtn}
          >
            <Ionicons name="play-skip-forward" size={24} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {currentPlayingAyah && (
          <Text style={[styles.nowPlayingText, nightMode && styles.textMutedNight]}>
            آية {currentPlayingAyah}
          </Text>
        )}
      </View>

      {/* نافذة إعدادات القراءة */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsModal(false)}
        >
          <View style={[styles.settingsModal, nightMode && styles.modalNight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, nightMode && styles.textNight]}>
                إعدادات القراءة
              </Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* حجم الخط */}
            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, nightMode && styles.textNight]}>
                حجم الخط
              </Text>
              <View style={styles.fontSizeOptions}>
                {(['small', 'medium', 'large', 'xlarge'] as FontSize[]).map(size => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.fontSizeBtn,
                      fontSize === size && styles.fontSizeBtnActive
                    ]}
                    onPress={() => {
                      setFontSize(size);
                      saveSettings();
                    }}
                  >
                    <Text style={[
                      styles.fontSizeBtnText,
                      { fontSize: FONT_SIZES[size] / 2 },
                      fontSize === size && styles.fontSizeBtnTextActive
                    ]}>
                      أ
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* الوضع الليلي */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                setNightMode(!nightMode);
                saveSettings();
              }}
            >
              <View style={styles.settingRowLeft}>
                <Ionicons
                  name={nightMode ? 'moon' : 'sunny'}
                  size={24}
                  color={nightMode ? Colors.gold : Colors.primary}
                />
                <Text style={[styles.settingRowText, nightMode && styles.textNight]}>
                  الوضع الليلي
                </Text>
              </View>
              <View style={[
                styles.toggleSwitch,
                nightMode && styles.toggleSwitchActive
              ]}>
                <View style={[
                  styles.toggleThumb,
                  nightMode && styles.toggleThumbActive
                ]} />
              </View>
            </TouchableOpacity>

            {/* إظهار الترجمة */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                setShowTranslation(!showTranslation);
                saveSettings();
              }}
            >
              <View style={styles.settingRowLeft}>
                <Ionicons name="language" size={24} color={Colors.secondary} />
                <Text style={[styles.settingRowText, nightMode && styles.textNight]}>
                  إظهار التفسير الميسر
                </Text>
              </View>
              <View style={[
                styles.toggleSwitch,
                showTranslation && styles.toggleSwitchActive
              ]}>
                <View style={[
                  styles.toggleThumb,
                  showTranslation && styles.toggleThumbActive
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
          <View style={[styles.reciterModal, nightMode && styles.modalNight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, nightMode && styles.textNight]}>
                اختر القارئ
              </Text>
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
                  onPress={() => {
                    setSelectedReciter(reciter);
                    AsyncStorage.setItem('quran_reciter', reciter.identifier);
                    setShowReciterModal(false);
                    stopPlayback();
                  }}
                >
                  <Ionicons
                    name="mic"
                    size={24}
                    color={selectedReciter.identifier === reciter.identifier ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[
                    styles.reciterItemText,
                    nightMode && styles.textNight,
                    selectedReciter.identifier === reciter.identifier && styles.reciterItemTextActive
                  ]}>
                    {reciter.name}
                  </Text>
                  {selectedReciter.identifier === reciter.identifier && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* نافذة خيارات الآية */}
      <Modal
        visible={showAyahModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAyahModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAyahModal(false)}
        >
          <View style={[styles.ayahModal, nightMode && styles.modalNight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, nightMode && styles.textNight]}>
                آية {selectedAyah?.numberInSurah}
              </Text>
              <TouchableOpacity onPress={() => setShowAyahModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedAyah && (
              <>
                {/* نص الآية */}
                <View style={styles.ayahModalPreview}>
                  <Text style={[styles.ayahModalText, nightMode && styles.textNight]}>
                    ﴿ {selectedAyah.text} ﴾
                  </Text>
                </View>

                {/* خيارات الإجراءات */}
                <View style={styles.ayahModalActions}>
                  {/* تشغيل */}
                  <TouchableOpacity
                    style={styles.ayahModalAction}
                    onPress={() => {
                      playAyah(selectedAyah.numberInSurah);
                      setShowAyahModal(false);
                    }}
                  >
                    <View style={[styles.ayahModalActionIcon, { backgroundColor: Colors.accent + '20' }]}>
                      <Ionicons name="play" size={24} color={Colors.accent} />
                    </View>
                    <Text style={[styles.ayahModalActionText, nightMode && styles.textNight]}>
                      تشغيل
                    </Text>
                  </TouchableOpacity>

                  {/* مشاركة */}
                  <TouchableOpacity
                    style={styles.ayahModalAction}
                    onPress={() => handleShareAyah(selectedAyah)}
                  >
                    <View style={[styles.ayahModalActionIcon, { backgroundColor: Colors.primary + '20' }]}>
                      <Ionicons name="share-social" size={24} color={Colors.primary} />
                    </View>
                    <Text style={[styles.ayahModalActionText, nightMode && styles.textNight]}>
                      مشاركة
                    </Text>
                  </TouchableOpacity>

                  {/* نسخ */}
                  <TouchableOpacity
                    style={styles.ayahModalAction}
                    onPress={() => handleCopyAyah(selectedAyah)}
                  >
                    <View style={[styles.ayahModalActionIcon, { backgroundColor: Colors.secondary + '20' }]}>
                      <Ionicons name="copy" size={24} color={Colors.secondary} />
                    </View>
                    <Text style={[styles.ayahModalActionText, nightMode && styles.textNight]}>
                      نسخ
                    </Text>
                  </TouchableOpacity>

                  {/* حفظ */}
                  <TouchableOpacity
                    style={styles.ayahModalAction}
                    onPress={() => {
                      toggleBookmark(selectedAyah);
                      setShowAyahModal(false);
                    }}
                  >
                    <View style={[styles.ayahModalActionIcon, { backgroundColor: Colors.gold + '20' }]}>
                      <Ionicons
                        name={selectedAyah.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                        size={24}
                        color={Colors.gold}
                      />
                    </View>
                    <Text style={[styles.ayahModalActionText, nightMode && styles.textNight]}>
                      {selectedAyah.isBookmarked ? 'إزالة' : 'حفظ'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* التفسير */}
                {translation[selectedAyah.numberInSurah] && (
                  <View style={styles.ayahModalTafsir}>
                    <Text style={[styles.ayahModalTafsirLabel, nightMode && styles.textMutedNight]}>
                      التفسير الميسر:
                    </Text>
                    <Text style={[styles.ayahModalTafsirText, nightMode && styles.textNight]}>
                      {translation[selectedAyah.numberInSurah]}
                    </Text>
                  </View>
                )}
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
  containerNight: {
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerNight: {
    backgroundColor: '#1E1E1E',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Amiri-Bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
  },

  // البسملة
  bismillahContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.primary + '08',
  },
  bismillahNight: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bismillahText: {
    fontSize: 28,
    fontFamily: 'Amiri-Regular',
    color: Colors.primary,
  },

  // قائمة الآيات
  ayahsList: {
    flex: 1,
  },
  ayahsContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },

  // الآية
  ayahContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  ayahContainerNight: {
    backgroundColor: '#1E1E1E',
  },
  ayahPlaying: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  ayahHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ayahNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
  },
  ayahActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  ayahActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahText: {
    fontFamily: 'Amiri-Regular',
    color: Colors.text,
    textAlign: 'center',
  },
  ayahTextNight: {
    color: '#E0E0E0',
  },
  ayahTextPlaying: {
    color: Colors.primary,
  },

  // الترجمة
  translationContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  translationText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  translationTextNight: {
    color: '#888',
  },

  // السجدة
  sajdaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  sajdaText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Cairo-SemiBold',
  },

  // نهاية السورة
  endOfSurah: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  endOfSurahText: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  navButtonText: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: Colors.primary,
  },

  // شريط التشغيل
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.md,
  },
  playerBarNight: {
    backgroundColor: '#1E1E1E',
    borderTopColor: '#333',
  },
  reciterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    maxWidth: '30%',
  },
  reciterBtnText: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  playPauseBtn: {
    backgroundColor: Colors.primary,
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  nowPlayingText: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
  },

  // النوافذ المنبثقة
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalNight: {
    backgroundColor: '#1E1E1E',
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

  // إعدادات القراءة
  settingsModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  settingSection: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  fontSizeBtn: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fontSizeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  fontSizeBtnText: {
    fontFamily: 'Amiri-Bold',
    color: Colors.textMuted,
  },
  fontSizeBtnTextActive: {
    color: Colors.primary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingRowText: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: Colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  toggleThumbActive: {
    marginLeft: 22,
  },

  // اختيار القارئ
  reciterModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
    paddingBottom: Spacing.xl,
  },
  reciterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  reciterItemActive: {
    backgroundColor: Colors.primary + '10',
  },
  reciterItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
  },
  reciterItemTextActive: {
    fontFamily: 'Cairo-Bold',
    color: Colors.primary,
  },

  // خيارات الآية
  ayahModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  ayahModalPreview: {
    padding: Spacing.lg,
    backgroundColor: Colors.primary + '08',
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  ayahModalText: {
    fontSize: 22,
    fontFamily: 'Amiri-Regular',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 38,
  },
  ayahModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  ayahModalAction: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ayahModalActionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahModalActionText: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
  },
  ayahModalTafsir: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  ayahModalTafsirLabel: {
    fontSize: 12,
    fontFamily: 'Cairo-SemiBold',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  ayahModalTafsirText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
    lineHeight: 24,
  },

  // أنماط الوضع الليلي
  textNight: {
    color: '#E0E0E0',
  },
  textMutedNight: {
    color: '#888',
  },
});
