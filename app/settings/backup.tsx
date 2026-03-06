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
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSettings } from '@/contexts/SettingsContext';

// ========================================
// الثوابت
// ========================================

const BACKUP_VERSION = '1.0';
const BACKUP_FILENAME = 'rooh_muslim_backup';

interface BackupData {
  version: string;
  createdAt: string;
  device: string;
  data: {
    settings: any;
    worship: any;
    khatma: any;
    bookmarks: any;
    progress: any;
  };
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
  return (
    <TouchableOpacity
      style={[styles.actionCard, isDarkMode && styles.actionCardDark]}
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
      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, isDarkMode && styles.textLight]}>{title}</Text>
        <Text style={[styles.actionSubtitle, isDarkMode && styles.textMuted]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons
        name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
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
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, isDarkMode && styles.textMuted]}>{label}</Text>
      <Text style={[styles.infoValue, isDarkMode && styles.textLight]}>{value}</Text>
    </View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function BackupScreen() {
  const router = useRouter();
  const { settings, isDarkMode, exportSettings, importSettings } = useSettings();
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
      const bookmarks = await AsyncStorage.getItem('quran_bookmarks');
      const khatmas = await AsyncStorage.getItem('khatmas');
      const worship = await AsyncStorage.getItem('worship_records');
      const quranProgress = await AsyncStorage.getItem('quran_progress');

      setDataStats({
        bookmarks: bookmarks ? JSON.parse(bookmarks).length : 0,
        khatmas: khatmas ? JSON.parse(khatmas).length : 0,
        worshipDays: worship ? Object.keys(JSON.parse(worship)).length : 0,
        quranProgress: quranProgress ? JSON.parse(quranProgress).lastPage || 0 : 0,
      });
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  };

  const gatherAllData = async (): Promise<BackupData> => {
    const keys = await AsyncStorage.getAllKeys();
    const allData: { [key: string]: any } = {};

    for (const key of keys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          allData[key] = JSON.parse(value);
        }
      } catch {
        const value = await AsyncStorage.getItem(key);
        allData[key] = value;
      }
    }

    return {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      device: Platform.OS,
      data: {
        settings: allData['app_settings'] || {},
        worship: allData['worship_records'] || {},
        khatma: allData['khatmas'] || [],
        bookmarks: allData['quran_bookmarks'] || [],
        progress: {
          quran: allData['quran_progress'] || {},
          azkar: allData['azkar_progress'] || {},
        },
      },
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
          dialogTitle: 'حفظ النسخة الاحتياطية',
          UTI: 'public.json',
        });
      } else {
        await Share.share({
          message: jsonString,
          title: 'نسخة روح المسلم الاحتياطية',
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('تم بنجاح', 'تم إنشاء النسخة الاحتياطية بنجاح');
    } catch (error) {
      console.error('Error creating backup:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async () => {
    Alert.alert(
      'استعادة البيانات',
      'سيتم استبدال جميع البيانات الحالية بالبيانات من النسخة الاحتياطية. هل تريد المتابعة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'استعادة',
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
      if (!backupData.version || !backupData.data) {
        throw new Error('ملف النسخة الاحتياطية غير صالح');
      }

      // استعادة الإعدادات
      if (backupData.data.settings) {
        await AsyncStorage.setItem('app_settings', JSON.stringify(backupData.data.settings));
      }

      // استعادة سجلات العبادة
      if (backupData.data.worship) {
        await AsyncStorage.setItem('worship_records', JSON.stringify(backupData.data.worship));
      }

      // استعادة الختمات
      if (backupData.data.khatma) {
        await AsyncStorage.setItem('khatmas', JSON.stringify(backupData.data.khatma));
      }

      // استعادة المفضلة
      if (backupData.data.bookmarks) {
        await AsyncStorage.setItem('quran_bookmarks', JSON.stringify(backupData.data.bookmarks));
      }

      // استعادة التقدم
      if (backupData.data.progress) {
        if (backupData.data.progress.quran) {
          await AsyncStorage.setItem('quran_progress', JSON.stringify(backupData.data.progress.quran));
        }
        if (backupData.data.progress.azkar) {
          await AsyncStorage.setItem('azkar_progress', JSON.stringify(backupData.data.progress.azkar));
        }
      }

      await loadDataStats();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'تم بنجاح',
        `تمت استعادة البيانات من نسخة ${new Date(backupData.createdAt).toLocaleDateString('ar-SA')}`,
        [
          {
            text: 'حسناً',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error restoring backup:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('خطأ', 'حدث خطأ أثناء استعادة النسخة الاحتياطية. تأكد من صحة الملف.');
    } finally {
      setIsRestoring(false);
    }
  };

  const shareBackupAsText = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const settingsJson = exportSettings();
      await Share.share({
        message: settingsJson,
        title: 'إعدادات روح المسلم',
      });
    } catch (error) {
      console.error('Error sharing settings:', error);
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      'مسح جميع البيانات',
      'سيتم حذف جميع البيانات المحلية بما في ذلك الإعدادات والتقدم والمفضلة. لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح الكل',
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
              Alert.alert('تم', 'تم مسح جميع البيانات بنجاح');
            } catch (error) {
              Alert.alert('خطأ', 'حدث خطأ أثناء مسح البيانات');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'لا يوجد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, isDarkMode && styles.headerDark]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={isDarkMode ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>النسخ الاحتياطي</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

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
              {lastBackup.exists ? 'النسخة الاحتياطية محدثة' : 'لا توجد نسخة احتياطية'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {lastBackup.exists
                ? `آخر نسخة: ${formatDate(lastBackup.date)}`
                : 'أنشئ نسخة احتياطية للحفاظ على بياناتك'}
            </Text>
          </View>
        </Animated.View>

        {/* Data Stats */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>البيانات المحفوظة</Text>
          <View style={[styles.statsCard, isDarkMode && styles.statsCardDark]}>
            <InfoRow label="المفضلة والعلامات" value={`${dataStats.bookmarks} عنصر`} isDarkMode={isDarkMode} />
            <InfoRow label="الختمات" value={`${dataStats.khatmas} ختمة`} isDarkMode={isDarkMode} />
            <InfoRow label="أيام العبادة" value={`${dataStats.worshipDays} يوم`} isDarkMode={isDarkMode} />
            <InfoRow label="تقدم القرآن" value={`صفحة ${dataStats.quranProgress}`} isDarkMode={isDarkMode} />
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>الإجراءات</Text>

          <ActionCard
            icon="cloud-upload"
            iconColor="#fff"
            gradientColors={['#2f7659', '#1d4a3a']}
            title="إنشاء نسخة احتياطية"
            subtitle="حفظ جميع البيانات في ملف"
            onPress={createBackup}
            isLoading={isCreatingBackup}
            isDarkMode={isDarkMode}
          />

          <ActionCard
            icon="cloud-download"
            iconColor="#fff"
            gradientColors={['#3a7ca5', '#2a5a7a']}
            title="استعادة من نسخة"
            subtitle="استيراد البيانات من ملف سابق"
            onPress={restoreBackup}
            isLoading={isRestoring}
            isDarkMode={isDarkMode}
          />

          <ActionCard
            icon="share-variant"
            iconColor="#fff"
            gradientColors={['#5d4e8c', '#4a3d6e']}
            title="مشاركة الإعدادات"
            subtitle="مشاركة إعدادات التطبيق كنص"
            onPress={shareBackupAsText}
            isDarkMode={isDarkMode}
          />
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: '#ef5350' }]}>منطقة الخطر</Text>

          <ActionCard
            icon="delete-forever"
            iconColor="#fff"
            gradientColors={['#ef5350', '#c62828']}
            title="مسح جميع البيانات"
            subtitle="حذف كل البيانات المحلية نهائياً"
            onPress={clearAllData}
            isDarkMode={isDarkMode}
          />
        </Animated.View>

        {/* Info Card */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
          <View style={styles.infoContent}>
            <Text style={[styles.infoText, isDarkMode && styles.textMuted]}>
              • النسخة الاحتياطية تشمل: الإعدادات، التقدم، المفضلة، والختمات
            </Text>
            <Text style={[styles.infoText, isDarkMode && styles.textMuted]}>
              • يمكنك حفظ الملف في iCloud أو Google Drive
            </Text>
            <Text style={[styles.infoText, isDarkMode && styles.textMuted]}>
              • ننصح بعمل نسخة احتياطية أسبوعياً
            </Text>
          </View>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerDark: {
    backgroundColor: '#1a1a2e',
    borderBottomColor: '#2a2a3e',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  headerPlaceholder: {
    width: 40,
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
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
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    marginBottom: 5,
  },
  statusSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Regular',
    color: '#333',
    lineHeight: 24,
    textAlign: 'right',
  },
  bottomSpace: {
    height: 100,
  },
});
