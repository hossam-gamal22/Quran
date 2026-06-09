// app/widget.tsx
// Glassify-style widget hub: replaces the old widget-settings.tsx + widgets-gallery.tsx pair.
// Tab 1 = Gallery (real previews of every variant). Tab 2 = Settings (minimal: permissions + how-to + about).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as BackgroundTask from 'expo-background-task';
import AsyncStorage from '@react-native-async-storage/async-storage';

import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader, NativeTabs } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';
import { ModalColors } from '@/constants/theme';
import { AppModal } from '@/components/ui/AppModal';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { guardPremiumFeature } from '@/lib/premium-guard';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { t, getLanguage } from '@/lib/i18n';
import { requestAddWidget } from '@/lib/widget-add-helper';
import {
  updateWidgetData,
  refreshWidgetDisplayNow,
  markWidgetRebakePending,
  clearWidgetRebakePending,
} from '@/lib/widget-data-bridge';
import { getWidgetHowToSteps } from '@/lib/widget-how-to-steps';
import {
  coerceWidgetDateFormatForCalendar,
  widgetDateFormatOptionsForCalendar,
} from '@/lib/widget-settings-options';
import type { PreviewSize, WidgetDateFormat } from '@/components/widgets/previews/shared';
import { formatDateSample } from '@/components/widgets/previews/shared';
import { WidgetPreviewDataContext } from '@/components/widgets/previews/snapshot-capture-context';
import type { SharedWidgetData } from '@/lib/widget-data';
import {
  definitionsForPlatform,
  isWidgetUnlocked,
  premiumRequiredForSize,
  type WidgetCategory,
  type WidgetDefinition,
} from '@/lib/widgets/registry';

// ────────────────────────────────────────────────────────
// Variant catalogue
// ────────────────────────────────────────────────────────

interface WidgetVariant {
  id: string;
  /** Native widget name on Android (used by requestAddWidget). null = iOS-only. */
  androidWidget: string | null;
  size: PreviewSize;
  Preview: React.FC<{ size: PreviewSize; language?: 'ar' | 'en' }>;
  labelAr: string;
  labelEn: string;
  isPremium: boolean;
  /** Force a specific render language regardless of app locale (e.g. "Month Elegant (En)" stays English in Arabic UI). */
  forcedLanguage?: 'ar' | 'en';
  /** Source registry entry. Phase B+ uses this to drive the snapshot pipeline. */
  definition: WidgetDefinition;
}

interface WidgetSection {
  id: string;
  titleAr: string;
  titleEn: string;
  variants: WidgetVariant[];
}

// SECTIONS_IOS / SECTIONS_ANDROID are derived from the unified WIDGET_REGISTRY
// (see lib/widgets/registry.ts). Sections are grouped by category in a stable
// display order; each definition × size becomes one variant tile.

const CATEGORY_ORDER: WidgetCategory[] = ['date', 'hijri', 'prayer', 'quran', 'azkar'];

const CATEGORY_LABELS: Record<WidgetCategory, { ar: string; en: string }> = {
  date: { ar: 'الوقت والتاريخ', en: 'Time & Date' },
  prayer: { ar: 'الصلاة', en: 'Prayer' },
  quran: { ar: 'القرآن', en: 'Quran' },
  azkar: { ar: 'الأذكار', en: 'Adhkar' },
  hijri: { ar: 'التاريخ الهجري', en: 'Hijri Date' },
};

function buildSections(platform: 'ios' | 'android'): WidgetSection[] {
  const defs = definitionsForPlatform(platform);
  const out: WidgetSection[] = [];
  for (const cat of CATEGORY_ORDER) {
    const variants: WidgetVariant[] = [];
    for (const def of defs) {
      if (def.category !== cat) continue;
      for (const size of def.sizes) {
        variants.push({
          id: `${def.id}_${size}`,
          // Phase A keeps the existing Android plumbing — legacy provider names map
          // unchanged. Phase D introduces grouped providers; until then we keep
          // legacyAndroidProvider to preserve existing add flows.
          androidWidget: def.legacyAndroidProvider ?? null,
          size,
          Preview: def.Preview as React.FC<{ size: PreviewSize; language?: 'ar' | 'en' }>,
          labelAr: def.titleAr,
          labelEn: def.titleEn,
          isPremium: premiumRequiredForSize(def, size),
          forcedLanguage: def.forcedLanguage,
          definition: def,
        });
      }
    }
    if (variants.length === 0) continue;
    out.push({
      id: cat,
      titleAr: CATEGORY_LABELS[cat].ar,
      titleEn: CATEGORY_LABELS[cat].en,
      variants,
    });
  }
  return out;
}

