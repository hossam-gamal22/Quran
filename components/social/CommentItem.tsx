// components/social/CommentItem.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TextInput,
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
  type ReportReason,
  type StoryComment,
  type StoryReply,
} from '@/lib/story-interactions';
import { getDisplayName } from '@/lib/firebase-user';
import { MAX_COMMENT_LENGTH } from '@/lib/profanity-filter';

interface Props {
  storyId: string;
  comment: StoryComment;
  isOwn: boolean;
  currentUserId: string;
  displayName: string | null;
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

export function CommentItem({ storyId, comment, isOwn, currentUserId, displayName, onDeleted }: Props) {
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

  const createdMs = comment.createdAt?.toMillis?.() || Date.now();
  const relative = formatRelativeTime(createdMs, lang);
  const direction = /^[؀-ۿ]/.test(comment.text) ? 'rtl' : 'ltr';

  const handleReport = useCallback(
    async (reason: ReportReason) => {
      setReporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const res = await reportComment(storyId, comment.id, reason);
      setReporting(false);
      setMenuOpen(false);
      if (res.ok) setReported(true);
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
    const res = await addReply(storyId, comment.id, replyText);
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
  }, [replyText, storyId, comment.id, submittingReply, loadRepliesNow]);

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
        <View
          style={[
            styles.repliesThread,
            isRTL ? { paddingRight: 36, paddingLeft: 0 } : { paddingLeft: 36, paddingRight: 0 },
          ]}
        >
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
                backgroundColor: colors.isDarkMode ? '#1a222a' : '#ffffff',
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
                style={[styles.menuRow, { borderColor }]}
              >
                {deleting ? (
                  <ActivityIndicator color="#ef4444" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                    <Text style={[styles.menuRowText, { color: '#ef4444' }]}>
                      {t('social.deleteComment')}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : (
              <>
                {REPORT_REASONS.map((r) => (
                  <Pressable
                    key={r.key}
                    onPress={() => handleReport(r.key)}
                    disabled={reporting}
                    style={[styles.menuRow, { borderColor }]}
                  >
                    <Text style={[styles.menuRowText, { color: colors.text }]}>{t(r.labelKey)}</Text>
                  </Pressable>
                ))}
                {reporting && (
                  <View style={{ marginTop: 8 }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                )}
              </>
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
  const cardBg = colors.isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const borderColor = colors.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  const handleReport = useCallback(
    async (reason: ReportReason) => {
      setReporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const res = await reportReply(storyId, commentId, reply.id, reason);
      setReporting(false);
      setMenuOpen(false);
      if (res.ok) setReported(true);
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
              { backgroundColor: colors.isDarkMode ? '#1a222a' : '#ffffff', borderColor },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.menuTitle, { color: colors.text }]}>
              {isOwn ? t('social.actions') : t('social.reportReason')}
            </Text>
            {isOwn ? (
              <Pressable onPress={handleDelete} disabled={deleting} style={[styles.menuRow, { borderColor }]}>
                {deleting ? (
                  <ActivityIndicator color="#ef4444" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                    <Text style={[styles.menuRowText, { color: '#ef4444' }]}>
                      {t('social.deleteReply')}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : (
              <>
                {REPORT_REASONS.map((r) => (
                  <Pressable
                    key={r.key}
                    onPress={() => handleReport(r.key)}
                    disabled={reporting}
                    style={[styles.menuRow, { borderColor }]}
                  >
                    <Text style={[styles.menuRowText, { color: colors.text }]}>{t(r.labelKey)}</Text>
                  </Pressable>
                ))}
                {reporting && (
                  <View style={{ marginTop: 8 }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                )}
              </>
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

  // Replies thread
  repliesThread: { marginTop: 6, gap: 6 },
  replyCard: {
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    marginBottom: 6,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  replyBody: { flex: 1, minWidth: 0 },
  replyHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 6,
  },
  replyName: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  replyTime: { fontSize: 10 },
  replyText: { fontSize: 13, lineHeight: 19 },

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
  menuClose: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  menuCloseText: { fontSize: 14, fontWeight: '600' },
});
