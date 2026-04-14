// app/question-answer.tsx
// صفحة سؤال وجواب من إذاعة القرآن الكريم من القاهرة - روح المسلم
// البيانات مخزنة محلياً في ملف JSON - متاحة فوراً بدون إنترنت

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Platform,
  ScrollView,
  InteractionManager,
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
  const listRef = useRef<FlatList<QAItem>>(null);
  const itemLayoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (isRTL) {
        tabsScrollRef.current?.scrollToEnd({ animated: false });
      } else {
        tabsScrollRef.current?.scrollTo({ x: 0, animated: false });
      }
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [isRTL]);

  const handleCategoryChange = useCallback((key: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(key);
    setExpandedItems(new Set());
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => {
            const y = itemLayoutsRef.current[id] ?? 0;
            listRef.current?.scrollToOffset({ offset: Math.max(0, y - 32), animated: true });
          });
        });
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
      marginTop: Spacing.sm,
      marginBottom: Spacing.md,
      overflow: 'visible',
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
      lineHeight: 32,
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr',
      flex: 1,
      paddingTop: 4,
      paddingBottom: 4,
    };

    const answerContainerStyle: ViewStyle = {
      marginTop: Spacing.lg,
      paddingTop: Spacing.sm,
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
      lineHeight: 30,
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr',
      flex: 1,
      paddingTop: 4,
      paddingBottom: 4,
    };
    
    return (
      <Pressable
        onPress={() => toggleExpanded(item.id)}
        onLayout={(event) => {
          itemLayoutsRef.current[item.id] = event.nativeEvent.layout.y;
        }}
        style={({ pressed }) => [
          cardStyle,
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: BorderRadius.lg, overflow: 'hidden' },
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
        </View>
        <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.md }}>
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  };

  const tabsRowStyle: ViewStyle = {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  };

  const chipStyle: ViewStyle = {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const chipTextStyle: TextStyle = {
    fontFamily: fontSemiBold(),
    fontSize: colors.fs(FONT_SIZES.sm),
    lineHeight: colors.fs(FONT_SIZES.sm) * 1.5,
    textAlign: 'center',
    writingDirection: isRTL ? 'rtl' : 'ltr',
    includeFontPadding: false,
    textAlignVertical: 'center',
  };

  const listContentStyle: ViewStyle = {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
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
          style={{ flexGrow: 0 }}
          onContentSizeChange={() => {
            if (isRTL) {
              tabsScrollRef.current?.scrollToEnd({ animated: false });
            }
          }}
        >
          <View style={tabsRowStyle}>
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategoryChange(cat.id)}
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
          ref={listRef}
          key={selectedCategory}
          data={qaItems}
          renderItem={renderQAItem}
          keyExtractor={item => item.id}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<View style={{ height: Spacing.md }} />}
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
