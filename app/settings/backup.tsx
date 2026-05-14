// app/settings/backup.tsx
// صفحة النسخ الاحتياطي - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import NetInfo from '@react-native-community/netinfo';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { guardPremiumFeature } from '@/lib/premium-guard';
import { t, getDateLocale } from '@/lib/i18n';
import {
  BACKUP_VERSION,
  BACKUP_FILENAME,
  EXCLUDED_KEYS,
  gatherBackupData,
  restoreBackupData,
  formatSize,
} from '@/lib/backup-utils';
import { getMonthlyActivityStats } from '@/lib/worship-storage';
import type { BackupData } from '@/lib/backup-utils';
import {
  uploadToCloud,
  downloadFromCloud,
  getCloudBackupMeta,
} from '@/lib/cloud-sync';
import type { CloudBackupMeta } from '@/lib/cloud-sync';
import * as Auth from '@/lib/_core/auth';

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
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  return (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
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
        <Text style={[styles.actionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{title}</Text>
        <Text style={[styles.actionSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons
        name={isRTL ? 'chevron-left' : 'chevron-right'}
        size={24}
        color={colors.textLight}
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
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  return (
    <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{label}</Text>
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
  const { isPremium } = useSubscription();
  const { settings, isDarkMode, exportSettings, importSettings, reloadSettings } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { resetOnboarding } = useOnboarding();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [authUser, setAuthUser] = useState<Auth.User | null>(null);
  const [cloudMeta, setCloudMeta] = useState<CloudBackupMeta | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupInfo>({
    exists: false,
    date: null,
    size: null,
  });
  const [dataStats, setDataStats] = useState({
    bookmarks: 0,
    khatmas: 0,
    prayers: 0,
    quranPages: 0,
    azkar: 0,
    tasbih: 0,
  });

  useEffect(() => {
    loadBackupInfo();
    loadDataStats();
    loadAuthAndCloudMeta();
    // Delay size calculation to avoid blocking initial render
    const timer = setTimeout(() => loadEstimatedSize(), 1000);
    return () => clearTimeout(timer);
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
      const azkarFavorites = await AsyncStorage.getItem('@azkar_favorites');
      const allFavorites = await AsyncStorage.getItem('@favorites_all');

      let bookmarkCount = 0;
      try { bookmarkCount = bookmarks ? JSON.parse(bookmarks).length : 0; } catch { }
      let khatmaCount = 0;
      try { khatmaCount = khatmas ? JSON.parse(khatmas).length : 0; } catch { }
      let azkarFavCount = 0;
      try { azkarFavCount = azkarFavorites ? JSON.parse(azkarFavorites).length : 0; } catch { }
      let allFavCount = 0;
      try { allFavCount = allFavorites ? JSON.parse(allFavorites).length : 0; } catch { }

      // Use the same source of truth as honor board (current month)
      const monthlyStats = await getMonthlyActivityStats();

      setDataStats({
        bookmarks: bookmarkCount + azkarFavCount + allFavCount,
        khatmas: khatmaCount,
        prayers: monthlyStats.prayers,
        quranPages: monthlyStats.quranPages,
        azkar: monthlyStats.azkar,
        tasbih: monthlyStats.tasbih,
      });
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  };

  const loadAuthAndCloudMeta = async () => {
    try {
      const user = await Auth.getUserInfo();
      setAuthUser(user);
      if (user?.openId) {
        const meta = await getCloudBackupMeta(user.openId);
        setCloudMeta(meta);
      }
    } catch (error) {
      console.error('Error loading auth/cloud meta:', error);
    }
  };

  const loadEstimatedSize = async () => {
    try {
      const data = await gatherBackupData();
      const jsonStr = JSON.stringify(data, null, 2);
      const bytes = new Blob([jsonStr]).size;
      setEstimatedSize(formatSize(bytes));
    } catch {
      // ignore
    }
  };

  // ========================================
  // Cloud Sync Functions
  // ========================================

  const handleUploadToCloud = async () => {
    if (!isPremium) {
      guardPremiumFeature('cloud_backup', router, isPremium);
      return;
    }
    if (!authUser?.openId) {
      Alert.alert(t('backup.loginRequired'), t('backup.loginRequiredMsg'));
      return;
    }
    setIsUploading(true);
    try {
      const result = await uploadToCloud(authUser.openId);
      if (result.success && result.meta) {
        setCloudMeta(result.meta);
        const now = new Date().toISOString();
        await AsyncStorage.setItem('last_backup_date', now);
        setLastBackup({ exists: true, date: now, size: result.meta.sizeFormatted });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          t('settings.success'),
          `${t('backup.uploadSuccess')}\n\n📦 ${result.meta.sizeFormatted} • ${result.meta.keyCount} ${t('backup.item')}`
        );
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Cloud upload error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('backup.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!isPremium) {
      guardPremiumFeature('cloud_backup', router, isPremium);
      return;
    }
    if (!authUser?.openId) {
      Alert.alert(t('backup.loginRequired'), t('backup.loginRequiredMsg'));
      return;
    }

    // Check if cloud backup exists
    const meta = await getCloudBackupMeta(authUser.openId);
    if (!meta) {
      Alert.alert(t('backup.noCloudBackup'));
      return;
    }

    // Conflict resolution: compare timestamps
    const cloudDate = meta.lastSyncAt?.toDate?.() || new Date(0);
    const localDateStr = await AsyncStorage.getItem('last_backup_date');
    const localDate = localDateStr ? new Date(localDateStr) : new Date(0);
    const isLocalNewer = localDate > cloudDate;

    const message = isLocalNewer
      ? t('backup.localNewerWarning')
      : t('backup.confirmCloudRestoreMsg');

    Alert.alert(
      t('backup.confirmCloudRestore'),
      `${message}\n\n☁️ ${cloudDate.toLocaleDateString(getDateLocale())} • ${meta.deviceName}\n📦 ${meta.sizeFormatted}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.restore'),
          style: 'destructive',
          onPress: performCloudRestore,
        },
      ]
    );
  };

  const performCloudRestore = async () => {
    if (!authUser?.openId) return;

    // Pre-flight network check
    const netState = await NetInfo.fetch();
    if (!(netState.isConnected && netState.isInternetReachable !== false)) {
      Alert.alert(t('common.error'), t('messages.noInternet'));
      return;
    }

    setIsDownloading(true);
    try {
      const result = await downloadFromCloud(authUser.openId);
      if (!result) {
        Alert.alert(t('backup.noCloudBackup'));
        return;
      }

      await loadDataStats();
      await reloadSettings();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const backupDate = new Date(result.backupDate).toLocaleDateString(getDateLocale());
      const summary = `${t('backup.downloadSuccess')} (${backupDate})\n\n` +
        `✅ ${result.restored} ${t('backup.keysRestored')}` +
        (result.failed > 0 ? `\n⚠️ ${result.failed} ${t('backup.keysFailed')}` : '');

      Alert.alert(t('settings.success'), summary, [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Cloud restore error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Check if error was due to network
      const netCheck = await NetInfo.fetch();
      if (!(netCheck.isConnected && netCheck.isInternetReachable !== false)) {
        Alert.alert(t('common.error'), t('messages.noInternet'));
      } else {
        Alert.alert(t('common.error'), t('backup.downloadError'));
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const gatherAllData = gatherBackupData;

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
      setLastBackup({ exists: true, date: now, size: formatSize(new Blob([jsonString]).size) });

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

      let backupData: BackupData;
      try {
        backupData = JSON.parse(content);
      } catch {
        throw new Error(t('backup.invalidBackupFile'));
      }

      if (!backupData.version || !backupData.data || typeof backupData.data !== 'object') {
        throw new Error(t('backup.invalidBackupFile'));
      }

      const { restored, failed, failedKeys } = await restoreBackupData(backupData);

      await loadDataStats();
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
                prayers: 0,
                quranPages: 0,
                azkar: 0,
                tasbih: 0,
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
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <UniversalHeader title={t('settings.backupRestore')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <Animated.View entering={FadeInDown.delay(50).duration(500)}>
          <View
            style={[styles.statusCard, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.85)' : 'rgba(6,79,47,0.85)' }]}
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
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('backup.savedData')}</Text>
          <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
            <InfoRow label={`${t('backup.quranProgress')} (${t('backup.thisMonth')})`} value={`${dataStats.quranPages} ${t('backup.page')}`} isDarkMode={isDarkMode} />
            <InfoRow label={`${t('backup.prayersCount')} (${t('backup.thisMonth')})`} value={`${dataStats.prayers}`} isDarkMode={isDarkMode} />
            <InfoRow label={`${t('backup.azkarCount')} (${t('backup.thisMonth')})`} value={`${dataStats.azkar}`} isDarkMode={isDarkMode} />
            <InfoRow label={`${t('backup.tasbihCount')} (${t('backup.thisMonth')})`} value={`${dataStats.tasbih}`} isDarkMode={isDarkMode} />
            <InfoRow label={t('backup.favoritesAndBookmarks')} value={`${dataStats.bookmarks} ${t('backup.item')}`} isDarkMode={isDarkMode} />
            <InfoRow label={t('backup.khatmasLabel')} value={`${dataStats.khatmas} ${t('backup.khatmaUnit')}`} isDarkMode={isDarkMode} />
            {estimatedSize && (
              <InfoRow label={t('backup.estimatedSize')} value={estimatedSize} isDarkMode={isDarkMode} />
            )}
          </View>
        </Animated.View>

        {/* Cloud Sync Section — only shown when authenticated */}
        {authUser && (
          <Animated.View entering={FadeInDown.delay(125).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('backup.cloudSync')}</Text>

            {cloudMeta && (
              <View style={[styles.statsCard, { backgroundColor: colors.card, marginBottom: 12 }]}>
                <InfoRow label={t('backup.cloudBackupDate')} value={formatDate(cloudMeta.lastSyncAt?.toDate?.()?.toISOString?.() || null)} isDarkMode={isDarkMode} />
                <InfoRow label={t('backup.cloudBackupDevice')} value={cloudMeta.deviceName} isDarkMode={isDarkMode} />
                <InfoRow label={t('backup.cloudBackupSize')} value={cloudMeta.sizeFormatted} isDarkMode={isDarkMode} />
              </View>
            )}

            <ActionCard
              icon="cloud-upload-outline"
              iconColor="#fff"
              gradientColors={['#0d9488', '#115e59']}
              title={t('backup.uploadToCloud')}
              subtitle={isUploading ? t('backup.uploading') : t('backup.uploadToCloudDesc')}
              onPress={handleUploadToCloud}
              isLoading={isUploading}
              isDarkMode={isDarkMode}
            />

            <ActionCard
              icon="cloud-download-outline"
              iconColor="#fff"
              gradientColors={['#2563eb', '#1e40af']}
              title={t('backup.downloadFromCloud')}
              subtitle={isDownloading ? t('backup.downloading') : t('backup.downloadFromCloudDesc')}
              onPress={handleDownloadFromCloud}
              isLoading={isDownloading}
              isDarkMode={isDarkMode}
            />
          </Animated.View>
        )}

        {/* Free user warning */}
        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(140).duration(500)} style={[styles.infoCard, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? 'rgba(245,166,35,0.15)' : '#fff8e1' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#f5a623" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('backup.freeUserWarning')}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Local File Actions */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('backup.actions')}</Text>

          <ActionCard
            icon="file-export"
            iconColor="#fff"
            gradientColors={['#0d8e62', '#1d4a3a']}
            title={t('backup.createBackup')}
            subtitle={t('backup.createBackupDesc')}
            onPress={createBackup}
            isLoading={isCreatingBackup}
            isDarkMode={isDarkMode}
          />

          <ActionCard
            icon="file-import"
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
            gradientColors={['#4a3d73', '#4a3d6e']}
            title={t('backup.shareSettings')}
            subtitle={t('backup.shareSettingsOnlyDesc')}
            onPress={shareBackupAsText}
            isDarkMode={isDarkMode}
          />
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: '#ef5350', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('backup.dangerZone')}</Text>

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
            <Text style={[styles.infoText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              • {t('backup.infoIncludes')}
            </Text>
            <Text style={[styles.infoText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              • {t('backup.infoSaveCloud')}
            </Text>
            <Text style={[styles.infoText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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

const _styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: '#FAFAFA',
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
    marginTop: 20,
    marginBottom: 12,
  },
  statsCard: {
    borderRadius: 16,
    padding: 5,
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
  },
  infoValue: {
    fontSize: 15,
    fontFamily: fontBold(),
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
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
  },
  actionSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
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
    lineHeight: 24,
  },
  bottomSpace: {
    height: 100,
  },
});
