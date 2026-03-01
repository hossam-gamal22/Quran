import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/app';
import { Share } from 'react-native';
import { copyToClipboard } from '../../lib/share-service';
import {
  fetchPrayerTimesByCoords,
  fetchHijriDate,
  PrayerTimesResponse,
  PrayerTimes,
  CALCULATION_METHODS,
  PRAYER_NAMES,
  formatTime,
  getNextPrayer,
  getPrayerIcon,
  getPrayerColor,
} from '../../lib/prayer-api';

// ============================================
// المكون الرئيسي
// ============================================

export default function PrayerScreen() {
  const router = useRouter();
  
  // الحالات
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prayerData, setPrayerData] = useState<PrayerTimesResponse | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; city?: string } | null>(null);
  const [calculationMethod, setCalculationMethod] = useState(4); // أم القرى
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [notifications, setNotifications] = useState<{ [key: string]: boolean }>({
    Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true,
  });
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // الأنيميشن
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // ============================================
  // تحميل البيانات
  // ============================================

  useEffect(() => {
    loadSettings();
    loadPrayerTimes();
    
    // تحديث الوقت كل دقيقة
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    return () => clearInterval(timer);
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('prayer_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setCalculationMethod(parsed.method ?? 4);
        setTimeFormat(parsed.timeFormat ?? '12h');
        setNotifications(parsed.notifications ?? {
          Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('prayer_settings', JSON.stringify({
        method: calculationMethod,
        timeFormat,
        notifications,
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const loadPrayerTimes = async () => {
    try {
      setLoading(true);
      
      // طلب إذن الموقع
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يرجى السماح بالوصول إلى الموقع لعرض مواقيت الصلاة');
        setLoading(false);
        return;
      }

      // الحصول على الموقع
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      // الحصول على اسم المدينة
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const city = address?.city || address?.region || 'موقعك الحالي';

      setLocation({ latitude, longitude, city });

      // جلب مواقيت الصلاة
      const data = await fetchPrayerTimesByCoords(latitude, longitude, calculationMethod);
      setPrayerData(data);

      // حفظ البيانات للاستخدام offline
      await AsyncStorage.setItem('cached_prayer_times', JSON.stringify({
        data,
        location: { latitude, longitude, city },
        timestamp: Date.now(),
      }));

    } catch (error) {
      console.error('Error loading prayer times:', error);
      
      // محاولة استخدام البيانات المحفوظة
      try {
        const cached = await AsyncStorage.getItem('cached_prayer_times');
        if (cached) {
          const { data, location: cachedLoc } = JSON.parse(cached);
          setPrayerData(data);
          setLocation(cachedLoc);
          Alert.alert('تنبيه', 'تم عرض آخر مواقيت محفوظة');
        }
      } catch (e) {
        Alert.alert('خطأ', 'فشل في تحميل مواقيت الصلاة');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPrayerTimes();
  };

  // ============================================
  // الإشعارات
  // ============================================

  const toggleNotification = async (prayer: string) => {
    const newNotifications = {
      ...notifications,
      [prayer]: !notifications[prayer],
    };
    setNotifications(newNotifications);
    
    await AsyncStorage.setItem('prayer_settings', JSON.stringify({
      method: calculationMethod,
      timeFormat,
      notifications: newNotifications,
    }));

    // TODO: جدولة/إلغاء الإشعار
  };

  // ============================================
  // المشاركة
  // ============================================

  const formatPrayerTimesForShare = () => {
    if (!prayerData) return '';
    
    const { timings, date } = prayerData;
    const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
    
    let shareText = `🕌 مواقيت الصلاة\n`;
    shareText += `📍 ${location?.city || 'موقعي'}\n`;
    shareText += `📅 ${date.hijri.day} ${date.hijri.month.ar} ${date.hijri.year}هـ\n`;
    shareText += `📆 ${date.gregorian.day} ${date.gregorian.month.en} ${date.gregorian.year}م\n\n`;
    
    prayers.forEach(prayer => {
      const icon = prayer === 'Fajr' ? '🌙' : 
                   prayer === 'Sunrise' ? '🌅' :
                   prayer === 'Dhuhr' ? '☀️' :
                   prayer === 'Asr' ? '🌤️' :
                   prayer === 'Maghrib' ? '🌇' : '🌃';
      shareText += `${icon} ${PRAYER_NAMES[prayer].ar}: ${formatTime(timings[prayer], timeFormat)}\n`;
    });
    
    shareText += `\n${APP_CONFIG.getShareSignature()}`;
    
    return shareText;
  };

  const handleShare = async () => {
    try {
      const shareText = formatPrayerTimesForShare();
      await Share.share({ message: shareText });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopy = async () => {
    const shareText = formatPrayerTimesForShare();
    await copyToClipboard(shareText);
    Alert.alert('تم النسخ', 'تم نسخ مواقيت الصلاة');
    setShowShareModal(false);
  };

  // ============================================
  // حساب الصلاة التالية
  // ============================================

  const nextPrayer = prayerData ? getNextPrayer(prayerData.timings) : null;

  // ============================================
  // العرض
  // ============================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="time-outline" size={48} color={Colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل مواقيت الصلاة...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* الهيدر */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/qibla')} style={styles.headerButton}>
          <Ionicons name="compass-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>مواقيت الصلاة</Text>
        
        <TouchableOpacity onPress={() => setShowShareModal(true)} style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          {/* بطاقة الموقع والتاريخ */}
          <View style={styles.locationCard}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={styles.locationText}>{location?.city || 'موقعك'}</Text>
            </View>
            
            {prayerData && (
              <View style={styles.dateInfo}>
                <Text style={styles.hijriDate}>
                  {prayerData.date.hijri.day} {prayerData.date.hijri.month.ar} {prayerData.date.hijri.year}هـ
                </Text>
                <Text style={styles.gregorianDate}>
                  {prayerData.date.gregorian.day} {prayerData.date.gregorian.month.en} {prayerData.date.gregorian.year}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.methodButton}
              onPress={() => setShowMethodModal(true)}
            >
              <Ionicons name="settings-outline" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* بطاقة الصلاة التالية */}
          {nextPrayer && (
            <View style={styles.nextPrayerCard}>
              <View style={styles.nextPrayerHeader}>
                <Text style={styles.nextPrayerLabel}>الصلاة القادمة</Text>
                <Text style={styles.nextPrayerRemaining}>{nextPrayer.remaining}</Text>
              </View>
              
              <View style={styles.nextPrayerContent}>
                <View style={[styles.nextPrayerIcon, { backgroundColor: getPrayerColor(nextPrayer.name) + '20' }]}>
                  <Ionicons 
                    name={getPrayerIcon(nextPrayer.name) as any} 
                    size={32} 
                    color={getPrayerColor(nextPrayer.name)} 
                  />
                </View>
                <View style={styles.nextPrayerInfo}>
                  <Text style={styles.nextPrayerName}>
                    {PRAYER_NAMES[nextPrayer.name]?.ar || nextPrayer.name}
                  </Text>
                  <Text style={styles.nextPrayerTime}>
                    {formatTime(nextPrayer.time, timeFormat)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* قائمة الصلوات */}
          <View style={styles.prayersList}>
            {prayerData && ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer) => {
              const isNext = nextPrayer?.name === prayer;
              const prayerTime = prayerData.timings[prayer as keyof PrayerTimes];
              
              return (
                <View 
                  key={prayer} 
                  style={[styles.prayerItem, isNext && styles.prayerItemActive]}
                >
                  <View style={styles.prayerItemLeft}>
                    <View style={[
                      styles.prayerIcon, 
                      { backgroundColor: getPrayerColor(prayer) + '15' }
                    ]}>
                      <Ionicons 
                        name={getPrayerIcon(prayer) as any} 
                        size={22} 
                        color={getPrayerColor(prayer)} 
                      />
                    </View>
                    <View>
                      <Text style={[styles.prayerName, isNext && styles.prayerNameActive]}>
                        {PRAYER_NAMES[prayer]?.ar || prayer}
                      </Text>
                      {isNext && (
                        <Text style={styles.prayerNextBadge}>التالية</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.prayerItemRight}>
                    <Text style={[styles.prayerTime, isNext && styles.prayerTimeActive]}>
                      {formatTime(prayerTime, timeFormat)}
                    </Text>
                    
                    {prayer !== 'Sunrise' && (
                      <TouchableOpacity 
                        style={styles.notificationButton}
                        onPress={() => toggleNotification(prayer)}
                      >
                        <Ionicons 
                          name={notifications[prayer] ? 'notifications' : 'notifications-outline'} 
                          size={20} 
                          color={notifications[prayer] ? Colors.primary : Colors.textLight} 
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* أزرار سريعة */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/qibla')}
            >
              <Ionicons name="compass" size={24} color={Colors.primary} />
              <Text style={styles.quickActionText}>القبلة</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/hijri')}
            >
              <Ionicons name="calendar" size={24} color={Colors.secondary} />
              <Text style={styles.quickActionText}>التقويم</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={handleShare}
            >
              <Ionicons name="share-social" size={24} color={Colors.success} />
              <Text style={styles.quickActionText}>مشاركة</Text>
            </TouchableOpacity>
          </View>

          {/* طريقة الحساب */}
          <TouchableOpacity 
            style={styles.methodCard}
            onPress={() => setShowMethodModal(true)}
          >
            <Ionicons name="calculator-outline" size={20} color={Colors.textLight} />
            <Text style={styles.methodText}>
              طريقة الحساب: {CALCULATION_METHODS.find(m => m.id === calculationMethod)?.nameAr}
            </Text>
            <Ionicons name="chevron-back" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* ============================================ */}
      {/* نافذة طريقة الحساب */}
      {/* ============================================ */}
      <Modal
        visible={showMethodModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMethodModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>طريقة الحساب</Text>
              <TouchableOpacity onPress={() => setShowMethodModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.methodsList}>
              {CALCULATION_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodItem,
                    calculationMethod === method.id && styles.methodItemSelected,
                  ]}
                  onPress={async () => {
                    setCalculationMethod(method.id);
                    setShowMethodModal(false);
                    await saveSettings();
                    loadPrayerTimes();
                  }}
                >
                  <View style={styles.methodItemContent}>
                    <Text style={styles.methodItemName}>{method.nameAr}</Text>
                    <Text style={styles.methodItemParams}>
                      الفجر: {method.params.Fajr}° | العشاء: {method.params.Isha}
                    </Text>
                  </View>
                  {calculationMethod === method.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* تنسيق الوقت */}
            <View style={styles.timeFormatSection}>
              <Text style={styles.timeFormatLabel}>تنسيق الوقت</Text>
              <View style={styles.timeFormatButtons}>
                <TouchableOpacity
                  style={[
                    styles.timeFormatButton,
                    timeFormat === '12h' && styles.timeFormatButtonActive,
                  ]}
                  onPress={() => {
                    setTimeFormat('12h');
                    saveSettings();
                  }}
                >
                  <Text style={[
                    styles.timeFormatButtonText,
                    timeFormat === '12h' && styles.timeFormatButtonTextActive,
                  ]}>12 ساعة</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timeFormatButton,
                    timeFormat === '24h' && styles.timeFormatButtonActive,
                  ]}
                  onPress={() => {
                    setTimeFormat('24h');
                    saveSettings();
                  }}
                >
                  <Text style={[
                    styles.timeFormatButtonText,
                    timeFormat === '24h' && styles.timeFormatButtonTextActive,
                  ]}>24 ساعة</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* نافذة المشاركة */}
      {/* ============================================ */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>مشاركة المواقيت</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.sharePreview}>
              <Ionicons name="time" size={40} color={Colors.primary} />
              <Text style={styles.sharePreviewTitle}>مواقيت الصلاة</Text>
              <Text style={styles.sharePreviewSubtitle}>{location?.city}</Text>
            </View>

            <View style={styles.shareOptions}>
              <TouchableOpacity 
                style={styles.shareOption} 
                onPress={() => {
                  handleShare();
                  setShowShareModal(false);
                }}
              >
                <View style={[styles.shareOptionIcon, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="share-outline" size={24} color={Colors.white} />
                </View>
                <Text style={styles.shareOptionText}>مشاركة</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareOption} onPress={handleCopy}>
                <View style={[styles.shareOptionIcon, { backgroundColor: Colors.secondary }]}>
                  <Ionicons name="copy-outline" size={24} color={Colors.white} />
                </View>
                <Text style={styles.shareOptionText}>نسخ</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.shareOption} 
                onPress={async () => {
                  const text = formatPrayerTimesForShare();
                  await Share.share({ message: text });
                  setShowShareModal(false);
                }}
              >
                <View style={[styles.shareOptionIcon, { backgroundColor: '#25D366' }]}>
                  <Ionicons name="logo-whatsapp" size={24} color={Colors.white} />
                </View>
                <Text style={styles.shareOptionText}>واتساب</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// الأنماط
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  dateInfo: {
    alignItems: 'center',
  },
  hijriDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  gregorianDate: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  methodButton: {
    padding: Spacing.sm,
  },
  nextPrayerCard: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  nextPrayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  nextPrayerLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    opacity: 0.9,
  },
  nextPrayerRemaining: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  nextPrayerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  nextPrayerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  nextPrayerInfo: {
    flex: 1,
  },
  nextPrayerName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.white,
  },
  nextPrayerTime: {
    fontSize: Typography.sizes.xl,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  prayersList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  prayerItemActive: {
    backgroundColor: Colors.primary + '10',
  },
  prayerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  prayerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  prayerNameActive: {
    color: Colors.primary,
  },
  prayerNextBadge: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    marginTop: 2,
  },
  prayerItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  prayerTime: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  prayerTimeActive: {
    color: Colors.primary,
  },
  notificationButton: {
    padding: Spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  quickActionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  methodText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '70%',
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  methodsList: {
    flex: 1,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  methodItemSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  methodItemContent: {
    flex: 1,
  },
  methodItemName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
  },
  methodItemParams: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: 'right',
  },
  timeFormatSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeFormatLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  timeFormatButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeFormatButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    ...Shadows.sm,
  },
  timeFormatButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeFormatButtonText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  timeFormatButtonTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  sharePreview: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sharePreviewTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  sharePreviewSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: 4,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
  },
  shareOption: {
    alignItems: 'center',
  },
  shareOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  shareOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
});
