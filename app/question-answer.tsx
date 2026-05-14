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
  Linking,
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
import { InlineMrecAd } from '@/components/ads/InlineMrecAd';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';
import { fetchQAContent, subscribeToQAContent, filterVisibleContent } from '@/lib/qa-content-api';
import { submitQuestion, waitForAutoAnswer, type AutoAnswerResult } from '@/lib/email-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  sources?: AutoAnswerResult['sources'];
  status?: AutoAnswerResult['status'];
  relatedQuestion?: string;
}

const INITIAL_CHAT_MESSAGE: ChatMessage = {
  id: 'intro',
  role: 'assistant',
  text: 'السلام عليكم، اكتب سؤالك بأسلوبك الطبيعي. سأبحث في المصادر الموثوقة وأعرض لك أقرب إجابة مع الروابط.',
};
const CHAT_HISTORY_KEY = '@qa_assistant_chat_history';
const CHAT_CONVERSATIONS_KEY = '@qa_assistant_conversations';
const QA_ASSISTANT_COMPLETIONS_AD_KEY = '@qa_assistant_completions_for_ad';
const MAX_SAVED_CONVERSATIONS = 20;
const QA_INTERSTITIAL_EVERY_COMPLETIONS = 3;
const MAX_QUESTION_LENGTH = 2000;

interface SavedConversation {
  id: string;
  date: string;
  preview: string;
  messages: ChatMessage[];
}

function formatConversationDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'أمس';
    if (diff < 7) return `منذ ${diff} أيام`;
    return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getSourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function maybeShowQaCompletionAd(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QA_ASSISTANT_COMPLETIONS_AD_KEY);
    const count = (Number(raw) || 0) + 1;
    await AsyncStorage.setItem(QA_ASSISTANT_COMPLETIONS_AD_KEY, String(count));
    if (count % QA_INTERSTITIAL_EVERY_COMPLETIONS === 0) {
      await showInterstitial();
    }
  } catch {
    // Ads are best-effort and should never affect answering.
  }
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
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_CHAT_MESSAGE]);
  const [isChatHistoryLoaded, setIsChatHistoryLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);

  const qaItems = useMemo(() => {
    const cat = categories.find(c => c.id === selectedCategory);
    return cat?.questions ?? [];
  }, [categories, selectedCategory]);

  const tabsScrollRef = useRef<ScrollView>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const listRef = useRef<FlatList<FilteredQuestion>>(null);
  const itemLayoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(CHAT_HISTORY_KEY)
      .then((saved) => {
        if (!mounted) return;
        if (saved) {
          const parsed = JSON.parse(saved) as ChatMessage[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChatMessages(parsed);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setIsChatHistoryLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isChatHistoryLoaded) return;
    const trimmed = chatMessages.slice(-60);
    AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed)).catch(() => undefined);
  }, [chatMessages, isChatHistoryLoaded]);

  // Load saved conversations on mount
  useEffect(() => {
    AsyncStorage.getItem(CHAT_CONVERSATIONS_KEY)
      .then((data) => {
        if (data) {
          const parsed = JSON.parse(data) as SavedConversation[];
          if (Array.isArray(parsed)) setSavedConversations(parsed);
        }
      })
      .catch(() => undefined);
  }, []);

  const saveCurrentConversation = useCallback((messages: ChatMessage[]) => {
    const userMsgs = messages.filter((m) => m.role === 'user');
    if (userMsgs.length === 0) return;
    const preview = userMsgs[0].text.slice(0, 100);
    const conversation: SavedConversation = {
      id: String(Date.now()),
      date: new Date().toISOString(),
      preview,
      messages: messages.slice(-60),
    };
    setSavedConversations((prev) => {
      const updated = [conversation, ...prev].slice(0, MAX_SAVED_CONVERSATIONS);
      AsyncStorage.setItem(CHAT_CONVERSATIONS_KEY, JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, []);

  const loadConversation = useCallback((conversation: SavedConversation) => {
    setChatMessages(conversation.messages);
    setShowHistory(false);
    requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: false }));
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setSavedConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      AsyncStorage.setItem(CHAT_CONVERSATIONS_KEY, JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, []);

  const clearChatHistory = useCallback(() => {
    setChatMessages([INITIAL_CHAT_MESSAGE]);
    AsyncStorage.removeItem(CHAT_HISTORY_KEY).catch(() => undefined);
  }, []);

  const startNewChat = useCallback(() => {
    saveCurrentConversation(chatMessages);
    setChatQuestion('');
    setChatMessages([{
      ...INITIAL_CHAT_MESSAGE,
      id: `intro-${Date.now()}`,
    }]);
    AsyncStorage.removeItem(CHAT_HISTORY_KEY).catch(() => undefined);
    setShowHistory(false);
    requestAnimationFrame(() => chatScrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [chatMessages, saveCurrentConversation]);

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

  const openManualQuestion = useCallback((prefill = '') => {
    if (prefill.trim()) setQuestionText(prefill.trim().slice(0, MAX_QUESTION_LENGTH));
    setShowAssistantModal(false);
    setShowQuestionModal(true);
  }, []);

  const submitAssistantQuestion = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isAssistantThinking) return;

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (text === chatQuestion.trim()) setChatQuestion('');
    setIsAssistantThinking(true);
    setChatMessages(prev => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text },
    ]);

    try {
      const questionId = await submitQuestion({
        userName: user?.name || '',
        userEmail: '',
        question: text,
        language,
        registeredName: user?.name || '',
        userId: user?.id != null ? String(user.id) : '',
        requestMode: 'assistant',
        notifyByEmail: false,
        updateRateLimit: false,
      });

      const result = await waitForAutoAnswer(questionId, 28000);
      const fallbackText =
        'لم أتمكن من تجهيز رد فوري موثوق الآن. يمكنك إرسال السؤال لنا، وسنراجعه ونرد عليك بمصادر موثوقة خلال 48 ساعة إن شاء الله.';

      setChatMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: result?.answer || fallbackText,
          sources: result?.sources || [],
          status: result?.status,
          relatedQuestion: text,
        },
      ]);
      maybeShowQaCompletionAd();
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: 'حدث خطأ أثناء البحث. يمكنك إرسال السؤال لنا، وسنراجعه ونرد عليك بمصادر موثوقة خلال 48 ساعة إن شاء الله.',
          sources: [],
          status: 'failed',
          relatedQuestion: text,
        },
      ]);
    } finally {
      setIsAssistantThinking(false);
    }
  }, [chatQuestion, isAssistantThinking, language, user]);

  const handleAskAssistant = useCallback(() => {
    submitAssistantQuestion(chatQuestion);
  }, [chatQuestion, submitAssistantQuestion]);

  const getLastUserQuestion = useCallback(() => {
    for (let i = chatMessages.length - 1; i >= 0; i -= 1) {
      if (chatMessages[i].role === 'user') return chatMessages[i].text;
    }
    return '';
  }, [chatMessages]);

  // ========================================
  // إرسال سؤال
  // ========================================

  const handleSubmitQuestion = useCallback(async () => {
    if (!questionText.trim()) return;
    if (!userEmail.trim() || !isValidEmail(userEmail)) {
      Alert.alert(t('common.error'), 'البريد الإلكتروني مطلوب للرد على سؤالك');
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
        requestMode: 'manual',
        notifyByEmail: true,
        updateRateLimit: true,
      });
      setShowQuestionModal(false);
      setQuestionText('');
      setUserName('');
      setUserEmail('');
      Alert.alert(
        t('questionAnswer.questionSent'),
        'تم إرسال سؤالك. سنراجعه ونرد عليك بمصادر موثوقة خلال 48 ساعة إن شاء الله.'
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
        rightActions={[
          {
            icon: 'robot-outline',
            onPress: () => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAssistantModal(true);
            },
          },
          {
            icon: 'email-plus-outline',
            onPress: () => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openManualQuestion();
            },
          },
        ]}
      />

      <Pressable
        onPress={() => setShowAssistantModal(true)}
        style={({ pressed }) => [
          styles.assistantEntry,
          {
            backgroundColor: isDarkMode ? 'rgba(13,142,98,0.16)' : 'rgba(13,142,98,0.10)',
            borderColor: isDarkMode ? 'rgba(13,142,98,0.35)' : 'rgba(13,142,98,0.22)',
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={[styles.assistantEntryIcon, { backgroundColor: ACCENT }]}>
          <MaterialCommunityIcons name="robot-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.assistantEntryTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            اسأل المساعد الذكي
          </Text>
          <Text style={[styles.assistantEntrySub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
            رد فوري بالمصادر، وإن لم نجد إجابة نرسل سؤالك للمراجعة خلال 48 ساعة.
          </Text>
        </View>
        <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={colors.textLight} />
      </Pressable>

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
          ListFooterComponent={qaItems.length >= 4 ? <InlineMrecAd screen="question_answer" darkMode={isDarkMode} /> : null}
        />
      )}

      {/* نموذج إرسال السؤال */}
      <Modal visible={showAssistantModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.chatOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.chatPanel, { backgroundColor: isDarkMode ? '#172230' : '#fff', paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.chatHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.assistantEntryIcon, { backgroundColor: ACCENT }]}>
                <MaterialCommunityIcons name="robot-outline" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.chatTitle, { color: isDarkMode ? '#fff' : '#1a1a1a', textAlign: isRTL ? 'right' : 'left' }]}>
                  المساعد الذكي
                </Text>
                <Text style={[styles.chatSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  ردود فورية من أفضل المصادر الإسلامية
                </Text>
              </View>
              <TouchableOpacity onPress={startNewChat} style={styles.chatNewBtn}>
                <MaterialCommunityIcons name="message-plus-outline" size={18} color="#fff" />
                <Text style={styles.chatNewText}>جديد</Text>
              </TouchableOpacity>
              {savedConversations.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowHistory((h) => !h)}
                  style={[styles.chatCloseBtn, showHistory && { backgroundColor: ACCENT_LIGHT }]}
                >
                  <MaterialCommunityIcons name="history" size={22} color={showHistory ? ACCENT : (isDarkMode ? '#fff' : '#1a1a1a')} />
                </TouchableOpacity>
              )}
              {chatMessages.length > 1 && !showHistory && (
                <TouchableOpacity onPress={clearChatHistory} style={styles.chatCloseBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={21} color={isDarkMode ? '#fff' : '#1a1a1a'} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  saveCurrentConversation(chatMessages);
                  setShowAssistantModal(false);
                }}
                style={styles.chatCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={22} color={isDarkMode ? '#fff' : '#1a1a1a'} />
              </TouchableOpacity>
            </View>

            {showHistory ? (
              <ScrollView style={styles.chatMessages} showsVerticalScrollIndicator={false}>
                {savedConversations.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingTop: 40 }}>
                    <MaterialCommunityIcons name="history" size={48} color="#888" />
                    <Text style={[styles.chatSubtitle, { marginTop: 12, fontSize: 14 }]}>لا توجد محادثات محفوظة</Text>
                  </View>
                ) : (
                  savedConversations.map((conv) => (
                    <TouchableOpacity
                      key={conv.id}
                      onPress={() => loadConversation(conv)}
                      style={[styles.historyItem, { backgroundColor: isDarkMode ? '#243044' : '#f0f4f2' }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.historyDate, { color: ACCENT }]}>
                          {formatConversationDate(conv.date)}
                        </Text>
                        <Text
                          style={[styles.historyPreview, { color: isDarkMode ? '#fff' : '#1a1a1a', textAlign: isRTL ? 'right' : 'left' }]}
                          numberOfLines={2}
                        >
                          {conv.preview}
                        </Text>
                        <Text style={[styles.historyCount, { textAlign: isRTL ? 'right' : 'left' }]}>
                          {conv.messages.filter((m) => m.role === 'user').length} سؤال
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => deleteConversation(conv.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ paddingStart: 8 }}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#888" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            ) : (
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatMessages}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {chatMessages.map(message => {
                const isUserMessage = message.role === 'user';
                const showManualFallback = message.role === 'assistant' && message.status !== undefined && message.status !== 'answered';
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.chatBubble,
                      isUserMessage ? styles.userBubble : styles.assistantBubble,
                      {
                        backgroundColor: isUserMessage ? ACCENT : (isDarkMode ? '#243044' : '#f4f7f5'),
                        alignSelf: isUserMessage ? (isRTL ? 'flex-start' : 'flex-end') : (isRTL ? 'flex-end' : 'flex-start'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chatBubbleText,
                        {
                          color: isUserMessage ? '#fff' : (isDarkMode ? '#fff' : '#1a1a1a'),
                          textAlign: isRTL ? 'right' : 'left',
                          writingDirection: isRTL ? 'rtl' : 'ltr',
                        },
                      ]}
                    >
                      {message.text}
                    </Text>

                    {(message.sources?.length || 0) > 0 && (
                      <View style={styles.chatSources}>
                        <Text style={[styles.sourcesLabel, { textAlign: isRTL ? 'right' : 'left' }]}>المصادر:</Text>
                        {message.sources?.map((source, index) => (
                          <TouchableOpacity
                            key={`${source.url}-${index}`}
                            onPress={() => Linking.openURL(source.url)}
                            style={styles.chatSourceLink}
                          >
                            <Text style={[styles.chatSourceDomain, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                              {getSourceHost(source.url)}
                            </Text>
                            <Text style={[styles.chatSourceText, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                              {index + 1}. {source.title}
                            </Text>
                            {!!source.snippet && (
                              <Text style={[styles.chatSourceSnippet, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={3}>
                                {source.snippet}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {showManualFallback && (
                      <View style={styles.chatFallbackActions}>
                        <TouchableOpacity
                          onPress={() => submitAssistantQuestion(message.relatedQuestion || getLastUserQuestion())}
                          disabled={isAssistantThinking}
                          style={[styles.retrySearchBtn, isAssistantThinking && styles.submitBtnDisabled]}
                        >
                          <Text style={styles.retrySearchText}>إعادة البحث</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openManualQuestion(message.relatedQuestion || getLastUserQuestion())}
                          style={styles.manualFallbackBtn}
                        >
                          <Text style={styles.manualFallbackText}>إرسال للإدارة خلال 48 ساعة</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
              {isAssistantThinking && (
                <View style={[styles.chatBubble, styles.assistantBubble, { backgroundColor: isDarkMode ? '#243044' : '#f4f7f5', alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={[styles.chatSubtitle, { marginTop: 8 }]}>جاري البحث في المصادر...</Text>
                </View>
              )}
            </ScrollView>
            )}

            {!showHistory && (
              <>
                <View style={[styles.chatInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? '#243044' : '#f5f5f5' }]}>
                  <TextInput
                    value={chatQuestion}
                    onChangeText={(val) => setChatQuestion(val.slice(0, MAX_QUESTION_LENGTH))}
                    placeholder="اكتب سؤالك هنا..."
                    placeholderTextColor="#888"
                    multiline
                    style={[styles.chatInput, { color: isDarkMode ? '#fff' : '#1a1a1a', textAlign: isRTL ? 'right' : 'left' }]}
                  />
                  <TouchableOpacity
                    onPress={handleAskAssistant}
                    disabled={!chatQuestion.trim() || isAssistantThinking}
                    style={[styles.chatSendBtn, (!chatQuestion.trim() || isAssistantThinking) && styles.submitBtnDisabled]}
                  >
                    <MaterialCommunityIcons name={isRTL ? 'send' : 'send'} size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => openManualQuestion(chatQuestion || getLastUserQuestion())}
                  style={{ paddingTop: 10 }}
                >
                  <Text style={styles.cancelText}>أو أرسل السؤال لنا للرد خلال 48 ساعة بمصادر موثوقة</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
              onChangeText={(val) => setQuestionText(val.slice(0, MAX_QUESTION_LENGTH))}
              multiline
              numberOfLines={5}
              style={[styles.input, styles.textArea, {
                backgroundColor: isDarkMode ? '#243044' : '#f5f5f5',
                color: isDarkMode ? '#fff' : '#1a1a1a',
                textAlign: isRTL ? 'right' : 'left',
              }]}
            />
            <Text style={[styles.charCount, { textAlign: isRTL ? 'left' : 'right' }]}>
              {questionText.length}/{MAX_QUESTION_LENGTH}
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

      <BannerAdComponent screen="question_answer" />
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

  assistantEntry: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  assistantEntryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantEntryTitle: {
    fontFamily: fontSemiBold(),
    fontSize: 16,
    lineHeight: 24,
  },
  assistantEntrySub: {
    fontFamily: fontRegular(),
    fontSize: 12,
    lineHeight: 19,
    marginTop: 2,
  },
  chatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  chatPanel: {
    height: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  chatHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatSubtitle: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  chatCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatNewBtn: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 5,
  },
  chatNewText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  chatMessages: {
    flex: 1,
    marginVertical: 8,
  },
  chatBubble: {
    maxWidth: '86%',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  assistantBubble: {
    borderBottomStartRadius: 6,
  },
  userBubble: {
    borderBottomEndRadius: 6,
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 24,
  },
  chatSources: {
    marginTop: 10,
    gap: 8,
  },
  chatSourceLink: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(13,142,98,0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(13,142,98,0.25)',
  },
  chatSourceDomain: {
    color: ACCENT,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 3,
  },
  chatSourceText: {
    color: ACCENT,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  chatSourceSnippet: {
    color: '#8b96a6',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  chatFallbackActions: {
    marginTop: 12,
    gap: 8,
  },
  retrySearchBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(13,142,98,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(13,142,98,0.45)',
    alignItems: 'center',
  },
  retrySearchText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '700',
  },
  manualFallbackBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
  },
  manualFallbackText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  chatInputRow: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    maxHeight: 96,
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 6,
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
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
  historyItem: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  historyDate: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  historyPreview: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  historyCount: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    lineHeight: 17,
  },
  autoAnswerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 18,
  },
  autoAnswerCard: {
    borderRadius: 22,
    padding: 20,
    maxHeight: '88%',
  },
  autoAnswerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 14,
  },
  autoAnswerDisclaimer: {
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 14,
  },
  autoAnswerText: {
    fontSize: 15,
    lineHeight: 28,
  },
  sourcesLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 10,
    marginTop: 6,
  },
  sourcesBlock: {
    marginTop: 18,
    marginBottom: 16,
  },
  sourcesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sourceItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  sourceTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  sourceSnippet: {
    fontSize: 13,
    lineHeight: 21,
    marginTop: 6,
  },
  sourceUrl: {
    color: '#7a8a9a',
    fontSize: 12,
    marginTop: 6,
  },
});
