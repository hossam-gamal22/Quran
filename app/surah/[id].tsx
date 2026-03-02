undefinedimport React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuran } from '../../contexts/QuranContext';
import { useColors } from '../../lib/theme-provider';
import { copyToClipboard, shareText } from '../../lib/clipboard';
import {
  Spacing,
  BorderRadius,
  FONT_SIZES,
} from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ===== TYPES =====
interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  juz: number;
  page: number;
}

interface Translation {
  id: number;
  name: string;
  englishName: string;
  language: string;
  identifier: string;
}

interface TranslatedAyah {
  numberInSurah: number;
  text: string;
}

// ===== AVAILABLE TRANSLATIONS =====
const TRANSLATIONS: Translation[] = [
  { id: 1, name: 'Sahih International', englishName: 'Sahih International', language: 'en', identifier: 'en.sahih' },
  { id: 2, name: 'اردو - احمد علی', englishName: 'Ahmed Ali', language: 'ur', identifier: 'ur.ahmedali' },
  { id: 3, name: 'Bahasa Indonesia', englishName: 'Indonesian Ministry', language: 'id', identifier: 'id.indonesian' },
  { id: 4, name: 'پښتو', englishName: 'Pashto', language: 'ps', identifier: 'ps.abdulwali' },
  { id: 5, name: 'فارسی', englishName: 'Farsi Ansarian', language: 'fa', identifier: 'fa.ansarian' },
  { id: 6, name: 'বাংলা', englishName: 'Bengali Muhiuddin', language: 'bn', identifier: 'bn.bengali' },
  { id: 7, name: 'Français', englishName: 'French Hamidullah', language: 'fr', identifier: 'fr.hamidullah' },
  { id: 8, name: 'Deutsch', englishName: 'German Bubenheim', language: 'de', identifier: 'de.bubenheim' },
  { id: 9, name: 'Español', englishName: 'Spanish Garcia', language: 'es', identifier: 'es.garcia' },
  { id: 10, name: 'Türkçe', englishName: 'Turkish Diyanet', language: 'tr', identifier: 'tr.diyanet' },
  { id: 11, name: 'Melayu', englishName: 'Malay Basmeih', language: 'ms', identifier: 'ms.basmeih' },
];

// ===== TAFSIR OPTIONS =====
const TAFSIR_OPTIONS = [
  { id: 1, name: 'تفسير ابن كثير', identifier: 'ar.ibn-kathir' },
  { id: 2, name: 'تفسير الجلالين', identifier: 'ar.jalalayn' },
  { id: 3, name: 'تفسير السعدي', identifier: 'ar.saadi' },
];

// ===== HELPER FUNCTIONS =====
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map((d) => arabicNumerals[parseInt(d)]).join('');
};

const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

// Remove Bismillah from first ayah of surahs (except Al-Fatiha and At-Tawbah)
const cleanAyahText = (text: string, surahNumber: number, ayahNumber: number): string => {
  if (ayahNumber === 1 && surahNumber !== 1 && surahNumber !== 9) {
    return text.replace(BISMILLAH, '').trim();
  }
  return text;
};

// ===== FETCH FUNCTIONS =====
const fetchSurahWithTranslation = async (
  surahNumber: number,
  translationId: string | null
): Promise<{ ayahs: Ayah[]; translation: TranslatedAyah[] | null }> => {
  try {
    // Fetch Arabic text
    const arabicRes = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`
    );
    const arabicData = await arabicRes.json();
    
    let translation: TranslatedAyah[] | null = null;
    
    // Fetch translation if selected
    if (translationId) {
      const transRes = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/${translationId}`
      );
      const transData = await transRes.json();
      if (transData.code === 200) {
        translation = transData.data.ayahs.map((a: any) => ({
          numberInSurah: a.numberInSurah,
          text: a.text,
        }));
      }
    }
    
    return {
      ayahs: arabicData.data.ayahs,
      translation,
    };
  } catch (error) {
    console.error('Error fetching surah:', error);
    throw error;
  }
};

