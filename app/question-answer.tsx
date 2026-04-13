// app/question-answer.tsx
// صفحة سؤال وجواب من إذاعة القرآن الكريم من القاهرة - روح المسلم
// البيانات مخزنة محلياً في ملف JSON - متاحة فوراً بدون إنترنت

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Platform,
  ScrollView,
  Dimensions,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { Spacing, BorderRadius, FONT_SIZES } from '@/constants/theme';
import { BannerAdComponent } from '@/components/ads/BannerAd';

// البيانات المخزنة محلياً
import qaData from '@/data/json/qa-data.json';

// ========================================
// الألوان والثوابت
// ========================================

const ACCENT = '#0d8e62';
const ACCENT_LIGHT = 'rgba(6,79,47,0.12)';
const SCREEN_WIDTH = Dimensions.get('window').width;

// ========================================
// أنواع البيانات
// ========================================

interface Category {
  id: string;
  name: string;
  image: string;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
  audioUrl?: string;
}

// ========================================
// المكون الرئيسي
// ========================================

export default function QuestionAnswerScreen() {
  const colors = useColors();
  const isRTL = useIsRTL();
  const { isDarkMode } = useSettings();

  // البيانات من الملف المخزن - جاهزة فوراً
  const categories = useMemo(() => qaData.categories as Category[], []);
  const allItems = useMemo(() => qaData.items as Record<string, QAItem[]>, []);

  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.id ?? '');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const qaItems = selectedCategory ? (allItems[selectedCategory] ?? []) : [];

  const tabsScrollRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});
  const scrollContentWidthRef = useRef(0);
  const flatListRef = useRef<FlatList>(null);

  const handleCategoryChange = useCallback((key: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(key);
    setExpandedItems(new Set());

    // Scroll list back to top
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });

    // Scroll to make the selected tab fully visible
    const layout = tabLayoutsRef.current[key];
    if (layout && tabsScrollRef.current && scrollContentWidthRef.current > 0) {
      if (isRTL) {
        const mirroredX = scrollContentWidthRef.current - layout.x - layout.width;
        const centeredX = mirroredX - (SCREEN_WIDTH - layout.width) / 2;
        tabsScrollRef.current.scrollTo({ x: Math.max(0, centeredX), animated: true });
      } else {
        const centeredX = layout.x - (SCREEN_WIDTH - layout.width) / 2;
        tabsScrollRef.current.scrollTo({ x: Math.max(0, centeredX), animated: true });
      }
    }
  }, [isRTL]);

  const toggleExpanded = useCallback((id: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // تصيير عنصر سؤال وجواب
  const renderQAItem = useCallback(({ item }: { item: QAItem }) => {
    const isExpanded = expandedItems.has(item.id);
    
    const cardStyle: ViewStyle = {
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      marginBottom: Spacing.md,
      overflow: 'hidden',
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    };

    const questionRowStyle: ViewStyle = {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    };

    const questionIconStyle: ViewStyle = {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: ACCENT_LIGHT,
    };

    const questionTextStyle: TextStyle = {
      fontFamily: fontSemiBold(),
      fontSize: colors.fs(FONT_SIZES.md),
      lineHeight: 26,
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr',
      flex: 1,
    };

    const answerContainerStyle: ViewStyle = {
      marginTop: Spacing.sm,
    };

    const dividerStyle: ViewStyle = {
      height: 1,
      marginVertical: Spacing.md,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    };

    const answerRowStyle: ViewStyle = {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    };

    const answerIconStyle: ViewStyle = {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: ACCENT_LIGHT,
    };

    const answerTextStyle: TextStyle = {
      fontFamily: fontRegular(),
      fontSize: colors.fs(FONT_SIZES.sm),
      lineHeight: 24,
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr',
      flex: 1,
    };
    
    return (
      <Pressable
        onPress={() => toggleExpanded(item.id)}
        style={({ pressed }) => [
          cardStyle,
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        {Platform.OS === 'ios' && (
          <BlurView
           
            intensity={80}
            tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' },
          ]}
        />
        <View style={{ padding: Spacing.md }}>
        {/* السؤال */}
        <View style={questionRowStyle}>
          <View style={questionIconStyle}>
            <MaterialCommunityIcons name="help-circle" size={20} color={ACCENT} />
          </View>
          <Text style={questionTextStyle}>
            {item.question.trim()}
          </Text>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textLight}
            style={{ marginStart: 8 }}
          />
        </View>

        {/* الجواب */}
        {isExpanded && (
          <View style={answerContainerStyle}>
            <View style={dividerStyle} />
            
            <View style={answerRowStyle}>
              <View style={answerIconStyle}>
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
              </View>
              <Text style={answerTextStyle}>
                {item.answer.trim()}
              </Text>
            </View>
          </View>
        )}
        </View>
      </Pressable>
    );
  }, [colors, isDarkMode, isRTL, expandedItems, toggleExpanded]);

  const tabsContainerStyle: ViewStyle = {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  };

  const chipsContainerStyle: ViewStyle = {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: Spacing.sm,
  };

  const chipStyle: ViewStyle = {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexShrink: 0,
  };

  const chipTextStyle: TextStyle = {
    fontFamily: fontSemiBold(),
    fontSize: colors.fs(FONT_SIZES.sm),
    lineHeight: colors.fs(FONT_SIZES.sm) * 1.6,
    includeFontPadding: false,
    textAlignVertical: 'center',
  };

  const listContentStyle: ViewStyle = {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  };

  const emptyTextStyle: TextStyle = {
    fontFamily: fontMedium(),
    fontSize: colors.fs(FONT_SIZES.md),
    marginTop: Spacing.md,
    textAlign: 'center',
    color: colors.textLight,
    lineHeight: 28,
    includeFontPadding: false,
  };

  const footerStyle: ViewStyle = {
    paddingTop: Spacing.lg,
  };

  return (
    <ScreenContainer>
      <UniversalHeader title={t('questionAnswer.title')} showBack />

      {/* التبويبات */}
      {categories.length > 0 && (
        <ScrollView
          ref={tabsScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tabsContainerStyle}
          onContentSizeChange={(w) => { scrollContentWidthRef.current = w; }}
          style={[{ flexGrow: 0, zIndex: 10 }, isRTL && { transform: [{ scaleX: -1 }] }]}
        >
          <View style={[chipsContainerStyle, isRTL && { transform: [{ scaleX: -1 }] }]}>
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategoryChange(cat.id)}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    tabLayoutsRef.current[cat.id] = { x, width };
                  }}
                  style={[
                    chipStyle,
                    {
                      backgroundColor: isSelected ? ACCENT : 'transparent',
                      borderColor: isSelected ? ACCENT : (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                    },
                  ]}
                >
                  {!isSelected && Platform.OS === 'ios' && (
                    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: BorderRadius.full }]}>
                      <BlurView
                       
                        intensity={20}
                        tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                  )}
                  {!isSelected && (
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)', borderRadius: BorderRadius.full },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      chipTextStyle,
                      {
                        color: isSelected ? '#fff' : colors.text,
                      },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* المحتوى */}
      {qaItems.length === 0 ? (
        <View style={centerContainerStyle}>
          <MaterialCommunityIcons name="help-box" size={48} color={colors.textLight} />
          <Text style={emptyTextStyle}>
            {t('questionAnswer.noQuestions')}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={qaItems}
          extraData={selectedCategory}
          renderItem={renderQAItem}
          keyExtractor={item => item.id}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={footerStyle}>
              <BannerAdComponent screen="home" />
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

// ========================================
// الأنماط الثابتة
// ========================================

const centerContainerStyle: ViewStyle = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: Spacing.xl,
};
