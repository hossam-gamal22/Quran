import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../constants/theme';
import { APP_CONFIG } from '../constants/app';
import { Share } from 'react-native';
import { copyToClipboard } from '../lib/share-service';
import { fetchHijriDate } from '../lib/prayer-api';
import { ISLAMIC_EVENTS } from '../lib/hijri-date';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BannerAdComponent } from '@/components/ads/BannerAd';

// ============================================
// أسماء الأشهر والأيام
// ============================================

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
  'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'
];

const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const GREGORIAN_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// ============================================
// المناسبات الإسلامية
// ============================================
// Islamic Events are imported from lib/hijri-date.ts - a trusted source

// ============================================
// المكون الرئيسي
// ============================================

export default function HijriScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDarkMode, settings } = useSettings();
  const insets = useSafeAreaInsets();
  
  // الحالات
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [hijriDate, setHijriDate] = useState<{
    day: string;
    month: { number: number; ar: string; en: string };
    year: string;
    weekday: { ar: string; en: string };
  } | null>(null);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [dateParamProcessed, setDateParamProcessed] = useState(false);

  // ============================================
  // تحميل التاريخ
  // ============================================

  // Process date param once when component mounts
  useEffect(() => {
    if (dateParamProcessed) return; // Only process once
    
    if (params?.date) {
      try {
        const decoded = decodeURIComponent(params.date as string);
        const parsed = new Date(decoded);
        if (!isNaN(parsed.getTime())) {
          setCurrentDate(parsed);
          setDateParamProcessed(true);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse date param:', e);
      }
    }
    
    // If no valid date param, use today
    setCurrentDate(new Date());
    setDateParamProcessed(true);
  }, [params?.date, dateParamProcessed]);

  // Load hijri data whenever `currentDate` changes
  useEffect(() => {
    if (currentDate) {
      loadHijriDate();
    }
  }, [currentDate]);

  const loadHijriDate = async () => {
    try {
      setLoading(true);
      const data = await fetchHijriDate(currentDate);
      setHijriDate(data.hijri);
      setSelectedMonth(data.hijri.month.number);
    } catch (error) {
      console.error('Error loading hijri date:', error);
      // حساب تقريبي للتاريخ الهجري
      const approxHijri = approximateHijriDate(currentDate);
      setHijriDate(approxHijri);
    } finally {
      setLoading(false);
    }
  };

  // حساب تقريبي للتاريخ الهجري (للاستخدام offline)
  const approximateHijriDate = (date: Date) => {
    const gregorianYear = date.getFullYear();
    const gregorianMonth = date.getMonth();
    const gregorianDay = date.getDate();
    
    // حساب تقريبي
    const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
    const hijriMonth = ((gregorianMonth + 1) % 12) + 1;
    const hijriDay = gregorianDay;
    
    return {
      day: String(hijriDay),
      month: { 
        number: hijriMonth, 
        ar: HIJRI_MONTHS[hijriMonth - 1], 
        en: HIJRI_MONTHS_EN[hijriMonth - 1] 
      },
      year: String(hijriYear),
      weekday: { 
        ar: WEEKDAYS_AR[date.getDay()], 
        en: '' 
      },
    };
  };

  // ============================================
  // التنقل بين التواريخ
  // ============================================

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // ============================================
  // المشاركة
  // ============================================

  const formatDateForShare = () => {
    if (!hijriDate) return '';
    
    let shareText = `📅 التاريخ الهجري\n\n`;
    shareText += `🌙 ${hijriDate.weekday.ar}\n`;
    shareText += `📆 ${hijriDate.day} ${hijriDate.month.ar} ${hijriDate.year}هـ\n`;
    shareText += `📅 ${currentDate.getDate()} ${GREGORIAN_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}م\n`;
    
    // إضافة المناسبة إن وجدت
    const event = getEventForDate(parseInt(hijriDate.month.number.toString()), parseInt(hijriDate.day));
    if (event) {
      shareText += `\n🎉 ${event.name}\n${event.description}`;
    }
    
    shareText += `\n\n${APP_CONFIG.getShareSignature()}`;
    
    return shareText;
  };

  const handleShare = async () => {
    try {
      const shareText = formatDateForShare();
      await Share.share({ message: shareText });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopy = async () => {
    const shareText = formatDateForShare();
    await copyToClipboard(shareText);
    Alert.alert('تم النسخ', 'تم نسخ التاريخ');
  };

  // ============================================
  // الحصول على مناسبة اليوم
  // ============================================

  const getEventForDate = (month: number, day: number) => {
    return ISLAMIC_EVENTS.find(e => e.hijriMonth === month && e.hijriDay === day);
  };

  const getEventsForMonth = (month: number) => {
    return ISLAMIC_EVENTS.filter(e => e.hijriMonth === month);
  };

  const todayEvent = hijriDate 
    ? getEventForDate(hijriDate.month.number, parseInt(hijriDate.day))
    : undefined;

  // ============================================
  // العرض
  // ============================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="calendar-outline" size={48} color={Colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل التاريخ...</Text>
      </View>
    );
  }

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      style={[styles.container, isDarkMode && { backgroundColor: '#11151c' }]}
    >
      {/* الهيدر */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: 'rgba(120,120,128,0.18)' }]}>
          <Ionicons name="arrow-forward" size={24} color={isDarkMode ? '#fff' : Colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, isDarkMode && { color: '#fff' }]}>التقويم الهجري</Text>
        
        <TouchableOpacity onPress={handleShare} style={[styles.headerButton, { backgroundColor: 'rgba(120,120,128,0.18)' }]}>
          <Ionicons name="share-outline" size={24} color={isDarkMode ? '#fff' : Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* بطاقة التاريخ الرئيسية */}
        <View style={styles.mainDateCard}>
          <Text style={styles.weekdayText}>{hijriDate?.weekday.ar}</Text>
          
          <View style={styles.dateDisplay}>
            <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={32} color={Colors.primary} />
            </TouchableOpacity>
            
            <View style={styles.dateCenter}>
              <Text style={styles.hijriDay}>{hijriDate?.day}</Text>
              <Text style={styles.hijriMonth}>{hijriDate?.month.ar}</Text>
              <Text style={styles.hijriYear}>{hijriDate?.year}هـ</Text>
            </View>
            
            <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
              <Ionicons name="chevron-back" size={32} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.gregorianDate}>
            <Text style={styles.gregorianText}>
              {currentDate.getDate()} {GREGORIAN_MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}م
            </Text>
          </View>

          {/* زر العودة لليوم */}
          {currentDate.toDateString() !== new Date().toDateString() && (
            <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
              <Ionicons name="today-outline" size={18} color={Colors.primary} />
              <Text style={styles.todayButtonText}>اليوم</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* مناسبة اليوم */}
        {todayEvent && (
          <View style={[
            styles.eventCard,
            todayEvent.type === 'holiday' && styles.eventCardHoliday,
            todayEvent.type === 'fasting' && styles.eventCardFasting,
            todayEvent.type === 'special' && styles.eventCardSpecial,
            todayEvent.type === 'observance' && styles.eventCardObservance,
          ]}>
            <View style={styles.eventIcon}>
              <Ionicons 
                name={
                  todayEvent.type === 'holiday' ? 'star' : 
                  todayEvent.type === 'fasting' ? 'restaurant-outline' :
                  todayEvent.type === 'special' ? 'sparkles' : 'moon'
                } 
                size={24} 
                color={
                  todayEvent.type === 'holiday' ? Colors.gold : 
                  todayEvent.type === 'fasting' ? Colors.success :
                  todayEvent.type === 'special' ? Colors.secondary : Colors.primary
                } 
              />
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>{todayEvent.nameAr}</Text>
              <Text style={styles.eventDescription}>{todayEvent.descriptionAr}</Text>
            </View>
          </View>
        )}

        {/* أزرار سريعة */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => setShowEventsModal(true)}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="calendar" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.quickActionText}>المناسبات</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={handleShare}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="share-social" size={24} color={Colors.secondary} />
            </View>
            <Text style={styles.quickActionText}>مشاركة</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={handleCopy}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="copy" size={24} color={Colors.success} />
            </View>
            <Text style={styles.quickActionText}>نسخ</Text>
          </TouchableOpacity>
        </View>

        {/* الأشهر الهجرية */}
        <View style={styles.monthsSection}>
          <Text style={styles.sectionTitle}>الأشهر الهجرية</Text>
          <View style={styles.monthsGrid}>
            {HIJRI_MONTHS.map((month, index) => {
              const events = getEventsForMonth(index + 1);
              const isCurrentMonth = hijriDate?.month.number === index + 1;
              
              return (
                <TouchableOpacity 
                  key={index}
                  style={[
                    styles.monthItem,
                    isCurrentMonth && styles.monthItemActive,
                  ]}
                  onPress={() => {
                    setSelectedMonth(index + 1);
                    setShowEventsModal(true);
                  }}
                >
                  <Text style={[
                    styles.monthNumber,
                    isCurrentMonth && styles.monthNumberActive,
                  ]}>{index + 1}</Text>
                  <Text style={[
                    styles.monthName,
                    isCurrentMonth && styles.monthNameActive,
                  ]}>{month}</Text>
                  {events.length > 0 && (
                    <View style={styles.monthEventDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* معلومات إضافية */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.info} />
          <Text style={styles.infoText}>
            التقويم الهجري يعتمد على دورة القمر، وقد يختلف يوم أو يومين حسب رؤية الهلال في بلدك
          </Text>
        </View>

        <BannerAdComponent screen="hijri" />
      </ScrollView>

      {/* ============================================ */}
      {/* نافذة المناسبات */}
      {/* ============================================ */}
      <Modal
        visible={showEventsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEventsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>المناسبات الإسلامية</Text>
              <TouchableOpacity onPress={() => setShowEventsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* اختيار الشهر */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.monthSelector}
            >
              <TouchableOpacity
                style={[styles.monthTab, selectedMonth === 0 && styles.monthTabActive]}
                onPress={() => setSelectedMonth(0)}
              >
                <Text style={[
                  styles.monthTabText,
                  selectedMonth === 0 && styles.monthTabTextActive
                ]}>الكل</Text>
              </TouchableOpacity>
              {HIJRI_MONTHS.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.monthTab, selectedMonth === index + 1 && styles.monthTabActive]}
                  onPress={() => setSelectedMonth(index + 1)}
                >
                  <Text style={[
                    styles.monthTabText,
                    selectedMonth === index + 1 && styles.monthTabTextActive
                  ]}>{month}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={styles.eventsList}>
              {(selectedMonth === 0 ? ISLAMIC_EVENTS : getEventsForMonth(selectedMonth))
                .map((event, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.eventListItem}
                    onPress={async () => {
                      const shareText = `🌙 ${event.name}\n📅 ${event.day} ${HIJRI_MONTHS[event.month - 1]}\n${event.description}\n\n${APP_CONFIG.getShareSignature()}`;
                      await Share.share({ message: shareText });
                    }}
                  >
                    <View style={[
                      styles.eventListIcon,
                      event.type === 'holiday' && { backgroundColor: Colors.gold + '20' },
                      event.type === 'fasting' && { backgroundColor: Colors.success + '20' },
                      event.type === 'special' && { backgroundColor: Colors.primary + '20' },
                    ]}>
                      <Ionicons 
                        name={
                          event.type === 'holiday' ? 'star' : 
                          event.type === 'fasting' ? 'restaurant-outline' : 'moon'
                        } 
                        size={20} 
                        color={
                          event.type === 'holiday' ? Colors.gold : 
                          event.type === 'fasting' ? Colors.success : Colors.primary
                        } 
                      />
                    </View>
                    <View style={styles.eventListInfo}>
                      <Text style={styles.eventListName}>{event.name}</Text>
                      <Text style={styles.eventListDate}>
                        {event.day} {HIJRI_MONTHS[event.month - 1]}
                      </Text>
                      <Text style={styles.eventListDesc}>{event.description}</Text>
                    </View>
                    <Ionicons name="share-outline" size={20} color={Colors.textLight} />
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </BackgroundWrapper>
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
    paddingBottom: Spacing.md,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  mainDateCard: {
    backgroundColor: 'rgba(47,118,89,0.85)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.md,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  weekdayText: {
    fontSize: Typography.sizes.lg,
    color: Colors.white,
    opacity: 0.9,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  navButton: {
    padding: Spacing.md,
  },
  dateCenter: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  hijriDay: {
    fontSize: 64,
    fontWeight: '700',
    color: Colors.white,
  },
  hijriMonth: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '600',
    color: Colors.white,
    marginTop: Spacing.xs,
  },
  hijriYear: {
    fontSize: Typography.sizes.lg,
    color: Colors.white,
    opacity: 0.9,
    marginTop: Spacing.xs,
  },
  gregorianDate: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  gregorianText: {
    fontSize: Typography.sizes.md,
    color: Colors.white,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  todayButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120,120,128,0.12)',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eventCardHoliday: {
    backgroundColor: Colors.gold + '10',
    borderColor: Colors.gold,
    borderWidth: 1,
  },
  eventCardFasting: {
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success,
    borderWidth: 1,
  },
  eventCardSpecial: {
    backgroundColor: Colors.secondary + '10',
    borderColor: Colors.secondary,
    borderWidth: 1,
  },
  eventCardObservance: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(120,120,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  eventName: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  eventDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  monthsSection: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  monthItem: {
    width: '31%',
    backgroundColor: 'rgba(120,120,128,0.12)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  monthItemActive: {
    backgroundColor: 'rgba(47,118,89,0.85)',
  },
  monthNumber: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  monthNumberActive: {
    color: Colors.white,
  },
  monthName: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  monthNameActive: {
    color: Colors.white,
  },
  monthEventDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120,120,128,0.1)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '80%',
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  monthSelector: {
    marginBottom: Spacing.md,
  },
  monthTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(120,120,128,0.15)',
  },
  monthTabActive: {
    backgroundColor: 'rgba(47,118,89,0.85)',
  },
  monthTabText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  monthTabTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  eventsList: {
    flex: 1,
  },
  eventListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120,120,128,0.12)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eventListIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,128,0.1)',
  },
  eventListInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  eventListName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  eventListDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    marginTop: 2,
  },
  eventListDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
});
