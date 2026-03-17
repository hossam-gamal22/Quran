// app/hajj.tsx
// صفحة مناسك الحج — منفصلة

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
import { exportAsPDF, showAdThenExport, PdfTemplate } from '@/lib/pdf-export';
import { PdfTemplatePicker } from '@/components/ui/PdfTemplatePicker';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { MissingTranslationCard } from '@/components/ui/MissingTranslationCard';
import {
  HAJJ_SECTIONS,
  DUAS_BY_RITUAL,
  GlassSection,
  DuaRitualCard,
  useHajjUmrahContent,
} from './hajj-umrah';
import {
  ACCENT,
  ACCENT_LIGHT,
  ACCENT_BORDER,
  s,
} from '@/components/hajj/shared';

export default function HajjScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const colors = useColors();
  const isRTL = useIsRTL();
  const [activeTab, setActiveTab] = useState<'rituals' | 'duas'>('rituals');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Use CMS data with hardcoded fallback
  const { hajjSections, duasByRitual } = useHajjUmrahContent();

  // Filter duas relevant to Hajj only
  const hajjDuas = duasByRitual;

  const handleExportPDF = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTemplatePicker(true);
  }, []);

  const doExport = useCallback((template: PdfTemplate) => {
    if (activeTab === 'duas') {
      const title = t('hajjUmrah.hajjDuas');
      const html = hajjDuas.map((group, i) => {
        const duasHtml = group.duas.map(d =>
          `<div class="dua-box"><div class="dua-arabic">${d.arabic}</div>${d.occasion ? `<div class="dua-note">${t('hajjUmrah.whenLabel')}: ${d.occasion}</div>` : ''}${d.reference ? `<div class="dua-note">${t('hajjUmrah.referenceLabel')}: ${d.reference}</div>` : ''}</div>`
        ).join('');
        return `<div class="section"><div class="section-title">${i + 1}. ${group.title}</div>${duasHtml}</div>`;
      }).join('');
      return showAdThenExport(() => exportAsPDF(title, html, template));
    }
    const title = t('hajjUmrah.hajjRituals');
    const html = hajjSections.map((sec, i) => {
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
    return showAdThenExport(() => exportAsPDF(title, html, template));
  }, [activeTab, hajjSections, hajjDuas]);

  return (
    <ScreenContainer edges={['top', 'left', 'right']} screenKey="hajj_umrah">
      {/* Header */}
      <UniversalHeader
        titleColor={colors.text}
        rightActions={[{ icon: 'file-pdf-box', onPress: handleExportPDF, color: colors.text }]}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('hajjUmrah.hajjRituals')}</Text>
          <SectionInfoButton sectionKey="hajj_umrah" />
        </View>
      </UniversalHeader>

      {/* Hero banner */}
      <View style={s.heroOuter}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 15}
          tint={isDarkMode ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[s.heroOverlay, { backgroundColor: isDarkMode ? 'rgba(47,118,89,0.15)' : 'rgba(47,118,89,0.08)' }]} />
        <View style={[s.heroContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="mosque" size={36} color={ACCENT} />
          <View style={s.heroTextWrap}>
            <Text style={[s.heroTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {activeTab === 'rituals' ? t('hajjUmrah.hajjGuide') : t('hajjUmrah.hajjUmrahDuas')}
            </Text>
            <Text style={[s.heroSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
              {activeTab === 'rituals'
                ? t('hajjUmrah.hajjGuideDesc')
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
        {activeTab === 'duas' ? (
          <>
            <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[s.countText, { color: ACCENT }]}>
                {hajjDuas.reduce((sum, g) => sum + g.duas.length, 0)} {t('hajjUmrah.duaCount')} • {hajjDuas.length} {t('hajjUmrah.sectionsCount')}
              </Text>
            </View>
            {hajjDuas.map((group, index) => (
              <DuaRitualCard key={`duas-${index}`} group={group} isDarkMode={isDarkMode} colors={colors} initiallyExpanded={index === 0} />
            ))}
          </>
        ) : (
          <>
            <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[s.countText, { color: ACCENT }]}>{hajjSections.length} {t('hajjUmrah.ritualsCount')}</Text>
            </View>
            <View style={s.timeline}>
              {hajjSections.map((section, index) => (
                <View key={`hajj-${index}`}>
                  {index < hajjSections.length - 1 && <View style={[s.timelineLine, { backgroundColor: ACCENT_BORDER }]} />}
                  <GlassSection section={section} sectionIndex={index} isDarkMode={isDarkMode} colors={colors} initiallyExpanded={index === 0} />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={s.footerOuter}>
          <BlurView intensity={Platform.OS === 'ios' ? 40 : 15} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[s.footerOverlay, { backgroundColor: isDarkMode ? 'rgba(47,118,89,0.12)' : 'rgba(47,118,89,0.06)' }]} />
          <View style={s.footerContent}>
            <MaterialCommunityIcons name="star-crescent" size={24} color={ACCENT} />
            <Text style={[s.footerText, { color: colors.text }]}>{t('hajj.footerDua')}</Text>
            <Text style={[s.footerNote, { color: colors.textLight }]}>{t('hajj.footerNote')}</Text>
          </View>
        </View>
        <BannerAdComponent screen="hajj_umrah" />
        <MissingTranslationCard pageName="Hajj" />
      </ScrollView>
      <PdfTemplatePicker
        visible={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelect={doExport}
        pageType="hajj"
      />
    </ScreenContainer>
  );
}
