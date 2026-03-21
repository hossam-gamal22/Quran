// components/hajj/shared.tsx
// مكونات مشتركة بين صفحات الحج والعمرة

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import type { useColors } from '@/hooks/use-colors';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';
import { localizeNumber } from '@/lib/format-number';
import { TranslatedText } from '@/components/ui/TranslatedText';

function stripTashkeel(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}
// ========================================
// الألوان المشتركة
// ========================================

export const ACCENT = '#22C55E';
export const ACCENT_LIGHT = 'rgba(6,79,47,0.12)';
export const ACCENT_BORDER = 'rgba(6,79,47,0.30)';

// Removed hardcoded ARABIC_NUMS — use localizeNumber() instead

// ========================================
// أنواع البيانات
// ========================================

export interface Step {
  text: string;
}

export interface RitualSection {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  description: string;
  steps: Step[];
  duas: { arabic: string; note?: string }[];
}

export interface DuaEntry {
  arabic: string;
  reference?: string;
  occasion: string;
}

export interface DuaRitualGroup {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  duas: DuaEntry[];
}

// ========================================
// مكون بطاقة أدعية المنسك
// ========================================

export const DuaRitualCard: React.FC<{
  group: DuaRitualGroup;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
  initiallyExpanded?: boolean;
}> = ({ group, isDarkMode, colors, initiallyExpanded = false }) => {
  const isRTL = useIsRTL();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const rotateAnim = useRef(new Animated.Value(initiallyExpanded ? 1 : 0)).current;

  const toggleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.spring(rotateAnim, {
      toValue: expanded ? 0 : 1,
      damping: 18,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
    setExpanded((prev) => !prev);
  }, [expanded, rotateAnim]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={s.sectionOuter}>
      <Pressable onPress={toggleExpand} style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[s.sectionIconWrap, { backgroundColor: ACCENT }]}>
          <MaterialCommunityIcons name={group.icon} size={22} color="#fff" />
        </View>
        <View style={s.sectionTitleWrap}>
          <TranslatedText from="ar" type="section" style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{group.title}</TranslatedText>
          <Text style={[s.sectionDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {group.duas.length} {group.duas.length > 10 ? t('hajj.duaWord') : group.duas.length > 2 ? t('hajj.duasWord') : t('hajj.duaWord')}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textLight} />
        </Animated.View>
      </Pressable>

      {expanded && (
        <View style={s.glassOuter}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 20}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.glassOverlay,
              {
                backgroundColor: isDarkMode ? 'rgba(30,30,32,0.55)' : 'rgba(255,255,255,0.50)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          />
          <View style={s.glassContent}>
            {group.duas.map((dua, i) => (
              <View
                key={i}
                style={[
                  s.duaBox,
                  {
                    backgroundColor: isDarkMode ? 'rgba(6,79,47,0.10)' : 'rgba(6,79,47,0.06)',
                    borderColor: ACCENT_BORDER,
                  },
                ]}
              >
                <View style={[s.duaAccentBar, { right: isRTL ? undefined : 0, left: isRTL ? 0 : undefined }]} />
                <Text style={[s.duaArabic, { color: colors.text, textAlign: 'right', writingDirection: 'rtl' }]}>{dua.arabic}</Text>
                {dua.occasion && (
                  <View style={[s.duaMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="clock-outline" size={13} color={ACCENT} />
                    <TranslatedText from="ar" type="section" style={[s.duaOccasion, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{dua.occasion}</TranslatedText>
                  </View>
                )}
                {dua.reference && (
                  <View style={[s.duaMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="book-open-variant" size={13} color={ACCENT} />
                    <TranslatedText from="ar" type="section" style={[s.duaReference, { color: ACCENT, textAlign: isRTL ? 'right' : 'left' }]}>{dua.reference}</TranslatedText>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// ========================================
// مكون القسم الزجاجي
// ========================================

export const GlassSection: React.FC<{
  section: RitualSection;
  sectionIndex: number;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
  initiallyExpanded?: boolean;
}> = ({ section, sectionIndex, isDarkMode, colors, initiallyExpanded = false }) => {
  const isRTL = useIsRTL();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const rotateAnim = useRef(new Animated.Value(initiallyExpanded ? 1 : 0)).current;

  const toggleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.spring(rotateAnim, {
      toValue: expanded ? 0 : 1,
      damping: 18,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
    setExpanded((prev) => !prev);
  }, [expanded, rotateAnim]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={s.sectionOuter}>
      <Pressable onPress={toggleExpand} style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[s.sectionIconWrap, { backgroundColor: ACCENT }]}>
          <MaterialCommunityIcons name={section.icon} size={22} color="#fff" />
        </View>
        <View style={s.sectionTitleWrap}>
          <TranslatedText from="ar" type="section" style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{section.title}</TranslatedText>
          <TranslatedText from="ar" type="section" style={[s.sectionDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {section.description}
          </TranslatedText>
        </View>
        <View style={s.sectionHeaderRight}>
          <View style={[s.sectionBadge, { backgroundColor: ACCENT_LIGHT }]}>
            <Text style={[s.sectionBadgeText, { color: ACCENT }]}>
              {localizeNumber(sectionIndex + 1)}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textLight} />
          </Animated.View>
        </View>
      </Pressable>

      {expanded && (
        <View style={s.glassOuter}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 20}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.glassOverlay,
              {
                backgroundColor: isDarkMode ? 'rgba(30,30,32,0.55)' : 'rgba(255,255,255,0.50)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          />
          <View style={s.glassContent}>
            <View style={[s.stepsLabel, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="format-list-numbered" size={16} color={ACCENT} />
              <Text style={[s.stepsLabelText, { color: ACCENT }]}>{t('hajjUmrah.steps')}</Text>
            </View>

            {section.steps.map((step, i) => (
              <View key={i} style={[s.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[s.stepCircle, { backgroundColor: ACCENT }]}>
                  <Text style={s.stepCircleText}>{localizeNumber(i + 1)}</Text>
                </View>
                <TranslatedText from="ar" type="section" style={[s.stepText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{step.text}</TranslatedText>
              </View>
            ))}

            {section.duas.length > 0 && (
              <View style={[s.duasContainer, { borderTopColor: ACCENT_BORDER }]}>
                <View style={[s.duasHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <MaterialCommunityIcons name="hands-pray" size={16} color={ACCENT} />
                  <Text style={[s.duasHeaderText, { color: ACCENT }]}>{t('hajjUmrah.duas')}</Text>
                </View>
                {section.duas.map((dua, i) => (
                  <View
                    key={i}
                    style={[
                      s.duaBox,
                      {
                        backgroundColor: isDarkMode ? 'rgba(6,79,47,0.10)' : 'rgba(6,79,47,0.06)',
                        borderColor: ACCENT_BORDER,
                      },
                    ]}
                  >
                    <View style={[s.duaAccentBar, { right: isRTL ? undefined : 0, left: isRTL ? 0 : undefined }]} />
                    <Text style={[s.duaArabic, { color: colors.text, textAlign: 'right', writingDirection: 'rtl' }]}>{dua.arabic}</Text>
                    {dua.note && (
                      <TranslatedText from="ar" type="section" style={[s.duaNote, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{`— ${dua.note}`}</TranslatedText>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

// ========================================
// الأنماط المشتركة
// ========================================

export const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontBold(),
    fontSize: 20,
  },
  heroOuter: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fontBold(),
    fontSize: 19,
    lineHeight: 30,
  },
  heroSub: {
    fontFamily: fontRegular(),
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 16,
  },
  countBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 16,
  },
  countText: {
    fontFamily: fontSemiBold(),
    fontSize: 13,
  },
  timeline: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    end: 18,
    top: 50,
    bottom: -10,
    width: 2,
    borderRadius: 1,
    zIndex: -1,
  },
  sectionOuter: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
    paddingVertical: 4,
  },
  sectionHeaderRight: {
    alignItems: 'center',
    gap: 8,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: fontBold(),
    fontSize: 18,
    lineHeight: 28,
  },
  sectionDesc: {
    fontFamily: fontRegular(),
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
    textAlign: 'right'
  },
  sectionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontFamily: fontBold(),
    fontSize: 14,
  },
  glassOuter: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
  },
  glassContent: {
    padding: 18,
  },
  stepsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  stepsLabelText: {
    fontFamily: fontSemiBold(),
    fontSize: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepCircleText: {
    fontFamily: fontBold(),
    fontSize: 13,
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontFamily: fontRegular(),
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'right'
  },
  duasContainer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  duasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  duasHeaderText: {
    fontFamily: fontSemiBold(),
    fontSize: 14,
  },
  duaBox: {
    borderRadius: 14,
    padding: 16,
    paddingEnd: 22,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    overflow: 'hidden',
  },
  duaAccentBar: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  duaArabic: {
    fontFamily: fontRegular(),
    fontSize: 17,
    lineHeight: 32,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  duaNote: {
    fontFamily: fontRegular(),
    fontSize: 12,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  duaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  duaOccasion: {
    fontFamily: fontRegular(),
    fontSize: 12,
    lineHeight: 20,
    flex: 1,
  },
  duaReference: {
    fontFamily: fontSemiBold(),
    fontSize: 11,
    lineHeight: 18,
    flex: 1,
  },
  footerOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
  },
  footerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  footerContent: {
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  footerText: {
    fontFamily: fontSemiBold(),
    fontSize: 17,
    lineHeight: 32,
    textAlign: 'center',
  },
  footerNote: {
    fontFamily: fontRegular(),
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 22,
  },
});
