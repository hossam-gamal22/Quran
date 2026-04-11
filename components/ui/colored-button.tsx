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
import { getContrastTextColor } from '@/lib/contrast-helper';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useColors } from '@/hooks/use-colors';
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
  iconColor,
  textColor,
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
  const { fs } = useColors();
  const styles = useScaledStyles(_styles, fs);

  // Auto-detect contrast-safe text/icon color from background if not explicitly provided
  const resolvedTextColor = textColor ?? getContrastTextColor(backgroundColor);
  const resolvedIconColor = iconColor ?? resolvedTextColor;

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
            color={resolvedIconColor}
          />
        </View>
      )}
      <Text
        style={[
          styles.text,
          {
            fontSize: sizeConfig.fontSize,
            color: resolvedTextColor,
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

const _styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconContainer: {
    borderRadius: 16,
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
