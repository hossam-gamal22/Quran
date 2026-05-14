// app/temp-page/[id].tsx
// عرض صفحة مؤقتة — بلوكات أصلية أو HTML حسب نوع المحتوى

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchTempPageById, TempPage, TempPageBlock, TempPageCtaButton } from '@/lib/app-config-api';
import { t, getLanguage, isRTL } from '@/lib/i18n';
import { useColors } from '@/hooks/use-colors';
import { showOfflineModal } from '@/components/ui/OfflineBanner';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui/UniversalHeader';

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

function getCtaLabel(cta: TempPageCtaButton, lang: string) {
  if (lang !== 'ar') {
    return cta.labels?.[lang] || cta.labelEn || cta.label;
  }
  return cta.labels?.ar || cta.label;
}

export default function TempPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [page, setPage] = useState<TempPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchTempPageById(id).then(p => {
      setPage(p);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      showOfflineModal();
    });
  }, [id]);

  const bgColor = colors.background;
  const lang = getLanguage();
  const isAr = lang === 'ar';
  const isRtl = isRTL();
  const dir = isRtl ? 'rtl' : 'ltr';
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  };
  const handleCtaPress = async () => {
    const route = page?.ctaButton?.route?.trim();
    if (!route) return;

    if (/^https?:\/\//i.test(route)) {
      await Linking.openURL(route);
      return;
    }

    const appRoute = route.startsWith('/') ? route : `/${route}`;
    router.push(appRoute as any);
  };
  const renderCta = () => {
    const cta = page?.ctaButton;
    if (!cta?.enabled || !cta.route?.trim()) return null;

    const label = getCtaLabel(cta, lang)?.trim();
    if (!label) return null;

    return (
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={handleCtaPress}
          style={[
            styles.ctaButton,
            {
              backgroundColor: cta.color || page?.color || colors.primary,
              flexDirection: isRtl ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Text style={styles.ctaText}>{label}</Text>
          <MaterialCommunityIcons
            name={isRtl ? 'arrow-left' : 'arrow-right'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    );
  };

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
        <UniversalHeader
          title={t('common.pageUnavailable')}
          titleColor={colors.text}
          onBack={handleBack}
          showBack
        />
        <View style={styles.loader}>
          <Text style={{ color: colors.text }}>
            {t('common.pageUnavailable')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const title = (lang !== 'ar' && page.titles?.[lang])
    ? page.titles[lang]
    : page.title;

  // ===== Blocks mode: native rendering =====
  if (page.contentMode === 'blocks' && page.blocks?.length) {
    return (
      <ScreenContainer edges={['top']}>
        <UniversalHeader
          title={title}
          titleColor={colors.text}
          onBack={handleBack}
          showBack
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.blocksContainer}
          showsVerticalScrollIndicator={false}
        >
          {page.blocks.map((block) => (
            <BlockItem
              key={block.id}
              block={block}
              lang={lang}
              colors={colors}
              isRtl={isRtl}
            />
          ))}
          {renderCta()}
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ===== HTML mode: WebView rendering =====
  const htmlBody = isAr ? page.htmlContent : (page.htmlContentEn || page.htmlContent);
  const wrappedHtml = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:16px;margin:0;color:${colors.text};background:${bgColor};direction:${dir};line-height:1.8}img{max-width:100%;border-radius:12px}h1,h2,h3{color:${colors.primary}}</style></head><body>${htmlBody}</body></html>`;

  return (
    <ScreenContainer edges={['top']}>
      <UniversalHeader
        title={title}
        titleColor={colors.text}
        onBack={handleBack}
        showBack
      />
      <View style={styles.htmlContent}>
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
        {renderCta()}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  htmlContent: { flex: 1 },
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
  ctaContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  ctaButton: {
    minHeight: 52,
    minWidth: 190,
    maxWidth: '100%',
    paddingHorizontal: 22,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
  },
});
