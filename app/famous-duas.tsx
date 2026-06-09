// app/famous-duas.tsx
// الأدعية المختارة — admin-managed selectedDuas with bundled fallback.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { t, getLanguage } from '@/lib/i18n';
import { buildShareText } from '@/lib/share-text';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSacredContext } from '@/hooks/use-sacred-context';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader, NativeTabs, GlassCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  FAMOUS_DUAS,
  resolveLocalized,
  type FamousDua,
  type FamousDuaCategory,
} from '@/data/famous-duas';
import {
  fetchSelectedDuas,
  subscribeToSelectedDuas,
  type SelectedDua,
} from '@/lib/duas-api';

type TabKey = 'all' | FamousDuaCategory;

interface DisplayDua {
  id: string;
  arabic: string;
  category: FamousDuaCategory;
  source: string;
  translation?: string;
  transliteration?: string;
  fadl?: {
    text: string;
    source: string;
  };
  repetitions: number | null;
  occasion?: string;
}

const CATEGORY_ICONS: Record<FamousDuaCategory, string> = {
  quran_duas: 'book-open-page-variant',
  sunnah_duas: 'mosque',
  tasbihat: 'counter',
};

function getLocalizedRecordValue(value: Record<string, string> | string | undefined, lang: string): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.ar || value.en || '';
}

function inferSelectedDuaCategory(dua: SelectedDua): FamousDuaCategory {
  const source = `${dua.source || ''} ${dua.reference || ''}`;
  if (/قرآن|القرآن|سورة|آية|quran|qur'an/i.test(source)) return 'quran_duas';
  if (/تسبيح|استغفار|ذكر|tasbih|dhikr/i.test(source)) return 'tasbihat';
  return 'sunnah_duas';
}

function selectedDuaToDisplay(dua: SelectedDua, lang: string): DisplayDua {
  const benefit = getLocalizedRecordValue(dua.benefit, lang);
  const source = [dua.source, dua.reference].filter(Boolean).join(' • ');
  const translation = lang === 'ar' ? '' : getLocalizedRecordValue(dua.translations, lang);

  return {
    id: `selected_${dua.id}`,
    arabic: dua.arabic,
    category: inferSelectedDuaCategory(dua),
    source: source || dua.reference || dua.source || '',
    translation,
    fadl: benefit ? { text: benefit, source: '' } : undefined,
    repetitions: null,
  };
}

function famousDuaToDisplay(dua: FamousDua, lang: string): DisplayDua {
  return {
    id: dua.id,
    arabic: dua.arabic,
    category: dua.category,
    source: resolveLocalized(dua.source, lang),
    transliteration: dua.transliteration,
    fadl: {
      text: resolveLocalized(dua.fadl.text, lang),
      source: resolveLocalized(dua.fadl.source, lang),
    },
    repetitions: dua.repetitions,
    occasion: resolveLocalized(dua.occasion, lang),
  };
}

export default function FamousDuasScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const isRTL = useIsRTL();
  const styles = useScaledStyles(_styles, colors.fs);
  const lang = getLanguage();

  useSacredContext('dua_reading');

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selectedDuas, setSelectedDuas] = useState<SelectedDua[]>([]);
  const [selectedDuasLoaded, setSelectedDuasLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const applyDuas = (duas: SelectedDua[]) => {
      if (!mounted) return;
      setSelectedDuas(duas);
      setSelectedDuasLoaded(true);
    };

    fetchSelectedDuas({ forceRefresh: true })
      .then(duas => {
        if (mounted && duas.length > 0) setSelectedDuas(duas);
      })
      .catch(() => {});

    const unsubscribe = subscribeToSelectedDuas(applyDuas);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const tabs = useMemo(
    () => [
      { key: 'all', label: t('common.all') || 'الكل' },
      { key: 'quran_duas', label: t('azkar.quranDuas') || 'أدعية قرآنية' },
      { key: 'sunnah_duas', label: t('home.selectedDuas') || 'أدعية من السنة' },
      { key: 'tasbihat', label: t('home.tasbihSection') || 'تسبيح واستغفار' },
    ],
    []
  );

  const displayDuas = useMemo(() => {
    if (selectedDuasLoaded || selectedDuas.length > 0) {
      return selectedDuas.map(dua => selectedDuaToDisplay(dua, lang));
    }
    return FAMOUS_DUAS.map(dua => famousDuaToDisplay(dua, lang));
  }, [lang, selectedDuas, selectedDuasLoaded]);

  const filteredDuas = useMemo(() => {
    if (activeTab === 'all') return displayDuas;
    return displayDuas.filter((d) => d.category === activeTab);
  }, [activeTab, displayDuas]);

  const handleCopy = useCallback(async (dua: DisplayDua) => {
    try {
      await Haptics.selectionAsync();
      const parts = [dua.arabic, dua.translation, dua.source].filter(Boolean);
      const text = buildShareText(parts.join('\n\n'));
      await Clipboard.setStringAsync(text);
      Alert.alert(t('common.copied') || 'تم النسخ', '');
    } catch {}
  }, []);

  const handleShare = useCallback(async (dua: DisplayDua) => {
    try {
      await Haptics.selectionAsync();
      const parts = [dua.arabic];
      if (dua.translation) parts.push(dua.translation);
      if (dua.source) parts.push(`📖 ${dua.source}`);
      if (dua.fadl?.text) parts.push(`✨ ${dua.fadl.text}`);
      if (dua.fadl?.source) parts.push(dua.fadl.source);
      const message = buildShareText(parts.join('\n\n'));
      await Share.share({ message });
    } catch {}
  }, []);

  return (
    <BackgroundWrapper>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top }}>
        <UniversalHeader title={t('home.famousDuas') || 'الأدعية المختارة'} />
      </View>

      <View style={styles.tabsWrap}>
        <NativeTabs
          tabs={tabs}
          selected={activeTab}
          onSelect={(k) => setActiveTab(k as TabKey)}
          scrollable
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredDuas.length > 0 ? filteredDuas.map((dua, idx) => (
          <DuaCard
            key={dua.id}
            dua={dua}
            index={idx + 1}
            lang={lang}
            isRTL={isRTL}
            colors={colors}
            styles={styles}
            onCopy={() => handleCopy(dua)}
            onShare={() => handleShare(dua)}
          />
        )) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="heart-outline" size={36} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              {t('common.noData') || 'لا توجد أدعية مفعلة حالياً'}
            </Text>
          </View>
        )}
      </ScrollView>
    </BackgroundWrapper>
  );
}

