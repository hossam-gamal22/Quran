import React from 'react';
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { getLanguage } from '@/lib/i18n';

const ACCENT = '#0a7a55';

function pdfCopy() {
  return getLanguage() === 'ar'
    ? {
        share: 'مشاركة PDF',
        errorTitle: 'تعذرت مشاركة PDF',
        errorBody: 'حاول مرة أخرى بعد لحظات.',
        retry: 'حاول مرة أخرى',
        close: 'إغلاق',
      }
    : {
        share: 'Share PDF',
        errorTitle: 'PDF could not be shared',
        errorBody: 'Please try again in a moment.',
        retry: 'Try again',
        close: 'Close',
      };
}

export function PdfShareButton({
  onPress,
  style,
  disabled,
}: {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const labels = pdfCopy();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.shareButton,
        { flexDirection: isRTL ? 'row-reverse' : 'row', opacity: disabled ? 0.55 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={labels.share}
    >
      <MaterialCommunityIcons name="file-pdf-box" size={15} color="#fff" />
      <Text style={[styles.shareText, { fontSize: colors.fs(12), lineHeight: colors.fs(18) }]}>
        {labels.share}
      </Text>
    </Pressable>
  );
}

export function PdfShareErrorModal({
  visible,
  onRetry,
  onClose,
}: {
  visible: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const labels = pdfCopy();
  const cardBg = colors.isDarkMode ? 'rgba(15,26,20,0.92)' : 'rgba(255,255,255,0.94)';
  const iconBg = colors.isDarkMode ? 'rgba(109,93,252,0.16)' : 'rgba(109,93,252,0.12)';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: cardBg,
              borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <View style={[styles.modalIconCircle, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={42} color="#ef4444" />
          </View>
          <Text style={[styles.modalTitle, { color: colors.text, fontSize: colors.fs(18), lineHeight: colors.fs(30) }]}>
            {labels.errorTitle}
          </Text>
          <Text style={[styles.modalBody, { color: colors.textLight, fontSize: colors.fs(14), lineHeight: colors.fs(24) }]}>
            {labels.errorBody}
          </Text>
          <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable onPress={onClose} style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: colors.textLight }]}>
              <Text style={[styles.modalButtonText, { color: colors.text, fontSize: colors.fs(14), lineHeight: colors.fs(20) }]}>
                {labels.close}
              </Text>
            </Pressable>
            <Pressable onPress={onRetry} style={[styles.modalButton, styles.modalButtonPrimary]}>
              <Text style={[styles.modalButtonText, { color: '#fff', fontSize: colors.fs(14), lineHeight: colors.fs(20) }]}>
                {labels.retry}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  shareText: {
    color: '#fff',
    fontFamily: fontSemiBold(),
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  modalCard: {
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
  modalIconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontFamily: fontBold(),
    marginBottom: 8,
    includeFontPadding: false,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: fontRegular(),
    marginBottom: 18,
    includeFontPadding: false,
    textAlign: 'center',
  },
  modalActions: {
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalButtonPrimary: {
    backgroundColor: ACCENT,
  },
  modalButtonSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalButtonText: {
    fontFamily: fontSemiBold(),
    textAlign: 'center',
  },
});