const SECTIONS_IOS: WidgetSection[] = buildSections('ios');
const SECTIONS_ANDROID: WidgetSection[] = buildSections('android');

// ────────────────────────────────────────────────────────
// Main screen
// ────────────────────────────────────────────────────────

export default function WidgetHubScreen() {
  const router = useRouter();
  const { settings, isDarkMode } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  // Phase F: real subscription gating restored (see plan §F).
  const { isPremium } = useSubscription();
  const [tab, setTab] = useState<'gallery' | 'settings'>('gallery');
  const [howToOpen, setHowToOpen] = useState(false);

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />

        <UniversalHeader
          title={t('widgetPage.title')}
          titleColor={colors.text}
          rightActions={[
            {
              icon: tab === 'gallery' ? 'cog-outline' : 'view-grid-outline',
              onPress: () => {
                Haptics.selectionAsync();
                setTab(tab === 'gallery' ? 'settings' : 'gallery');
              },
              color: colors.text,
            },
          ]}
        />

        <View style={styles.tabsWrap}>
          <NativeTabs
            tabs={[
              { key: 'gallery', label: t('widgetPage.gallery') },
              { key: 'settings', label: t('widgetPage.settings') },
            ]}
            selected={tab}
            onSelect={(k) => setTab(k as any)}
            indicatorColor={colors.primary}
          />
        </View>

        {tab === 'gallery' ? (
          <GalleryTab
            isRTL={isRTL}
            isPremium={isPremium}
            onAddWidget={(variant) => {
              if (!isWidgetUnlocked(variant.definition, isPremium, variant.size)) {
                if (!guardPremiumFeature('premium_widgets', router, isPremium)) return;
              }
              Haptics.impactAsync(
                Platform.OS === 'android'
                  ? Haptics.ImpactFeedbackStyle.Medium
                  : Haptics.ImpactFeedbackStyle.Light
              );
              // Pass the registry definition id so the instruction sheet can
              // show the localized widget name. Phase G consolidated both
              // platforms onto the same call shape.
              requestAddWidget({
                widgetId: variant.definition.id,
                labelAr: variant.labelAr,
                labelEn: variant.labelEn,
                size: variant.size,
              });
            }}
          />
        ) : (
          <SettingsTab
            isRTL={isRTL}
            onShowHowTo={() => setHowToOpen(true)}
          />
        )}

        <HowToAddModal visible={howToOpen} onClose={() => setHowToOpen(false)} isRTL={isRTL} />
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ────────────────────────────────────────────────────────
// Gallery tab
// ────────────────────────────────────────────────────────

function GalleryTab({
  isRTL,
  isPremium,
  onAddWidget,
}: {
  isRTL: boolean;
  isPremium: boolean;
  onAddWidget: (variant: WidgetVariant) => void;
}) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { settings } = useSettings();
  const sections = Platform.OS === 'android' ? SECTIONS_ANDROID : SECTIONS_IOS;
  const ar = isRTL;
  const lang = getLanguage();
  const showLangNotice = lang !== 'ar' && lang !== 'en';
  // A widget ALWAYS renders in the app language (the per-widget language
  // override was removed) so the gallery preview matches the home-screen widget
  // and the two can never disagree or mix AR/EN.
  const widgetLang: 'ar' | 'en' = (lang === 'ar' || lang === 'ur') ? 'ar' : 'en';
  const [widgetPreviewData, setWidgetPreviewData] = useState<SharedWidgetData | null>(null);
  // Gate the gallery until the first read of the shared payload completes, so the
  // previews never render their sample/fallback values for a frame before real
  // data (or the needsLocation placeholder) is available.
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const loadPreviewData = useCallback(async (cancelled?: () => boolean) => {
    try {
      const raw = await AsyncStorage.getItem('widget_shared_data');
      if (!cancelled?.() && raw) setWidgetPreviewData(JSON.parse(raw));
    } catch {}
    finally {
      if (!cancelled?.()) setPreviewLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadPreviewData(() => cancelled);
    const interval = setInterval(() => loadPreviewData(() => cancelled), 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadPreviewData]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        await updateWidgetData();
      } catch {}
      await loadPreviewData(() => cancelled);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPreviewData]));

  return (
    <WidgetPreviewDataContext.Provider value={widgetPreviewData}>
      {/* Keying the ScrollView (and therefore the entire VariantCard tree
         underneath) by the current language forces a full remount when the
         user switches Arabic ↔ English. Without this key, React reuses the
         old card instances and one frame of the previous language's text
         can flash before the new translations propagate through context. */}
      <ScrollView
        key={`gallery-${lang}-${widgetLang}`}
        style={styles.scrollView}
        contentContainerStyle={styles.galleryScroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.galleryHint, { color: colors.textLight, textAlign: ar ? 'right' : 'left', writingDirection: ar ? 'rtl' : 'ltr', marginBottom: 10 }]}>
          {Platform.OS === 'ios' ? t('widgetPage.iosHint') : t('widgetPage.androidHint')}
        </Text>

      {!previewLoaded ? (
        <View style={{ paddingVertical: 60, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (() => {
        // Hide variants whose forced language doesn't match the viewer: an
        // Arabic-only widget (forcedLanguage: 'ar') never shows in the gallery
        // for a non-Arabic (English) viewer, and vice-versa. Variants with no
        // forcedLanguage adapt to the viewer and are always shown.
        const allVariants = sections.flatMap((s) =>
          s.variants.filter((v) => !v.forcedLanguage || v.forcedLanguage === widgetLang)
        );
        const smalls = allVariants.filter((v) => v.size === 'small');
        const mediums = allVariants.filter((v) => v.size === 'medium');
        const larges = allVariants.filter((v) => v.size === 'large');
        // In RTL (Arabic): free → index[1] = right = first in reading
        // In LTR (English/others): free → index[0] = left = first in reading
        const sortPair = (pair: WidgetVariant[]): WidgetVariant[] => {
          if (pair.length !== 2) return pair;
          const [a, b] = pair;
          const aFree = !a.isPremium, bFree = !b.isPremium;
          if (ar) {
            if (aFree && !bFree) return [b, a]; // free to right (index 1)
          } else {
            if (!aFree && bFree) return [b, a]; // free to left (index 0)
          }
          return pair;
        };
        const rawPairs: WidgetVariant[][] = [];
        for (let i = 0; i < smalls.length; i += 2) rawPairs.push(smalls.slice(i, i + 2));
        const smallPairs = rawPairs.map(sortPair);
        // Free mediums/larges appear before premium ones (top = first in any direction)
        const sortByFree = (arr: WidgetVariant[]) =>
          [...arr].sort((a, b) => (a.isPremium ? 1 : 0) - (b.isPremium ? 1 : 0));
        const sortedMediums = sortByFree(mediums);
        const sortedLarges = sortByFree(larges);
        return (
          <View>
            {showLangNotice && (
              <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.text, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                  {t('widgetPage.languageNotice')}
                </Text>
              </View>
            )}
          <View style={styles.sectionGrid}>
            {smallPairs.map((pair, idx) => (
              <View key={`smalls-${idx}`} style={styles.smallRow}>
                {pair.map((variant) => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    isPremium={isPremium}
                    onPress={() => onAddWidget(variant)}
                    isRTL={ar}
                    previewLanguage={widgetLang}
                  />
                ))}
              </View>
            ))}
            {sortedMediums.map((variant) => (
              <View key={variant.id} style={styles.fullRow}>
                <VariantCard variant={variant} isPremium={isPremium} onPress={() => onAddWidget(variant)} isRTL={ar} previewLanguage={widgetLang} />
              </View>
            ))}
            {sortedLarges.map((variant) => (
              <View key={variant.id} style={styles.fullRow}>
                <VariantCard variant={variant} isPremium={isPremium} onPress={() => onAddWidget(variant)} isRTL={ar} previewLanguage={widgetLang} />
              </View>
            ))}
          </View>
          </View>
        );
      })()}

        <View style={{ height: 60 }} />
      </ScrollView>
    </WidgetPreviewDataContext.Provider>
  );
}

