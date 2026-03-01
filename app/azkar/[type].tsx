// app/azkar/[type].tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Vibration,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import ShareButton from '../../components/ShareButton';
import QuickShareBar from '../../components/QuickShareBar';
import {
  shareZikr,
  copyToClipboard,
  formatZikrForShare,
  ShareContent,
} from '../../lib/share-service';
import {
  MORNING_AZKAR,
  EVENING_AZKAR,
  AFTER_PRAYER_AZKAR,
  SLEEP_AZKAR,
  WAKEUP_AZKAR,
  MISC_AZKAR,
  Zikr,
  AZKAR_CATEGORIES,
} from '../../lib/azkar-api';

// ===============================
// أنواع البيانات
// ===============================
interface ZikrWithProgress extends Zikr {
  currentCount: number;
  isCompleted: boolean;
}

interface AzkarData {
  title: string;
  titleEn: string;
  description: string;
  icon: string;
  color: string;
  azkar: Zikr[];
  audioUrl?: string;
}

// ===============================
// بيانات الأذكار حسب النوع
// ===============================
const AZKAR_DATA: Record<string, AzkarData> = {
  morning: {
    title: 'أذكار الصباح',
    titleEn: 'Morning Azkar',
    description: 'تُقال بعد صلاة الفجر حتى طلوع الشمس',
    icon: 'sunny',
    color: '#F59E0B',
    azkar: MORNING_AZKAR,
    audioUrl: 'http://www.hisnmuslim.com/audio/ar/ar_7esn_AlMoslem_by_Doors_028.mp3',
  },
  evening: {
    title: 'أذكار المساء',
    titleEn: 'Evening Azkar',
    description: 'تُقال بعد صلاة العصر حتى غروب الشمس',
    icon: 'moon',
    color: '#6366F1',
    azkar: EVENING_AZKAR,
    audioUrl: 'http://www.hisnmuslim.com/audio/ar/ar_7esn_AlMoslem_by_Doors_028.mp3',
  },
  'after-prayer': {
    title: 'أذكار بعد الصلاة',
    titleEn: 'After Prayer Azkar',
    description: 'تُقال بعد السلام من الصلاة المفروضة',
    icon: 'hand-left',
    color: '#22C55E',
    azkar: AFTER_PRAYER_AZKAR,
    audioUrl: 'http://www.hisnmuslim.com/audio/ar/ar_7esn_AlMoslem_by_Doors_026.mp3',
  },
  sleep: {
    title: 'أذكار النوم',
    titleEn: 'Sleep Azkar',
    description: 'تُقال قبل النوم',
    icon: 'bed',
    color: '#8B5CF6',
    azkar: SLEEP_AZKAR,
    audioUrl: 'http://www.hisnmuslim.com/audio/ar/ar_7esn_AlMoslem_by_Doors_029.mp3',
  },
  wakeup: {
    title: 'أذكار الاستيقاظ',
    titleEn: 'Wake Up Azkar',
    description: 'تُقال عند الاستيقاظ من النوم',
    icon: 'alarm',
    color: '#EC4899',
    azkar: WAKEUP_AZKAR,
    audioUrl: 'http://www.hisnmuslim.com/audio/ar/ar_7esn_AlMoslem_by_Doors_002.mp3',
  },
  misc: {
    title: 'أذكار متنوعة',
    titleEn: 'Miscellaneous Azkar',
    description: 'أذكار دخول وخروج المنزل والمسجد وغيرها',
    icon: 'apps',
    color: '#14B8A6',
    azkar: MISC_AZKAR,
  },
};

