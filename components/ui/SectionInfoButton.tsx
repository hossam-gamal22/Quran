import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { fontBold, fontRegular, arabicBodyStyle } from '@/lib/fonts';

interface SectionInfoButtonProps {
  sectionKey: string;
  icon?: string;
  size?: number;
  color?: string;
}

export const SectionInfoButton: React.FC<SectionInfoButtonProps> = ({
  sectionKey,
  icon = 'information-outline',
  size = 18,
  color,
}) => {
  const [visible, setVisible] = useState(false);
  const { isDarkMode, t, settings } = useSettings();
  const colors = useColors();

  const title = t(`sectionInfo.${sectionKey}.title`) || '';
  const body = t(`sectionInfo.${sectionKey}.body`) || '';

  if (!body || settings.display.showSectionInfo === false) return null;

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={infoStyles.btn}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={size}
          color={color || colors.textLight}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={infoStyles.overlay} onPress={() => setVisible(false)}>
          <Pressable
            style={[infoStyles.card, { backgroundColor: isDarkMode ? '#1c1c1e' : '#fff' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={infoStyles.iconWrap}>
              <MaterialCommunityIcons name="information" size={40} color="#2f7659" />
            </View>
            {title ? (
              <Text style={[infoStyles.title, { color: colors.text }]}>{title}</Text>
            ) : null}
            <Text style={[infoStyles.body, { color: colors.text }, arabicBodyStyle()]}>{body}</Text>
            <TouchableOpacity
              style={infoStyles.okBtn}
              onPress={() => setVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={infoStyles.okText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const infoStyles = StyleSheet.create({
  btn: {
    padding: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(47,118,89,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: fontBold(),
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontFamily: fontRegular(),
    lineHeight: 26,
    textAlign: 'center',
  },
  okBtn: {
    marginTop: 24,
    backgroundColor: '#2f7659',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  okText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: fontBold(),
  },
});
