import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Animated,
  Vibration,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { APP_CONFIG, APP_NAME } from '../../constants/app';
import { ShareButton } from '../components/ShareButton';
import { copyToClipboard } from '../../lib/share-service';
import { Share } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// الأنواع والواجهات
// ============================================

interface TasbihItem {
  id: number;
  text: string;
  transliteration?: string;
  target: number;
  virtue?: string;
  reference?: string;
  source?: 'quran' | 'hadith_sahih' | 'hadith_hasan' | 'athar';
  grade?: string;
}

interface TasbihProgress {
  itemId: number;
  count: number;
  date: string;
  completed: boolean;
}

interface CustomTasbih {
  id: number;
  text: string;
  target: number;
  createdAt: string;
}

// ============================================
// بيانات التسبيحات المعتمدة مع التخريج
// ============================================

const PRESET_TASBIHAT: TasbihItem[] = [
  {
    id: 1,
    text: 'سُبْحَانَ اللهِ',
    transliteration: 'Subhan Allah',
    target: 33,
    virtue: 'تملأ الميزان',
    reference: 'رواه مسلم (223)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 2,
    text: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    target: 33,
    virtue: 'تملأ الميزان',
    reference: 'رواه مسلم (223)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 3,
    text: 'اللهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    target: 33,
    virtue: 'تملأ ما بين السماء والأرض',
    reference: 'رواه مسلم (223)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 4,
    text: 'لَا إِلَهَ إِلَّا اللهُ',
    transliteration: 'La ilaha illa Allah',
    target: 100,
    virtue: 'كانت له عدل عشر رقاب، وكتبت له مائة حسنة، ومحيت عنه مائة سيئة، وكانت له حرزاً من الشيطان',
    reference: 'رواه البخاري (3293) ومسلم (2691)',
    source: 'hadith_sahih',
    grade: 'متفق عليه',
  },
  {
    id: 5,
    text: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illa Allahu wahdahu la sharika lah...',
    target: 100,
    virtue: 'كانت له عدل عشر رقاب، وكتبت له مائة حسنة، ومحيت عنه مائة سيئة، وكانت له حرزاً من الشيطان يومه ذلك حتى يمسي',
    reference: 'رواه البخاري (3293) ومسلم (2691)',
    source: 'hadith_sahih',
    grade: 'متفق عليه',
  },
  {
    id: 6,
    text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    transliteration: 'Subhan Allahi wa bihamdih',
    target: 100,
    virtue: 'حُطَّت خطاياه وإن كانت مثل زبد البحر',
    reference: 'رواه البخاري (6405) ومسلم (2691)',
    source: 'hadith_sahih',
    grade: 'متفق عليه',
  },
  {
    id: 7,
    text: 'سُبْحَانَ اللهِ الْعَظِيمِ وَبِحَمْدِهِ',
    transliteration: 'Subhan Allahil Azeem wa bihamdih',
    target: 100,
    virtue: 'غُرست له نخلة في الجنة',
    reference: 'رواه الترمذي (3464) وصححه الألباني',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 8,
    text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
    transliteration: 'La hawla wa la quwwata illa billah',
    target: 100,
    virtue: 'كنز من كنوز الجنة',
    reference: 'رواه البخاري (4205) ومسلم (2704)',
    source: 'hadith_sahih',
    grade: 'متفق عليه',
  },
  {
    id: 9,
    text: 'أَسْتَغْفِرُ اللهَ',
    transliteration: 'Astaghfirullah',
    target: 100,
    virtue: 'من لزم الاستغفار جعل الله له من كل هم فرجاً، ومن كل ضيق مخرجاً',
    reference: 'رواه أبو داود (1518) وصححه الألباني',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 10,
    text: 'أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullah al-Azeem...',
    target: 3,
    virtue: 'غُفرت ذنوبه وإن كان فارًا من الزحف',
    reference: 'رواه أبو داود (1517) والترمذي (3577)',
    source: 'hadith_hasan',
    grade: 'حسن',
  },
  {
    id: 11,
    text: 'سُبْحَانَ اللهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ',
    transliteration: 'Subhan Allah, wal hamdulillah...',
    target: 100,
    virtue: 'أحب الكلام إلى الله، ولا يضرك بأيهن بدأت',
    reference: 'رواه مسلم (2137)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 12,
    text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    transliteration: 'Allahumma salli wa sallim ala nabiyyina Muhammad',
    target: 100,
    virtue: 'من صلى عليَّ صلاة صلى الله عليه بها عشراً',
    reference: 'رواه مسلم (384)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 13,
    text: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    transliteration: 'Rabbi ighfir li wa tub alayya...',
    target: 100,
    virtue: 'كان النبي ﷺ يقولها في المجلس الواحد مائة مرة',
    reference: 'رواه أبو داود (1516) والترمذي (3434)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 14,
    text: 'سُبُّوحٌ قُدُّوسٌ رَبُّ الْمَلَائِكَةِ وَالرُّوحِ',
    transliteration: 'Subbuhun Quddusun Rabbul malaikati war-ruh',
    target: 33,
    virtue: 'كان النبي ﷺ يقولها في ركوعه وسجوده',
    reference: 'رواه مسلم (487)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 15,
    text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
    transliteration: 'Ya Hayyu Ya Qayyum bi rahmatika astaghith',
    target: 7,
    virtue: 'دعاء الكرب والشدة',
    reference: 'رواه الترمذي (3524) وحسنه الألباني',
    source: 'hadith_hasan',
    grade: 'حسن',
  },
];

