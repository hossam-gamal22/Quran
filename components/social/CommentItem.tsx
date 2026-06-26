// components/social/CommentItem.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getLanguage } from '@/lib/i18n';
import {
  reportComment,
  deleteOwnComment,
  fetchReplies,
  addReply,
  deleteOwnReply,
  reportReply,
  hasUserLikedComment,
  toggleCommentLike,
  fetchCommentLikers,
  type ReportReason,
  type StoryComment,
  type StoryReply,
  type CommentLiker,
} from '@/lib/story-interactions';
import { getDisplayName } from '@/lib/firebase-user';
import { MAX_COMMENT_LENGTH } from '@/lib/profanity-filter';

interface Props {
  storyId: string;
  comment: StoryComment;
  isOwn: boolean;
  currentUserId: string;
  displayName: string | null;
  storyTitle?: string;
  onDeleted?: () => void;
}

const REPORT_REASONS: { key: ReportReason; labelKey: string }[] = [
  { key: 'inappropriate', labelKey: 'social.reportInappropriate' },
  { key: 'sectarian', labelKey: 'social.reportSectarian' },
  { key: 'misinformation', labelKey: 'social.reportMisinformation' },
  { key: 'spam', labelKey: 'social.reportSpam' },
  { key: 'harassment', labelKey: 'social.reportHarassment' },
  { key: 'other', labelKey: 'social.reportOther' },
];

const ACCENT = '#0d8e62';

