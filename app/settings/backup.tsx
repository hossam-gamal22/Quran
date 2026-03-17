// app/settings/backup.tsx
// صفحة النسخ الاحتياطي - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { fontBold, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { t, getDateLocale } from '@/lib/i18n';

// ========================================
// الثوابت
// ========================================

const BACKUP_VERSION = '2.0';
const BACKUP_FILENAME = 'rooh_muslim_backup';

// Keys to exclude from backup/restore (device-specific or sensitive)
const EXCLUDED_KEYS = [
  '@fcm_token',
  '@rooh_fcm_token',
  '@device_registered',
  '@rooh_user_id',
  '@rooh_first_open',
  '@app_version',
  'auth_token',
  'last_backup_date',
  // Cache keys that regenerate automatically
  '@quran_cache_timestamp',
  '@sound_settings_cache',
  'ads_config_cache',
  'remote_app_config',
  'dynamic_backgrounds',
  'sdui_screen_configs',
  'home_page_config',
  'performance_data',
  'cache_index',
  'image_cache_index',
  'current_session',
  'seasonal_content_cache',
  'seasonal_last_update',
  'cached_api_data',
];

interface BackupData {
  version: string;
  createdAt: string;
  device: string;
  keyCount?: number;
  data: Record<string, any>;
}

interface BackupInfo {
  exists: boolean;
  date: string | null;
  size: string | null;
}

// ========================================
// مكونات فرعية
// ========================================

