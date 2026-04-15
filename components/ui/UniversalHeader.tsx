import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { BackButton } from './BackButton';
import { fontBold } from '@/lib/fonts';

export interface HeaderAction {
  icon: string;
  onPress: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

interface UniversalHeaderProps {
  title?: string;
  titleColor?: string;
  onBack?: () => void;
  showBack?: boolean;
  backColor?: string;
  backStyle?: StyleProp<ViewStyle>;
  rightActions?: HeaderAction[];
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function UniversalHeader({
  title,
  titleColor,
  onBack,
  showBack = true,
  backColor,
  backStyle,
  rightActions = [],
  style,
  titleStyle,
  children,
}: UniversalHeaderProps) {
  const colors = useColors();
  const s = useScaledStyles(_s, colors.fs);
  const isRTL = useIsRTL();

  return (
    <View
      style={[
        s.header,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        style,
      ]}
    >
      {/* Back button — fixed width, at the leading edge */}
      <View style={s.backSide}>
        {showBack && (
          <BackButton
            onPress={onBack}
            color={backColor}
            style={backStyle}
          />
        )}
      </View>

      {/* Title — sits right next to the back button (not centered) */}
      <View
        style={[
          s.titleSide,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {children || (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              s.title,
              { color: titleColor || colors.text },
              { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
              titleStyle,
            ]}
          >
            {title || ''}
          </Text>
        )}
      </View>

      {/* Action buttons — natural width, at the trailing edge */}
      <View
        style={[
          s.actionsSide,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {rightActions.map((action, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={action.onPress}
            style={[s.actionBtn, action.style]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name={action.icon as any}
              size={action.size || 24}
              color={action.color || colors.text}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const _s = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backSide: {
    width: 44,
    justifyContent: 'center',
  },
  titleSide: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: fontBold(),
    fontSize: 20,
    flexShrink: 1,
  },
  actionsSide: {
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