// ===============================
// المكون الرئيسي
// ===============================
export default function AzkarScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  
  // الحالة
  const [loading, setLoading] = useState(true);
  const [azkar, setAzkar] = useState<ZikrWithProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showReference, setShowReference] = useState(true);
  const [showBenefit, setShowBenefit] = useState(true);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedZikr, setSelectedZikr] = useState<ZikrWithProgress | null>(null);
  
  // الرسوم المتحركة
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // بيانات النوع الحالي
  const currentData = AZKAR_DATA[type || 'morning'];
  
  // ===============================
  // تحميل البيانات
  // ===============================
  useEffect(() => {
    loadData();
  }, [type]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // تحميل الأذكار المحفوظة
      const savedKey = `azkar_progress_${type}`;
      const savedData = await AsyncStorage.getItem(savedKey);
      
      // تحميل الإشارات المرجعية
      const savedBookmarks = await AsyncStorage.getItem('azkar_bookmarks');
      if (savedBookmarks) {
        setBookmarks(JSON.parse(savedBookmarks));
      }
      
      // تحميل الإعدادات
      const settings = await AsyncStorage.getItem('azkar_settings');
      if (settings) {
        const { vibration, reference, benefit } = JSON.parse(settings);
        setVibrationEnabled(vibration ?? true);
        setShowReference(reference ?? true);
        setShowBenefit(benefit ?? true);
      }
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // التحقق من أن البيانات من نفس اليوم
        const today = new Date().toDateString();
        if (parsed.date === today) {
          setAzkar(parsed.azkar);
          setCurrentIndex(parsed.currentIndex || 0);
        } else {
          initializeAzkar();
        }
      } else {
        initializeAzkar();
      }
    } catch (error) {
      console.error('Error loading azkar:', error);
      initializeAzkar();
    } finally {
      setLoading(false);
    }
  };
  
  const initializeAzkar = () => {
    if (!currentData) return;
    
    const initialAzkar: ZikrWithProgress[] = currentData.azkar.map(zikr => ({
      ...zikr,
      currentCount: 0,
      isCompleted: false,
    }));
    
    setAzkar(initialAzkar);
    setCurrentIndex(0);
  };
  
  // ===============================
  // حفظ البيانات
  // ===============================
  const saveProgress = async (updatedAzkar: ZikrWithProgress[], index: number) => {
    try {
      const savedKey = `azkar_progress_${type}`;
      await AsyncStorage.setItem(savedKey, JSON.stringify({
        date: new Date().toDateString(),
        azkar: updatedAzkar,
        currentIndex: index,
      }));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };
  
  // ===============================
  // معالجة الضغط على الذكر
  // ===============================
  const handleZikrPress = (index: number) => {
    const updatedAzkar = [...azkar];
    const currentZikr = updatedAzkar[index];
    
    if (currentZikr.isCompleted) return;
    
    // زيادة العداد
    currentZikr.currentCount += 1;
    
    // الاهتزاز
    if (vibrationEnabled) {
      Vibration.vibrate(50);
    }
    
    // رسم متحرك للضغط
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // التحقق من الاكتمال
    if (currentZikr.currentCount >= currentZikr.count) {
      currentZikr.isCompleted = true;
      
      // اهتزاز أقوى عند الاكتمال
      if (vibrationEnabled) {
        Vibration.vibrate([0, 100, 50, 100]);
      }
      
      // الانتقال للذكر التالي
      const nextIndex = findNextIncomplete(updatedAzkar, index);
      if (nextIndex !== -1) {
        setTimeout(() => {
          animateToNext(nextIndex);
        }, 500);
      } else {
        // اكتمال جميع الأذكار
        Alert.alert(
          'بارك الله فيك! 🤲',
          'أتممت جميع الأذكار، جعلها الله في ميزان حسناتك',
          [{ text: 'آمين', style: 'default' }]
        );
      }
    }
    
    setAzkar(updatedAzkar);
    saveProgress(updatedAzkar, currentIndex);
  };
  
  const findNextIncomplete = (azkarList: ZikrWithProgress[], fromIndex: number): number => {
    // البحث من الموقع الحالي
    for (let i = fromIndex + 1; i < azkarList.length; i++) {
      if (!azkarList[i].isCompleted) return i;
    }
    // البحث من البداية
    for (let i = 0; i < fromIndex; i++) {
      if (!azkarList[i].isCompleted) return i;
    }
    return -1;
  };
  
  const animateToNext = (nextIndex: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setCurrentIndex(nextIndex);
  };
  
  // ===============================
  // إعادة تعيين الأذكار
  // ===============================
  const handleReset = () => {
    Alert.alert(
      'إعادة تعيين',
      'هل تريد إعادة تعيين جميع الأذكار؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة تعيين',
          style: 'destructive',
          onPress: () => {
            initializeAzkar();
            AsyncStorage.removeItem(`azkar_progress_${type}`);
          },
        },
      ]
    );
  };
  
  // ===============================
  // المشاركة
  // ===============================
  const handleShare = async (zikr: ZikrWithProgress) => {
    const success = await shareZikr(
      zikr.text,
      currentData.title,
      zikr.reference,
      zikr.referenceNumber,
      zikr.benefit
    );
    
    if (success) {
      // يمكن إضافة تتبع للمشاركات هنا
    }
  };
  
  const handleCopy = async (zikr: ZikrWithProgress) => {
    const content: ShareContent = {
      type: 'zikr',
      title: currentData.title,
      arabicText: zikr.text,
      reference: zikr.reference,
      referenceNumber: zikr.referenceNumber,
      benefit: zikr.benefit,
    };
    
    const text = formatZikrForShare(content, { includeAppName: true });
    const success = await copyToClipboard(text);
    
    if (success) {
      Alert.alert('تم النسخ', 'تم نسخ الذكر إلى الحافظة ✓');
    }
  };
  
  const handleLongPress = (zikr: ZikrWithProgress) => {
    setSelectedZikr(zikr);
    setShowShareModal(true);
  };
  
  // ===============================
  // الإشارات المرجعية
  // ===============================
  const toggleBookmark = async (zikrId: number) => {
    let updatedBookmarks: number[];
    
    if (bookmarks.includes(zikrId)) {
      updatedBookmarks = bookmarks.filter(id => id !== zikrId);
    } else {
      updatedBookmarks = [...bookmarks, zikrId];
    }
    
    setBookmarks(updatedBookmarks);
    await AsyncStorage.setItem('azkar_bookmarks', JSON.stringify(updatedBookmarks));
  };
  
  // ===============================
  // حساب التقدم
  // ===============================
  const completedCount = azkar.filter(z => z.isCompleted).length;
  const totalCount = azkar.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  
  // ===============================
  // عرض التحميل
  // ===============================
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل الأذكار...</Text>
      </SafeAreaView>
    );
  }
  
  if (!currentData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={Colors.error} />
        <Text style={styles.errorText}>لم يتم العثور على الأذكار</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>العودة</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  const currentZikr = azkar[currentIndex];
  
  // ===============================
  // العرض الرئيسي
  // ===============================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentData.color + '10' }]}>
      {/* الرأس */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-forward" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Ionicons name={currentData.icon as any} size={24} color={currentData.color} />
          <Text style={styles.headerTitle}>{currentData.title}</Text>
        </View>
        
        <TouchableOpacity onPress={handleReset} style={styles.headerButton}>
          <Ionicons name="refresh" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* شريط التقدم */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            {completedCount} / {totalCount}
          </Text>
          <Text style={styles.progressPercentage}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${progressPercentage}%`,
                backgroundColor: currentData.color,
              }
            ]} 
          />
        </View>
        
        <Text style={styles.progressDescription}>{currentData.description}</Text>
      </View>
      
      {/* الذكر الحالي */}
      {currentZikr && (
        <Animated.View 
          style={[
            styles.currentZikrCard,
            { 
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
              borderColor: currentData.color + '40',
            }
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleZikrPress(currentIndex)}
            onLongPress={() => handleLongPress(currentZikr)}
            disabled={currentZikr.isCompleted}
          >
            {/* رقم الذكر */}
            <View style={styles.zikrHeader}>
              <View style={[styles.zikrNumber, { backgroundColor: currentData.color }]}>
                <Text style={styles.zikrNumberText}>{currentIndex + 1}</Text>
              </View>
              
              <View style={styles.zikrActions}>
                {/* زر المشاركة */}
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleShare(currentZikr)}
                >
                  <Ionicons name="share-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
                
                {/* زر النسخ */}
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleCopy(currentZikr)}
                >
                  <Ionicons name="copy-outline" size={22} color={Colors.secondary} />
                </TouchableOpacity>
                
                {/* زر الحفظ */}
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => toggleBookmark(currentZikr.id)}
                >
                  <Ionicons 
                    name={bookmarks.includes(currentZikr.id) ? 'bookmark' : 'bookmark-outline'} 
                    size={22} 
                    color={bookmarks.includes(currentZikr.id) ? Colors.gold : Colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* نص الذكر */}
            <Text style={styles.zikrText}>{currentZikr.text}</Text>
            
            {/* العداد */}
            <View style={styles.counterSection}>
              <View style={[styles.counterCircle, { borderColor: currentData.color }]}>
                <Text style={[styles.counterText, { color: currentData.color }]}>
                  {currentZikr.currentCount}
                </Text>
                <Text style={styles.counterTotal}>/ {currentZikr.count}</Text>
              </View>
              
              {currentZikr.isCompleted && (
                <View style={[styles.completedBadge, { backgroundColor: Colors.success }]}>
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                  <Text style={styles.completedText}>تم</Text>
                </View>
              )}
            </View>
            
            {/* التخريج */}
            {showReference && currentZikr.reference && (
              <View style={styles.referenceSection}>
                <Ionicons name="book-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.referenceText}>
                  {currentZikr.reference}
                  {currentZikr.referenceNumber && ` (${currentZikr.referenceNumber})`}
                </Text>
                {currentZikr.grade && (
                  <View style={[styles.gradeBadge, { backgroundColor: Colors.success + '20' }]}>
                    <Text style={[styles.gradeText, { color: Colors.success }]}>
                      {currentZikr.grade}
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* الفضل */}
            {showBenefit && currentZikr.benefit && (
              <View style={styles.benefitSection}>
                <Ionicons name="star" size={16} color={Colors.gold} />
                <Text style={styles.benefitText}>{currentZikr.benefit}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
      
      {/* قائمة الأذكار */}
      <ScrollView 
        style={styles.azkarList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.azkarListContent}
      >
        <Text style={styles.listTitle}>جميع الأذكار</Text>
        
        {azkar.map((zikr, index) => (
          <TouchableOpacity
            key={zikr.id}
            style={[
              styles.zikrItem,
              index === currentIndex && styles.zikrItemActive,
              zikr.isCompleted && styles.zikrItemCompleted,
            ]}
            onPress={() => {
              if (!zikr.isCompleted) {
                setCurrentIndex(index);
              }
            }}
            onLongPress={() => handleLongPress(zikr)}
          >
            <View style={styles.zikrItemLeft}>
              <View style={[
                styles.zikrItemNumber,
                { backgroundColor: zikr.isCompleted ? Colors.success : currentData.color }
              ]}>
                {zikr.isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text style={styles.zikrItemNumberText}>{index + 1}</Text>
                )}
              </View>
              
              <View style={styles.zikrItemContent}>
                <Text style={styles.zikrItemText} numberOfLines={2}>
                  {zikr.text}
                </Text>
                <Text style={styles.zikrItemCount}>
                  {zikr.currentCount} / {zikr.count}
                </Text>
              </View>
            </View>
            
            {/* أزرار المشاركة السريعة */}
            <View style={styles.zikrItemActions}>
              <TouchableOpacity 
                style={styles.smallActionButton}
                onPress={() => handleShare(zikr)}
              >
                <Ionicons name="share-outline" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* نافذة المشاركة */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowShareModal(false)}
        >
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>مشاركة الذكر</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            {selectedZikr && (
              <>
                <Text style={styles.sharePreviewText} numberOfLines={3}>
                  {selectedZikr.text}
                </Text>
                
                <View style={styles.shareOptions}>
                  {/* مشاركة */}
                  <TouchableOpacity 
                    style={styles.shareOption}
                    onPress={() => {
                      handleShare(selectedZikr);
                      setShowShareModal(false);
                    }}
                  >
                    <View style={[styles.shareOptionIcon, { backgroundColor: Colors.primary + '20' }]}>
                      <Ionicons name="share-social" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.shareOptionText}>مشاركة</Text>
                  </TouchableOpacity>
                  
                  {/* نسخ */}
                  <TouchableOpacity 
                    style={styles.shareOption}
                    onPress={() => {
                      handleCopy(selectedZikr);
                      setShowShareModal(false);
                    }}
                  >
                    <View style={[styles.shareOptionIcon, { backgroundColor: Colors.secondary + '20' }]}>
                      <Ionicons name="copy" size={24} color={Colors.secondary} />
                    </View>
                    <Text style={styles.shareOptionText}>نسخ</Text>
                  </TouchableOpacity>
                  
                  {/* واتساب */}
                  <TouchableOpacity 
                    style={styles.shareOption}
                    onPress={() => {
                      handleShare(selectedZikr);
                      setShowShareModal(false);
                    }}
                  >
                    <View style={[styles.shareOptionIcon, { backgroundColor: '#25D366' + '20' }]}>
                      <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                    </View>
                    <Text style={styles.shareOptionText}>واتساب</Text>
                  </TouchableOpacity>
                  
                  {/* حفظ */}
                  <TouchableOpacity 
                    style={styles.shareOption}
                    onPress={() => {
                      toggleBookmark(selectedZikr.id);
                      setShowShareModal(false);
                    }}
                  >
                    <View style={[styles.shareOptionIcon, { backgroundColor: Colors.gold + '20' }]}>
                      <Ionicons 
                        name={bookmarks.includes(selectedZikr.id) ? 'bookmark' : 'bookmark-outline'} 
                        size={24} 
                        color={Colors.gold} 
                      />
                    </View>
                    <Text style={styles.shareOptionText}>
                      {bookmarks.includes(selectedZikr.id) ? 'إزالة' : 'حفظ'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* معلومات إضافية */}
                {selectedZikr.reference && (
                  <View style={styles.shareInfoSection}>
                    <Text style={styles.shareInfoLabel}>المصدر:</Text>
                    <Text style={styles.shareInfoText}>
                      {selectedZikr.reference}
                      {selectedZikr.referenceNumber && ` - ${selectedZikr.referenceNumber}`}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ===============================
// الأنماط
// ===============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: 18,
    fontFamily: 'Cairo-SemiBold',
    color: Colors.text,
    textAlign: 'center',
  },
  backButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
  },
  
  // الرأس
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: Colors.text,
  },
  
  // شريط التقدم
  progressSection: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressText: {
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    color: Colors.text,
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: Colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressDescription: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  
  // الذكر الحالي
  currentZikrCard: {
    margin: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    ...Shadows.md,
  },
  zikrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  zikrNumber: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zikrNumberText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
  },
  zikrActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zikrText: {
    fontSize: 22,
    fontFamily: 'Amiri-Regular',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: Spacing.lg,
  },
  
  // العداد
  counterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  counterCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
  },
  counterTotal: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  completedText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
  },
  
  // التخريج
  referenceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexWrap: 'wrap',
  },
  referenceText: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
  },
  gradeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  gradeText: {
    fontSize: 10,
    fontFamily: 'Cairo-SemiBold',
  },
  
  // الفضل
  benefitSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.gold + '10',
    borderRadius: BorderRadius.lg,
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
    lineHeight: 22,
  },
  
  // قائمة الأذكار
  azkarList: {
    flex: 1,
    marginTop: Spacing.sm,
  },
  azkarListContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  listTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  zikrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  zikrItemActive: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  zikrItemCompleted: {
    opacity: 0.7,
    backgroundColor: Colors.success + '10',
  },
  zikrItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  zikrItemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zikrItemNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
  },
  zikrItemContent: {
    flex: 1,
  },
  zikrItemText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
    lineHeight: 22,
  },
  zikrItemCount: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  zikrItemActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  smallActionButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // نافذة المشاركة
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  shareModalTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: Colors.text,
  },
  sharePreviewText: {
    fontSize: 16,
    fontFamily: 'Amiri-Regular',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 28,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  shareOption: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shareOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionText: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
  },
  shareInfoSection: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
  },
  shareInfoLabel: {
    fontSize: 12,
    fontFamily: 'Cairo-SemiBold',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  shareInfoText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
  },
});
