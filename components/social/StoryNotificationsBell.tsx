// components/social/StoryNotificationsBell.tsx
// Self-contained notifications bell for story/seerah/companions page headers.
// Shows a red unread badge and opens the reply/like notifications center.
// Drop it into UniversalHeader via the `rightExtra` slot.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/use-colors';
import { t } from '@/lib/i18n';
import { getUserId } from '@/lib/firebase-user';
import { countUnreadReplyNotifications } from '@/lib/comment-notifications';
import { ReplyNotificationsSheet } from './ReplyNotificationsSheet';

const ACCENT = '#0d8e62';

export function StoryNotificationsBell({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const id = userId || (await getUserId());
    if (!userId && id) setUserId(id);
    if (!id) return;
    setUnread(await countUnreadReplyNotifications(id));
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const id = await getUserId();
      if (!mounted || !id) return;
      setUserId(id);
      setUnread(await countUnreadReplyNotifications(id));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const bellBg = colors.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  return (
    <>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setOpen(true);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t('social.notifTitle')}
        style={[styles.btn, { backgroundColor: bellBg }, style]}
      >
        <MaterialCommunityIcons
          name={unread > 0 ? 'bell-badge' : 'bell-outline'}
          size={22}
          color={unread > 0 ? ACCENT : colors.text}
        />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
          </View>
        )}
      </Pressable>

      <ReplyNotificationsSheet
        visible={open}
        onClose={() => {
          setOpen(false);
          refresh();
        }}
        userId={userId}
        onRead={refresh}
      />
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
