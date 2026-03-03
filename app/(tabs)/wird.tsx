// app/(tabs)/tasbih.tsx
// شاشة التسبيح الإلكترونية بتصميم دائري

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSettings } from '@/contexts/SettingsContext';

const { width, height } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.65;
const DOT_COUNT = 33;

// ========================================
// الأذكار المتاحة
// ========================================

const ADHKAR = [
  { id: 1, text: 'سُبْحَانَ اللَّه', target: 33 },
  { id: 2, text: 'الْحَمْدُ لِلَّه', target: 33 },
  { id: 3, text: 'اللَّهُ أَكْبَر', target: 34 },
  { id: 4, text: 'لَا إِلَهَ إِلَّا اللَّه', target: 100 },
  { id: 5, text: 'أَسْتَغْفِرُ اللَّه', target: 100 },
  { id: 6, text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', target: 100 },
  { id: 7, text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّه', target: 100 },
];

// ========================================
// مكون النقطة
// ========================================

interface DotProps {
  index: number;
  total: number;
  count: number;
  target: number;
}

const Dot: React.FC<DotProps> = ({ index, total, count, target }) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = CIRCLE_SIZE / 2 + 25;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  
  const dotIndex = index + 1;
  const isActive = dotIndex <= (count % target || (count > 0 && count % target === 0 ? target : 0));
  const isCompleted = count >= target && dotIndex <= target;
  
  return (
    <View
      style={[
        styles.dot,
        {
          transform: [
            { translateX: x },
            { translateY: y },
          ],
        },
        isActive && styles.dotActive,
        isCompleted && styles.dotCompleted,
      ]}
    />
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function TasbihScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  const scale = useSharedValue(1);
  const ripple = useSharedValue(0);
  const counterScale = useSharedValue(1);

  const currentDhikr = ADHKAR[currentIndex];

  // تحميل البيانات المحفوظة
  useEffect(() => {
    loadSavedData();
  }, []);

  // حفظ البيانات
  useEffect(() => {
    saveData();
  }, [count, rounds, totalCount, currentIndex]);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem('tasbih_data');
      if (saved) {
        const data = JSON.parse(saved);
        setCount(data.count || 0);
        setRounds(data.rounds || 0);
        setTotalCount(data.totalCount || 0);
        setCurrentIndex(data.currentIndex || 0);
      }
    } catch (error) {
      console.error('Error loading tasbih data:', error);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('tasbih_data', JSON.stringify({
        count,
        rounds,
        totalCount,
        currentIndex,
      }));
    } catch (error) {
      console.error('Error saving tasbih data:', error);
    }
  };

  // معالجة الضغط على العداد
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // أنيميشن الضغط
    scale.value = withSequence(
      withTiming(0.95, { duration: 50 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    
    counterScale.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withSpring(1, { damping: 15, stiffness: 200 })
    );
    
    ripple.value = 0;
    ripple.value = withTiming(1, { duration: 600 });

    const newCount = count + 1;
    setCount(newCount);
    setTotalCount(prev => prev + 1);

    // التحقق من إكمال الجولة
    if (newCount >= currentDhikr.target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCount(0);
      setRounds(prev => prev + 1);
    }
  }, [count, currentDhikr.target]);

  // تغيير الذكر
  const changeAdhkar = (direction: 'prev' | 'next') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (direction === 'next') {
      setCurrentIndex(prev => (prev + 1) % ADHKAR.length);
    } else {
      setCurrentIndex(prev => (prev - 1 + ADHKAR.length) % ADHKAR.length);
    }
    setCount(0);
  };

  // إعادة التعيين
  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCount(0);
    setRounds(0);
  };

  // إعادة تعيين الكل
  const handleResetAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setCount(0);
    setRounds(0);
    setTotalCount(0);
  };

  // الأنيميشن
  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const counterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ripple.value, [0, 1], [0.5, 0], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(ripple.value, [0, 1], [1, 1.5], Extrapolate.CLAMP) },
    ],
  }));

  const backgroundColor = isDarkMode ? '#11151c' : '#0d3d2d';
  const textColor = '#fff';

  return (
    <LinearGradient
      colors={isDarkMode ? ['#11151c', '#1a2a20'] : ['#0d3d2d', '#1a5a40']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* الهيدر */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-right" size={28} color={textColor} />
          </Pressable>
          <Text style={styles.headerTitle}>السبحة الإلكترونية</Text>
          <Pressable onPress={handleResetAll} style={styles.resetAllButton}>
            <MaterialCommunityIcons name="refresh" size={24} color={textColor} />
          </Pressable>
        </View>

        {/* اختيار الذكر */}
        <View style={styles.adhkarSelector}>
          <Pressable onPress={() => changeAdhkar('prev')} style={styles.arrowButton}>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#4ade80" />
          </Pressable>
          <View style={styles.adhkarTextContainer}>
            <Text style={styles.adhkarText}>{currentDhikr.text}</Text>
          </View>
          <Pressable onPress={() => changeAdhkar('next')} style={styles.arrowButton}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#4ade80" />
          </Pressable>
        </View>

        {/* العداد الدائري */}
        <View style={styles.counterContainer}>
          {/* النقاط حول الدائرة */}
          <View style={styles.dotsContainer}>
            {Array.from({ length: DOT_COUNT }).map((_, index) => (
              <Dot
                key={index}
                index={index}
                total={DOT_COUNT}
                count={count}
                target={currentDhikr.target > 33 ? 33 : currentDhikr.target}
              />
            ))}
          </View>

          {/* الدائرة الرئيسية */}
          <Pressable onPress={handlePress}>
            <Animated.View style={[styles.mainCircle, circleAnimatedStyle]}>
              {/* تأثير الموجة */}
              <Animated.View style={[styles.ripple, rippleAnimatedStyle]} />
              
              {/* الدائرة الداخلية */}
              <View style={styles.innerCircle}>
                <Animated.View style={counterAnimatedStyle}>
                  <Text style={styles.countText}>{count}</Text>
                </Animated.View>
                <Text style={styles.targetText}>{currentDhikr.target} /</Text>
              </View>
            </Animated.View>
          </Pressable>
        </View>

        {/* الإحصائيات */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rounds}</Text>
            <Text style={styles.statLabel}>الجولات</Text>
          </View>
          
          <Pressable onPress={handleReset} style={styles.resetButton}>
            <MaterialCommunityIcons name="restart" size={32} color="#4ade80" />
          </Pressable>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>المجموع</Text>
          </View>
        </View>

        {/* تعليمات */}
        <Text style={styles.instructions}>اضغط على الدائرة للتسبيح</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  
  // الهيدر
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 20,
    color: '#fff',
  },
  resetAllButton: {
    padding: 8,
  },

  // اختيار الذكر
  adhkarSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adhkarTextContainer: {
    flex: 1,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    alignItems: 'center',
  },
  adhkarText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 22,
    color: '#fff',
    textAlign: 'center',
  },

  // العداد
  counterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    width: CIRCLE_SIZE + 60,
    height: CIRCLE_SIZE + 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  dotCompleted: {
    backgroundColor: '#4ade80',
  },
  mainCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(74, 222, 128, 0.4)',
  },
  ripple: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 3,
    borderColor: '#4ade80',
  },
  innerCircle: {
    width: CIRCLE_SIZE - 40,
    height: CIRCLE_SIZE - 40,
    borderRadius: (CIRCLE_SIZE - 40) / 2,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  countText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 72,
    color: '#fff',
  },
  targetText: {
    fontFamily: 'Cairo-Medium',
    fontSize: 24,
    color: 'rgba(255,255,255,0.6)',
    marginTop: -10,
  },

  // الإحصائيات
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Cairo-Bold',
    fontSize: 32,
    color: '#fff',
  },
  statLabel: {
    fontFamily: 'Cairo-Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  resetButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // التعليمات
  instructions: {
    fontFamily: 'Cairo-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingBottom: 20,
  },
});
