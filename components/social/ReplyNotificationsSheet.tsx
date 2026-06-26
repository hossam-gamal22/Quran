// components/social/ReplyNotificationsSheet.tsx
// Bottom-sheet listing "someone replied to your comment" notifications.
// A notification is marked read when the user taps it (opening the story's
// comments); the header's check-all button marks everything read at once.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getLanguage } from '@/lib/i18n';
import { parseStoryId, type StorySection } from '@/lib/story-id';
import {
  fetchRecentReplyNotifications,
  markReplyNotificationsRead,
  type ReplyNotification,
} from '@/lib/comment-notifications';
import { CommentsSheet } from './CommentsSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onRead?: () => void;
}

const ACCENT = '#0d8e62';
const PALETTE = ['#0d8e62', '#1e88e5', '#7b1fa2', '#d84315', '#5d4037', '#00838f', '#8e24aa', '#3949ab'];
const colorFor = (s: string): string => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

const relTime = (ms: number, lang: string): string => {
  const diff = Date.now() - ms;
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return lang === 'ar' ? 'الآن' : 'now';
  if (diff < hr) return lang === 'ar' ? `منذ ${Math.floor(diff / min)} د` : `${Math.floor(diff / min)}m`;
  if (diff < day) return lang === 'ar' ? `منذ ${Math.floor(diff / hr)} س` : `${Math.floor(diff / hr)}h`;
  return lang === 'ar' ? `منذ ${Math.floor(diff / day)} ي` : `${Math.floor(diff / day)}d`;
};

export function ReplyNotificationsSheet({ visible, onClose, userId, onRead }: Props) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const lang = getLanguage();
  const [items, setItems] = useState<ReplyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ storyId: string; section: StorySection; title: string } | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const list = await fetchRecentReplyNotifications(userId);
      if (cancelled) return;
      setItems(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  const markRead = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      setItems((prev) => (prev.some((n) => ids.includes(n.id) && !n.read)
        ? prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
        : prev));
      markReplyNotificationsRead(ids)
        .then(() => onRead?.())
        .catch(() => {});
    },
    [onRead],
  );

  const openNotification = useCallback((n: ReplyNotification) => {
    Haptics.selectionAsync().catch(() => {});
    if (!n.read) markRead([n.id]);
    const parsed = parseStoryId(n.storyId);
    if (!parsed) return;
    setSelected({ storyId: n.storyId, section: parsed.section, title: n.storyTitle });
  }, [markRead]);

  const unreadIds = items.filter((n) => !n.read).map((n) => n.id);

  const markAllRead = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    markRead(unreadIds);
  }, [markRead, unreadIds]);

  const sheetBg = colors.modalSurface;
  const borderColor = colors.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const renderEmpty = () => {
    if (loading) {
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
            styles.emptyIcon,
            { backgroundColor: colors.isDarkMode ? 'rgba(13,142,98,0.16)' : 'rgba(13,142,98,0.10)' },
          ]}
        >
          <MaterialCommunityIcons name="bell-outline" size={42} color={ACCENT} />
        </View>
        <Text style={[styles.emptyText, { color: colors.text }]}>{t('social.notifEmpty')}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: ReplyNotification }) => {
    const avatarColor = colorFor(item.fromName || 'x');
    const initial = (item.fromName || '?').trim().charAt(0).toUpperCase();
    const createdMs = item.createdAt?.toMillis?.() || Date.now();
    return (
      <Pressable
        onPress={() => openNotification(item)}
        style={({ pressed }) => [
          styles.row,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            backgroundColor: item.read
              ? colors.isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
              : colors.isDarkMode ? 'rgba(13,142,98,0.12)' : 'rgba(13,142,98,0.08)',
            borderColor,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.body}>
          <Text
            style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
            numberOfLines={2}
          >
            {t(item.type === 'like' ? 'social.likeNotifOne' : 'social.replyNotifOne').replace(
              '{name}',
              item.fromName || '',
            )}
          </Text>
          {!!item.storyTitle && (
            <Text
              style={[styles.sub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={1}
            >
              {item.storyTitle}
            </Text>
          )}
          {!!item.replyText && (
            <Text
              style={[styles.snippet, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={2}
            >
              “{item.replyText}”
            </Text>
          )}
          <Text style={[styles.time, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
            {relTime(createdMs, lang)}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
        <MaterialCommunityIcons
          name={isRTL ? 'chevron-left' : 'chevron-right'}
          size={22}
          color={colors.textLight}
        />
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: sheetBg, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.grabber} />
          <View style={[styles.header, { borderBottomColor: borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('social.notifTitle')}</Text>
            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {unreadIds.length > 0 && (
                <Pressable
                  onPress={markAllRead}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t('social.notifMarkAllRead')}
                  style={[styles.closeBtn, { backgroundColor: colors.isDarkMode ? 'rgba(13,142,98,0.18)' : 'rgba(13,142,98,0.10)' }]}
                >
                  <MaterialCommunityIcons name="check-all" size={20} color={ACCENT} />
                </Pressable>
              )}
              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={[styles.closeBtn, { backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <FlatList
            data={items}
            keyExtractor={(n) => n.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 14, gap: 8, flexGrow: 1 }}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      {selected && (
        <CommentsSheet
          visible={!!selected}
          onClose={() => setSelected(null)}
          storyId={selected.storyId}
          section={selected.section}
          storyTitle={selected.title}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { height: '80%', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { alignItems: 'center', gap: 8 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row: {
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, fontWeight: '600' },
  snippet: { fontSize: 13, fontStyle: 'italic' },
  time: { fontSize: 11, marginTop: 2 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: ACCENT },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 14 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, fontWeight: '700' },
});
