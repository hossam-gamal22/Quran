import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold } from '@/lib/fonts';

export const APP_MODAL_BACKDROP = 'rgba(0,0,0,0.72)';
export const APP_MODAL_DARK_SURFACE = '#0f1a14';
export const APP_MODAL_LIGHT_SURFACE = '#ffffff';
export const APP_MODAL_GREEN = '#0d8e62';

export type AppModalPosition = 'center' | 'bottom';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: AppModalPosition;
  scroll?: boolean;
  closeButton?: boolean;
  sheetStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function getAppModalSurface(isDarkMode: boolean): string {
  return isDarkMode ? APP_MODAL_DARK_SURFACE : APP_MODAL_LIGHT_SURFACE;
}

export function getAppModalBorder(isDarkMode: boolean): string {
  return isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
}

export function AppModal({
  visible,
  onClose,
  title,
  children,
  position = 'center',
  scroll = false,
  closeButton = true,
  sheetStyle,
  contentStyle,
}: AppModalProps) {
  const colors = useColors();
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const bottomSheet = position === 'bottom';

  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={contentStyle}>{children}</View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={bottomSheet ? 'slide' : 'fade'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={[
          styles.backdrop,
          bottomSheet ? styles.backdropBottom : styles.backdropCenter,
          bottomSheet && { paddingBottom: 0 },
        ]}
        onPress={onClose}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.sheet,
            bottomSheet ? styles.bottomSheet : styles.centerSheet,
            {
              backgroundColor: getAppModalSurface(isDarkMode),
              borderColor: getAppModalBorder(isDarkMode),
              paddingBottom: bottomSheet ? Math.max(insets.bottom, 16) + 16 : 24,
            },
            Platform.OS === 'android' && styles.androidElevation,
            sheetStyle,
          ]}
        >
          {(title || closeButton) && (
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text
                numberOfLines={2}
                style={[
                  styles.title,
                  {
                    color: isDarkMode ? '#ffffff' : colors.text,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {title || ''}
              </Text>
              {closeButton && (
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(13,142,98,0.18)'
                        : 'rgba(13,142,98,0.10)',
                      borderColor: isDarkMode
                        ? 'rgba(13,142,98,0.28)'
                        : 'rgba(13,142,98,0.18)',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={18}
                    color={isDarkMode ? '#4ADE80' : APP_MODAL_GREEN}
                  />
                </Pressable>
              )}
            </View>
          )}
          {content}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: APP_MODAL_BACKDROP,
    paddingHorizontal: 20,
  },
  backdropCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  backdropBottom: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  centerSheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  bottomSheet: {
    width: '100%',
    maxHeight: '86%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  androidElevation: {
    elevation: 16,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontFamily: fontBold(),
    fontSize: 20,
    lineHeight: 30,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 8,
  },
});

export default AppModal;
