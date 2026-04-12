// components/ui/CelebrationModal.tsx
// مودال الاحتفال مع أنيميشن Lottie + Confetti

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LottieView from 'lottie-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { fontBold, fontSemiBold } from '@/lib/fonts';
import { t } from '@/lib/i18n';
import type { CelebrationType } from '@/contexts/CelebrationContext';

const { width } = Dimensions.get('window');

const ANIMATION_SOURCES: Record<CelebrationType, any> = {
  adhkar_complete: require('@/assets/animations/adhkar-complete.json'),
  rank_up: require('@/assets/animations/rank-up.json'),
  monthly_winner: require('@/assets/animations/monthly-winner.json'),
  quran_pages: require('@/assets/animations/adhkar-complete.json'),
  khatma_wird: require('@/assets/animations/adhkar-complete.json'),
};

const ANIMATION_SIZES: Record<CelebrationType, number> = {
  adhkar_complete: 200,
  rank_up: 200,
  monthly_winner: 180,
  quran_pages: 200,
  khatma_wird: 200,
};

const CONFETTI_COLORS_DARK = ['#0d8e62', '#0f987f', '#10B981', '#22C55E', '#34D399', '#059669'];
const CONFETTI_COLORS_LIGHT = ['#0d8e62', '#1B5E20', '#2E7D32', '#388E3C', '#43A047', '#4CAF50'];

interface CelebrationModalProps {
  visible: boolean;
  type: CelebrationType;
  title: string;
  subtitle?: string;
  onDismiss: () => void;
}

export function CelebrationModal({ visible, type, title, subtitle, onDismiss }: CelebrationModalProps) {
  const colors = useColors();
  const confettiRef = useRef<ConfettiCannon | null>(null);
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        lottieRef.current?.reset();
        lottieRef.current?.play();
      }, 100);
    }
  }, [visible]);

  if (!visible) return null;

  const animSize = ANIMATION_SIZES[type];
  
  // Clear, high-contrast backgrounds
  const cardBg = colors.isDarkMode ? '#1C1C1E' : '#FFFFFF';
  const cardTextColor = colors.isDarkMode ? '#FFFFFF' : '#1C1C1E';
  const subtitleColor = colors.isDarkMode ? '#4ADE80' : '#0d8e62';
  const buttonBg = colors.isDarkMode ? '#22C55E' : '#0d8e62';
  const confettiColors = colors.isDarkMode ? CONFETTI_COLORS_DARK : CONFETTI_COLORS_LIGHT;
  
  // Special gold colors for monthly winner
  const isWinner = type === 'monthly_winner';
  const accentColor = isWinner ? (colors.isDarkMode ? '#FFD60A' : '#D4A017') : subtitleColor;
  const buttonColor = isWinner ? (colors.isDarkMode ? '#FFD60A' : '#D4A017') : buttonBg;

  const cardContent = (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, backgroundColor: cardBg }}>
      <LottieView
        ref={lottieRef}
        source={ANIMATION_SOURCES[type]}
        autoPlay
        loop={false}
        style={{ width: animSize, height: animSize }}
      />
      <Animated.Text
        entering={FadeInDown.delay(200).duration(500)}
        style={{ fontSize: 22, fontFamily: fontBold(), textAlign: 'center', marginTop: 8, lineHeight: 34, color: cardTextColor }}
      >
        {title}
      </Animated.Text>
      {subtitle ? (
        <Animated.Text
          entering={FadeInDown.delay(400).duration(500)}
          style={{ fontSize: 16, fontFamily: fontSemiBold(), textAlign: 'center', marginTop: 8, lineHeight: 26, color: accentColor }}
        >
          {subtitle}
        </Animated.Text>
      ) : null}
      <Animated.View entering={FadeInDown.delay(600).duration(400)}>
        <TouchableOpacity
          style={{ marginTop: 20, paddingHorizontal: 40, paddingVertical: 12, borderRadius: 16, backgroundColor: buttonColor }}
          onPress={onDismiss}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: fontBold(), textAlign: 'center' }}>
            {t('celebration.alhamdulillah')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const cardStyle = {
    width: width - 48,
    borderRadius: 24,
    overflow: 'hidden' as const,
    backgroundColor: cardBg,
    // Subtle shadow for light mode, border for dark mode
    ...(colors.isDarkMode 
      ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 }
    ),
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <ConfettiCannon
          ref={confettiRef}
          count={80}
          origin={{ x: width / 2, y: -20 }}
          autoStart
          fadeOut
          explosionSpeed={350}
          fallSpeed={2500}
          colors={confettiColors}
        />

        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={cardStyle}>
              {cardContent}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