interface DuaCardProps {
  dua: DisplayDua;
  index: number;
  lang: string;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof useScaledStyles<typeof _styles>>;
  onCopy: () => void;
  onShare: () => void;
}

function DuaCard({ dua, index, lang, isRTL, colors, styles, onCopy, onShare }: DuaCardProps) {
  const icon = CATEGORY_ICONS[dua.category];

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.indexBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.indexBadgeText}>{index}</Text>
        </View>
        <MaterialCommunityIcons name={icon as any} size={22} color={colors.primary} />
        {dua.repetitions != null && (
          <View style={[styles.repBadge, { borderColor: colors.primary }]}>
            <Text style={[styles.repBadgeText, { color: colors.primary }]}>
              ×{dua.repetitions}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.arabic, { color: colors.text }]} selectable>
        {dua.arabic}
      </Text>

      {lang !== 'ar' && !!dua.transliteration && (
        <Text style={[styles.translit, { color: colors.textLight }]}>
          {dua.transliteration}
        </Text>
      )}

      {lang !== 'ar' && !!dua.translation && (
        <Text style={[styles.translation, { color: colors.textLight }]}>
          {dua.translation}
        </Text>
      )}

      {!!dua.source && (
        <View style={styles.sourceRow}>
          <MaterialCommunityIcons name="book-open-variant" size={14} color={colors.primary} />
          <Text style={[styles.sourceText, { color: colors.text }]}>{dua.source}</Text>
        </View>
      )}

      {!!dua.occasion && (
        <View style={[styles.occasionBox, { backgroundColor: colors.primary + '14' }]}>
          <Text style={[styles.occasionText, { color: colors.text }]}>
            <Text style={{ fontFamily: 'Rubik-Bold' }}>{t('common.occasion') || 'المناسبة'}: </Text>
            {dua.occasion}
          </Text>
        </View>
      )}

      {!!dua.fadl?.text && (
        <View style={styles.fadlBox}>
          <View style={[styles.fadlHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="star-four-points" size={16} color="#9B7B00" />
            <Text style={[styles.fadlTitle, { color: colors.text }]}>
              {t('common.virtue') || 'فضل الدعاء'}
            </Text>
          </View>
          <Text style={[styles.fadlText, { color: colors.text }]}>{dua.fadl.text}</Text>
          {!!dua.fadl.source && (
            <Text style={[styles.fadlSource, { color: colors.textLight }]}>{dua.fadl.source}</Text>
          )}
        </View>
      )}

      <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={onCopy} style={styles.actionBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="content-copy" size={20} color={colors.text} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>
            {t('common.copy') || 'نسخ'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} style={styles.actionBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>
            {t('common.share') || 'مشاركة'}
          </Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

const _styles = StyleSheet.create({
  tabsWrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadgeText: {
    color: '#fff',
    fontFamily: 'Rubik-Bold',
    fontSize: 13,
  },
  repBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginStart: 'auto',
  },
  repBadgeText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 12,
  },
  arabic: {
    fontFamily: 'KFGQPCUthmanic',
    fontSize: 24,
    lineHeight: 44,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: Spacing.sm,
  },
  translit: {
    fontFamily: 'Rubik-Regular',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  translation: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  sourceText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 13,
  },
  occasionBox: {
    padding: Spacing.sm,
    borderRadius: 10,
    marginBottom: Spacing.sm,
  },
  occasionText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  fadlBox: {
    padding: Spacing.md,
    borderRadius: 10,
    backgroundColor: 'rgba(155, 123, 0, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#9B7B00',
    marginBottom: Spacing.md,
  },
  fadlHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fadlTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: 13,
  },
  fadlText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  fadlSource: {
    fontFamily: 'Rubik-Regular',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actionsRow: {
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionLabel: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
});
