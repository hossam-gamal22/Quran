// app/question-answer.tsx
// صفحة سؤال وجواب من إذاعة القرآن الكريم من القاهرة - روح المسلم

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  UIManager,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ========================================
// الألوان والثوابت
// ========================================

const ACCENT = '#22C55E';
const ACCENT_LIGHT = 'rgba(6,79,47,0.12)';

// ========================================
// أنواع البيانات
// ========================================

interface Category {
  id: string;
  name: string;
  image: string;
  isPublished: boolean;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
  programeQandAId: string;
  mediaService?: {
    audioRef: string;
    durationInSec: number;
  };
  subjects: Array<{ id: string; name: string }>;
}

interface ApiResponse<T> {
  count: number;
  data: T[];
  isSuccess: boolean;
}

// ========================================
// API Functions
// ========================================

const API_BASE = 'https://API.misrquran.gov.eg/api';

async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${API_BASE}/ProgramQandAs/GetAll?ishome=false`);
    const data: ApiResponse<Category> = await response.json();
    if (data.isSuccess) {
      return data.data.filter(cat => cat.isPublished);
    }
    return [];
  } catch (error) {
    console.error('[Q&A] Error fetching categories:', error);
    return [];
  }
}

async function fetchQAByCategory(categoryId: string): Promise<QAItem[]> {
  try {
    const response = await fetch(
      `${API_BASE}/QuestionAndAnswers/GetByPublic?firstItemId=${categoryId}`
    );
    const data: ApiResponse<QAItem> = await response.json();
    if (data.isSuccess) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('[Q&A] Error fetching Q&A:', error);
    return [];
  }
}

// ========================================
// المكون الرئيسي
// ========================================

export default function QuestionAnswerScreen() {
  const colors = useColors();
  const isRTL = useIsRTL();
  const { isDarkMode } = useSettings();

  const [categories, setCategories] = useState<Category[]>([]);
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingQA, setLoadingQA] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تحميل التصنيفات عند التشغيل
  useEffect(() => {
    loadCategories();
  }, []);

  // تحميل الأسئلة عند تغيير التصنيف
  useEffect(() => {
    if (selectedCategory) {
      loadQA(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cats = await fetchCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategory(cats[0].id);
      }
    } catch (e) {
      setError(t('common.errorLoadContent'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQA = useCallback(async (categoryId: string) => {
    try {
      setLoadingQA(true);
      const items = await fetchQAByCategory(categoryId);
      setQaItems(items);
      setExpandedItems(new Set());
    } catch (e) {
      console.error('[Q&A] Error loading Q&A:', e);
    } finally {
      setLoadingQA(false);
    }
  }, []);

  const handleCategoryChange = useCallback((key: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(key);
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  // تحويل التصنيفات لتبويبات
  // ترتيب التصنيفات
  const displayCategories = categories;

  // تصيير عنصر سؤال وجواب
  const renderQAItem = useCallback(({ item }: { item: QAItem }) => {
    const isExpanded = expandedItems.has(item.id);
    
    const cardStyle: ViewStyle = {
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
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
      fontSize: FONT_SIZES.md,
      lineHeight: 26,
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left',
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

    const subjectsRowStyle: ViewStyle = {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    };

    const subjectTagStyle: ViewStyle = {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      backgroundColor: ACCENT_LIGHT,
    };

    const subjectTextStyle: TextStyle = {
      fontFamily: fontMedium(),
      fontSize: FONT_SIZES.xs,
      color: ACCENT,
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
      backgroundColor: 'rgba(46,125,50,0.12)',
    };

    const answerTextStyle: TextStyle = {
      fontFamily: fontRegular(),
      fontSize: FONT_SIZES.sm,
      lineHeight: 24,
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left',
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
            
            {/* المواضيع */}
            {item.subjects && item.subjects.length > 0 && (
              <View style={subjectsRowStyle}>
                {item.subjects.map(subject => (
                  <View key={subject.id} style={subjectTagStyle}>
                    <Text style={subjectTextStyle}>
                      {subject.name.trim()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            <View style={answerRowStyle}>
              <View style={answerIconStyle}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#2e7d32" />
              </View>
              <Text style={answerTextStyle}>
                {item.answer.trim()}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    );
  }, [colors, isDarkMode, isRTL, expandedItems, toggleExpanded]);

  // حالة التحميل
  if (loading) {
    return (
      <ScreenContainer>
        <UniversalHeader title={t('questionAnswer.title')} showBack />
        <View style={centerContainerStyle}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </ScreenContainer>
    );
  }

  // حالة الخطأ
  if (error) {
    const errorTextStyle: TextStyle = {
      fontFamily: fontMedium(),
      fontSize: FONT_SIZES.md,
      marginTop: Spacing.md,
      textAlign: 'center',
      color: colors.textLight,
    };

    const retryButtonStyle: ViewStyle = {
      marginTop: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: ACCENT,
    };

    const retryButtonTextStyle: TextStyle = {
      fontFamily: fontSemiBold(),
      fontSize: FONT_SIZES.md,
      color: '#fff',
    };

    return (
      <ScreenContainer>
        <UniversalHeader title={t('questionAnswer.title')} showBack />
        <View style={centerContainerStyle}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={colors.textLight} />
          <Text style={errorTextStyle}>{error}</Text>
          <Pressable onPress={loadCategories} style={retryButtonStyle}>
            <Text style={retryButtonTextStyle}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

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
  };

  const chipTextStyle: TextStyle = {
    fontFamily: fontSemiBold(),
    fontSize: FONT_SIZES.sm,
  };

  const listContentStyle: ViewStyle = {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  };

  const headerInfoStyle: ViewStyle = {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  };

  const headerTextStyle: TextStyle = {
    fontFamily: fontRegular(),
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
    opacity: 0.8,
    color: colors.textLight,
    textAlign: isRTL ? 'right' : 'left',
  };

  const emptyTextStyle: TextStyle = {
    fontFamily: fontMedium(),
    fontSize: FONT_SIZES.md,
    marginTop: Spacing.md,
    textAlign: 'center',
    color: colors.textLight,
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
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tabsContainerStyle}
          style={[{ flexGrow: 0 }, isRTL && { transform: [{ scaleX: -1 }] }]}
        >
          <View style={[chipsContainerStyle, isRTL && { transform: [{ scaleX: -1 }] }]}>
            {displayCategories.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategoryChange(cat.id)}
                  style={[
                    chipStyle,
                    {
                      backgroundColor: isSelected ? ACCENT : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                      borderColor: isSelected ? ACCENT : (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                    },
                  ]}
                >
                  <Text
                    style={[
                      chipTextStyle,
                      {
                        color: isSelected ? '#fff' : colors.text,
                      },
                    ]}
                    numberOfLines={1}
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
      {loadingQA ? (
        <View style={centerContainerStyle}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : qaItems.length === 0 ? (
        <View style={centerContainerStyle}>
          <MaterialCommunityIcons name="help-box" size={48} color={colors.textLight} />
          <Text style={emptyTextStyle}>
            {t('questionAnswer.noQuestions')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={qaItems}
          renderItem={renderQAItem}
          keyExtractor={item => item.id}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={headerInfoStyle}>
              <Text style={headerTextStyle}>
                {t('questionAnswer.description')}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={footerStyle}>
              <BannerAdComponent />
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
