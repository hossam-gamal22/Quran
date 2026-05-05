// app/famous-duas.tsx
// الأدعية المختارة — 20 famous Quran/Sunnah duas + tasbihat from data/famous-duas.ts.

import React, { useMemo, useState, useCallback } from 'react';
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

type TabKey = 'all' | FamousDuaCategory;

const CATEGORY_ICONS: Record<FamousDuaCategory, string> = {
  quran_duas: 'book-open-page-variant',
  sunnah_duas: 'mosque',
  tasbihat: 'counter',
};

export default function FamousDuasScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const isRTL = useIsRTL();
  const styles = useScaledStyles(_styles, colors.fs);
  const lang = getLanguage();

  useSacredContext('dua_reading');

  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const tabs = useMemo(
    () => [
      { key: 'all', label: t('common.all') || 'الكل' },
      { key: 'quran_duas', label: t('azkar.quranDuas') || 'أدعية قرآنية' },
      { key: 'sunnah_duas', label: t('home.selectedDuas') || 'أدعية من السنة' },
      { key: 'tasbihat', label: t('home.tasbihSection') || 'تسبيح واستغفار' },
    ],
    []
  );

  const filteredDuas = useMemo(() => {
    if (activeTab === 'all') return FAMOUS_DUAS;
    return FAMOUS_DUAS.filter((d) => d.category === activeTab);
  }, [activeTab]);

  const handleCopy = useCallback(async (dua: FamousDua) => {
    try {
      await Haptics.selectionAsync();
      const text = `${dua.arabic}\n\n${resolveLocalized(dua.source, lang)}`;
      await Clipboard.setStringAsync(text);
      Alert.alert(t('common.copied') || 'تم النسخ', '');
    } catch {}
  }, [lang]);

  const handleShare = useCallback(async (dua: FamousDua) => {
    try {
      await Haptics.selectionAsync();
      const fadl = resolveLocalized(dua.fadl.text, lang);
      const fadlSrc = resolveLocalized(dua.fadl.source, lang);
      const src = resolveLocalized(dua.source, lang);
      const message =
        `${dua.arabic}\n\n` +
        `📖 ${src}\n\n` +
        `✨ ${fadl}\n${fadlSrc}\n\n` +
        `— روح المسلم`;
      await Share.share({ message });
    } catch {}
  }, [lang]);

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
        {filteredDuas.map((dua, idx) => (
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
        ))}
      </ScrollView>
    </BackgroundWrapper>
  );
}

interface DuaCardProps {
  dua: FamousDua;
  index: number;
  lang: string;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof useScaledStyles<typeof _styles>>;
  onCopy: () => void;
  onShare: () => void;
}

function DuaCard({ dua, index, lang, isRTL, colors, styles, onCopy, onShare }: DuaCardProps) {
  const occasion = resolveLocalized(dua.occasion, lang);
  const fadl = resolveLocalized(dua.fadl.text, lang);
  const fadlSrc = resolveLocalized(dua.fadl.source, lang);
  const src = resolveLocalized(dua.source, lang);
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

      <View style={styles.sourceRow}>
        <MaterialCommunityIcons name="book-open-variant" size={14} color={colors.primary} />
        <Text style={[styles.sourceText, { color: colors.text }]}>{src}</Text>
      </View>

      {!!occasion && (
        <View style={[styles.occasionBox, { backgroundColor: colors.primary + '14' }]}>
          <Text style={[styles.occasionText, { color: colors.text }]}>
            <Text style={{ fontFamily: 'Cairo-Bold' }}>{t('common.occasion') || 'المناسبة'}: </Text>
            {occasion}
          </Text>
        </View>
      )}

      {!!fadl && (
        <View style={styles.fadlBox}>
          <View style={[styles.fadlHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="star-four-points" size={16} color="#9B7B00" />
            <Text style={[styles.fadlTitle, { color: colors.text }]}>
              {t('common.virtue') || 'فضل الدعاء'}
            </Text>
          </View>
          <Text style={[styles.fadlText, { color: colors.text }]}>{fadl}</Text>
          {!!fadlSrc && (
            <Text style={[styles.fadlSource, { color: colors.textLight }]}>{fadlSrc}</Text>
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
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-SemiBold',
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
    fontFamily: 'Cairo-Regular',
    fontSize: 13,
    fontStyle: 'italic',
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
    fontFamily: 'Cairo-SemiBold',
    fontSize: 13,
  },
  occasionBox: {
    padding: Spacing.sm,
    borderRadius: 10,
    marginBottom: Spacing.sm,
  },
  occasionText: {
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    fontSize: 13,
  },
  fadlText: {
    fontFamily: 'Cairo-Regular',
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  fadlSource: {
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-SemiBold',
    fontSize: 13,
  },
});
