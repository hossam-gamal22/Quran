// app/question-answer.tsx
// صفحة سؤال وجواب - روح المسلم
// البيانات من Firestore مع كاش محلي وفولباك على JSON

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
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/hooks/use-auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, getLanguage } from '@/lib/i18n';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { Spacing, BorderRadius, FONT_SIZES } from '@/constants/theme';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { fetchQAContent, subscribeToQAContent, filterVisibleContent } from '@/lib/qa-content-api';
import { submitQuestion, checkRateLimit } from '@/lib/email-service';

// ========================================
// الألوان والثوابت
// ========================================

const ACCENT = '#0d8e62';
const ACCENT_LIGHT = 'rgba(6,79,47,0.12)';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isValidEmail = (email: string) => EMAIL_REGEX.test(email.trim());

// ========================================
// أنواع البيانات
// ========================================

interface FilteredCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
  isVisible: boolean;
  questions: FilteredQuestion[];
}

interface FilteredQuestion {
  id: string;
  question: string;
  answer: string;
  order: number;
  isVisible: boolean;
}

// ========================================
// المكون الرئيسي
// ========================================

export default function QuestionAnswerScreen() {
  const colors = useColors();
  const isRTL = useIsRTL();
  const { isDarkMode } = useSettings();
  const language = getLanguage();
  const { user } = useAuth({ autoFetch: true });
  const insets = useSafeAreaInsets();

  // البيانات من Firestore مع كاش
  const [categories, setCategories] = useState<FilteredCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // حالة نموذج السؤال
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const qaItems = useMemo(() => {
    const cat = categories.find(c => c.id === selectedCategory);
    return cat?.questions ?? [];
  }, [categories, selectedCategory]);

  const tabsScrollRef = useRef<ScrollView>(null);
  const listRef = useRef<FlatList<FilteredQuestion>>(null);
  const itemLayoutsRef = useRef<Record<string, number>>({});

  // تحميل البيانات من Firestore مع كاش
  useEffect(() => {
    let mounted = true;
    const selRef = { current: '' };

    fetchQAContent().then(data => {
      if (!mounted) return;
      const filtered = filterVisibleContent(data, language);
      setCategories(filtered);
      if (filtered.length > 0 && !selRef.current) {
        selRef.current = filtered[0].id;
        setSelectedCategory(filtered[0].id);
      }
      setIsLoading(false);
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    const unsubscribe = subscribeToQAContent((data) => {
      if (!mounted) return;
      const filtered = filterVisibleContent(data, language);
      setCategories(filtered);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [language]);

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

  // ========================================
  // إرسال سؤال
  // ========================================

  const handleSubmitQuestion = useCallback(async () => {
    if (!questionText.trim()) return;
    if (!userEmail.trim() || !isValidEmail(userEmail)) {
      Alert.alert(t('common.error'), 'البريد الإلكتروني مطلوب للرد على سؤالك');
      return;
    }

    const canSubmit = await checkRateLimit();
    if (!canSubmit) {
      Alert.alert(
        t('questionAnswer.rateLimitTitle'),
        t('questionAnswer.rateLimitBody')
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await submitQuestion({
        userName: userName.trim() || user?.name || '',
        userEmail: userEmail.trim(),
        question: questionText.trim(),
        language,
        registeredName: user?.name || '',
        userId: user?.id != null ? String(user.id) : '',
      });
      setShowQuestionModal(false);
      setQuestionText('');
      setUserName('');
      setUserEmail('');
      Alert.alert(
        t('questionAnswer.questionSent'),
        t('questionAnswer.questionSentBody')
      );
    } catch (e) {
      Alert.alert(t('common.error'), t('questionAnswer.submitError') || 'حدث خطأ أثناء إرسال السؤال. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  }, [questionText, userName, userEmail, language, user]);

  // تصيير عنصر سؤال وجواب
  const renderQAItem = useCallback(({ item }: { item: FilteredQuestion }) => {
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
    paddingBottom: 120,
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

  if (isLoading) {
    return (
      <ScreenContainer>
        <UniversalHeader title={t('questionAnswer.title')} showBack />
        <View style={centerContainerStyle}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={[emptyTextStyle, { color: colors.textLight }]}>
            {t('questionAnswer.loadingCategories')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <UniversalHeader
        title={t('questionAnswer.title')}
        showBack
        rightActions={[{
          icon: 'email-plus-outline',
          onPress: () => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowQuestionModal(true);
          },
        }]}
      />

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
        />
      )}

      {/* نموذج إرسال السؤال */}
      <Modal visible={showQuestionModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowQuestionModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1a2535' : '#fff', paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#fff' : '#1a1a1a' }]}>
              {t('questionAnswer.sendQuestion')}
            </Text>
            <Text style={styles.replyTime}>
              {t('questionAnswer.replyTime')}
            </Text>

            <TextInput
              placeholder={t('questionAnswer.namePlaceholder')}
              placeholderTextColor="#888"
              value={userName}
              onChangeText={setUserName}
              style={[styles.input, {
                backgroundColor: isDarkMode ? '#243044' : '#f5f5f5',
                color: isDarkMode ? '#fff' : '#1a1a1a',
                textAlign: isRTL ? 'right' : 'left',
              }]}
            />
            <TextInput
              placeholder={t('questionAnswer.emailPlaceholder') + ' *'}
              placeholderTextColor="#888"
              value={userEmail}
              onChangeText={setUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, {
                backgroundColor: isDarkMode ? '#243044' : '#f5f5f5',
                color: isDarkMode ? '#fff' : '#1a1a1a',
                textAlign: isRTL ? 'right' : 'left',
                borderColor: !isValidEmail(userEmail) && userEmail.length > 0 ? '#e74c3c' : 'transparent',
                borderWidth: 1,
              }]}
            />
            <TextInput
              placeholder={t('questionAnswer.questionPlaceholder')}
              placeholderTextColor="#888"
              value={questionText}
              onChangeText={(val) => setQuestionText(val.slice(0, 500))}
              multiline
              numberOfLines={5}
              style={[styles.input, styles.textArea, {
                backgroundColor: isDarkMode ? '#243044' : '#f5f5f5',
                color: isDarkMode ? '#fff' : '#1a1a1a',
                textAlign: isRTL ? 'right' : 'left',
              }]}
            />
            <Text style={[styles.charCount, { textAlign: isRTL ? 'left' : 'right' }]}>
              {questionText.length}/500
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.submitBtn,
                (isSubmitting || !questionText.trim() || !isValidEmail(userEmail)) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmitQuestion}
              disabled={isSubmitting || !questionText.trim() || !isValidEmail(userEmail)}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {t('questionAnswer.submitQuestion')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowQuestionModal(false)}
              style={{ paddingVertical: 12 }}
            >
              <Text style={styles.cancelText}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BannerAdComponent screen="home" />
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

const styles = StyleSheet.create({

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  replyTime: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#888',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: '#1B8A5A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 15,
  },
});
