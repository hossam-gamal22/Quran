// components/full-adhan/AdhanVoicePickerSheet.tsx
// Bottom sheet listing the 5 curated complete-adhan voices with selected
// indicator. Used by app/full-adhan.tsx; selecting a voice replays current
// playback with the new voice AND persists to notifSettings.fullAdhanSoundType.

import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { t } from '@/lib/i18n';
import { useIsRTL } from '@/hooks/use-is-rtl';
import type { CompleteAdhanVoiceKey } from '@/data/adhan-transcript';
import { ModalColors } from '@/constants/theme';

export const COMPLETE_ADHAN_VOICES: ReadonlyArray<{
  key: CompleteAdhanVoiceKey;
  label: string;
}> = [
  { key: 'makkah',     label: 'أذان الحرم المكي' },
  { key: 'madinah',    label: 'أذان الحرم النبوي' },
  { key: 'al_aqsa',    label: 'أذان المسجد الأقصى' },
  { key: 'mishary',    label: 'الأذان بصوت مشاري العفاسي' },
  { key: 'abdulbasit', label: 'الأذان بصوت عبد الباسط عبد الصمد' },
];

interface AdhanVoicePickerSheetProps {
  visible: boolean;
  selectedVoice: CompleteAdhanVoiceKey;
  availableVoices: CompleteAdhanVoiceKey[]; // voices that have a complete-adhan MP3 bundled
  onSelect: (voice: CompleteAdhanVoiceKey) => void;
  onClose: () => void;
}

export const AdhanVoicePickerSheet: React.FC<AdhanVoicePickerSheetProps> = ({
  visible,
  selectedVoice,
  availableVoices,
  onSelect,
  onClose,
}) => {
  const isRTL = useIsRTL();
  const availableSet = new Set(availableVoices);

  const handleSelect = (voice: CompleteAdhanVoiceKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelect(voice);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetWrapper} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={80} tint="dark" style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={[styles.title, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('fullAdhan.voicePickerTitle')}
            </Text>
            <Text style={[styles.subtitle, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('fullAdhan.voicePickerSubtitle')}
            </Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {COMPLETE_ADHAN_VOICES.map(({ key, label }) => {
                const isSelected = key === selectedVoice;
                const isAvailable = availableSet.has(key);
                return (
                  <Pressable
                    key={key}
                    onPress={isAvailable ? () => handleSelect(key) : undefined}
                    disabled={!isAvailable}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                        backgroundColor: isSelected
                          ? 'rgba(13,142,98,0.35)'
                          : pressed
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.04)',
                        opacity: isAvailable ? 1 : 0.4,
                      },
                    ]}
                  >
                    <Text style={[styles.rowLabel, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                      {label}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons name="check-circle" size={22} color="#5dd4a8" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    width: '100%',
  },
  sheet: {
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: ModalColors.cardDark,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  list: {
    maxHeight: 400,
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    flex: 1,
  },
});

export default AdhanVoicePickerSheet;
