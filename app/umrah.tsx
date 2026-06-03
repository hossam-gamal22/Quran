// app/umrah.tsx
// صفحة مناسك العمرة — منفصلة

import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing } from '@/constants/theme';
import { fontBold } from '@/lib/fonts';
import { t } from '@/lib/i18n';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { ScreenContainer } from '@/components/screen-container';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { MissingTranslationCard } from '@/components/ui/MissingTranslationCard';
import { ContentLanguageNotice } from '@/components/ui/ContentLanguageNotice';
import {
  UMRAH_SECTIONS,
  DUAS_BY_RITUAL,
  GlassSection,
  DuaRitualCard,
  useHajjUmrahContent,
} from './hajj-umrah';
import {
  ACCENT,
  ACCENT_BORDER,
  COUNT_BADGE_BG,
  COUNT_BADGE_TEXT,
  s as _s,
} from '@/components/hajj/shared';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { localizeNumber } from '@/lib/format-number';

export default function UmrahScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const colors = useColors();
  const s = useScaledStyles(_s, colors.fs);
  const isRTL = useIsRTL();
  const [activeTab, setActiveTab] = useState<'rituals' | 'duas'>('rituals');
  const scrollRef = useRef<ScrollView>(null);

  // Use CMS data with hardcoded fallback
  const { umrahSections, duasByRitual } = useHajjUmrahContent();

  // Umrah-related duas (first 4 groups: إحرام، طواف، سعي، عامة)
  const umrahDuas = duasByRitual.filter((_, i) => i <= 3 || i >= 8);

  return (
    <ScreenContainer edges={['top', 'left', 'right']} screenKey="hajj_umrah">
      {/* Header */}
      <UniversalHeader
        titleColor={colors.text}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text, lineHeight: 30, includeFontPadding: false }} numberOfLines={1}>{t('hajjUmrah.umrah')}</Text>
          <SectionInfoButton sectionKey="hajj_umrah" />
        </View>
      </UniversalHeader>

      {/* Hero banner */}
      <View style={s.heroOuter}>
        <BlurView
         
          intensity={Platform.OS === 'ios' ? 25 : 10}
          tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
          style={StyleSheet.absoluteFill}
        />
        <View style={[s.heroOverlay, { backgroundColor: isDarkMode ? 'rgba(6,79,47,0.15)' : 'rgba(6,79,47,0.08)' }]} />
        <View style={[s.heroContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="mosque" size={36} color={ACCENT} />
          <View style={s.heroTextWrap}>
            <Text style={[s.heroTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {activeTab === 'rituals' ? t('hajjUmrah.umrahGuide') : t('hajjUmrah.umrahDuas')}
            </Text>
            <Text style={[s.heroSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {activeTab === 'rituals'
                ? t('hajjUmrah.umrahGuideDesc')
                : t('hajjUmrah.duasDesc')}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ marginTop: 10, marginHorizontal: 16 }}>
        <NativeTabs
          tabs={[
            { key: 'rituals', label: t('hajjUmrah.rituals') },
            { key: 'duas', label: t('hajjUmrah.duas') },
          ]}
          selected={activeTab}
          onSelect={(key) => setActiveTab(key as 'rituals' | 'duas')}
          indicatorColor={ACCENT}
        />
      </View>

      {/* Content */}
      <ScrollView ref={scrollRef} style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <ContentLanguageNotice />
        {activeTab === 'duas' ? (
          <>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: 16 }}>
              <View style={[s.countBadge, { backgroundColor: COUNT_BADGE_BG, flexShrink: 1, marginBottom: 0 }]}>
                <Text style={[s.countText, { color: COUNT_BADGE_TEXT }]}>
                  {t('hajjUmrah.duaCount')} {localizeNumber(umrahDuas.reduce((sum, g) => sum + g.duas.length, 0))} • {t('hajjUmrah.sectionsCount')} {localizeNumber(umrahDuas.length)}
                </Text>
              </View>
            </View>
            {umrahDuas.map((group, index) => (
              <DuaRitualCard key={`duas-${index}`} group={group} isDarkMode={isDarkMode} colors={colors} initiallyExpanded={index === 0} scrollRef={scrollRef} />
            ))}
          </>
        ) : (
          <>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: 16 }}>
              <View style={[s.countBadge, { backgroundColor: COUNT_BADGE_BG, flexShrink: 1, marginBottom: 0 }]}>
                <Text style={[s.countText, { color: COUNT_BADGE_TEXT }]}>{t('hajjUmrah.ritualsCount')} {localizeNumber(umrahSections.length)}</Text>
              </View>
            </View>
            <View style={s.timeline}>
              {umrahSections.map((section, index) => (
                <View key={`umrah-${index}`}>
                  {index < umrahSections.length - 1 && <View style={[s.timelineLine, { backgroundColor: ACCENT_BORDER }]} />}
                  <GlassSection section={section} sectionIndex={index} isDarkMode={isDarkMode} colors={colors} initiallyExpanded={index === 0} scrollRef={scrollRef} />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={s.footerOuter}>
          <BlurView intensity={Platform.OS === 'ios' ? 25 : 10} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
          <View style={[s.footerOverlay, { backgroundColor: isDarkMode ? 'rgba(6,79,47,0.12)' : 'rgba(6,79,47,0.06)' }]} />
          <View style={s.footerContent}>
            <MaterialCommunityIcons name="star-crescent" size={24} color={ACCENT} />
            <Text style={[s.footerText, { color: colors.text }]}>{t('hajj.footerDua')}</Text>
            <Text style={[s.footerNote, { color: colors.textLight }]}>{t('hajj.footerNoteUmrah')}</Text>
          </View>
        </View>
        <MissingTranslationCard pageName="Umrah" />
      </ScrollView>
      <BannerAdComponent screen="hajj_umrah" />
    </ScreenContainer>
  );
}