// ============================================
// المكون الرئيسي
// ============================================

export default function TasbihScreen() {
  const router = useRouter();
  
  // الحالات
  const [selectedTasbih, setSelectedTasbih] = useState<TasbihItem>(PRESET_TASBIHAT[0]);
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showTasbihList, setShowTasbihList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [customTasbihat, setCustomTasbihat] = useState<CustomTasbih[]>([]);
  const [customText, setCustomText] = useState('');
  const [customTarget, setCustomTarget] = useState('33');
  const [dailyStats, setDailyStats] = useState<{ [key: string]: number }>({});
  const [showReference, setShowReference] = useState(true);
  const [showVirtue, setShowVirtue] = useState(true);
  
  // الأنيميشن
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ============================================
  // تحميل البيانات
  // ============================================

  useEffect(() => {
    loadData();
    startPulseAnimation();
  }, []);

  useEffect(() => {
    // تحديث شريط التقدم
    Animated.timing(progressAnim, {
      toValue: count / selectedTasbih.target,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [count, selectedTasbih.target]);

  const loadData = async () => {
    try {
      // تحميل الإعدادات
      const settings = await AsyncStorage.getItem('tasbih_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setVibrationEnabled(parsed.vibrationEnabled ?? true);
        setSoundEnabled(parsed.soundEnabled ?? false);
        setShowReference(parsed.showReference ?? true);
        setShowVirtue(parsed.showVirtue ?? true);
      }

      // تحميل التسبيحات المخصصة
      const custom = await AsyncStorage.getItem('custom_tasbihat');
      if (custom) {
        setCustomTasbihat(JSON.parse(custom));
      }

      // تحميل التقدم المحفوظ
      const today = new Date().toDateString();
      const progress = await AsyncStorage.getItem('tasbih_progress');
      if (progress) {
        const parsed = JSON.parse(progress);
        if (parsed.date === today) {
          setCount(parsed.count || 0);
          setTotalCount(parsed.totalCount || 0);
          setRounds(parsed.rounds || 0);
          if (parsed.selectedId) {
            const found = PRESET_TASBIHAT.find(t => t.id === parsed.selectedId);
            if (found) setSelectedTasbih(found);
          }
        }
      }

      // تحميل الإحصائيات
      const stats = await AsyncStorage.getItem('tasbih_daily_stats');
      if (stats) {
        setDailyStats(JSON.parse(stats));
      }
    } catch (error) {
      console.error('Error loading tasbih data:', error);
    }
  };

  const saveProgress = async () => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem('tasbih_progress', JSON.stringify({
        date: today,
        count,
        totalCount,
        rounds,
        selectedId: selectedTasbih.id,
      }));

      // تحديث الإحصائيات اليومية
      const newStats = { ...dailyStats };
      newStats[today] = totalCount;
      setDailyStats(newStats);
      await AsyncStorage.setItem('tasbih_daily_stats', JSON.stringify(newStats));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('tasbih_settings', JSON.stringify({
        vibrationEnabled,
        soundEnabled,
        showReference,
        showVirtue,
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // ============================================
  // الأنيميشن
  // ============================================

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const animatePress = () => {
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
  };

  // ============================================
  // معالجة الضغط
  // ============================================

  const handlePress = useCallback(() => {
    animatePress();

    if (vibrationEnabled) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Vibration.vibrate(30);
      }
    }

    const newCount = count + 1;
    const newTotal = totalCount + 1;
    setCount(newCount);
    setTotalCount(newTotal);

    // التحقق من اكتمال الجولة
    if (newCount >= selectedTasbih.target) {
      if (vibrationEnabled) {
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Vibration.vibrate([0, 100, 100, 100]);
        }
      }
      setRounds(prev => prev + 1);
      setCount(0);
      
      Alert.alert(
        '🎉 ما شاء الله!',
        `أكملت جولة من "${selectedTasbih.text}"\n\nإجمالي الجولات: ${rounds + 1}`,
        [{ text: 'متابعة', style: 'default' }]
      );
    }

    // حفظ التقدم
    saveProgress();
  }, [count, totalCount, rounds, selectedTasbih, vibrationEnabled]);

  const handleReset = () => {
    Alert.alert(
      'إعادة تعيين',
      'هل تريد إعادة تعيين العداد الحالي؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة تعيين',
          style: 'destructive',
          onPress: () => {
            setCount(0);
            saveProgress();
          },
        },
      ]
    );
  };

  const handleResetAll = () => {
    Alert.alert(
      'إعادة تعيين الكل',
      'هل تريد إعادة تعيين جميع العدادات والجولات؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة تعيين',
          style: 'destructive',
          onPress: () => {
            setCount(0);
            setTotalCount(0);
            setRounds(0);
            saveProgress();
          },
        },
      ]
    );
  };

  // ============================================
  // المشاركة والنسخ
  // ============================================

  const formatTasbihForShare = () => {
    let shareText = `📿 تسبيح\n\n`;
    shareText += `「 ${selectedTasbih.text} 」\n\n`;
    shareText += `🔢 العدد المستهدف: ${selectedTasbih.target}\n`;
    
    if (selectedTasbih.virtue && showVirtue) {
      shareText += `\n✨ الفضل:\n${selectedTasbih.virtue}\n`;
    }
    
    if (selectedTasbih.reference && showReference) {
      shareText += `\n📚 المصدر: ${selectedTasbih.reference}`;
      if (selectedTasbih.grade) {
        shareText += ` (${selectedTasbih.grade})`;
      }
    }
    
    shareText += `\n\n${APP_CONFIG.getShareSignature()}`;
    
    return shareText;
  };

  const handleShare = async () => {
    try {
      const shareText = formatTasbihForShare();
      await Share.share({
        message: shareText,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopy = async () => {
    const shareText = formatTasbihForShare();
    await copyToClipboard(shareText);
    Alert.alert('تم النسخ', 'تم نسخ التسبيح إلى الحافظة');
    setShowShareModal(false);
  };

  const shareProgress = async () => {
    const shareText = `📿 إنجازاتي في التسبيح اليوم\n\n` +
      `✅ التسبيح الحالي: ${selectedTasbih.text}\n` +
      `🔢 العدد: ${count}/${selectedTasbih.target}\n` +
      `🔄 الجولات المكتملة: ${rounds}\n` +
      `📊 الإجمالي اليوم: ${totalCount}\n\n` +
      `${APP_CONFIG.getShareSignature()}`;
    
    try {
      await Share.share({ message: shareText });
    } catch (error) {
      console.error('Error sharing progress:', error);
    }
  };

  // ============================================
  // التسبيحات المخصصة
  // ============================================

  const addCustomTasbih = async () => {
    if (!customText.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال نص التسبيح');
      return;
    }

    const target = parseInt(customTarget) || 33;
    const newCustom: CustomTasbih = {
      id: Date.now(),
      text: customText.trim(),
      target,
      createdAt: new Date().toISOString(),
    };

    const updated = [...customTasbihat, newCustom];
    setCustomTasbihat(updated);
    await AsyncStorage.setItem('custom_tasbihat', JSON.stringify(updated));
    
    setCustomText('');
    setCustomTarget('33');
    setShowCustomModal(false);
    
    Alert.alert('تم', 'تمت إضافة التسبيح المخصص');
  };

  const deleteCustomTasbih = async (id: number) => {
    Alert.alert(
      'حذف التسبيح',
      'هل تريد حذف هذا التسبيح المخصص؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const updated = customTasbihat.filter(t => t.id !== id);
            setCustomTasbihat(updated);
            await AsyncStorage.setItem('custom_tasbihat', JSON.stringify(updated));
          },
        },
      ]
    );
  };

  const selectTasbih = (tasbih: TasbihItem | CustomTasbih) => {
    if ('virtue' in tasbih) {
      setSelectedTasbih(tasbih);
    } else {
      setSelectedTasbih({
        id: tasbih.id,
        text: tasbih.text,
        target: tasbih.target,
        source: 'athar',
      });
    }
    setCount(0);
    setShowTasbihList(false);
  };

  // ============================================
  // حساب النسبة المئوية
  // ============================================

  const progressPercentage = Math.round((count / selectedTasbih.target) * 100);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ============================================
  // العرض
  // ============================================

  return (
    <View style={styles.container}>
      {/* الهيدر */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>عداد التسبيح</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setShowStatsModal(true)} 
            style={styles.headerButton}
          >
            <Ionicons name="stats-chart-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowSettings(true)} 
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* الإحصائيات السريعة */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>الإجمالي</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{rounds}</Text>
          <Text style={styles.statLabel}>الجولات</Text>
        </View>
      </View>

      {/* بطاقة التسبيح */}
      <TouchableOpacity 
        style={styles.tasbihSelector}
        onPress={() => setShowTasbihList(true)}
      >
        <Text style={styles.tasbihSelectorText} numberOfLines={1}>
          {selectedTasbih.text}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.primary} />
      </TouchableOpacity>

      {/* شريط التقدم */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill, 
              { width: progressWidth }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{count} / {selectedTasbih.target}</Text>
        <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
      </View>

      {/* زر العداد الرئيسي */}
      <View style={styles.counterContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Text style={styles.counterNumber}>{count}</Text>
              <Text style={styles.counterLabel}>اضغط للتسبيح</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* أزرار التحكم */}
      <View style={styles.controlButtons}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleReset}
        >
          <Ionicons name="refresh-outline" size={24} color={Colors.text} />
          <Text style={styles.controlButtonText}>إعادة</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setShowShareModal(true)}
        >
          <Ionicons name="share-outline" size={24} color={Colors.text} />
          <Text style={styles.controlButtonText}>مشاركة</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={shareProgress}
        >
          <Ionicons name="trophy-outline" size={24} color={Colors.text} />
          <Text style={styles.controlButtonText}>إنجازاتي</Text>
        </TouchableOpacity>
      </View>

      {/* معلومات التسبيح */}
      {(selectedTasbih.virtue && showVirtue) || (selectedTasbih.reference && showReference) ? (
        <ScrollView style={styles.infoContainer} showsVerticalScrollIndicator={false}>
          {selectedTasbih.virtue && showVirtue && (
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="sparkles" size={18} color={Colors.primary} />
                <Text style={styles.infoTitle}>الفضل</Text>
              </View>
              <Text style={styles.infoText}>{selectedTasbih.virtue}</Text>
            </View>
          )}
          
          {selectedTasbih.reference && showReference && (
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="book" size={18} color={Colors.secondary} />
                <Text style={styles.infoTitle}>المصدر</Text>
                {selectedTasbih.grade && (
                  <View style={styles.gradeBadge}>
                    <Text style={styles.gradeText}>{selectedTasbih.grade}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.infoText}>{selectedTasbih.reference}</Text>
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* ============================================ */}
      {/* نافذة قائمة التسبيحات */}
      {/* ============================================ */}
      <Modal
        visible={showTasbihList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTasbihList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر التسبيح</Text>
              <TouchableOpacity onPress={() => setShowTasbihList(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tasbihList}>
              {/* التسبيحات المعتمدة */}
              <Text style={styles.sectionTitle}>التسبيحات المعتمدة</Text>
              {PRESET_TASBIHAT.map((tasbih) => (
                <TouchableOpacity
                  key={tasbih.id}
                  style={[
                    styles.tasbihItem,
                    selectedTasbih.id === tasbih.id && styles.tasbihItemSelected,
                  ]}
                  onPress={() => selectTasbih(tasbih)}
                >
                  <View style={styles.tasbihItemContent}>
                    <Text style={styles.tasbihItemText}>{tasbih.text}</Text>
                    <View style={styles.tasbihItemMeta}>
                      <Text style={styles.tasbihItemTarget}>× {tasbih.target}</Text>
                      {tasbih.grade && (
                        <View style={styles.smallBadge}>
                          <Text style={styles.smallBadgeText}>{tasbih.grade}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {selectedTasbih.id === tasbih.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {/* التسبيحات المخصصة */}
              {customTasbihat.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>تسبيحاتي المخصصة</Text>
                  {customTasbihat.map((tasbih) => (
                    <TouchableOpacity
                      key={tasbih.id}
                      style={styles.tasbihItem}
                      onPress={() => selectTasbih(tasbih)}
                      onLongPress={() => deleteCustomTasbih(tasbih.id)}
                    >
                      <View style={styles.tasbihItemContent}>
                        <Text style={styles.tasbihItemText}>{tasbih.text}</Text>
                        <Text style={styles.tasbihItemTarget}>× {tasbih.target}</Text>
                      </View>
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>

            {/* زر إضافة تسبيح مخصص */}
            <TouchableOpacity
              style={styles.addCustomButton}
              onPress={() => {
                setShowTasbihList(false);
                setShowCustomModal(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color={Colors.white} />
              <Text style={styles.addCustomButtonText}>إضافة تسبيح مخصص</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* نافذة إضافة تسبيح مخصص */}
      {/* ============================================ */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة تسبيح مخصص</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>نص التسبيح</Text>
              <TextInput
                style={styles.textInput}
                value={customText}
                onChangeText={setCustomText}
                placeholder="أدخل نص التسبيح..."
                placeholderTextColor={Colors.textLight}
                multiline
                textAlign="right"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>العدد المستهدف</Text>
              <TextInput
                style={[styles.textInput, { height: 50 }]}
                value={customTarget}
                onChangeText={setCustomTarget}
                placeholder="33"
                placeholderTextColor={Colors.textLight}
                keyboardType="number-pad"
                textAlign="center"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={addCustomTasbih}>
              <Text style={styles.saveButtonText}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* نافذة الإعدادات */}
      {/* ============================================ */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>الإعدادات</Text>
              <TouchableOpacity onPress={() => {
                saveSettings();
                setShowSettings(false);
              }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="phone-portrait-outline" size={22} color={Colors.primary} />
                <Text style={styles.settingLabel}>الاهتزاز</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, vibrationEnabled && styles.toggleActive]}
                onPress={() => setVibrationEnabled(!vibrationEnabled)}
              >
                <View style={[styles.toggleKnob, vibrationEnabled && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="book-outline" size={22} color={Colors.primary} />
                <Text style={styles.settingLabel}>إظهار المصدر</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, showReference && styles.toggleActive]}
                onPress={() => setShowReference(!showReference)}
              >
                <View style={[styles.toggleKnob, showReference && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="sparkles-outline" size={22} color={Colors.primary} />
                <Text style={styles.settingLabel}>إظهار الفضل</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, showVirtue && styles.toggleActive]}
                onPress={() => setShowVirtue(!showVirtue)}
              >
                <View style={[styles.toggleKnob, showVirtue && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: Colors.error, marginTop: 20 }]}
              onPress={() => {
                handleResetAll();
                setShowSettings(false);
              }}
            >
              <Text style={styles.saveButtonText}>إعادة تعيين كل شيء</Text>
            </TouchableOpacity>
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
              <Text style={styles.modalTitle}>مشاركة التسبيح</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* معاينة */}
            <View style={styles.sharePreview}>
              <Text style={styles.sharePreviewText}>{selectedTasbih.text}</Text>
              {selectedTasbih.reference && (
                <Text style={styles.sharePreviewRef}>{selectedTasbih.reference}</Text>
              )}
            </View>

            {/* خيارات المشاركة */}
            <View style={styles.shareOptions}>
              <TouchableOpacity style={styles.shareOption} onPress={handleShare}>
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
                  const text = formatTasbihForShare();
                  await Share.share({ message: text });
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

      {/* ============================================ */}
      {/* نافذة الإحصائيات */}
      {/* ============================================ */}
      <Modal
        visible={showStatsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إحصائياتي</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.statsContainer}>
              <View style={styles.statsCard}>
                <Ionicons name="today-outline" size={32} color={Colors.primary} />
                <Text style={styles.statsCardValue}>{totalCount}</Text>
                <Text style={styles.statsCardLabel}>تسبيحات اليوم</Text>
              </View>

              <View style={styles.statsCard}>
                <Ionicons name="sync-outline" size={32} color={Colors.secondary} />
                <Text style={styles.statsCardValue}>{rounds}</Text>
                <Text style={styles.statsCardLabel}>جولات مكتملة</Text>
              </View>

              <View style={styles.statsCard}>
                <Ionicons name="calendar-outline" size={32} color={Colors.success} />
                <Text style={styles.statsCardValue}>
                  {Object.values(dailyStats).reduce((a, b) => a + b, 0)}
                </Text>
                <Text style={styles.statsCardLabel}>الإجمالي الكلي</Text>
              </View>

              {/* آخر 7 أيام */}
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>آخر 7 أيام</Text>
              {Object.entries(dailyStats)
                .slice(-7)
                .reverse()
                .map(([date, count]) => (
                  <View key={date} style={styles.statsRow}>
                    <Text style={styles.statsRowDate}>{date}</Text>
                    <Text style={styles.statsRowValue}>{count} تسبيحة</Text>
                  </View>
                ))}
            </ScrollView>
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
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  tasbihSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  tasbihSelectorText: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    marginRight: Spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    minWidth: 60,
    textAlign: 'center',
  },
  progressPercentage: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: '600',
    minWidth: 40,
  },
  counterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  counterButton: {
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.55,
    borderRadius: SCREEN_WIDTH * 0.275,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  counterNumber: {
    fontSize: 72,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  counterLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.white,
    opacity: 0.9,
    marginTop: Spacing.sm,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  controlButton: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  controlButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    marginTop: 4,
  },
  infoContainer: {
    maxHeight: 200,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  infoTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  infoText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'right',
  },
  gradeBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  gradeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.success,
    fontWeight: '600',
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
  tasbihList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  tasbihItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  tasbihItemSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  tasbihItemContent: {
    flex: 1,
  },
  tasbihItemText: {
    fontSize: Typography.sizes.md,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
    marginBottom: 4,
  },
  tasbihItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  tasbihItemTarget: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  smallBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  smallBadgeText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: '600',
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  addCustomButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    ...Shadows.sm,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  toggleKnobActive: {
    marginLeft: 22,
  },
  sharePreview: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  sharePreviewText: {
    fontSize: Typography.sizes.xl,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  sharePreviewRef: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  statsContainer: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  statsCardValue: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
    marginVertical: Spacing.sm,
  },
  statsCardLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  statsRowDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  statsRowValue: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
});
