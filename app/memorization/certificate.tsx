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
import { getSurahName, getAyahCount, toArabicDigits } from '@/lib/memorization-helpers';

export default function CertificateScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const params = useLocalSearchParams<{ surah?: string }>();
  const surahNum = Number(params.surah || '1');
  const surahName = getSurahName(surahNum);
  const ayahCount = getAyahCount(surahNum);
  const today = new Date().toLocaleDateString('ar-EG');

  return (
    <BackgroundWrapper
      backgroundKey={appSettings.display.appBackground}
      backgroundUrl={appSettings.display.appBackgroundUrl}
      opacity={appSettings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <UniversalHeader title="شهادة إتمام" onBack={() => router.back()} />

        <View style={styles.container}>
          <BrandedCapture title={`شهادة حفظ ${surahName}`}>
            {(textColor) => (
              <View style={[styles.cert, { borderColor: '#0d8e62' }]}>
                <MaterialCommunityIcons name="certificate" size={56} color="#0d8e62" />
                <Text style={[styles.title, { color: textColor }]}>شهادة إتمام</Text>
                <Text style={[styles.subtitle, { color: textColor }]}>حفظ كتاب الله</Text>

                <View style={styles.divider} />

                <Text style={[styles.body, { color: textColor }]}>نُبارك إتمام حفظ</Text>
                <Text style={[styles.surahName, { color: '#0d8e62' }]}>{surahName}</Text>
                <Text style={[styles.body, { color: textColor }]}>
                  {`${toArabicDigits(ayahCount)} آية`}
                </Text>

                <View style={styles.divider} />

                <Text style={[styles.date, { color: textColor }]}>{today}</Text>
                <Text style={[styles.dua, { color: textColor }]}>
                  جعلها الله حُجّة لك لا عليك
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
  title: { fontFamily: 'Cairo-Bold', fontSize: 24 },
  subtitle: { fontFamily: 'Cairo-SemiBold', fontSize: 16, opacity: 0.85 },
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(13,142,98,0.4)',
    marginVertical: 12,
  },
  body: { fontFamily: 'Cairo-Regular', fontSize: 14 },
  surahName: { fontFamily: 'KFGQPCUthmanic', fontSize: 32, marginVertical: 6 },
  date: { fontFamily: 'Cairo-SemiBold', fontSize: 13, opacity: 0.85 },
  dua: { fontFamily: 'Cairo-Regular', fontSize: 13, marginTop: 8, textAlign: 'center' },
});
