// app/temp-page/[id].tsx
// عرض صفحة مؤقتة — بلوكات أصلية أو HTML حسب نوع المحتوى

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchTempPageById, TempPage, TempPageBlock } from '@/lib/app-config-api';
import { t, getLanguage, isRTL } from '@/lib/i18n';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';

function BlockItem({ block, lang, colors, isRtl }: {
  block: TempPageBlock;
  lang: string;
  colors: ReturnType<typeof useColors>;
  isRtl: boolean;
}) {
  // Use translation for user's language, fallback to Arabic text
  const text = (lang !== 'ar' && block.translations?.[lang])
    ? block.translations[lang]
    : block.text;

  return (
    <View style={[styles.blockItem, {
      backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      flexDirection: isRtl ? 'row-reverse' : 'row',
    }]}>
      <View style={[styles.blockIcon, { backgroundColor: colors.primary + '20' }]}>
        <MaterialCommunityIcons
          name={block.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={22}
          color={colors.primary}
        />
      </View>
      <Text style={[styles.blockText, {
        color: colors.text,
        textAlign: isRtl ? 'right' : 'left',
        writingDirection: isRtl ? 'rtl' : 'ltr',
      }]}>
        {text}
      </Text>
    </View>
  );
}

export default function TempPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDarkMode } = useSettings();
  const colors = useColors();
  const [page, setPage] = useState<TempPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchTempPageById(id).then(p => {
      setPage(p);
      setLoading(false);
    });
  }, [id]);

  const bgColor = colors.background;
  const lang = getLanguage();
  const isAr = lang === 'ar';
  const isRtl = isRTL();
  const dir = isRtl ? 'rtl' : 'ltr';

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0d8e62" />
        </View>
      </ScreenContainer>
    );
  }

  if (!page) {
    return (
      <ScreenContainer>
        <View style={styles.loader}>
          <Text style={{ color: colors.text }}>
            {t('common.pageUnavailable')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // ===== Blocks mode: native rendering =====
  if (page.contentMode === 'blocks' && page.blocks?.length) {
    const title = (lang !== 'ar' && page.titles?.[lang])
      ? page.titles[lang]
      : page.title;

    return (
      <ScreenContainer edges={['top']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.blocksContainer}
          showsVerticalScrollIndicator={false}
        >
          {title ? (
            <Text style={[styles.blocksTitle, {
              color: colors.primary,
              textAlign: isRtl ? 'right' : 'left',
              writingDirection: isRtl ? 'rtl' : 'ltr',
            }]}>
              {title}
            </Text>
          ) : null}
          {page.blocks.map((block) => (
            <BlockItem
              key={block.id}
              block={block}
              lang={lang}
              colors={colors}
              isRtl={isRtl}
            />
          ))}
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ===== HTML mode: WebView rendering =====
  const htmlBody = isAr ? page.htmlContent : (page.htmlContentEn || page.htmlContent);
  const wrappedHtml = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:16px;margin:0;color:${colors.text};background:${bgColor};direction:${dir};line-height:1.8}img{max-width:100%;border-radius:12px}h1,h2,h3{color:${colors.primary}}</style></head><body>${htmlBody}</body></html>`;

  return (
    <ScreenContainer edges={['top']}>
      <WebView
        source={{ html: wrappedHtml }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0d8e62" />
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blocksContainer: {
    padding: 20,
    gap: 12,
  },
  blocksTitle: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    marginBottom: 8,
  },
  blockItem: {
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  blockIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Cairo-Regular',
  },
});
