// components/ui/AudioResumePromptModal.tsx
// Shared "continue listening or start over" prompt for long-form audio
// (Seerah, religious stories, companions stories). Shown when the user
// returns to content they previously listened to partway through.

import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { getLanguage } from '@/lib/i18n';
import { formatAudioTime } from '@/lib/audio-time';
import { ModalColors } from '@/constants/theme';

const ACCENT = '#0d8e62';

function getResumeCopy() {
  return getLanguage() === 'ar'
    ? {
        title: 'متابعة الاستماع؟',
        body: 'توقفت في المرة السابقة عند {time}. هل تريد المتابعة من حيث توقفت أم البدء من البداية؟',
        resume: 'تكملة الاستماع',
        restart: 'البدء من جديد',
        hint: 'توقفت عند {time}',
      }
    : {
        title: 'Continue listening?',
        body: 'You stopped at {time} last time. Continue from where you left off, or start over?',
        resume: 'Continue listening',
        restart: 'Start over',
        hint: 'You stopped at {time}',
      };
}

/** Localized inline hint, e.g. "توقفت عند ١:١٨:٥٩" — for the player card. */
export function formatResumeHint(positionMs: number): string {
  return getResumeCopy().hint.replace('{time}', formatAudioTime(positionMs));
}

interface AudioResumePromptModalProps {
  visible: boolean;
  savedPositionMs: number;
  onResume: () => void;
  onRestart: () => void;
  onClose: () => void;
  /**
   * Fires once this modal has been *fully* removed from the screen.
   * Callers must defer any action that presents another modal (e.g. an audio
   * loading/status modal) into this hook — presenting a second native Modal in
   * the same commit this one dismisses leaves a transparent, touch-blocking
   * window on iOS (the screen "freezes" although the audio plays). iOS uses the
   * native post-dismiss callback; Android (no native equivalent, and no such
   * bug) is emulated from the visible→hidden transition so callers can rely on
   * a single hook on every platform.
   */
  onDismiss?: () => void;
}

export function AudioResumePromptModal({
  visible,
  savedPositionMs,
  onResume,
  onRestart,
  onClose,
  onDismiss,
}: AudioResumePromptModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(_s, colors.fs);
  const copy = getResumeCopy();

  // Android has no native Modal `onDismiss`; emulate it from the controlled
  // `visible` prop so the contract is identical on both platforms.
  const wasVisibleRef = useRef(visible);
  useEffect(() => {
    if (Platform.OS === 'ios') {
      wasVisibleRef.current = visible;
      return;
    }
    if (wasVisibleRef.current && !visible) onDismiss?.();
    wasVisibleRef.current = visible;
  }, [visible, onDismiss]);
  const cardBg = colors.isDarkMode ? ModalColors.cardDark : ModalColors.cardLight;
  const iconBg = colors.isDarkMode ? 'rgba(6,79,47,0.16)' : 'rgba(6,79,47,0.12)';
  const body = copy.body.replace('{time}', formatAudioTime(savedPositionMs));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={Platform.OS === 'ios' ? onDismiss : undefined}
    >
      <View
        style={[
          s.overlay,
          // Keep the centered card clear of the status bar and the gesture/nav
          // bar so it is never clipped on Android (statusBarTranslucent makes
          // the modal full-screen; without inset padding a tall card with large
          // fonts could spill under the system bars).
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View
          style={[
            s.card,
            {
              backgroundColor: cardBg,
              borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <View style={[s.iconCircle, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name="play-pause" size={42} color={ACCENT} />
          </View>
          <Text style={[s.title, { color: colors.text }]}>{copy.title}</Text>
          <Text style={[s.body, { color: colors.textLight }]}>{body}</Text>
          {/* Fixed 'row' so the primary resume action always sits on the right. */}
          <View style={[s.actions, { flexDirection: 'row' }]}>
            <Pressable onPress={onRestart} style={[s.button, s.buttonSecondary, { borderColor: colors.textLight }]}>
              <Text style={[s.buttonText, { color: colors.text }]}>{copy.restart}</Text>
            </Pressable>
            <Pressable onPress={onResume} style={[s.button, s.buttonPrimary]}>
              <Text style={[s.buttonText, { color: '#fff' }]}>{copy.resume}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const _s = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: fontBold(),
    fontSize: 18,
    lineHeight: 30,
    marginBottom: 8,
    textAlign: 'center',
    includeFontPadding: false,
  },
  body: {
    fontFamily: fontRegular(),
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    includeFontPadding: false,
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 18,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonPrimary: {
    backgroundColor: ACCENT,
  },
  buttonSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontFamily: fontSemiBold(),
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
