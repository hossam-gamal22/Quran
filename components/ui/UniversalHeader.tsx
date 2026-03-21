import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
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
  const isRTL = useIsRTL();

  return (
    <View
      style={[
        s.header,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        style,
      ]}
    >
      {/* Back button — fixed width, always at the edge */}
      <View style={s.backSide}>
        {showBack && (
          <BackButton
            onPress={onBack}
            color={backColor}
            style={backStyle}
          />
        )}
      </View>

      {/* Center: title or custom children */}
      <View style={s.center}>
        {children || (
          <Text
            style={[
              s.title,
              { color: titleColor || colors.text },
              { textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' },
              titleStyle,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {title}
          </Text>
        )}
      </View>

      {/* Action buttons — natural width, at the opposite edge */}
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

const s = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backSide: {
    width: 44,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: fontBold(),
    fontSize: 20,
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