const formatRelativeTime = (ms: number, lang: string): string => {
  const diff = Date.now() - ms;
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return lang === 'ar' ? 'الآن' : 'now';
  if (diff < hr) {
    const n = Math.floor(diff / min);
    return lang === 'ar' ? `منذ ${n} د` : `${n}m ago`;
  }
  if (diff < day) {
    const n = Math.floor(diff / hr);
    return lang === 'ar' ? `منذ ${n} س` : `${n}h ago`;
  }
  if (diff < 7 * day) {
    const n = Math.floor(diff / day);
    return lang === 'ar' ? `منذ ${n} ي` : `${n}d ago`;
  }
  const d = new Date(ms);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const PALETTE = ['#0d8e62', '#1e88e5', '#7b1fa2', '#d84315', '#5d4037', '#00838f', '#8e24aa', '#3949ab', '#6d4c41', '#ad1457'];
const stringToColor = (s: string): string => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

// Shared report UI: clear reason cards, plus a free-text note when "other" is
// chosen (the note is stored on the report doc for admins to read). Remounted
// fresh each time the menu opens (parent keys it on `menuOpen`).
function ReportMenuContent({
  colors,
  isRTL,
  reporting,
  onReport,
}: {
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  reporting: boolean;
  onReport: (reason: ReportReason, note?: string) => void;
}) {
  const [noteMode, setNoteMode] = useState(false);
  const [noteText, setNoteText] = useState('');
  const rowBg = colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const rowBorder = colors.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (noteMode) {
    return (
      <View style={{ gap: 10 }}>
        <View
          style={[
            styles.noteInputRow,
            {
              backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderColor: ACCENT,
            },
          ]}
        >
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder={t('social.reportNotePlaceholder')}
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={500}
            autoFocus
            style={[styles.noteInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
          />
        </View>
        <Pressable
          onPress={() => onReport('other', noteText.trim() || undefined)}
          disabled={reporting}
          style={[styles.menuRow, { borderColor: ACCENT, backgroundColor: ACCENT, justifyContent: 'center' }]}
        >
          {reporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.menuRowText, { color: '#fff', flex: 0, textAlign: 'center' }]}>
              {t('social.reportSend')}
            </Text>
          )}
        </Pressable>
        <Pressable onPress={() => setNoteMode(false)} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ color: colors.textLight, fontSize: 13, fontWeight: '600' }}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      {REPORT_REASONS.map((r) => (
        <Pressable
          key={r.key}
          onPress={() => (r.key === 'other' ? setNoteMode(true) : onReport(r.key))}
          disabled={reporting}
          style={[
            styles.menuRow,
            { borderColor: rowBorder, flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: rowBg },
          ]}
        >
          <MaterialCommunityIcons name="flag-outline" size={18} color={colors.textLight} />
          <Text style={[styles.menuRowText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {t(r.labelKey)}
          </Text>
        </Pressable>
      ))}
      {reporting && (
        <View style={{ marginTop: 8 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </>
  );
}

export function CommentItem({ storyId, comment, isOwn, currentUserId, displayName, storyTitle, onDeleted }: Props) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const lang = getLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Replies state
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replies, setReplies] = useState<StoryReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(comment.replyCount || 0);
  const [replyInputOpen, setReplyInputOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Keep local replyCount in sync if the parent stream updates the comment
  useEffect(() => {
    setReplyCount(comment.replyCount || 0);
  }, [comment.replyCount]);

  // Likes state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [likersOpen, setLikersOpen] = useState(false);
  const [likers, setLikers] = useState<CommentLiker[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const likePending = useRef(false);

  useEffect(() => {
    setLikeCount(comment.likeCount || 0);
  }, [comment.likeCount]);

  useEffect(() => {
    let mounted = true;
    hasUserLikedComment(storyId, comment.id).then((v) => {
      if (mounted) setLiked(v);
    });
    return () => {
      mounted = false;
    };
  }, [storyId, comment.id]);

  const handleLike = useCallback(async () => {
    if (likePending.current) return;
    likePending.current = true;
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const res = await toggleCommentLike(storyId, comment.id, {
        authorUserId: comment.userId,
        storyTitle,
        commentText: comment.text,
      });
      if (res.liked !== next) {
        setLiked(res.liked);
        setLikeCount((n) => Math.max(0, n + (res.liked ? 1 : -1) - (next ? 1 : -1)));
      }
    } catch {
      // revert on failure
      setLiked(!next);
      setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)));
    } finally {
      likePending.current = false;
    }
  }, [liked, storyId, comment.id, comment.userId, comment.text, storyTitle]);

  const openLikers = useCallback(async () => {
    Haptics.selectionAsync().catch(() => {});
    setLikersOpen(true);
    setLikersLoading(true);
    const list = await fetchCommentLikers(storyId, comment.id);
    setLikers(list);
    setLikersLoading(false);
  }, [storyId, comment.id]);

  const createdMs = comment.createdAt?.toMillis?.() || Date.now();
  const relative = formatRelativeTime(createdMs, lang);
  const direction = /^[؀-ۿ]/.test(comment.text) ? 'rtl' : 'ltr';

  const handleReport = useCallback(
    async (reason: ReportReason, note?: string) => {
      setReporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const res = await reportComment(storyId, comment.id, reason, note);
      setReporting(false);
      setMenuOpen(false);
      if (res.ok) {
        setReported(true);
        Alert.alert(t('social.reportConfirmTitle'), t('social.reportedThanks'));
      }
    },
    [storyId, comment.id],
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const ok = await deleteOwnComment(storyId, comment.id);
    setDeleting(false);
    setMenuOpen(false);
    if (ok && onDeleted) onDeleted();
  }, [storyId, comment.id, onDeleted]);

  const loadRepliesNow = useCallback(async () => {
    setLoadingReplies(true);
    const list = await fetchReplies(storyId, comment.id);
    setReplies(list);
    setLoadingReplies(false);
  }, [storyId, comment.id]);

  const toggleReplies = useCallback(async () => {
    Haptics.selectionAsync().catch(() => {});
    if (!repliesOpen) {
      setRepliesOpen(true);
      if (!replies.length && replyCount > 0) {
        await loadRepliesNow();
      }
    } else {
      setRepliesOpen(false);
    }
  }, [repliesOpen, replies.length, replyCount, loadRepliesNow]);

  const startReply = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setReplyInputOpen(true);
    if (!repliesOpen) setRepliesOpen(true);
  }, [repliesOpen]);

  const handleSubmitReply = useCallback(async () => {
    if (submittingReply || !replyText.trim()) return;
    setSubmittingReply(true);
    setReplyError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const res = await addReply(storyId, comment.id, replyText, storyTitle);
    setSubmittingReply(false);
    if (res.ok) {
      setReplyText('');
      setReplyInputOpen(false);
      setReplyCount((n) => n + 1);
      // Refresh list so the new reply shows immediately
      await loadRepliesNow();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }
    switch (res.reason) {
      case 'no_display_name':
        setReplyError(t('social.errorNoName'));
        break;
      case 'banned':
        setReplyError(t('social.errorBanned'));
        break;
      case 'profanity':
        setReplyError(t('social.errorProfanity'));
        break;
      case 'too_long':
        setReplyError(t('social.errorTooLong'));
        break;
      case 'empty':
      case 'too_short':
        setReplyError(t('social.errorEmpty'));
        break;
      default:
        setReplyError(t('social.errorNetwork'));
    }
  }, [replyText, storyId, comment.id, submittingReply, loadRepliesNow, storyTitle]);

  const handleReplyDeleted = useCallback(async (replyId: string) => {
    const ok = await deleteOwnReply(storyId, comment.id, replyId);
    if (ok) {
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      setReplyCount((n) => Math.max(0, n - 1));
    }
  }, [storyId, comment.id]);

  const avatarColor = stringToColor(comment.userId || comment.displayName || 'x');
  const initial = (comment.displayName || '?').trim().charAt(0).toUpperCase();
  const cardBg = colors.isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';
  const borderColor = colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.body}>
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {comment.displayName}
            </Text>
            <Text style={[styles.time, { color: colors.textLight }]}>{relative}</Text>
          </View>

          <Text
            style={[
              styles.text,
              {
                color: colors.text,
                textAlign: direction === 'rtl' ? 'right' : 'left',
                writingDirection: direction as any,
              },
            ]}
          >
            {comment.text}
          </Text>

          {reported && (
            <Text style={[styles.reportedNote, { color: colors.textLight }]}>
              {t('social.reportedThanks')}
            </Text>
          )}

          {/* Reply actions row */}
          <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable onPress={handleLike} hitSlop={6} style={styles.actionBtn}>
              <MaterialCommunityIcons
                name={liked ? 'heart' : 'heart-outline'}
                size={15}
                color={liked ? '#ef4444' : colors.textLight}
              />
              <Text style={[styles.actionText, { color: liked ? '#ef4444' : colors.textLight }]}>
                {t('social.like')}
              </Text>
            </Pressable>
            {likeCount > 0 && (
              <Pressable onPress={openLikers} hitSlop={6} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: colors.textLight, textDecorationLine: 'underline' }]}>
                  {likeCount}
                </Text>
              </Pressable>
            )}
            <Pressable onPress={startReply} hitSlop={6} style={styles.actionBtn}>
              <MaterialCommunityIcons name="reply-outline" size={14} color={ACCENT} />
              <Text style={[styles.actionText, { color: ACCENT }]}>{t('social.reply')}</Text>
            </Pressable>
            {replyCount > 0 && (
              <Pressable onPress={toggleReplies} hitSlop={6} style={styles.actionBtn}>
                <MaterialCommunityIcons
                  name={repliesOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textLight}
                />
                <Text style={[styles.actionText, { color: colors.textLight }]}>
                  {repliesOpen
                    ? t('social.hideReplies')
                    : t('social.showReplies').replace('{count}', String(replyCount))}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={8}
          style={styles.menuBtn}
          accessibilityLabel={t('social.moreActions')}
        >
          <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.textLight} />
        </Pressable>
      </View>

      {/* Replies thread */}
      {repliesOpen && (
        <View style={styles.repliesThread}>
          {loadingReplies && (
            <View style={{ paddingVertical: 10 }}>
              <ActivityIndicator color={ACCENT} size="small" />
            </View>
          )}

          {!loadingReplies &&
            replies.map((r) => (
              <ReplyItem
                key={r.id}
                storyId={storyId}
                commentId={comment.id}
                reply={r}
                isOwn={!!currentUserId && r.userId === currentUserId}
                onDelete={() => handleReplyDeleted(r.id)}
              />
            ))}

          {replyInputOpen && (
            <View style={styles.replyInputWrap}>
              {!displayName ? (
                <Text style={[styles.replyError, { color: '#ef4444' }]}>{t('social.errorNoName')}</Text>
              ) : (
                <>
                  <View
                    style={[
                      styles.replyInputRow,
                      {
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                        backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: ACCENT,
                      },
                    ]}
                  >
                    <TextInput
                      value={replyText}
                      onChangeText={(v) => {
                        setReplyText(v.slice(0, MAX_COMMENT_LENGTH));
                        if (replyError) setReplyError(null);
                      }}
                      placeholder={t('social.writeReplyAs').replace('{name}', displayName)}
                      placeholderTextColor={colors.textLight}
                      multiline
                      maxLength={MAX_COMMENT_LENGTH}
                      style={[
                        styles.replyInput,
                        { color: colors.text, textAlign: isRTL ? 'right' : 'left' },
                      ]}
                      autoFocus
                    />
                    <Pressable
                      onPress={handleSubmitReply}
                      disabled={submittingReply || !replyText.trim()}
                      style={[
                        styles.replySendBtn,
                        {
                          backgroundColor: replyText.trim() ? ACCENT : 'rgba(120,120,120,0.25)',
                        },
                      ]}
                    >
                      {submittingReply ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <MaterialCommunityIcons name="send" size={16} color="#fff" />
                      )}
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => {
                      setReplyInputOpen(false);
                      setReplyText('');
                      setReplyError(null);
                    }}
                    hitSlop={6}
                    style={{ alignSelf: isRTL ? 'flex-end' : 'flex-start', paddingHorizontal: 4 }}
                  >
                    <Text style={[styles.cancelReplyText, { color: colors.textLight }]}>
                      {t('common.cancel')}
                    </Text>
                  </Pressable>
                </>
              )}
              {!!replyError && (
                <Text style={[styles.replyError, { color: '#ef4444' }]}>{replyError}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Comment-level action menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[
              styles.menuCard,
              {
                backgroundColor: colors.modalSurface,
                borderColor,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.menuTitle, { color: colors.text }]}>
              {isOwn ? t('social.actions') : t('social.reportReason')}
            </Text>

            {isOwn ? (
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={[styles.menuRow, { borderColor, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'center' }]}
              >
                {deleting ? (
                  <ActivityIndicator color="#ef4444" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                    <Text style={[styles.menuRowText, { color: '#ef4444', flex: 0, textAlign: 'center' }]}>
                      {t('social.deleteComment')}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : (
              <ReportMenuContent
                key={String(menuOpen)}
                colors={colors}
                isRTL={isRTL}
                reporting={reporting}
                onReport={handleReport}
              />
            )}

            <Pressable
              onPress={() => setMenuOpen(false)}
              style={[styles.menuClose, { borderColor }]}
            >
              <Text style={[styles.menuCloseText, { color: colors.textLight }]}>
                {t('common.close')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Likers list */}
      <Modal
        visible={likersOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLikersOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setLikersOpen(false)}>
          <Pressable
            style={[styles.menuCard, { backgroundColor: colors.modalSurface, borderColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.likersTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="heart" size={18} color="#ef4444" />
              <Text style={[styles.menuTitle, { color: colors.text, marginBottom: 0 }]}>
                {t('social.likedByTitle')}
              </Text>
            </View>

            {likersLoading ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color={ACCENT} />
              </View>
            ) : likers.length === 0 ? (
              <Text style={[styles.likersEmpty, { color: colors.textLight }]}>
                {t('social.likesEmpty')}
              </Text>
            ) : (
              <View style={{ maxHeight: 320 }}>
                {likers.map((l) => (
                  <View
                    key={l.userId}
                    style={[styles.likerRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderColor }]}
                  >
                    <View style={[styles.likerAvatar, { backgroundColor: stringToColor(l.userId || l.displayName || 'x') }]}>
                      <Text style={styles.likerInitial}>
                        {(l.displayName || '?').trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[styles.likerName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
                      numberOfLines={1}
                    >
                      {l.displayName || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable onPress={() => setLikersOpen(false)} style={[styles.menuClose, { borderColor }]}>
              <Text style={[styles.menuCloseText, { color: colors.textLight }]}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ==================== Reply Item ====================

function ReplyItem({
  storyId,
  commentId,
  reply,
  isOwn,
  onDelete,
}: {
  storyId: string;
  commentId: string;
  reply: StoryReply;
  isOwn: boolean;
  onDelete: () => void;
}) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const lang = getLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const createdMs = reply.createdAt?.toMillis?.() || Date.now();
  const relative = formatRelativeTime(createdMs, lang);
  const direction = /^[؀-ۿ]/.test(reply.text) ? 'rtl' : 'ltr';
  const avatarColor = stringToColor(reply.userId || reply.displayName || 'x');
  const initial = (reply.displayName || '?').trim().charAt(0).toUpperCase();
  // Replies share the main comment's footprint but sit on a darker fill so the
  // thread hierarchy still reads at a glance.
  const cardBg = colors.isDarkMode ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.06)';
  const borderColor = colors.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  const handleReport = useCallback(
    async (reason: ReportReason, note?: string) => {
      setReporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const res = await reportReply(storyId, commentId, reply.id, reason, note);
      setReporting(false);
      setMenuOpen(false);
      if (res.ok) {
        setReported(true);
        Alert.alert(t('social.reportConfirmTitle'), t('social.reportedThanks'));
      }
    },
    [storyId, commentId, reply.id],
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setMenuOpen(false);
    await onDelete();
    setDeleting(false);
  }, [onDelete]);

  return (
    <View
      style={[
        styles.replyCard,
        {
          backgroundColor: cardBg,
          borderColor,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <View style={[styles.replyAvatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.replyAvatarText}>{initial}</Text>
      </View>

      <View style={styles.replyBody}>
        <View style={[styles.replyHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.replyName, { color: colors.text }]} numberOfLines={1}>
            {reply.displayName}
          </Text>
          <Text style={[styles.replyTime, { color: colors.textLight }]}>{relative}</Text>
        </View>
        <Text
          style={[
            styles.replyText,
            {
              color: colors.text,
              textAlign: direction === 'rtl' ? 'right' : 'left',
              writingDirection: direction as any,
            },
          ]}
        >
          {reply.text}
        </Text>
        {reported && (
          <Text style={[styles.reportedNote, { color: colors.textLight }]}>
            {t('social.reportedThanks')}
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => setMenuOpen(true)}
        hitSlop={8}
        style={styles.menuBtn}
        accessibilityLabel={t('social.moreActions')}
      >
        <MaterialCommunityIcons name="dots-vertical" size={16} color={colors.textLight} />
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[
              styles.menuCard,
              { backgroundColor: colors.modalSurface, borderColor },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.menuTitle, { color: colors.text }]}>
              {isOwn ? t('social.actions') : t('social.reportReason')}
            </Text>
            {isOwn ? (
              <Pressable onPress={handleDelete} disabled={deleting} style={[styles.menuRow, { borderColor, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'center' }]}>
                {deleting ? (
                  <ActivityIndicator color="#ef4444" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                    <Text style={[styles.menuRowText, { color: '#ef4444', flex: 0, textAlign: 'center' }]}>
                      {t('social.deleteReply')}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : (
              <ReportMenuContent
                key={String(menuOpen)}
                colors={colors}
                isRTL={isRTL}
                reporting={reporting}
                onReport={handleReport}
              />
            )}
            <Pressable
              onPress={() => setMenuOpen(false)}
              style={[styles.menuClose, { borderColor }]}
            >
              <Text style={[styles.menuCloseText, { color: colors.textLight }]}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  card: {
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  body: { flex: 1, minWidth: 0 },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  name: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  time: { fontSize: 11 },
  text: { fontSize: 14, lineHeight: 21 },
  reportedNote: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  actionsRow: { alignItems: 'center', gap: 14, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, fontWeight: '600' },
  menuBtn: { padding: 4 },

  // Replies thread — same footprint as the main comment card, darker fill.
  repliesThread: { marginTop: 8, gap: 8 },
  replyCard: {
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    marginBottom: 0,
  },
  replyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  replyBody: { flex: 1, minWidth: 0 },
  replyHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  replyName: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  replyTime: { fontSize: 11 },
  replyText: { fontSize: 14, lineHeight: 21 },

  // Reply input
  replyInputWrap: { marginTop: 4, gap: 6 },
  replyInputRow: {
    alignItems: 'flex-end',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 6,
  },
  replyInput: {
    flex: 1,
    minHeight: 32,
    maxHeight: 90,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  replySendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelReplyText: { fontSize: 11, fontWeight: '600', paddingVertical: 2 },
  replyError: { fontSize: 11, paddingHorizontal: 4 },

  // Menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  menuCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  menuRowText: { fontSize: 14, fontWeight: '600', textAlign: 'center', flex: 1 },
  noteInputRow: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteInput: {
    minHeight: 70,
    maxHeight: 140,
    fontSize: 14,
    paddingVertical: 4,
  },
  likersTitleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  likersEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  likerRow: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  likerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likerInitial: { color: '#fff', fontSize: 13, fontWeight: '700' },
  likerName: { fontSize: 14, fontWeight: '600', flex: 1 },
  menuClose: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  menuCloseText: { fontSize: 14, fontWeight: '600' },
});
