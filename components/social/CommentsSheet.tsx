// components/social/CommentsSheet.tsx
// Bottom-sheet style modal listing comments + an input row.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';
import {
  addComment,
  fetchFirstCommentsPage,
  fetchNextCommentsPage,
  isUserBanned,
  subscribeToFirstCommentsPage,
  subscribeToInteractionCounts,
  type StoryComment,
  type UserBan,
} from '@/lib/story-interactions';
import { getDisplayName, getUserId } from '@/lib/firebase-user';
import { MAX_COMMENT_LENGTH } from '@/lib/profanity-filter';
import type { StorySection } from '@/lib/story-id';
import { CommentItem } from './CommentItem';

interface Props {
  visible: boolean;
  onClose: () => void;
  storyId: string;
  section: StorySection;
  storyTitle?: string;
}

const ACCENT = '#0d8e62';

const formatTotalCount = (n: number): string => {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${Math.round(n / 1000)}K`;
};

export function CommentsSheet({ visible, onClose, storyId, section, storyTitle }: Props) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const router = useRouter();
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<any>(null);
  const hasMoreRef = useRef(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [ban, setBan] = useState<UserBan | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setComments([]);
    setText('');
    setError(null);
    setLoadingInitial(true);
    cursorRef.current = null;
    hasMoreRef.current = false;

    (async () => {
      const [name, userId, banStatus, page] = await Promise.all([
        getDisplayName(),
        getUserId(),
        isUserBanned(),
        fetchFirstCommentsPage(storyId),
      ]);
      setDisplayName(name);
      setCurrentUserId(userId);
      setBan(banStatus);
      setComments(page.comments);
      cursorRef.current = page.lastDoc;
      hasMoreRef.current = page.hasMore;
      setLoadingInitial(false);
    })();

    const unsubComments = subscribeToFirstCommentsPage(storyId, (latest) => {
      setComments((prev) => {
        if (!prev.length) return latest;
        const oldestNewMs = latest[latest.length - 1]?.createdAt?.toMillis?.() || 0;
        const oldestNewId = latest[latest.length - 1]?.id;
        const tail = prev.filter((c) => {
          const ms = c.createdAt?.toMillis?.() || 0;
          if (oldestNewMs && ms < oldestNewMs) return true;
          return !latest.some((l) => l.id === c.id) && c.id !== oldestNewId;
        });
        return [...latest, ...tail];
      });
    });

    const unsubCounts = subscribeToInteractionCounts(storyId, (counts) => {
      setTotalCount(counts.commentCount);
    });

    return () => {
      unsubComments();
      unsubCounts();
    };
  }, [visible, storyId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMoreRef.current || !cursorRef.current) return;
    setLoadingMore(true);
    const page = await fetchNextCommentsPage(storyId, cursorRef.current);
    setComments((prev) => {
      const seen = new Set(prev.map((c) => c.id));
      return [...prev, ...page.comments.filter((c) => !seen.has(c.id))];
    });
    cursorRef.current = page.lastDoc;
    hasMoreRef.current = page.hasMore;
    setLoadingMore(false);
  }, [storyId, loadingMore]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const res = await addComment(storyId, section, text);
    setSubmitting(false);
    if (res.ok) {
      setText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }
    switch (res.reason) {
      case 'no_display_name':
        setError(t('social.errorNoName'));
        break;
      case 'banned':
        setError(t('social.errorBanned'));
        isUserBanned().then(setBan);
        break;
      case 'profanity':
        setError(t('social.errorProfanity'));
        break;
      case 'too_long':
        setError(t('social.errorTooLong'));
        break;
      case 'too_short':
      case 'empty':
        setError(t('social.errorEmpty'));
        break;
      case 'network':
      default:
        setError(t('social.errorNetwork'));
    }
  }, [text, storyId, section, submitting]);

  const canSubmit = useMemo(() => {
    return !!displayName && !ban && text.trim().length > 0 && text.length <= MAX_COMMENT_LENGTH;
  }, [displayName, ban, text]);

  const sheetBg = colors.isDarkMode ? '#0d1419' : '#ffffff';
  const borderColor = colors.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const inputBg = colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorderActive = ACCENT;
  const charLeft = MAX_COMMENT_LENGTH - text.length;

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: borderColor }]}>
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {t('social.comments')}
            </Text>
            {totalCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: ACCENT }]}>
                <Text style={styles.countBadgeText}>{formatTotalCount(totalCount)}</Text>
              </View>
            )}
          </View>
          {!!storyTitle && (
            <Text style={[styles.subtitle, { color: colors.textLight }]} numberOfLines={1}>
              {storyTitle}
            </Text>
          )}
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={[styles.closeBtn, { backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
        >
          <MaterialCommunityIcons name="close" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );

  const renderBanner = () => {
    if (ban) {
      return (
        <View style={[styles.banner, { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.30)' }]}>
          <MaterialCommunityIcons name="account-cancel-outline" size={18} color="#ef4444" />
          <Text style={[styles.bannerText, { color: '#ef4444', flex: 1 }]}>
            {ban.bannedUntil
              ? t('social.bannedUntil').replace('{date}', formatBanDate(ban.bannedUntil.toMillis()))
              : t('social.bannedPermanent')}
            {ban.reason ? ` — ${ban.reason}` : ''}
          </Text>
        </View>
      );
    }
    if (!displayName) {
      return (
        <Pressable
          onPress={() => {
            onClose();
            router.navigate('/(tabs)/settings' as any);
          }}
          style={[
            styles.banner,
            {
              backgroundColor: 'rgba(13,142,98,0.12)',
              borderColor: 'rgba(13,142,98,0.40)',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={[styles.bannerIcon, { backgroundColor: ACCENT }]}>
            <MaterialCommunityIcons name="account-edit-outline" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.bannerTitle, { color: ACCENT }]}>
              {t('social.setNameToComment')}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={isRTL ? 'chevron-left' : 'chevron-right'}
            size={22}
            color={ACCENT}
          />
        </Pressable>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (loadingInitial) {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: colors.isDarkMode ? 'rgba(13,142,98,0.16)' : 'rgba(13,142,98,0.10)' },
          ]}
        >
          <MaterialCommunityIcons name="comment-text-outline" size={42} color={ACCENT} />
        </View>
        <Text style={[styles.emptyText, { color: colors.text }]}>{t('social.noComments')}</Text>
        <Text style={[styles.emptyHint, { color: colors.textLight }]}>{t('social.beFirst')}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheet, { backgroundColor: sheetBg }]}
        >
          <View style={styles.grabber} />
          {renderHeader()}
          {renderBanner()}

          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <CommentItem
                storyId={storyId}
                comment={item}
                isOwn={!!currentUserId && item.userId === currentUserId}
                currentUserId={currentUserId}
                displayName={displayName}
                onDeleted={() => setComments((prev) => prev.filter((c) => c.id !== item.id))}
              />
            )}
            contentContainerStyle={{ padding: 14, paddingBottom: 12, flexGrow: 1 }}
            ListEmptyComponent={renderEmpty}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 14 }}>
                  <ActivityIndicator color={ACCENT} />
                </View>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
          />

          {!ban && !!displayName && (
            <View style={[styles.inputWrap, { borderTopColor: borderColor, backgroundColor: sheetBg }]}>
              <View
                style={[
                  styles.inputAuthor,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View style={[styles.authorAvatar, { backgroundColor: ACCENT }]}>
                  <Text style={styles.authorInitial}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                {text.length > 0 && (
                  <Text
                    style={[
                      styles.charCounter,
                      { color: charLeft < 50 ? '#ef4444' : colors.textLight },
                    ]}
                  >
                    {charLeft}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.inputBar,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    backgroundColor: inputBg,
                    borderColor: inputFocused ? inputBorderActive : borderColor,
                  },
                ]}
              >
                <TextInput
                  value={text}
                  onChangeText={(v) => {
                    setText(v.slice(0, MAX_COMMENT_LENGTH));
                    if (error) setError(null);
                  }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder={t('social.writeCommentAs').replace('{name}', displayName)}
                  placeholderTextColor={colors.textLight}
                  multiline
                  maxLength={MAX_COMMENT_LENGTH}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                />
                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit || submitting}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    {
                      backgroundColor: canSubmit ? ACCENT : 'rgba(120,120,120,0.25)',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('social.send')}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <MaterialCommunityIcons name="send" size={20} color="#fff" />
                  )}
                </Pressable>
              </View>

              {!!error && (
                <View
                  style={[
                    styles.errorWrap,
                    {
                      backgroundColor: 'rgba(239,68,68,0.10)',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#ef4444" />
                  <Text style={styles.errorText} numberOfLines={2}>
                    {error}
                  </Text>
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const formatBanDate = (ms: number): string => {
  try {
    const d = new Date(ms);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    height: '85%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { alignItems: 'center', gap: 12 },
  titleRow: { alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '700' },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 3 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    marginHorizontal: 14,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerText: { fontSize: 13, fontWeight: '600' },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: { fontSize: 16, fontWeight: '700' },
  emptyHint: { fontSize: 13 },
  inputWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
  },
  inputAuthor: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  authorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: { color: '#fff', fontSize: 12, fontWeight: '700' },
  authorName: { fontSize: 12, fontWeight: '600', flex: 1 },
  charCounter: { fontSize: 11, fontWeight: '600' },
  inputBar: {
    alignItems: 'flex-end',
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorText: { color: '#ef4444', fontSize: 12, flex: 1 },
});
