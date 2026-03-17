import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  haptics?: boolean;
}

export function BackButton({ onPress, color, size = 28, style, haptics = true }: BackButtonProps) {
  const isRTL = useIsRTL();
  const router = useRouter();
  const colorScheme = useColors();

  const handlePress = () => {
    if (haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialCommunityIcons
        name={isRTL ? 'arrow-right' : 'arrow-left'}
        size={size}
        color={color || colorScheme.text}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