function VariantCard({
  variant,
  isPremium,
  onPress,
  isRTL,
  previewLanguage,
}: {
  variant: WidgetVariant;
  isPremium: boolean;
  onPress: () => void;
  isRTL: boolean;
  previewLanguage?: 'ar' | 'en';
}) {
  const colors = useColors();
  const locked = !isWidgetUnlocked(variant.definition, isPremium, variant.size);
  // English (or any non-Arabic) viewer looking at an Arabic-only widget: show an
  // "Arabic only" badge (same style as the premium lock) instead of the premium
  // badge — the placed widget itself renders an English notice.
  const arabicOnly = previewLanguage === 'en' && variant.forcedLanguage === 'ar';
  const Preview = variant.Preview;

  return (
    <View style={cardStyles.cell}>
      <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
        <View>
          <Preview size={variant.size} language={variant.forcedLanguage ?? previewLanguage} />
          {arabicOnly ? (
            <View pointerEvents="none" style={cardStyles.lockOverlay}>
              <View style={cardStyles.lockPill}>
                <MaterialCommunityIcons name="translate" size={13} color="#FFFFFF" />
                <Text style={cardStyles.lockText}>Arabic only</Text>
              </View>
            </View>
          ) : locked ? (
            <View pointerEvents="none" style={cardStyles.lockOverlay}>
              <View style={cardStyles.lockPill}>
                <MaterialCommunityIcons name="lock" size={13} color="#FFFFFF" />
                <Text style={cardStyles.lockText}>{isRTL ? 'مميز' : 'Premium'}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </Pressable>
      <Text
        numberOfLines={1}
        style={[
          cardStyles.caption,
          { color: colors.textLight, textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' },
        ]}
      >
        {variant.forcedLanguage === 'en' ? variant.labelEn : isRTL ? variant.labelAr : variant.labelEn}
      </Text>
    </View>
  );
}


const cardStyles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    marginBottom: 18,
  },
  caption: {
    fontFamily: fontMedium(),
    fontSize: 13,
    marginTop: 8,
    lineHeight: 20,
  },
  lockOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  lockPill: {
    minWidth: 56,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(212,160,23,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  lockText: {
    fontFamily: fontBold(),
    fontSize: 11,
    lineHeight: 14,
    color: '#FFFFFF',
  },
});

// ────────────────────────────────────────────────────────
// Settings tab
// ────────────────────────────────────────────────────────

interface PermissionState {
  background: 'available' | 'restricted' | 'unknown';
  location: 'granted' | 'denied' | 'undetermined';
}

function SettingsTab({
  isRTL,
  onShowHowTo,
}: {
  isRTL: boolean;
  onShowHowTo: () => void;
}) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { settings, updateDisplay } = useSettings();
  const [perms, setPerms] = useState<PermissionState>({ background: 'unknown', location: 'undetermined' });
  // Drives the inline "updating widgets…" / "updated ✓" banner while a placed
  // widget re-bake runs. 'idle' renders nothing.
  const [widgetSyncState, setWidgetSyncState] = useState<'idle' | 'updating' | 'done'>('idle');
  // Re-entrancy guards: a re-bake is heavy (off-screen captureRef per variant),
  // so we run at most one at a time and coalesce settings tapped during a bake
  // into a single trailing re-bake against the latest persisted prefs.
  const syncInFlightRef = useRef(false);
  const syncDirtyRef = useRef(false);

  useEffect(() => {
    (async () => {
      let background: PermissionState['background'] = 'unknown';
      try {
        const status = await BackgroundTask.getStatusAsync();
        background = status === BackgroundTask.BackgroundTaskStatus.Available ? 'available' : 'restricted';
      } catch {}
      let location: PermissionState['location'] = 'undetermined';
      try {
        const loc = await Location.getForegroundPermissionsAsync();
        location = loc.status === 'granted' ? 'granted' : loc.status === 'denied' ? 'denied' : 'undetermined';
      } catch {}
      setPerms({ background, location });
    })();
  }, []);

  useEffect(() => {
    if (__DEV__) {
      console.log('[WidgetTheme] settings screen initial value:', settings.display.widgetTheme);
    }
  }, [settings.display.widgetTheme]);

  // Persist + push fresh SharedWidgetData → forces iOS WidgetKit/Android
  // glance widgets to re-render with the new theme/language/etc. The
  // updateDisplay call updates the in-app reactive context (so previews
  // change instantly); updateWidgetData() flushes those values to App
  // Group UserDefaults / AsyncStorage so the home-screen widget picks them up.
  const applyWidgetSetting = useCallback(
    async (patch: Parameters<typeof updateDisplay>[0]) => {
      if (__DEV__) console.log('[WidgetTheme] passed to updateDisplay:', patch);
      // Always update the in-app reactive context first so the gallery previews
      // reflect the change instantly and the new prefs are persisted.
      await updateDisplay(patch);

      // iOS: a display-only reload is safe — most iOS widgets render live SwiftUI,
      // so pushing the new theme/numerals gives instant home-screen feedback while
      // the PNG re-bakes. Android does NOT do this: its widgets are a baked PNG +
      // live text overlays, so reloading native now would paint the OLD PNG with
      // freshly-recolored overlays → the "half old / half new" flash. Android waits
      // for the single post-bake reload inside updateWidgetData().
      if (Platform.OS === 'ios') {
        refreshWidgetDisplayNow(patch as any).catch((e) => {
          if (__DEV__) console.warn('[WidgetTheme] iOS display-only sync failed:', e);
        });
      }

      // If a re-bake is already running, just mark the queue dirty — the in-flight
      // pass will run one more time against the now-persisted latest prefs.
      if (syncInFlightRef.current) {
        syncDirtyRef.current = true;
        return;
      }

      syncInFlightRef.current = true;
      setWidgetSyncState('updating');
      try {
        // Mark the re-bake as owed up front: if the app is backgrounded mid-bake,
        // SnapshotPumpController's foreground drain force-rebakes on next launch.
        await markWidgetRebakePending();
        let override: Parameters<typeof updateDisplay>[0] | undefined = patch;
        do {
          syncDirtyRef.current = false;
          // forceSnapshots: guarantees a fresh bake of the placed (visible) widgets
          // and surfaces capture errors (non-force calls swallow them and keep the
          // stale manifest). Visible-first ordering is handled inside updateWidgetData
          // via getActiveSnapshotRouteKeys → includeRouteKeys; background themes /
          // prayer matrix continue deferred. A single native reload fires once the
          // new PNG + manifest are committed.
          await updateWidgetData(undefined, undefined, {
            displayOverride: override as any,
            forceSnapshots: true,
          });
          // Subsequent coalesced passes read the latest persisted prefs directly.
          override = undefined;
        } while (syncDirtyRef.current);
        await clearWidgetRebakePending();
        setWidgetSyncState('done');
        setTimeout(() => setWidgetSyncState((s) => (s === 'done' ? 'idle' : s)), 2000);
      } catch (e) {
        // Leave the owed-re-bake marker set → next app foreground self-heals.
        if (__DEV__) console.warn('[WidgetTheme] widget sync failed; will self-heal on next foreground:', e);
        setWidgetSyncState('idle');
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [updateDisplay],
  );

  // Live computed sample values for the date-format dropdown — mirrors Glassify
  // (e.g. "٢٠٢٦ / ٠٥ / ٠٩", "09 / 05 / 2026"). Recomputed once per mount.
  const widgetCalendar = settings.display.widgetCalendar ?? 'auto';
  const selectedDateFormat = coerceWidgetDateFormatForCalendar(
    widgetCalendar,
    settings.display.widgetDateFormat,
  );
  useEffect(() => {
    if (selectedDateFormat !== settings.display.widgetDateFormat) {
      applyWidgetSetting({ widgetDateFormat: selectedDateFormat as any });
    }
  }, [applyWidgetSetting, selectedDateFormat, settings.display.widgetDateFormat]);

  const dateFormatOptions = useMemo(() => {
    const today = new Date();
    return widgetDateFormatOptionsForCalendar(widgetCalendar).map((key) => ({
      key,
      label: key === 'none' ? t('widgetPage.dateFormatNone') : formatDateSample(today, key),
    }));
  }, [widgetCalendar]);
  const settingDescriptions = useMemo(() => getWidgetSettingDescriptions(isRTL), [isRTL]);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.settingsScroll}
      showsVerticalScrollIndicator={false}
    >
      {widgetSyncState !== 'idle' && (
        <View
          style={[
            styles.syncBanner,
            {
              backgroundColor: widgetSyncState === 'done' ? `${colors.primary}22` : colors.card,
              borderColor: widgetSyncState === 'done' ? colors.primary : colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          {widgetSyncState === 'updating' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
          )}
          <Text
            style={[
              styles.syncBannerText,
              {
                color: colors.text,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              },
            ]}
          >
            {widgetSyncState === 'updating' ? t('widgetPage.updatingWidgets') : t('widgetPage.widgetsUpdated')}
          </Text>
        </View>
      )}
      <SettingsGroup title={t('widgetPage.customize')} isRTL={isRTL}>
        {/* Language picker removed: a widget ALWAYS renders in the app language
            (no per-widget language override) so the placed widget can never
            disagree with the app or mix AR/EN. */}
        <WidgetOptionRow
          isRTL={isRTL}
          label={t('widgetPage.calendar')}
          value={settings.display.widgetCalendar ?? 'auto'}
          options={[
            { key: 'auto', label: t('widgetPage.calendarAuto') },
            { key: 'gregorian', label: t('widgetPage.calendarGregorian') },
            { key: 'hijri', label: t('widgetPage.calendarHijri') },
          ]}
          description={settingDescriptions.calendar}
          onChange={(v) => {
            const nextDateFormat = coerceWidgetDateFormatForCalendar(v, settings.display.widgetDateFormat);
            applyWidgetSetting({
              widgetCalendar: v as any,
              widgetDayCalendar: v as any,
              widgetMonthCalendar: v as any,
              ...(nextDateFormat !== settings.display.widgetDateFormat ? { widgetDateFormat: nextDateFormat as any } : {}),
            });
          }}
        />
        {/* Date-format is only meaningful for an explicit Gregorian calendar.
            For Auto/Hijri the date widgets render the natural live Hijri date
            ("١٦ من ذي الحجة ١٤٤٧") automatically and ignore this setting, so a
            Gregorian-style format row here would be misleading. */}
        {widgetCalendar === 'gregorian' ? (
          <WidgetOptionRow
            isRTL={isRTL}
            label={t('widgetPage.dateFormat')}
            value={selectedDateFormat}
            options={dateFormatOptions}
            description={settingDescriptions.dateFormat}
            onChange={(v) => applyWidgetSetting({ widgetDateFormat: v as any })}
          />
        ) : null}
        <WidgetOptionRow
          isRTL={isRTL}
          label={t('widgetPage.numerals')}
          value={settings.display.widgetNumerals}
          options={[
            { key: 'auto', label: t('widgetPage.numeralsAuto') },
            { key: 'arabic', label: t('widgetPage.numeralsArabic') },
            { key: 'western', label: t('widgetPage.numeralsWestern') },
          ]}
          description={settingDescriptions.numerals}
          onChange={(v) => applyWidgetSetting({ widgetNumerals: v as any })}
        />
        <WidgetOptionRow
          isRTL={isRTL}
          label={t('widgetPage.theme')}
          value={settings.display.widgetTheme}
          options={[
            { key: 'auto', label: t('widgetPage.themeAuto') },
            { key: 'dark', label: t('widgetPage.themeDark') },
            { key: 'light', label: t('widgetPage.themeLight') },
            { key: 'olive', label: t('widgetPage.themeOlive') },
            { key: 'green', label: t('widgetPage.themeGreen') },
            { key: 'blue', label: t('widgetPage.themeBlue') },
            { key: 'desert', label: t('widgetPage.themeDesert') },
            { key: 'slate', label: t('widgetPage.themeSlate') },
          ]}
          description={settingDescriptions.theme}
          onChange={(v) => applyWidgetSetting({ widgetTheme: v as any })}
        />
      </SettingsGroup>

      {/* Permissions */}
      <SettingsGroup title={t('widgetPage.permissions')} isRTL={isRTL}>
        <SettingsRow
          isRTL={isRTL}
          label={t('widgetPage.backgroundRefresh')}
          onPress={() => {
            Haptics.selectionAsync();
            Linking.openSettings().catch(() => {});
          }}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PermStatusBadge status={perms.background === 'available' ? 'ok' : perms.background === 'restricted' ? 'warn' : 'pending'} />
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textLight} />
            </View>
          }
        />
        <SettingsRow
          isRTL={isRTL}
          label={t('widgetPage.locationAccess')}
          onPress={() => {
            Haptics.selectionAsync();
            Linking.openSettings().catch(() => {});
          }}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PermStatusBadge status={perms.location === 'granted' ? 'ok' : perms.location === 'denied' ? 'warn' : 'pending'} />
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textLight} />
            </View>
          }
        />
      </SettingsGroup>

      {/* How to add */}
      <SettingsGroup title={t('widgetPage.howToAddTitle')} isRTL={isRTL}>
        <SettingsRow
          isRTL={isRTL}
          label={t('widgetPage.howToAddRow')}
          onPress={onShowHowTo}
          right={<MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textLight} />}
        />
      </SettingsGroup>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function getWidgetSettingDescriptions(isRTL: boolean) {
  if (isRTL || getLanguage() === 'ar') {
    return {
      calendar: 'يظهر في ودجات اليوم والشهر واليوم الرقمي. ودجة التاريخ الهجري تظل هجريًا دائمًا.',
      dateFormat: 'يغيّر سطر التاريخ المختصر في ودجات اليوم الرقمي والشهر فقط.',
      numerals: 'يغيّر شكل الأرقام في ودجات التاريخ ومواقيت الصلاة والعدادات.',
      theme: 'يغيّر ألوان كل الودجات في المعرض وعلى شاشة الهاتف.',
      language: 'لغة نص الودجات (أسماء الصلوات، التواريخ، الترجمة). «تلقائي» يتبع لغة التطبيق.',
    };
  }
  return {
    calendar: 'Applies to day, month, and digital day widgets. Hijri date widgets always stay Hijri.',
    dateFormat: 'Changes the compact date line in digital day and month widgets only.',
    numerals: 'Changes digits in date, prayer-time, and countdown widgets.',
    theme: 'Changes colors for all gallery and home-screen widgets.',
    language: 'Language of widget text (prayer names, dates, translation). “Auto” follows the app language.',
  };
}

