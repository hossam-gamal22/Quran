// components/ui/SourcesList.tsx
// ============================================================================
// Renders the "Sources" section beneath religious stories, companion
// biographies, and Seerah sections. Citations are shown as a list, each
// optionally linking to sunnah.com / quran.com / dorar.net. When a source has
// a `note` (e.g. flagging ikhtilaf or a weak chain), the note appears
// underneath the reference in a smaller, muted color so users know the source
// is named but the underlying claim is contested.
//
// RTL: the whole panel mirrors when the active language is Arabic — header
// icon moves to the right of the title, bullets sit on the right of each
// item, and every text node carries explicit `textAlign` + `writingDirection`
// so iOS does not fall back to LTR rendering for mixed Arabic/Latin lines
// (hadith reference numbers, URLs, etc.).
// ============================================================================

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useColors } from '@/hooks/use-colors';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { getLanguage } from '@/lib/i18n';
import { Spacing } from '@/constants/theme';
import { openSourceLink, parseQuranUrl } from '@/lib/source-link-router';

export interface SourcesListItem {
  reference: string;
  url?: string;
  note?: string;
}

interface SourcesListProps {
  sources?: SourcesListItem[];
  title?: string;
  compact?: boolean;
}

const LABEL_AR = 'المصادر';
const LABEL_EN = 'Sources';

const RTL_LANGS = new Set(['ar', 'ur', 'fa']);

export function SourcesList({ sources, title, compact = false }: SourcesListProps) {
  const colors = useColors();
  const router = useRouter();
  const lang = getLanguage();
  const isRTL = RTL_LANGS.has(lang);
  if (!sources || sources.length === 0) return null;

  const headerLabel = title || (isRTL ? LABEL_AR : LABEL_EN);
  const muted = (colors as { textLight?: string; muted?: string; text: string }).textLight
    ?? (colors as { muted?: string; text: string }).muted
    ?? colors.text;
  const borderColor = (colors as { border?: string }).border ?? 'rgba(127,127,127,0.18)';
  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const writingDirection = isRTL ? 'rtl' : 'ltr';

  return (
    <View
      style={[
        styles.container,
        compact && styles.compactContainer,
        { backgroundColor: colors.card, borderColor },
      ]}
    >
      <View style={[styles.header, { flexDirection: rowDirection }]}>
        <MaterialCommunityIcons name="book-open-variant" size={18} color={colors.primary} />
        <Text
          style={[
            styles.headerText,
            { color: colors.text, fontFamily: fontBold(), textAlign, writingDirection },
          ]}
        >
          {headerLabel}
        </Text>
      </View>
      <View style={styles.list}>
        {sources.map((source, idx) => {
          const isLink = Boolean(source.url);
          const quranRef = source.url ? parseQuranUrl(source.url) : null;
          const inAppHintIcon = quranRef ? 'book-open-page-variant' : null;
          const content = (
            <View style={[styles.item, { flexDirection: rowDirection }]}>
              <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
              <View style={styles.itemBody}>
                <View style={[styles.referenceRow, { flexDirection: rowDirection }]}>
                  <Text
                    style={[
                      styles.reference,
                      {
                        color: isLink ? colors.primary : colors.text,
                        fontFamily: fontSemiBold(),
                        textDecorationLine: isLink ? 'underline' : 'none',
                        textAlign,
                        writingDirection,
                        flex: 1,
                      },
                    ]}
                    selectable
                  >
                    {source.reference}
                  </Text>
                  {inAppHintIcon ? (
                    <MaterialCommunityIcons
                      name={inAppHintIcon}
                      size={14}
                      color={colors.primary}
                      style={styles.inAppHint}
                    />
                  ) : null}
                </View>
                {source.note ? (
                  <Text
                    style={[
                      styles.note,
                      { color: muted, fontFamily: fontRegular(), textAlign, writingDirection },
                    ]}
                    selectable
                  >
                    {source.note}
                  </Text>
                ) : null}
              </View>
            </View>
          );
          if (isLink) {
            return (
              <Pressable
                key={idx}
                onPress={() => openSourceLink(source.url, router, { sourceReference: source.reference })}
                hitSlop={6}
                accessibilityRole="link"
                accessibilityLabel={source.reference}
              >
                {content}
              </Pressable>
            );
          }
          return <View key={idx}>{content}</View>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compactContainer: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  headerText: {
    fontSize: 15,
    flex: 1,
  },
  list: {
    gap: 6,
  },
  item: {
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 1,
  },
  itemBody: {
    flex: 1,
  },
  referenceRow: {
    alignItems: 'center',
    gap: 4,
  },
  reference: {
    fontSize: 14,
    lineHeight: 22,
  },
  inAppHint: {
    marginTop: 2,
    opacity: 0.85,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    opacity: 0.85,
  },
});

export default SourcesList;
