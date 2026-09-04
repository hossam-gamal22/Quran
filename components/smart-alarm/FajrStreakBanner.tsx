import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fontBold, fontMedium, fontSemiBold } from '@/lib/fonts';
import { uiText } from '@/lib/ui-text';
import { getHistoricalFajrTimes } from '@/lib/worship-storage';

/**
 * Small motivational banner shown in the alarm ring screen — fetches the
 * user's Fajr completions over the last 7 days and shows a count + tailored
 * message. Designed for dark backgrounds (white text).
 */
export function FajrStreakBanner() {
  const [count, setCount] = useState<number | null>(null);
  const total = 7;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const records = await getHistoricalFajrTimes(total);
        const prayedCount = records.filter(
          (r) => r.status === 'prayed' || r.status === 'late',
        ).length;
        if (!cancelled) setCount(prayedCount);
      } catch {
        if (!cancelled) setCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  const message =
    count === 0
      ? uiText({
          ar: 'كل فجر فرصة جديدة — ابدأ اليوم',
          en: 'Every Fajr is a fresh start — begin today',
        })
      : count <= 3
        ? uiText({
            ar: 'تقدم جميل — استمر',
            en: "You're on the path — keep going",
          })
        : count <= 5
          ? uiText({
              ar: 'الالتزام يصنع الفارق',
              en: 'Consistency is making the difference',
            })
          : count === 6
            ? uiText({
                ar: 'كاد أسبوعك يكتمل — لا تفوّت اليوم',
                en: "You're one away from a full week — don't miss today",
              })
            : uiText({
                ar: '٧ من ٧ — أسبوع مبارك',
                en: '7 of 7 — a blessed week',
              });

  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="star-crescent" size={20} color="#FFD27A" />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.countLine}>
          {uiText({ ar: `صلّيت ${count} من ${total} صلوات فجر هذا الأسبوع`, en: `You prayed ${count} of ${total} Fajr prayers this week` })}
        </Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,210,122,0.16)',
  },
  textCol: { flex: 1, gap: 2 },
  countLine: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#FFFFFF',
    textAlign: 'right',
  },
  message: {
    fontSize: 12,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'right',
  },
});
