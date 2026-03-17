// components/ui/colored-button.tsx
// زر ملون كبير مع أيقونة - للأقسام الرئيسية والتسليطات
// Colored Large Button - For Main Sections and Highlights

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { fontBold } from '@/lib/fonts';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useIsRTL } from '@/hooks/use-is-rtl';
interface ColoredButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  icon?: string;
  backgroundColor: string; // لون الخلفية الرئيسي
  iconBackgroundColor?: string; // لون خلفية الأيقونة (optional)
  iconColor?: string; // لون الأيقونة
  textColor?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export const ColoredButton: React.FC<ColoredButtonProps> = ({
  label,
  icon,
  backgroundColor,
  iconBackgroundColor,
  iconColor = '#fff',
  textColor = '#fff',
  size = 'medium',
  style,
  textStyle,
  haptic = true,
  onPress,
  disabled = false,
  ...props
}) => {
  const sizeConfig = SIZE_MAP[size];
  const isRTL = useIsRTL();

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.container,
        {
          backgroundColor,
          opacity: disabled ? 0.6 : 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
    >
      {icon && (
        <View
          style={[
            styles.iconContainer,
            {
              width: sizeConfig.iconSize,
              height: sizeConfig.iconSize,
              backgroundColor: iconBackgroundColor || 'transparent',
            },
          ]}
        >
          <MaterialCommunityIcons
            name={icon as any}
            size={sizeConfig.iconSize * 0.6}
            color={iconColor}
          />
        </View>
      )}
      <Text
        style={[
          styles.text,
          {
            fontSize: sizeConfig.fontSize,
            color: textColor,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const SIZE_MAP = {
  small: {
    padding: 12,
    iconSize: 32,
    fontSize: 14,
  },
  medium: {
    padding: 16,
    iconSize: 44,
    fontSize: 16,
  },
  large: {
    padding: 20,
    iconSize: 56,
    fontSize: 18,
  },
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconContainer: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: fontBold(),
    fontWeight: '700',
    flex: 1,
  },
});

export default ColoredButton;
