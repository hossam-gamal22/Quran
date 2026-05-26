// components/social/StoryInteractionBar.tsx
// Compact like + comment pills. Icon + count only, aligned to the start edge
// in RTL/LTR. Small footprint so it sits naturally under the audio.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';
import {
  hasUserLiked,
  subscribeToInteractionCounts,
  toggleLike,
  type InteractionCounts,
} from '@/lib/story-interactions';
import type { StorySection } from '@/lib/story-id';
import { CommentsSheet } from './CommentsSheet';

interface Props {
  storyId: string;
  section: StorySection;
  storyTitle?: string;
}

const LIKE_COLOR = '#ef4444';

const formatCount = (n: number): string => {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
};

export function StoryInteractionBar({ storyId, section, storyTitle }: Props) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const [counts, setCounts] = useState<InteractionCounts>({ likeCount: 0, commentCount: 0 });
  const [liked, setLiked] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pendingLike = useRef(false);

  useEffect(() => {
    let mounted = true;
    hasUserLiked(storyId).then((v) => {
      if (mounted) setLiked(v);
    });
    return () => {
      mounted = false;
    };
  }, [storyId]);

  useEffect(() => {
    const unsub = subscribeToInteractionCounts(storyId, setCounts);
    return () => unsub();
  }, [storyId]);

  const handleLike = useCallback(async () => {
    if (pendingLike.current) return;
    pendingLike.current = true;
    const next = !liked;
    setLiked(next);
    setCounts((prev) => ({
      ...prev,
      likeCount: Math.max(0, prev.likeCount + (next ? 1 : -1)),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const result = await toggleLike(storyId, section);
      if (result.liked !== next) setLiked(result.liked);
    } catch (err) {
      console.warn('[StoryInteractionBar] like failed:', err);
      setLiked(liked);
      setCounts((prev) => ({
        ...prev,
        likeCount: Math.max(0, prev.likeCount + (next ? -1 : 1)),
      }));
    } finally {
      pendingLike.current = false;
    }
  }, [liked, storyId, section]);

  const openComments = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setSheetOpen(true);
  }, []);

  const pillBg = colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const pillBorder = colors.isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const likedBg = colors.isDarkMode ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.08)';
  const likedBorder = 'rgba(239,68,68,0.40)';

  return (
    <>
      <View
        style={[
          styles.row,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: isRTL ? 'flex-start' : 'flex-end',
          },
        ]}
      >
        <Pressable
          onPress={handleLike}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={liked ? t('social.unlike') : t('social.like')}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: liked ? likedBg : pillBg,
              borderColor: liked ? likedBorder : pillBorder,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={liked ? 'heart' : 'heart-outline'}
            size={18}
            color={liked ? LIKE_COLOR : colors.text}
          />
          <Text style={[styles.count, { color: colors.text }]}>
            {formatCount(counts.likeCount)}
          </Text>
        </Pressable>

        <Pressable
          onPress={openComments}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('social.comments')}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: pillBg,
              borderColor: pillBorder,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name="comment-outline" size={18} color={colors.text} />
          <Text style={[styles.count, { color: colors.text }]}>
            {formatCount(counts.commentCount)}
          </Text>
        </Pressable>
      </View>

      <CommentsSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        storyId={storyId}
        section={section}
        storyTitle={storyTitle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: 8,
    marginTop: -4,
    marginBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 32,
  },
  count: {
    fontWeight: '600',
    fontSize: 13,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif-medium' },
    }),
  },
});