interface ActionCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  gradientColors: string[];
  title: string;
  subtitle: string;
  onPress: () => void;
  isLoading?: boolean;
  isDarkMode: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  iconColor,
  gradientColors,
  title,
  subtitle,
  onPress,
  isLoading = false,
  isDarkMode,
}) => {
  const colors = useColors();
  const isRTL = useIsRTL();
  return (
    <TouchableOpacity
      style={[styles.actionCard, isDarkMode && styles.actionCardDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      onPress={() => {
        if (!isLoading) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }
      }}
      activeOpacity={0.8}
      disabled={isLoading}
    >
      <View
        style={[styles.actionIconContainer, { backgroundColor: `${(gradientColors as [string, string])[0]}CC` }]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <MaterialCommunityIcons name={icon} size={28} color="#fff" />
        )}
      </View>
      <View style={[styles.actionContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.actionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
        <Text style={[styles.actionSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons
        name={isRTL ? 'chevron-left' : 'chevron-right'}
        size={24}
        color={isDarkMode ? '#666' : '#ccc'}
      />
    </TouchableOpacity>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
  isDarkMode: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, isDarkMode }) => {
  const colors = useColors();
  const isRTL = useIsRTL();
  return (
    <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={[styles.infoLabel, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text, textAlign: isRTL ? 'left' : 'right' }]}>{value}</Text>
    </View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function BackupScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { settings, isDarkMode, exportSettings, importSettings, reloadSettings } = useSettings();
  const colors = useColors();
  const { resetOnboarding } = useOnboarding();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupInfo>({
    exists: false,
    date: null,
    size: null,
  });
  const [dataStats, setDataStats] = useState({
    bookmarks: 0,
    khatmas: 0,
    worshipDays: 0,
    quranProgress: 0,
  });

  useEffect(() => {
    loadBackupInfo();
    loadDataStats();
  }, []);

  const loadBackupInfo = async () => {
    try {
      const lastBackupDate = await AsyncStorage.getItem('last_backup_date');
      if (lastBackupDate) {
        setLastBackup({
          exists: true,
          date: lastBackupDate,
          size: null,
        });
      }
    } catch (error) {
      console.error('Error loading backup info:', error);
    }
  };

  const loadDataStats = async () => {
    try {
      const bookmarks = await AsyncStorage.getItem('@quran_bookmarks');
      const khatmas = await AsyncStorage.getItem('@rooh_muslim_khatmas');
      const worship = await AsyncStorage.getItem('worship_prayer_records');
      const quranLastRead = await AsyncStorage.getItem('@quran_last_read');

      let bookmarkCount = 0;
      try { bookmarkCount = bookmarks ? JSON.parse(bookmarks).length : 0; } catch { }
      let khatmaCount = 0;
      try { khatmaCount = khatmas ? JSON.parse(khatmas).length : 0; } catch { }
      let worshipCount = 0;
      try { worshipCount = worship ? Object.keys(JSON.parse(worship)).length : 0; } catch { }
      let lastPage = 0;
      try {
        if (quranLastRead) {
          const parsed = JSON.parse(quranLastRead);
          lastPage = parsed.page || parsed.lastPage || 0;
        }
      } catch { }

      setDataStats({
        bookmarks: bookmarkCount,
        khatmas: khatmaCount,
        worshipDays: worshipCount,
        quranProgress: lastPage,
      });
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  };

  const gatherAllData = async (): Promise<BackupData> => {
    const keys = await AsyncStorage.getAllKeys();
    const data: Record<string, any> = {};

    for (const key of keys) {
      if (EXCLUDED_KEYS.includes(key)) continue;
      try {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      } catch {
        // Skip unreadable keys
      }
    }

    return {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      device: Platform.OS,
      keyCount: Object.keys(data).length,
      data,
    };
  };

  const createBackup = async () => {
    setIsCreatingBackup(true);

    try {
      const backupData = await gatherAllData();
      const jsonString = JSON.stringify(backupData, null, 2);
      const fileName = `${BACKUP_FILENAME}_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // حفظ تاريخ آخر نسخة
      const now = new Date().toISOString();
      await AsyncStorage.setItem('last_backup_date', now);
      setLastBackup({ exists: true, date: now, size: `${(jsonString.length / 1024).toFixed(1)} KB` });

      // مشاركة الملف
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: t('backup.saveBackup'),
          UTI: 'public.json',
        });
      } else {
        await Share.share({
          message: jsonString,
          title: t('backup.backupFileName'),
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('settings.success'), t('backup.createdSuccess'));
    } catch (error) {
      console.error('Error creating backup:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('backup.errorCreating'));
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async () => {
    Alert.alert(
      t('backup.restoreConfirm'),
      t('backup.restoreConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.restore'),
          style: 'destructive',
          onPress: performRestore,
        },
      ]
    );
  };

  const performRestore = async () => {
    setIsRestoring(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setIsRestoring(false);
        return;
      }

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const backupData: BackupData = JSON.parse(content);

      // التحقق من صحة النسخة
      if (!backupData.version || !backupData.data || typeof backupData.data !== 'object') {
        throw new Error(t('backup.invalidBackupFile'));
      }

      let restored = 0;
      let failed = 0;
      const failedKeys: string[] = [];

      if (backupData.version === '2.0') {
        // V2: Raw dump of all keys
        const entries = Object.entries(backupData.data);
        for (const [key, value] of entries) {
          if (EXCLUDED_KEYS.includes(key)) continue;
          try {
            const strValue = typeof value === 'string' ? value : JSON.stringify(value);
            await AsyncStorage.setItem(key, strValue);
            restored++;
          } catch (e) {
            failed++;
            failedKeys.push(key);
            console.warn(`⚠️ Failed to restore key: ${key}`, e);
          }
        }
      } else {
        // V1 backward compatibility: old categorized format
        const v1Map: Record<string, string> = {
          settings: 'app_settings',
          worship: 'worship_prayer_records',
          khatma: '@rooh_muslim_khatmas',
          bookmarks: '@quran_bookmarks',
        };
        for (const [dataKey, storageKey] of Object.entries(v1Map)) {
          if (backupData.data[dataKey]) {
            try {
              await AsyncStorage.setItem(storageKey, JSON.stringify(backupData.data[dataKey]));
              restored++;
            } catch (e) {
              failed++;
              failedKeys.push(storageKey);
              console.warn(`⚠️ Failed to restore V1 key: ${storageKey}`, e);
            }
          }
        }
        if (backupData.data.progress?.quran) {
          try {
            await AsyncStorage.setItem('@quran_last_read', JSON.stringify(backupData.data.progress.quran));
            restored++;
          } catch (e) {
            failed++;
            failedKeys.push('@quran_last_read');
            console.warn('⚠️ Failed to restore V1 quran progress', e);
          }
        }
      }

      await loadDataStats();
      // Reload settings context to apply restored settings and reschedule notifications
      await reloadSettings();

      if (failed > 0) {
        console.warn(`⚠️ Restore completed with ${failed} failures:`, failedKeys);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const backupDate = new Date(backupData.createdAt).toLocaleDateString(getDateLocale());
      const summary = `${t('backup.restoredSuccess')} (${backupDate})\n\n` +
        `✅ ${restored} ${t('backup.keysRestored')}` +
        (failed > 0 ? `\n⚠️ ${failed} ${t('backup.keysFailed')}` : '');

      Alert.alert(
        t('settings.success'),
        summary,
        [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error restoring backup:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('backup.errorRestoring'));
    } finally {
      setIsRestoring(false);
    }
  };

  const shareBackupAsText = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const settingsJson = await exportSettings();
      if (!settingsJson) return;
      await Share.share({
        message: settingsJson,
        title: t('backup.appSettings'),
      });
    } catch (error) {
      console.error('Error sharing settings:', error);
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      t('backup.clearDataConfirm'),
      t('backup.clearDataConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.clearAll'),
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            try {
              await AsyncStorage.clear();
              setDataStats({
                bookmarks: 0,
                khatmas: 0,
                worshipDays: 0,
                quranProgress: 0,
              });
              setLastBackup({ exists: false, date: null, size: null });
              // إعادة تعيين حالة الـ Onboarding والتوجيه لشاشة الترحيب
              await resetOnboarding();
            } catch (error) {
              Alert.alert(t('common.error'), t('backup.errorClearing'));
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return t('backup.noData');
    const date = new Date(dateString);
    return date.toLocaleDateString(getDateLocale(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <UniversalHeader title={t('settings.backupSection')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <Animated.View entering={FadeInDown.delay(50).duration(500)}>
          <View
            style={[styles.statusCard, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.85)' : 'rgba(47,118,89,0.85)' }]}
          >
            <View style={styles.statusIcon}>
              <MaterialCommunityIcons
                name={lastBackup.exists ? 'cloud-check' : 'cloud-off-outline'}
                size={40}
                color="#fff"
              />
            </View>
            <Text style={styles.statusTitle}>
              {lastBackup.exists ? t('backup.backupUpToDate') : t('backup.noBackup')}
            </Text>
            <Text style={styles.statusSubtitle}>
              {lastBackup.exists
                ? `${t('backup.lastBackupPrefix')} ${formatDate(lastBackup.date)}`
                : t('backup.createBackupPrompt')}
            </Text>
          </View>
        </Animated.View>

        {/* Data Stats */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('backup.savedData')}</Text>
          <View style={[styles.statsCard, isDarkMode && styles.statsCardDark]}>
            <InfoRow label={t('backup.favoritesAndBookmarks')} value={`${dataStats.bookmarks} ${t('backup.item')}`} isDarkMode={isDarkMode} />
            <InfoRow label={t('backup.khatmasLabel')} value={`${dataStats.khatmas} ${t('backup.khatmaUnit')}`} isDarkMode={isDarkMode} />
            <InfoRow label={t('backup.worshipDays')} value={`${dataStats.worshipDays} ${t('backup.day')}`} isDarkMode={isDarkMode} />
            <InfoRow label={t('backup.quranProgress')} value={`${t('backup.page')} ${dataStats.quranProgress}`} isDarkMode={isDarkMode} />
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('backup.actions')}</Text>

          <ActionCard
            icon="cloud-upload"
            iconColor="#fff"
            gradientColors={['#2f7659', '#1d4a3a']}
            title={t('backup.createBackup')}
            subtitle={t('backup.createBackupDesc')}
            onPress={createBackup}
            isLoading={isCreatingBackup}
            isDarkMode={isDarkMode}
          />

          <ActionCard
            icon="cloud-download"
            iconColor="#fff"
            gradientColors={['#3a7ca5', '#2a5a7a']}
            title={t('backup.restoreFromBackup')}
            subtitle={t('backup.restoreFromBackupDesc')}
            onPress={restoreBackup}
            isLoading={isRestoring}
            isDarkMode={isDarkMode}
          />

          <ActionCard
            icon="share-variant"
            iconColor="#fff"
            gradientColors={['#5d4e8c', '#4a3d6e']}
            title={t('backup.shareSettings')}
            subtitle={t('backup.shareSettingsDesc')}
            onPress={shareBackupAsText}
            isDarkMode={isDarkMode}
          />
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: '#ef5350', textAlign: isRTL ? 'right' : 'left' }]}>{t('backup.dangerZone')}</Text>

          <ActionCard
            icon="delete-forever"
            iconColor="#fff"
            gradientColors={['#ef5350', '#c62828']}
            title={t('backup.clearAllData')}
            subtitle={t('backup.clearAllDataDesc')}
            onPress={clearAllData}
            isDarkMode={isDarkMode}
          />
        </Animated.View>

        {/* Info Card */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={[styles.infoCard, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? 'rgba(58,124,165,0.15)' : '#e8f4fd' }]}>
          <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
          <View style={styles.infoContent}>
            <Text style={[styles.infoText, { color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#333', textAlign: isRTL ? 'right' : 'left' }]}>
              • {t('backup.infoIncludes')}
            </Text>
            <Text style={[styles.infoText, { color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#333', textAlign: isRTL ? 'right' : 'left' }]}>
              • {t('backup.infoSaveCloud')}
            </Text>
            <Text style={[styles.infoText, { color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#333', textAlign: isRTL ? 'right' : 'left' }]}>
              • {t('backup.infoWeekly')}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#11151c',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statusCard: {
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 20,
    fontFamily: fontBold(),
    color: '#fff',
    marginBottom: 5,
  },
  statusSubtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#666',
    marginTop: 20,
    marginBottom: 12,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 5,
  },
  statsCardDark: {
    backgroundColor: '#1a1a2e',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 15,
    fontFamily: fontRegular(),
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontFamily: fontBold(),
    color: '#333',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  actionCardDark: {
    backgroundColor: '#1a1a2e',
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: '#999',
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: '#333',
    lineHeight: 24,
  },
  bottomSpace: {
    height: 100,
  },
});