const fetchTafsir = async (
  surahNumber: number,
  ayahNumber: number,
  tafsirId: string
): Promise<string> => {
  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/${tafsirId}`
    );
    const data = await res.json();
    if (data.code === 200) {
      return data.data.text;
    }
    return 'لم يتم العثور على التفسير';
  } catch (error) {
    console.error('Error fetching tafsir:', error);
    return 'حدث خطأ في تحميل التفسير';
  }
};

// ===== MAIN COMPONENT =====
export default function SurahScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const surahNumber = parseInt(id || '1');
  const router = useRouter();
  const colors = useColors();
  const scrollViewRef = useRef<ScrollView>(null);
  const ayahRefs = useRef<{ [key: number]: number }>({});
  
  const {
    getSurah,
    playAyah,
    playbackState,
    togglePlayPause,
    stopPlayback,
    currentReciter,
  } = useQuran();

  // ===== STATE =====
  const [surahInfo, setSurahInfo] = useState<any>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [translatedAyahs, setTranslatedAyahs] = useState<TranslatedAyah[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedTranslation, setSelectedTranslation] = useState<Translation | null>(null);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  
  const [selectedTafsir, setSelectedTafsir] = useState(TAFSIR_OPTIONS[0]);
  const [showTafsirModal, setShowTafsirModal] = useState(false);
  const [tafsirAyah, setTafsirAyah] = useState<number | null>(null);
  const [tafsirText, setTafsirText] = useState<string>('');
  const [tafsirLoading, setTafsirLoading] = useState(false);
  
  const [showAyahMenu, setShowAyahMenu] = useState(false);
  const [selectedAyahForMenu, setSelectedAyahForMenu] = useState<Ayah | null>(null);
  
  const [fontSize, setFontSize] = useState(28);
  const [showSettings, setShowSettings] = useState(false);

  // Current playing ayah
  const currentPlayingAyah = useMemo(() => {
    if (playbackState.currentSurah === surahNumber) {
      return playbackState.currentAyah;
    }
    return null;
  }, [playbackState, surahNumber]);

  // ===== LOAD SURAH =====
  useEffect(() => {
    loadSurah();
  }, [surahNumber, selectedTranslation]);

  const loadSurah = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get surah info from cache
      const info = await getSurah(surahNumber);
      setSurahInfo(info);
      
      // Fetch ayahs with optional translation
      const { ayahs: fetchedAyahs, translation } = await fetchSurahWithTranslation(
        surahNumber,
        selectedTranslation?.identifier || null
      );
      
      setAyahs(fetchedAyahs);
      setTranslatedAyahs(translation);
    } catch (err) {
      setError('حدث خطأ في تحميل السورة');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== SCROLL TO PLAYING AYAH =====
  useEffect(() => {
    if (currentPlayingAyah && ayahRefs.current[currentPlayingAyah]) {
      scrollViewRef.current?.scrollTo({
        y: ayahRefs.current[currentPlayingAyah] - 100,
        animated: true,
      });
    }
  }, [currentPlayingAyah]);

  // ===== HANDLERS =====
  const handlePlayAyah = useCallback(
    (ayahNumber: number) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      playAyah(surahNumber, ayahNumber, currentReciter, true);
    },
    [surahNumber, currentReciter, playAyah]
  );

  const handleAyahLongPress = useCallback((ayah: Ayah) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedAyahForMenu(ayah);
    setShowAyahMenu(true);
  }, []);

  const handleCopyAyah = useCallback(async () => {
    if (selectedAyahForMenu) {
      const text = `${selectedAyahForMenu.text}\n\n[${surahInfo?.name} : ${toArabicNumber(selectedAyahForMenu.numberInSurah)}]`;
      await copyToClipboard(text);
      setShowAyahMenu(false);
    }
  }, [selectedAyahForMenu, surahInfo]);

  const handleShareAyah = useCallback(async () => {
    if (selectedAyahForMenu) {
      const text = `${selectedAyahForMenu.text}\n\n[${surahInfo?.name} : ${toArabicNumber(selectedAyahForMenu.numberInSurah)}]\n\nمن تطبيق روح المسلم`;
      await shareText(text, 'مشاركة آية');
      setShowAyahMenu(false);
    }
  }, [selectedAyahForMenu, surahInfo]);

  const handleShowTafsir = useCallback(async (ayahNumber: number) => {
    setTafsirAyah(ayahNumber);
    setTafsirLoading(true);
    setShowTafsirModal(true);
    
    const text = await fetchTafsir(surahNumber, ayahNumber, selectedTafsir.identifier);
    setTafsirText(text);
    setTafsirLoading(false);
  }, [surahNumber, selectedTafsir]);

  const handleAyahLayout = useCallback((ayahNumber: number, y: number) => {
    ayahRefs.current[ayahNumber] = y;
  }, []);

  // ===== RENDER AYAH =====
  const renderAyah = useCallback(
    (ayah: Ayah, index: number) => {
      const isPlaying = currentPlayingAyah === ayah.numberInSurah;
      const cleanedText = cleanAyahText(ayah.text, surahNumber, ayah.numberInSurah);
      const translationText = translatedAyahs?.find(
        (t) => t.numberInSurah === ayah.numberInSurah
      )?.text;

      return (
        <TouchableOpacity
          key={ayah.number}
          style={[
            styles.ayahContainer,
            isPlaying && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => handlePlayAyah(ayah.numberInSurah)}
          onLongPress={() => handleAyahLongPress(ayah)}
          delayLongPress={500}
          activeOpacity={0.7}
          onLayout={(e) => handleAyahLayout(ayah.numberInSurah, e.nativeEvent.layout.y)}
        >
          {/* Ayah Number Badge */}
          <View style={[styles.ayahBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.ayahBadgeText, { color: colors.primary }]}>
              {toArabicNumber(ayah.numberInSurah)}
            </Text>
          </View>

          {/* Arabic Text */}
          <Text
            style={[
              styles.ayahText,
              { color: colors.text, fontSize },
              isPlaying && { color: colors.primary },
            ]}
          >
            {cleanedText}
            <Text style={styles.ayahEndMark}> ۝</Text>
          </Text>

          {/* Translation */}
          {translationText && (
            <Text style={[styles.translationText, { color: colors.textSecondary }]}>
              {translationText}
            </Text>
          )}

          {/* Action Icons */}
          <View style={styles.ayahActions}>
            <TouchableOpacity
              onPress={() => handleShowTafsir(ayah.numberInSurah)}
              style={styles.actionButton}
            >
              <Ionicons name="book-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedAyahForMenu(ayah);
                handleCopyAyah();
              }}
              style={styles.actionButton}
            >
              <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedAyahForMenu(ayah);
                handleShareAyah();
              }}
              style={styles.actionButton}
            >
              <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [
      currentPlayingAyah,
      colors,
      fontSize,
      translatedAyahs,
      surahNumber,
      handlePlayAyah,
      handleAyahLongPress,
      handleShowTafsir,
      handleCopyAyah,
      handleShareAyah,
      handleAyahLayout,
    ]
  );

  // ===== LOADING STATE =====
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            جاري تحميل السورة...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadSurah}
          >
            <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.surahName, { color: colors.text }]}>
            {surahInfo?.name || 'سورة'}
          </Text>
          <Text style={[styles.surahInfo, { color: colors.textSecondary }]}>
            {toArabicNumber(ayahs.length)} آية
          </Text>
        </View>

        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Bismillah */}
      {surahNumber !== 1 && surahNumber !== 9 && (
        <View style={styles.bismillahContainer}>
          <Text style={[styles.bismillah, { color: colors.text }]}>
            {BISMILLAH}
          </Text>
        </View>
      )}

      {/* Ayahs List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {ayahs.map((ayah, index) => renderAyah(ayah, index))}
        
        {/* Bottom Padding for Audio Player */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Audio Player Bar */}
      {playbackState.currentSurah === surahNumber && (
        <View style={[styles.audioBar, { backgroundColor: colors.card }]}>
          <View style={styles.audioInfo}>
            <Text style={[styles.audioTitle, { color: colors.text }]}>
              الآية {toArabicNumber(playbackState.currentAyah || 0)}
            </Text>
            {playbackState.isLoading && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>
          
          <View style={styles.audioControls}>
            <TouchableOpacity onPress={() => playAyah(surahNumber, (playbackState.currentAyah || 1) - 1, currentReciter, true)}>
              <Ionicons name="play-skip-forward" size={28} color={colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={togglePlayPause}
              style={[styles.playButton, { backgroundColor: colors.primary }]}
            >
              <Ionicons
                name={playbackState.isPlaying ? 'pause' : 'play'}
                size={28}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => playAyah(surahNumber, (playbackState.currentAyah || 1) + 1, currentReciter, true)}>
              <Ionicons name="play-skip-back" size={28} color={colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={stopPlayback}>
              <Ionicons name="stop" size={28} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Translation Selection Modal */}
      <Modal
        visible={showTranslationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTranslationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>اختر الترجمة</Text>
              <TouchableOpacity onPress={() => setShowTranslationModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {/* No Translation Option */}
              <TouchableOpacity
                style={[
                  styles.translationItem,
                  { borderBottomColor: colors.border },
                  !selectedTranslation && { backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => {
                  setSelectedTranslation(null);
                  setShowTranslationModal(false);
                }}
              >
                <Text style={[styles.translationName, { color: colors.text }]}>
                  بدون ترجمة
                </Text>
                {!selectedTranslation && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
              
              {TRANSLATIONS.map((trans) => (
                <TouchableOpacity
                  key={trans.id}
                  style={[
                    styles.translationItem,
                    { borderBottomColor: colors.border },
                    selectedTranslation?.id === trans.id && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    setSelectedTranslation(trans);
                    setShowTranslationModal(false);
                  }}
                >
                  <View>
                    <Text style={[styles.translationName, { color: colors.text }]}>
                      {trans.name}
                    </Text>
                    <Text style={[styles.translationLang, { color: colors.textSecondary }]}>
                      {trans.englishName}
                    </Text>
                  </View>
                  {selectedTranslation?.id === trans.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tafsir Modal */}
      <Modal
        visible={showTafsirModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTafsirModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, maxHeight: '80%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                تفسير الآية {tafsirAyah ? toArabicNumber(tafsirAyah) : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowTafsirModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Tafsir Source Selector */}
            <View style={[styles.tafsirSelector, { borderBottomColor: colors.border }]}>
              {TAFSIR_OPTIONS.map((tafsir) => (
                <TouchableOpacity
                  key={tafsir.id}
                  style={[
                    styles.tafsirOption,
                    selectedTafsir.id === tafsir.id && { backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={async () => {
                    setSelectedTafsir(tafsir);
                    if (tafsirAyah) {
                      setTafsirLoading(true);
                      const text = await fetchTafsir(surahNumber, tafsirAyah, tafsir.identifier);
                      setTafsirText(text);
                      setTafsirLoading(false);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.tafsirOptionText,
                      { color: selectedTafsir.id === tafsir.id ? colors.primary : colors.text },
                    ]}
                  >
                    {tafsir.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <ScrollView style={styles.tafsirScroll}>
              {tafsirLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
              ) : (
                <Text style={[styles.tafsirText, { color: colors.text }]}>
                  {tafsirText}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>إعدادات القراءة</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Font Size */}
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>حجم الخط</Text>
              <View style={styles.fontSizeControls}>
                <TouchableOpacity
                  onPress={() => setFontSize((prev) => Math.max(18, prev - 2))}
                  style={[styles.fontSizeButton, { backgroundColor: colors.card }]}
                >
                  <Ionicons name="remove" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.fontSizeValue, { color: colors.text }]}>{fontSize}</Text>
                <TouchableOpacity
                  onPress={() => setFontSize((prev) => Math.min(42, prev + 2))}
                  style={[styles.fontSizeButton, { backgroundColor: colors.card }]}
                >
                  <Ionicons name="add" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Translation Button */}
            <TouchableOpacity
              style={[styles.settingButton, { backgroundColor: colors.card }]}
              onPress={() => {
                setShowSettings(false);
                setShowTranslationModal(true);
              }}
            >
              <View style={styles.settingButtonContent}>
                <Ionicons name="language" size={24} color={colors.primary} />
                <Text style={[styles.settingButtonText, { color: colors.text }]}>الترجمة</Text>
              </View>
              <Text style={[styles.settingButtonValue, { color: colors.textSecondary }]}>
                {selectedTranslation?.name || 'بدون ترجمة'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ayah Menu Modal */}
      <Modal
        visible={showAyahMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAyahMenu(false)}
      >
        <TouchableOpacity
          style={styles.ayahMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowAyahMenu(false)}
        >
          <View style={[styles.ayahMenuContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.ayahMenuItem} onPress={handleCopyAyah}>
              <Ionicons name="copy-outline" size={22} color={colors.text} />
              <Text style={[styles.ayahMenuText, { color: colors.text }]}>نسخ الآية</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.ayahMenuItem} onPress={handleShareAyah}>
              <Ionicons name="share-outline" size={22} color={colors.text} />
              <Text style={[styles.ayahMenuText, { color: colors.text }]}>مشاركة الآية</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.ayahMenuItem}
              onPress={() => {
                setShowAyahMenu(false);
                if (selectedAyahForMenu) {
                  handleShowTafsir(selectedAyahForMenu.numberInSurah);
                }
              }}
            >
              <Ionicons name="book-outline" size={22} color={colors.text} />
              <Text style={[styles.ayahMenuText, { color: colors.text }]}>التفسير</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.ayahMenuItem}
              onPress={() => {
                setShowAyahMenu(false);
                if (selectedAyahForMenu) {
                  handlePlayAyah(selectedAyahForMenu.numberInSurah);
                }
              }}
            >
              <Ionicons name="play-outline" size={22} color={colors.text} />
              <Text style={[styles.ayahMenuText, { color: colors.text }]}>تشغيل الآية</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ===== STYLES =====
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  surahName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  surahInfo: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bismillahContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  bismillah: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  ayahContainer: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  ayahBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ayahBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  ayahText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
    lineHeight: 50,
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingTop: Spacing.xl,
  },
  ayahEndMark: {
    fontSize: 20,
  },
  translationText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 26,
    textAlign: 'right',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  ayahActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  audioBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  audioTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
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
  modalScroll: {
    paddingBottom: Spacing.xl,
  },
  translationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  translationName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  translationLang: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  tafsirSelector: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  tafsirOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  tafsirOptionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  tafsirScroll: {
    padding: Spacing.lg,
  },
  tafsirText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 28,
    textAlign: 'right',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  settingLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  fontSizeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  settingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  settingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  settingButtonValue: {
    fontSize: FONT_SIZES.sm,
  },
  ayahMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ayahMenuContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minWidth: 200,
  },
  ayahMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  ayahMenuText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
});
