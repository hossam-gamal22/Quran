// app/settings/custom-dhikr.tsx
// إنشاء ذِكر مخصص

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { fontBold, fontMedium } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSettings } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';

const ICONS = [
  'hand-heart', 'star-crescent', 'heart', 'moon-waning-crescent',
  'book-open-variant', 'circle-multiple', 'leaf', 'water',
  'flower', 'candelabra', 'hands-pray', 'shield-cross',
];

const STORAGE_KEY = 'custom_adhkar';

interface CustomDhikr {
  id: string;
  name: string;
  text: string;
  icon: string;
  count: number;
}

export default function CustomDhikrScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { settings, isDarkMode } = useSettings();
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('hand-heart');
  const [count, setCount] = useState('33');
  const colors = useColors();

  const handleSave = async () => {
    if (!name.trim() || !text.trim()) {
      Alert.alert(t('common.warning'), t('azkar.enterDhikrNameAndText'));
      return;
    }

    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1) {
      Alert.alert(t('common.warning'), t('azkar.enterValidNumber'));
      return;
    }

    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const list: CustomDhikr[] = existing ? JSON.parse(existing) : [];

      const newDhikr: CustomDhikr = {
        id: Date.now().toString(),
        name: name.trim(),
        text: text.trim(),
        icon: selectedIcon,
        count: countNum,
      };

      list.push(newDhikr);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.savedSuccess'), t('azkar.dhikrAddedSuccess'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('common.saveError'));
    }
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={isDarkMode ? '#fff' : '#333'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('tasbih.customDhikr')}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* اختيار الأيقونة */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('azkar.iconSection')}</Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark, styles.iconGrid]}>
              {ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedIcon(icon);
                  }}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={24}
                    color={selectedIcon === icon ? '#22C55E' : isDarkMode ? '#aaa' : '#666'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* اسم الذِكر */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('azkar.dhikrName')}</Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                placeholder={t('azkar.dhikrNamePlaceholder')}
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
          </Animated.View>

          {/* نص الذِكر */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('azkar.dhikrTextSection')}</Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.inputDark]}
                placeholder={t('azkar.dhikrTextPlaceholder')}
                placeholderTextColor="#999"
                value={text}
                onChangeText={setText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
          </Animated.View>

          {/* عدد التكرار */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('azkar.repeatCount')}</Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                placeholder="33"
                placeholderTextColor="#999"
                value={count}
                onChangeText={setCount}
                keyboardType="number-pad"
                textAlign="center"
              />
            </View>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  containerDark: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontFamily: fontBold(), color: '#333' },
  saveBtn: {
    backgroundColor: 'rgba(6,79,47,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  saveText: { fontFamily: fontBold(), fontSize: 14, color: '#fff' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 10 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  section: {
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionDark: { backgroundColor: 'rgba(120,120,128,0.18)' },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,128,0.08)',
  },
  iconOptionSelected: {
    backgroundColor: 'rgba(6,79,47,0.15)',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  input: {
    fontFamily: fontMedium(),
    fontSize: 16,
    color: '#333',
    padding: 16,
  },
  inputDark: { color: '#fff' },
  textArea: {
    minHeight: 100,
  },
});
