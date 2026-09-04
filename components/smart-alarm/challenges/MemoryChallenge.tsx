import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fontBold, fontMedium, fontSemiBold } from '@/lib/fonts';
import { uiText } from '@/lib/ui-text';
import type { Difficulty } from '@/lib/smart-alarm/types';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Card {
  id: number;
  iconKey: string;
  iconName: IconName;
  matched: boolean;
}

const ICON_POOL: { key: string; name: IconName; color: string }[] = [
  { key: 'mosque', name: 'mosque', color: '#FBBF24' },
  { key: 'star', name: 'star-crescent', color: '#A78BFA' },
  { key: 'book', name: 'book-open-variant', color: '#60A5FA' },
  { key: 'heart', name: 'heart', color: '#F472B6' },
  { key: 'leaf', name: 'leaf', color: '#34D399' },
  { key: 'sun', name: 'weather-sunny', color: '#FB923C' },
  { key: 'moon', name: 'weather-night', color: '#94A3B8' },
  { key: 'water', name: 'water', color: '#22D3EE' },
  { key: 'tree', name: 'tree', color: '#10B981' },
  { key: 'flower', name: 'flower', color: '#EC4899' },
  { key: 'cloud', name: 'weather-cloudy', color: '#9CA3AF' },
  { key: 'fire', name: 'fire', color: '#EF4444' },
  { key: 'feather', name: 'feather', color: '#DDD6FE' },
  { key: 'crown', name: 'crown', color: '#FACC15' },
  { key: 'compass', name: 'compass', color: '#06B6D4' },
];

function pairCountFor(d: Difficulty): number {
  switch (d) {
    case 'easy': return 3;
    case 'medium': return 4;
    case 'hard': return 6;
  }
}

function buildDeck(pairs: number): Card[] {
  const shuffledIcons = [...ICON_POOL].sort(() => Math.random() - 0.5).slice(0, pairs);
  const deck: Card[] = [];
  shuffledIcons.forEach((icon) => {
    deck.push({ id: deck.length, iconKey: icon.key, iconName: icon.name, matched: false });
    deck.push({ id: deck.length, iconKey: icon.key, iconName: icon.name, matched: false });
  });
  return deck.sort(() => Math.random() - 0.5);
}

const PEEK_MS = 2200;

interface MemoryChallengeProps {
  difficulty: Difficulty;
  onSolved: () => void;
}

export function MemoryChallenge({ difficulty, onSolved }: MemoryChallengeProps) {
  const pairs = pairCountFor(difficulty);
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(pairs));
  const [revealedAll, setRevealedAll] = useState(true);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);

  // Initial peek: show all cards face up for PEEK_MS, then hide
  useEffect(() => {
    const t = setTimeout(() => setRevealedAll(false), PEEK_MS);
    return () => clearTimeout(t);
  }, []);

  // Win condition
  useEffect(() => {
    if (matches === pairs && !revealedAll) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const t = setTimeout(() => onSolved(), 400);
      return () => clearTimeout(t);
    }
  }, [matches, pairs, revealedAll, onSolved]);

  const onTapCard = useCallback(
    (cardId: number) => {
      if (revealedAll) return;
      if (flipped.length >= 2) return;
      if (flipped.includes(cardId)) return;
      const card = deck.find((c) => c.id === cardId);
      if (!card || card.matched) return;

      Haptics.selectionAsync().catch(() => {});
      const nextFlipped = [...flipped, cardId];
      setFlipped(nextFlipped);

      if (nextFlipped.length === 2) {
        setMoves((m) => m + 1);
        const [aId, bId] = nextFlipped;
        const a = deck.find((c) => c.id === aId);
        const b = deck.find((c) => c.id === bId);
        if (a && b && a.iconKey === b.iconKey) {
          // Match
          setTimeout(() => {
            setDeck((d) => d.map((c) => (c.id === aId || c.id === bId ? { ...c, matched: true } : c)));
            setMatches((m) => m + 1);
            setFlipped([]);
          }, 350);
        } else {
          // Miss — flip back
          setTimeout(() => setFlipped([]), 700);
        }
      }
    },
    [deck, flipped, revealedAll],
  );

  const showFace = useCallback(
    (card: Card) => revealedAll || card.matched || flipped.includes(card.id),
    [revealedAll, flipped],
  );

  const cols = pairs <= 3 ? 3 : 4;

  return (
    <View style={styles.root}>
      <Text style={styles.label}>
        {revealedAll
          ? uiText({ ar: 'احفظ مواقع الأيقونات', en: 'Memorize the icons' })
          : uiText({ ar: 'طابق كل أيقونتين', en: 'Match each pair' })}
      </Text>

      <View style={styles.statsRow}>
        <Text style={styles.statText}>
          {uiText({ ar: 'مطابقات', en: 'Matches' })}: {matches} / {pairs}
        </Text>
        <Text style={styles.statText}>
          {uiText({ ar: 'محاولات', en: 'Moves' })}: {moves}
        </Text>
      </View>

      <View style={[styles.grid, { width: cols * 100 }]}>
        {deck.map((card) => {
          const face = showFace(card);
          const iconMeta = ICON_POOL.find((i) => i.key === card.iconKey);
          return (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.8}
              onPress={() => onTapCard(card.id)}
              style={[
                styles.card,
                face && styles.cardFace,
                card.matched && styles.cardMatched,
              ]}
            >
              {face && iconMeta ? (
                <MaterialCommunityIcons name={iconMeta.name} size={44} color={iconMeta.color} />
              ) : (
                <MaterialCommunityIcons name="help" size={38} color="rgba(255,255,255,0.5)" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', paddingVertical: 8 },
  label: {
    fontSize: 17,
    fontFamily: fontSemiBold(),
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 18,
  },
  statText: {
    fontSize: 13,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.75)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  card: {
    width: 90,
    height: 90,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFace: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.45)',
  },
  cardMatched: {
    backgroundColor: 'rgba(255,210,122,0.22)',
    borderColor: 'rgba(255,210,122,0.6)',
  },
});