function SettingsGroup({ title, children, isRTL }: { title: string; children: React.ReactNode; isRTL: boolean }) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
        {title}
      </Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  label,
  right,
  onPress,
  isRTL,
}: {
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isRTL: boolean;
}) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.65}
      style={[
        styles.row,
        { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border },
      ]}
    >
      <Text style={[styles.rowLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
        {label}
      </Text>
      <View>{right}</View>
    </Wrapper>
  );
}

function PermStatusBadge({ status }: { status: 'ok' | 'warn' | 'pending' }) {
  const color = status === 'ok' ? '#22C55E' : status === 'warn' ? '#F59E0B' : 'rgba(150,150,150,0.5)';
  const icon = status === 'ok' ? 'check-circle' : status === 'warn' ? 'alert-circle' : 'circle-outline';
  return <MaterialCommunityIcons name={icon as any} size={20} color={color} />;
}

function WidgetOptionRow({
  isRTL,
  label,
  value,
  options,
  description,
  onChange,
}: {
  isRTL: boolean;
  label: string;
  value: string;
  options: { key: string; label: string }[];
  description?: string;
  onChange: (key: string) => void;
}) {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const current = options.find((o) => o.key === value) ?? options[0];
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.65}
        onPress={() => {
          Haptics.selectionAsync();
          setOpen(true);
        }}
        style={[
          styles.row,
          { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.optionTextBlock, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }]}>
          <Text style={[styles.optionLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {label}
          </Text>
          {description ? (
            <TouchableOpacity
              hitSlop={10}
              onPress={(e) => {
                e.stopPropagation();
                Haptics.selectionAsync();
                setInfoOpen(true);
              }}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color={colors.textLight}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={[styles.optionValue, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]}
        >
          {current.label}
        </Text>
      </TouchableOpacity>
      <OptionPickerModal
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        options={options}
        value={value}
        onChange={(k) => {
          Haptics.selectionAsync();
          onChange(k);
          setOpen(false);
        }}
        isRTL={isRTL}
      />
      {description ? (
        <AppModal
          visible={infoOpen}
          onClose={() => setInfoOpen(false)}
          title={label}
          position="center"
        >
          <Text
            style={{
              fontFamily: fontMedium(),
              fontSize: 14,
              lineHeight: 24,
              color: colors.text,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr',
            }}
          >
            {description}
          </Text>
        </AppModal>
      ) : null}
    </>
  );
}

function OptionPickerModal({
  visible,
  onClose,
  title,
  options,
  value,
  onChange,
  isRTL,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  isRTL: boolean;
}) {
  const colors = useColors();
  const { isDarkMode } = useSettings();
  // Solid (non-translucent) surface so the page behind never bleeds through.
  const cardBg = isDarkMode ? ModalColors.cardDark : ModalColors.cardLight;
  const cardBorder = isDarkMode ? ModalColors.borderDark : ModalColors.borderLight;
  const divider = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.darkBackdrop} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            modalStyles.pickerCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <Text
            style={[
              modalStyles.pickerTitle,
              { color: colors.text, textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            {title}
          </Text>
          <View style={{ marginTop: 4 }}>
            {options.map((opt, idx) => {
              const selected = opt.key === value;
              const isLast = idx === options.length - 1;
              return (
                <TouchableOpacity
                  key={opt.key}
                  activeOpacity={0.6}
                  onPress={() => onChange(opt.key)}
                  style={[
                    modalStyles.pickerOption,
                    {
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      borderBottomColor: divider,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: selected ? fontSemiBold() : fontMedium(),
                      fontSize: 16,
                      color: selected ? colors.primary : colors.text,
                      textAlign: isRTL ? 'right' : 'left',
                      writingDirection: isRTL ? 'rtl' : 'ltr',
                    }}
                  >
                    {opt.label}
                  </Text>
                  {selected ? (
                    <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────
// How-to-add modal
// ────────────────────────────────────────────────────────

function HowToAddModal({ visible, onClose, isRTL }: { visible: boolean; onClose: () => void; isRTL: boolean }) {
  const colors = useColors();
  const { isDarkMode } = useSettings();
  const cardBg = isDarkMode ? ModalColors.cardDark : ModalColors.cardLight;
  const cardBorder = isDarkMode ? ModalColors.borderDark : ModalColors.borderLight;
  const language = getLanguage();
  const instructionPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
  const steps = useMemo(
    () => getWidgetHowToSteps(instructionPlatform, language),
    [instructionPlatform, language]
  );
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable style={[modalStyles.card, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={() => {}}>
          <Text style={[modalStyles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('widgetPage.howToAddTitle')}
          </Text>
          <ScrollView
            style={modalStyles.stepsScroll}
            contentContainerStyle={modalStyles.stepsContent}
            showsVerticalScrollIndicator={false}
          >
            {steps.map((step, idx) => (
              <View
                key={idx}
                style={[modalStyles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <View style={[modalStyles.stepBubble, { backgroundColor: colors.primary }]}>
                  <Text style={modalStyles.stepNum}>{idx + 1}</Text>
                </View>
                <Text style={[modalStyles.stepText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {step}
                </Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: colors.primary }]}>
            <Text style={modalStyles.closeText}>{t('common.ok')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  /** Stronger backdrop for the picker so the page behind doesn't bleed through. */
  darkBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '86%',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
  },
  title: {
    fontFamily: fontBold(),
    fontSize: 18,
    lineHeight: 26,
  },
  stepsScroll: {
    marginTop: 12,
    maxHeight: 420,
  },
  stepsContent: {
    paddingBottom: 2,
  },
  stepRow: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontFamily: fontBold(),
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  stepText: {
    flex: 1,
    fontFamily: fontMedium(),
    fontSize: 14,
    lineHeight: 22,
  },
  closeBtn: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeText: {
    fontFamily: fontBold(),
    fontSize: 15,
    color: '#FFFFFF',
  },
  pickerCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  pickerTitle: {
    fontFamily: fontBold(),
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
});

// ────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────

const _styles = StyleSheet.create({
  container: { flex: 1 },
  tabsWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  scrollView: { flex: 1 },
  galleryScroll: { paddingHorizontal: 16, paddingTop: 8 },
  galleryHint: {
    fontFamily: fontRegular(),
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 16,
  },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: fontBold(),
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 14,
  },
  sectionGrid: {
    flexDirection: 'column',
    gap: 16,
    alignSelf: 'stretch',
  },
  smallRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  fullRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  // Settings
  settingsScroll: { paddingHorizontal: 16, paddingTop: 12 },
  syncBanner: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  syncBannerText: { flex: 1, fontSize: 13, fontFamily: fontMedium() },
  group: { marginBottom: 18 },
  groupTitle: {
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 8,
    paddingHorizontal: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fontMedium(),
    fontSize: 15,
    lineHeight: 22,
  },
  rowValue: {
    fontFamily: fontMedium(),
    fontSize: 14,
  },
  optionTextBlock: {
    flex: 1,
    gap: 3,
    paddingEnd: 12,
  },
  optionLabel: {
    fontFamily: fontMedium(),
    fontSize: 15,
    lineHeight: 22,
  },
  optionDescription: {
    fontFamily: fontRegular(),
    fontSize: 11.5,
    lineHeight: 17,
  },
  optionValue: {
    flexShrink: 1,
    maxWidth: '42%',
    fontFamily: fontMedium(),
    fontSize: 14,
  },
});
