// app/umrah.tsx
// صفحة مناسك العمرة — منفصلة

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

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
import { exportAsPDF, showAdThenExport } from '@/lib/pdf-export';
import { PdfShareButton, PdfShareErrorModal } from '@/components/ui/PdfShareControls';
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
  ACCENT_LIGHT,
  ACCENT_BORDER,
  s as _s,
} from '@/components/hajj/shared';
import { useScaledStyles } from '@/hooks/use-font-scale';

export default function UmrahScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const colors = useColors();
  const s = useScaledStyles(_s, colors.fs);
  const isRTL = useIsRTL();
  const [activeTab, setActiveTab] = useState<'rituals' | 'duas'>('rituals');
  const [pdfErrorVisible, setPdfErrorVisible] = useState(false);

  // Use CMS data with hardcoded fallback
  const { umrahSections, duasByRitual } = useHajjUmrahContent();

  // Umrah-related duas (first 4 groups: إحرام، طواف، سعي، عامة)
  const umrahDuas = duasByRitual.filter((_, i) => i <= 3 || i >= 8);

  const handleSharePdf = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (activeTab === 'duas') {
        const title = t('hajjUmrah.umrahDuas');
        const html = umrahDuas.map((group, i) => {
          const duasHtml = group.duas.map(d =>
            `<div class="dua-box"><div class="dua-arabic">${d.arabic}</div>${d.occasion ? `<div class="dua-note">${t('hajjUmrah.whenLabel')}: ${d.occasion}</div>` : ''}${d.reference ? `<div class="dua-note">${t('hajjUmrah.referenceLabel')}: ${d.reference}</div>` : ''}</div>`
          ).join('');
          return `<div class="section"><div class="section-title">${i + 1}. ${group.title}</div>${duasHtml}</div>`;
        }).join('');
        await showAdThenExport(() => exportAsPDF(title, html));
        return;
      }
      const title = t('hajjUmrah.umrahRituals');
      const html = umrahSections.map((sec, i) => {
        const stepsHtml = sec.steps.map((step, j) =>
          `<div class="step"><span class="step-num">${j + 1}</span><span class="step-text">${step.text}</span></div>`
        ).join('');
        const duasHtml = sec.duas.map(d =>
          `<div class="dua-box"><div class="dua-arabic">${d.arabic}</div>${d.note ? `<div class="dua-note">— ${d.note}</div>` : ''}</div>`
        ).join('');
        return `<div class="section">
          <div class="section-title">${i + 1}. ${sec.title}</div>
          <div class="section-desc">${sec.description}</div>
          <div class="steps-label">${t('hajjUmrah.steps')}:</div>
          ${stepsHtml}
          ${duasHtml ? `<div class="steps-label" style="margin-top:10px;">${t('hajjUmrah.duas')}:</div>${duasHtml}` : ''}
        </div>`;
      }).join('');
      await showAdThenExport(() => exportAsPDF(title, html));
    } catch (pdfError) {
      setPdfErrorVisible(true);
      console.log('Umrah PDF sharing failed', pdfError);
    }
  }, [activeTab, umrahSections, umrahDuas]);

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
      <View style={{ marginTop: 10 }}>
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
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <ContentLanguageNotice />
        {activeTab === 'duas' ? (
          <>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, flexWrap: 'wrap' }}>
              <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT, flexShrink: 1 }]}>
                <Text style={[s.countText, { color: ACCENT }]}>
                  {umrahDuas.reduce((sum, g) => sum + g.duas.length, 0)} {t('hajjUmrah.duaCount')} • {umrahDuas.length} {t('hajjUmrah.sectionsCount')}
                </Text>
              </View>
              <PdfShareButton onPress={handleSharePdf} />
            </View>
            {umrahDuas.map((group, index) => (
              <DuaRitualCard key={`duas-${index}`} group={group} isDarkMode={isDarkMode} colors={colors} initiallyExpanded={index === 0} />
            ))}
          </>
        ) : (
          <>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, flexWrap: 'wrap' }}>
              <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT, flexShrink: 1 }]}>
                <Text style={[s.countText, { color: ACCENT }]}>{umrahSections.length} {t('hajjUmrah.ritualsCount')}</Text>
              </View>
              <PdfShareButton onPress={handleSharePdf} />
            </View>
            <View style={s.timeline}>
              {umrahSections.map((section, index) => (
                <View key={`umrah-${index}`}>
                  {index < umrahSections.length - 1 && <View style={[s.timelineLine, { backgroundColor: ACCENT_BORDER }]} />}
                  <GlassSection section={section} sectionIndex={index} isDarkMode={isDarkMode} colors={colors} initiallyExpanded={index === 0} />
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
      <PdfShareErrorModal
        visible={pdfErrorVisible}
        onRetry={() => {
          setPdfErrorVisible(false);
          handleSharePdf();
        }}
        onClose={() => setPdfErrorVisible(false)}
      />
    </ScreenContainer>
  );
}
