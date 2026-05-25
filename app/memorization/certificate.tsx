// app/memorization/certificate.tsx
// شهادة إتمام حفظ سورة — قابلة للمشاركة كصورة عبر BrandedCapture.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { UniversalHeader } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BrandedCapture } from '@/components/ui/BrandedCapture';
import { useSettings } from '@/contexts/SettingsContext';
import { getSurahName, getAyahCount } from '@/lib/memorization-helpers';
import { mt } from '@/lib/memorization-i18n';
import { uiDateLocale } from '@/lib/ui-text';
import { localizeNumber } from '@/lib/format-number';

export default function CertificateScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const params = useLocalSearchParams<{ surah?: string }>();
  const surahNum = Number(params.surah || '1');
  const surahName = getSurahName(surahNum);
  const ayahCount = getAyahCount(surahNum);
  const today = new Date().toLocaleDateString(uiDateLocale());

  return (
    <BackgroundWrapper
      backgroundKey={appSettings.display.appBackground}
      backgroundUrl={appSettings.display.appBackgroundUrl}
      opacity={appSettings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <UniversalHeader title={mt('certificateTitle')} onBack={() => router.back()} />

        <View style={styles.container}>
          <BrandedCapture title={mt('certificateCaptureTitle', { surah: surahName })}>
            {(textColor) => (
              <View style={[styles.cert, { borderColor: '#0d8e62' }]}>
                <MaterialCommunityIcons name="certificate" size={56} color="#0d8e62" />
                <Text style={[styles.title, { color: textColor }]}>{mt('certificateTitle')}</Text>
                <Text style={[styles.subtitle, { color: textColor }]}>{mt('certificateSubtitle')}</Text>

                <View style={styles.divider} />

                <Text style={[styles.body, { color: textColor }]}>{mt('certificateCongrats')}</Text>
                <Text style={[styles.surahName, { color: '#0d8e62' }]}>{surahName}</Text>
                <Text style={[styles.body, { color: textColor }]}>
                  {mt('certificateAyahCount', { count: localizeNumber(ayahCount) })}
                </Text>

                <View style={styles.divider} />

                <Text style={[styles.date, { color: textColor }]}>{today}</Text>
                <Text style={[styles.dua, { color: textColor }]}>
                  {mt('certificateDua')}
                </Text>
              </View>
            )}
          </BrandedCapture>
        </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 16 },
  cert: {
    padding: 32,
    borderWidth: 3,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
  },
  title: { fontFamily: 'Rubik-Bold', fontSize: 24 },
  subtitle: { fontFamily: 'Rubik-SemiBold', fontSize: 16, opacity: 0.85 },
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(13,142,98,0.4)',
    marginVertical: 12,
  },
  body: { fontFamily: 'Rubik-Regular', fontSize: 14 },
  surahName: { fontFamily: 'KFGQPCUthmanic', fontSize: 32, marginVertical: 6 },
  date: { fontFamily: 'Rubik-SemiBold', fontSize: 13, opacity: 0.85 },
  dua: { fontFamily: 'Rubik-Regular', fontSize: 13, marginTop: 8, textAlign: 'center' },
});
