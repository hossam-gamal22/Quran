// hooks/use-favorite.ts
// هوك للتعامل مع المحفوظات

import { useState, useEffect, useCallback } from 'react';
import {
  isFavorited,
  toggleFavorite,
  type FavoriteItem,
  type FavoriteType,
} from '@/lib/favorites-manager';
import * as Haptics from 'expo-haptics';

export function useFavorite(id: string, type: FavoriteType, itemBuilder: () => Omit<FavoriteItem, 'savedAt'>) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    isFavorited(id, type).then(setSaved);
  }, [id, type]);

  const toggle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowSaved = await toggleFavorite(itemBuilder());
    setSaved(nowSaved);
  }, [itemBuilder]);

  return { saved, toggle };
}
