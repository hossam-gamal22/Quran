/**
 * TajweedDownloadModal — Full-screen modal that bulk-downloads
 * the 604 colored Mushaf fonts on first activation of Tajweed mode.
 *
 * Usage:
 *   <TajweedDownloadModal
 *     visible={needsDownload}
 *     onComplete={() => { ... apply tajweed mode ... }}
 *     onCancel={() => { ... revert to tarteel ... }}
 *   />
 */

import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  downloadAllTajweedFonts,
  TOTAL_TAJWEED_PAGES,
  type DownloadSignal,
} from '@/lib/qcf-color-font-cache';
import { useSettings } from '@/contexts/SettingsContext';
import { ModalColors } from '@/constants/theme';

interface Props {
  visible: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export const TajweedDownloadModal: React.FC<Props> = ({ visible, onComplete, onCancel }) => {
  const { t } = useSettings();
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signalRef = useRef<DownloadSignal>({ cancelled: false });

  useEffect(() => {
    if (!visible) {
      setCurrent(0);
      setFailed(0);
      setDone(false);
      setError(null);
      signalRef.current = { cancelled: false };
      return;
    }
    // Always create a fresh signal per mount so React 18 strict-mode
    // cleanup doesn't poison the next attempt.
    const localSignal: DownloadSignal = { cancelled: false };
    signalRef.current = localSignal;
    let cancelled = false;
    setCurrent(0);
    setFailed(0);
    setDone(false);
    setError(null);
    (async () => {
      try {
        const result = await downloadAllTajweedFonts(
          (p) => {
            if (cancelled) return;
            setCurrent(p.current);
            setFailed(p.failed);
          },
          localSignal
        );
        if (cancelled) return;
        if (result.success) {
          setDone(true);
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          setTimeout(() => onComplete(), 600);
        } else if (result.failed > 0 && result.failed < TOTAL_TAJWEED_PAGES) {
          // Partial success — still allow user to proceed
          setDone(true);
          setTimeout(() => onComplete(), 800);
        } else {
          setError(t('quran.tajweedDownloadError') || 'فشل التنزيل، تأكد من الإنترنت');
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
      localSignal.cancelled = true;
    };
  }, [visible, onComplete, t]);

  const percent = TOTAL_TAJWEED_PAGES > 0 ? Math.round((current / TOTAL_TAJWEED_PAGES) * 100) : 0;

  const handleCancel = () => {
    signalRef.current.cancelled = true;
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <BlurView intensity={Platform.OS === 'ios' ? 50 : 0} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <MaterialCommunityIcons
            name={done ? 'check-circle' : error ? 'alert-circle' : 'book-open-page-variant'}
            size={56}
            color={done ? '#0d8e62' : error ? '#EF4444' : '#D4A017'}
          />
          <Text style={styles.title}>
            {done
              ? t('quran.tajweedDownloadDone') || 'تم تنزيل خطوط التجويد'
              : error
              ? t('quran.tajweedDownloadFailed') || 'تعذّر التنزيل'
              : t('quran.tajweedDownloading') || 'جارٍ تنزيل المصحف المجوّد...'}
          </Text>
          {!done && !error && (
            <>
              <Text style={styles.subtitle}>
                {t('quran.tajweedDownloadSubtitle') || 'يحدث هذا مرة واحدة فقط ليعمل التجويد دون إنترنت'}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {current} / {TOTAL_TAJWEED_PAGES} ({percent}%)
              </Text>
              {failed > 0 && (
                <Text style={styles.failedText}>
                  {(t('quran.tajweedDownloadFailedCount') || '{n} صفحات فشل تنزيلها').replace('{n}', String(failed))}
                </Text>
              )}
              <ActivityIndicator size="small" color="#D4A017" style={{ marginTop: 12 }} />
              <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>{t('common.cancel') || 'إلغاء'}</Text>
              </TouchableOpacity>
            </>
          )}
          {error && (
            <>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={handleCancel} style={[styles.cancelBtn, { marginTop: 16 }]}>
                <Text style={styles.cancelText}>{t('common.close') || 'إغلاق'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: ModalColors.cardDark,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontFamily: 'Rubik-Bold',
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: 13,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#D4A017',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    color: '#D4A017',
    marginTop: 10,
  },
  failedText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  errorText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 13,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  cancelBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});

export default TajweedDownloadModal;
