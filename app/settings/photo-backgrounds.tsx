// app/settings/photo-backgrounds.tsx
// صفحة تصفح صور الخلفيات — روح المسلم

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UniversalHeader } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ScreenContainer } from '@/components/screen-container';
import {
  PHOTO_CATEGORIES,
  fetchCategoryPhotos,
  fetchAdminCategories,
  downloadPhotoBackground,
  isPhotoFree,
  getSavedPhotos,
  deleteSavedPhoto,
  isPhotoSaved,
  type PexelsPhoto,
  type PhotoCategory,
  type SavedPhoto,
} from '@/lib/photo-backgrounds';
import { useInterstitialAd } from '@/components/ads/InterstitialAdManager';

import { useIsRTL } from '@/hooks/use-is-rtl';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 16) / 3;

type ViewMode = 'saved' | 'browse';

export default function PhotoBackgroundsScreen() {
  const { isDarkMode, settings, updateDisplay } = useSettings();
  const isRTL = useIsRTL();
  const categoryTabsScrollRef = useRef<ScrollView>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isPremium } = useSubscription();
  const router = useRouter();
  const { showAd } = useInterstitialAd();

  const [viewMode, setViewMode] = useState<ViewMode>('saved');
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory>(PHOTO_CATEGORIES[0]);
  const [categories, setCategories] = useState<PhotoCategory[]>(PHOTO_CATEGORIES);
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PexelsPhoto | null>(null);
  const [previewSaved, setPreviewSaved] = useState<SavedPhoto | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [savedPhotos, setSavedPhotos] = useState<SavedPhoto[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);

  // Cache photos in memory for instant switching
  const photosCache = useRef<Map<string, PexelsPhoto[]>>(new Map());

  // Load saved photos on mount
  useEffect(() => {
    loadSavedPhotos();
  }, []);

  const loadSavedPhotos = useCallback(async () => {
    setSavedLoading(true);
    const saved = await getSavedPhotos();
    setSavedPhotos(saved);
    setSavedLoading(false);
  }, []);

  // Load admin categories on mount
  useEffect(() => {
    fetchAdminCategories().then(cats => {
      if (cats.length > 0) {
        setCategories(cats);
        setSelectedCategory(cats[0]);
      }
    });
  }, []);

  // Load photos when switching to browse mode or category changes
  useEffect(() => {
    if (viewMode === 'browse') {
      loadPhotos(selectedCategory);
    }
  }, [selectedCategory, viewMode]);

  const loadPhotos = async (category: PhotoCategory) => {
    const cached = photosCache.current.get(category.id);
    if (cached) {
      setPhotos(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchCategoryPhotos(category);
    setPhotos(result);
    photosCache.current.set(category.id, result);
    setLoading(false);
  };

  const handleSetBackground = async (photo: PexelsPhoto) => {
    const photoIndex = photos.indexOf(photo);
    const isFree = photo.is_free !== undefined ? photo.is_free : isPhotoFree(photoIndex);
    if (!isFree && !isPremium) {
      Alert.alert(
        t('common.premiumFeature'),
        t('common.premiumOnly'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('subscription.subscribe'), onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }

    try {
      setDownloading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const localPath = await downloadPhotoBackground(photo);
      updateDisplay({
        appBackground: 'dynamic' as any,
        appBackgroundUrl: localPath,
        appBackgroundTextColor: 'white',
        dynamicBgColor: photo.avg_color || undefined,
        blurEnabled: false,
        blurIntensity: 15,
        dimEnabled: true,
        dimOpacity: 0.55,
      } as any);
      setPreviewPhoto(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Refresh saved list
      loadSavedPhotos();
      if (!isPremium) {
        try { await showAd(); } catch { /* proceed silently */ }
      }
    } catch (error) {
      console.error('Error setting background:', error);
      Alert.alert(t('common.error'), t('settings.backgroundLoadError'));
    } finally {
      setDownloading(false);
    }
  };

  const handleSetSavedBackground = async (saved: SavedPhoto) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateDisplay({
      appBackground: 'dynamic' as any,
      appBackgroundUrl: saved.localPath,
      appBackgroundTextColor: 'white',
      dynamicBgColor: saved.avgColor || undefined,
      blurEnabled: false,
      blurIntensity: 15,
      dimEnabled: true,
      dimOpacity: (settings.display as any).dimOpacity ?? 0.55,
    } as any);
    setPreviewSaved(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteSaved = (saved: SavedPhoto) => {
    const isCurrentBg = settings.display.appBackgroundUrl === saved.localPath;
    Alert.alert(
      t('common.deleteBackground'),
      isCurrentBg ? t('settings.currentBackgroundDeleteConfirm') : t('settings.deleteBackgroundConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteSavedPhoto(saved.id);
            if (isCurrentBg) {
              updateDisplay({
                appBackground: 'none' as any,
                appBackgroundUrl: undefined,
              });
            }
            setPreviewSaved(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            loadSavedPhotos();
          },
        },
      ]
    );
  };

  const isCurrentBackground = (localPath: string) => {
    return settings.display.appBackground === 'dynamic' && settings.display.appBackgroundUrl === localPath;
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* Header */}
        <UniversalHeader title={t('settings.photoBackgrounds')} />

        {/* View mode toggle: saved / browse */}
        <View style={[styles.modeToggle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'saved' && styles.modeBtnActive, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => { setViewMode('saved'); Haptics.selectionAsync(); }}
          >
            <MaterialCommunityIcons name="content-save" size={18} color={viewMode === 'saved' ? '#fff' : colors.textLight} />
            <Text style={[styles.modeBtnText, { color: viewMode === 'saved' ? '#fff' : colors.textLight }]}>
              {t('photoBackgrounds.saved')} {savedPhotos.length > 0 ? `(${savedPhotos.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'browse' && styles.modeBtnActive, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => { setViewMode('browse'); Haptics.selectionAsync(); }}
          >
            <MaterialCommunityIcons name="cloud-download" size={18} color={viewMode === 'browse' ? '#fff' : colors.textLight} />
            <Text style={[styles.modeBtnText, { color: viewMode === 'browse' ? '#fff' : colors.textLight }]}>
              {t('photoBackgrounds.browseDownload')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ===== SAVED VIEW ===== */}
        {viewMode === 'saved' && (
          savedLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0f987f" />
            </View>
          ) : savedPhotos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="image-off-outline" size={64} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('photoBackgrounds.noSavedBgs')}</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => { setViewMode('browse'); Haptics.selectionAsync(); }}
              >
                <Text style={styles.emptyBtnText}>{t('photoBackgrounds.browseBgs')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.photoScrollArea}
              contentContainerStyle={styles.photoGrid}
              showsVerticalScrollIndicator={false}
            >
              {savedPhotos.map(saved => {
                const isCurrent = isCurrentBackground(saved.localPath);
                return (
                  <TouchableOpacity
                    key={saved.id}
                    onPress={() => setPreviewSaved(saved)}
                    activeOpacity={0.8}
                    style={styles.photoItem}
                  >
                    <Image
                      source={{ uri: saved.localPath }}
                      style={styles.photoImage}
                      contentFit="cover"
                      transition={300}
                    />
                    {isCurrent && (
                      <View style={[styles.currentOverlay, isRTL ? { left: 6, right: undefined } : null]}>
                        <MaterialCommunityIcons name="check-circle" size={24} color="#0f987f" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          )
        )}

        {/* ===== BROWSE VIEW ===== */}
        {viewMode === 'browse' && (
          <>
            {/* Category tabs */}
            <ScrollView
              ref={categoryTabsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.categoryTabs, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              style={styles.categoryTabsContainer}
              onContentSizeChange={() => {
                if (isRTL) {
                  categoryTabsScrollRef.current?.scrollToEnd({ animated: false });
                }
              }}
            >
              {categories.map(cat => {
                const isActive = cat.id === selectedCategory.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      setSelectedCategory(cat);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.categoryTab,
                      isActive && styles.categoryTabActive,
                    ]}
                  >
                    <Text style={[
                      styles.categoryTabText,
                      { color: isActive ? '#fff' : colors.textLight },
                    ]}>
                      {cat.name_ar}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Photo grid */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0f987f" />
              </View>
            ) : (
              <ScrollView
                style={styles.photoScrollArea}
                contentContainerStyle={styles.photoGrid}
                showsVerticalScrollIndicator={false}
              >
                {photos.map((photo, index) => {
                  const isFree = photo.is_free !== undefined ? photo.is_free : isPhotoFree(index);
                  const isLocked = !isFree && !isPremium;
                  const isSaved = isPhotoSaved(savedPhotos, photo.id);

                  return (
                    <TouchableOpacity
                      key={photo.id}
                      onPress={() => setPreviewPhoto(photo)}
                      activeOpacity={0.8}
                      style={styles.photoItem}
                    >
                      <Image
                        source={{ uri: photo.src.medium }}
                        style={styles.photoImage}
                        contentFit="cover"
                        transition={300}
                      />
                      {isLocked && (
                        <View style={styles.lockOverlay}>
                          <MaterialCommunityIcons name="lock" size={20} color="#fff" />
                        </View>
                      )}
                      {isSaved && !isLocked && (
                        <View style={[styles.savedBadge, isRTL ? { left: 6, right: undefined } : null]}>
                          <MaterialCommunityIcons name="check" size={14} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </>
        )}

        {/* Dim adjustment — only when a photo background is active */}
        {settings.display.appBackground === 'dynamic' && settings.display.dimEnabled && (
          <View style={[styles.dimControl, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <View style={[styles.dimLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="brightness-6" size={18} color={colors.text} />
              <Text style={[styles.dimLabel, { color: colors.text }]}>{t('photoBackgrounds.dimIntensity')}</Text>
              <Text style={[styles.dimValue, { color: colors.textLight }]}>
                {Math.round(((settings.display as any).dimOpacity ?? 0.5) * 100)}%
              </Text>
            </View>
            <Slider
              style={styles.dimSlider}
              minimumValue={0.3}
              maximumValue={0.7}
              step={0.05}
              value={(settings.display as any).dimOpacity ?? 0.5}
              onSlidingComplete={(val: number) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateDisplay({ dimOpacity: val } as any);
              }}
              minimumTrackTintColor="#0f987f"
              maximumTrackTintColor={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
              thumbTintColor="#0f987f"
            />
          </View>
        )}

        {/* ===== BROWSE PREVIEW MODAL ===== */}
        <Modal visible={!!previewPhoto} transparent animationType="fade">
          {previewPhoto && (
            <View style={styles.fullPreview}>
              <Image
                source={{ uri: previewPhoto.src.large2x }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
              <BlurView intensity={40} tint="default" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${(settings.display as any).dimOpacity ?? 0.5})` }]} />

              <View style={styles.previewContent}>
                <Text style={styles.previewSampleText}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
                <Text style={styles.previewSampleSub}>{t('photoBackgrounds.preview')}</Text>
              </View>

              <View style={styles.previewBottomActions}>
                <TouchableOpacity
                  style={[styles.setBtn, downloading && { opacity: 0.6 }]}
                  onPress={() => handleSetBackground(previewPhoto)}
                  disabled={downloading}
                >
                  {downloading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View style={[styles.setBtnInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <MaterialCommunityIcons name="download" size={20} color="#fff" />
                      <Text style={styles.setBtnText}>{t('photoBackgrounds.saveAndSet')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelPreviewBtn}
                  onPress={() => setPreviewPhoto(null)}
                >
                  <Text style={styles.cancelPreviewText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.closePreviewBtn, { top: insets.top + 10 }, isRTL ? { right: 20, left: undefined } : null]}
                onPress={() => setPreviewPhoto(null)}
              >
                <MaterialCommunityIcons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </Modal>

        {/* ===== SAVED PREVIEW MODAL ===== */}
        <Modal visible={!!previewSaved} transparent animationType="fade">
          {previewSaved && (
            <View style={styles.fullPreview}>
              <Image
                source={{ uri: previewSaved.localPath }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
              <BlurView intensity={40} tint="default" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${(settings.display as any).dimOpacity ?? 0.5})` }]} />

              <View style={styles.previewContent}>
                <Text style={styles.previewSampleText}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
                <Text style={styles.previewSampleSub}>{t('photoBackgrounds.preview')}</Text>
              </View>

              <View style={styles.previewBottomActions}>
                <TouchableOpacity
                  style={styles.setBtn}
                  onPress={() => handleSetSavedBackground(previewSaved)}
                >
                  <Text style={styles.setBtnText}>{t('photoBackgrounds.setAsBg')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => handleDeleteSaved(previewSaved)}
                >
                  <MaterialCommunityIcons name="delete-outline" size={20} color="#ff4444" />
                  <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelPreviewBtn}
                  onPress={() => setPreviewSaved(null)}
                >
                  <Text style={styles.cancelPreviewText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.closePreviewBtn, { top: insets.top + 10 }, isRTL ? { right: 20, left: undefined } : null]}
                onPress={() => setPreviewSaved(null)}
              >
                <MaterialCommunityIcons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  categoryTabs: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  categoryTabsContainer: { maxHeight: 48, marginBottom: 12, flexGrow: 0 },
  categoryTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  categoryTabActive: {
    backgroundColor: '#0f987f',
  },
  categoryTabText: { fontSize: 15, fontFamily: fontSemiBold(), lineHeight: 22 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoScrollArea: {
    flex: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreview: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  previewSampleText: {
    fontSize: 26,
    fontFamily: fontBold(),
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  previewSampleSub: {
    fontSize: 16,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  previewBottomActions: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    gap: 12,
    alignItems: 'center',
  },
  setBtn: {
    backgroundColor: '#0f987f',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  setBtnText: { fontSize: 16, fontFamily: fontBold(), color: '#fff' },
  cancelPreviewBtn: {
    paddingVertical: 10,
  },
  cancelPreviewText: {
    fontSize: 15,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.8)',
  },
  closePreviewBtn: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimControl: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
  },
  dimLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dimLabel: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    flex: 1,
  },
  dimValue: {
    fontSize: 12,
    fontFamily: fontMedium(),
  },
  dimSlider: {
    width: '100%',
    height: 32,
  },
  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: '#0f987f',
  },
  modeBtnText: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fontMedium(),
    marginTop: 8,
  },
  emptyBtn: {
    backgroundColor: '#0f987f',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#fff',
  },
  // Current background indicator
  currentOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Saved badge on browse photos
  savedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0f987f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Set button inner (with icon + text)
  setBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Delete button
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(255,68,68,0.15)',
  },
  deleteBtnText: {
    fontSize: 15,
    fontFamily: fontMedium(),
    color: '#ff4444',
  },
});
